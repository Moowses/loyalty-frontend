import { NextRequest, NextResponse } from "next/server";

function extractArrayPayload(json: any): any[] | null {
  if (!json) return null;
  let root: any = json;
  if (root && typeof root === "object" && "data" in root) root = root.data;
  if (typeof root === "string") return null;
  if (Array.isArray(root)) return root;
  if (root && typeof root === "object" && Array.isArray(root.data)) return root.data;
  return null;
}

function toNum(v: unknown): number {
  const n =
    typeof v === "number"
      ? v
      : Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateRange(startDate: string, endDate: string): string[] {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const out: string[] = [];
  const cur = new Date(start);
  while (cur < end) {
    out.push(ymd(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function roomTotalFromDailyPrices(dailyPrices: Record<string, unknown>, nights: string[]) {
  return nights.reduce((sum, key) => sum + toNum(dailyPrices?.[key]), 0);
}

function fullyAvailable(availability: Record<string, unknown>, nights: string[]) {
  return nights.every((key) => {
    const v = availability?.[key];
    return v === 1 || v === true || String(v) === "1" || String(v).toLowerCase() === "true";
  });
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const startDate = sp.get("startDate") || "";
  const endDate = sp.get("endDate") || "";

  if (!startDate || !endDate) {
    return NextResponse.json(
      { success: false, message: "startDate and endDate are required." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.API_BASE_URL ||
    "http://localhost:5000";

  const adult = sp.get("adult") || "1";
  const child = sp.get("child") || "0";
  const infant = sp.get("infant") || "0";
  const pet = sp.get("pet") || "no";
  const currency = (sp.get("currency") || "CAD").toUpperCase();
  const roomTypeId = sp.get("roomTypeId") || "";

  const upstreamCalabogieQs = new URLSearchParams({
    hotelNo: "CBE",
    startDate,
    endDate,
    adult,
    child,
    infant,
    pet,
    currency,
  });
  if (roomTypeId) upstreamCalabogieQs.set("roomTypeId", roomTypeId);

  try {
    const upstream = await fetch(
      `${base}/api/calabogie/availability?${upstreamCalabogieQs.toString()}`,
      { cache: "no-store", headers: { Accept: "application/json" } }
    );
    const json = await upstream.json();
    const compact = json?.data;

    if (!upstream.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "Upstream request failed.",
          status: upstream.status,
          upstream: json,
        },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    // If upstream already returned room rows, pass through.
    const directRows = extractArrayPayload(json);
    if (Array.isArray(directRows)) {
      return NextResponse.json(
        { success: true, data: directRows },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // Compact shape: when no roomTypeId, expand by room types.
    if (!roomTypeId && compact && Array.isArray(compact.roomTypes)) {
      const nights = dateRange(startDate, endDate);
      const roomRows = await Promise.all(
        compact.roomTypes.map(async (rt: any) => {
          const rid = String(rt?.roomTypeId ?? "").trim();
          if (!rid) return null;
          const qs = new URLSearchParams(upstreamCalabogieQs);
          qs.set("roomTypeId", rid);
          const r = await fetch(`${base}/api/calabogie/availability?${qs.toString()}`, {
            cache: "no-store",
            headers: { Accept: "application/json" },
          });
          const j = await r.json();
          const d = j?.data ?? {};
          const dailyPrices = (d?.dailyPrices ?? {}) as Record<string, unknown>;
          const availability = (d?.availability ?? {}) as Record<string, unknown>;
          const totalPrice = roomTotalFromDailyPrices(dailyPrices, nights);
          if (!fullyAvailable(availability, nights) || totalPrice <= 0) return null;
          return {
            hotelId: "CBE",
            hotelNo: "CBE",
            hotelName: "Calabogie Escapes",
            roomTypeId: rid,
            roomTypeName: String(rt?.roomTypeName ?? rid),
            totalPrice,
            dailyPrices,
            petFeeAmount: 0,
            currencyCode: String(d?.currencyCode ?? currency),
            minNights: Number(d?.defaults?.minNights ?? 1),
          };
        })
      );
      const rows = roomRows.filter(Boolean);
      return NextResponse.json(
        { success: true, data: rows },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // Compact single-room response (or aggregated fallback) -> normalize to single row when possible.
    if (compact && typeof compact === "object") {
      const nights = dateRange(startDate, endDate);
      const d = compact;
      const dailyPrices = (d?.dailyPrices ?? {}) as Record<string, unknown>;
      const availability = (d?.availability ?? {}) as Record<string, unknown>;
      const totalPrice = roomTotalFromDailyPrices(dailyPrices, nights);
      const resolvedRoomTypeId = String(d?.roomTypeId ?? roomTypeId ?? "").trim();
      if (resolvedRoomTypeId && fullyAvailable(availability, nights) && totalPrice > 0) {
        return NextResponse.json(
          {
            success: true,
            data: [
              {
                hotelId: "CBE",
                hotelNo: "CBE",
                hotelName: "Calabogie Escapes",
                roomTypeId: resolvedRoomTypeId,
                roomTypeName: resolvedRoomTypeId,
                totalPrice,
                dailyPrices,
                petFeeAmount: 0,
                currencyCode: String(d?.currencyCode ?? currency),
                minNights: Number(d?.defaults?.minNights ?? 1),
              },
            ],
          },
          { headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    return NextResponse.json(
      { success: true, data: [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch Calabogie availability.", error: String(error) },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
