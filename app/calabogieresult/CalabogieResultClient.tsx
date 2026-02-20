"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import Image from "next/image";
import dynamic from "next/dynamic";

const ImageCarousel = dynamic(() => import("@/components/ImageCarousel"), {
  ssr: false,
});


//icons

const CalIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" strokeWidth="2" />
    <path d="M16 3v4M8 3v4M3 11h18" strokeWidth="2" />
  </svg>
);

function dashedSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function compactSlug(s: string) {
  return s.replace(/[^a-z0-9]/gi, "").toUpperCase();
}
// exact folder names in /public/properties
const slugMap: Record<string, string> = {
  "Your Dream Getaway": "your-dream-getaway",
  "Escape From Life": "escape-from-life",
  "The Perfect Getaway": "the-perfect-getaway",
  "Scandinavian-Inspired Tiny Home Experience": "tiny-home-experience",
  "Fern Woods Escape": "fern-woods-escape",
  "Nordic Spa Retreat PEI": "nordic-spa-retreat-pei",
  "Nordic Spa Getaway on Stoney Lake": "nordic-spa-get-away-on-stoney-lake",
  "Gull River Escape: Nordic Spa": "gull-river-escape-nordic-spa",
};

const CALABOGIE_ROOM_FOLDER_BY_ID: Record<string, string> = {
  "ae50e6a8-29dd-447d-840c-b3f40144635d": "CA1B",
  "3b427e83-f01e-4cf8-83cc-b3f4014439f6": "CH2B",
  "82c0ab4c-8a5c-4d77-aaae-b3f40143f53b": "CH3B",
  "8767d68e-188d-42ff-811e-b31b011b278b": "1 Bedroom Loft",
};

function getCalabogieRoomFolder(room: any): string {
  const rid = String(room?.roomTypeId ?? room?.RoomTypeId ?? room?.RoomTypeID ?? "").trim();
  const fromId = CALABOGIE_ROOM_FOLDER_BY_ID[rid];
  if (fromId) return fromId;
  const fromName = String(room?.roomTypeName ?? room?.RoomType ?? "").trim();
  if (fromName) {
    const compact = compactSlug(fromName);
    if (compact === "1BEDROOMLOFT") return "1 Bedroom Loft";
    return compact;
  }
  return "";
}

function getCalabogieMeta(room: any): any {
  const folder = getCalabogieRoomFolder(room);
  try {
    if (folder === "CA1B") return require("@/public/calabogie-properties/CA1B/meta.json");
    if (folder === "CH2B") return require("@/public/calabogie-properties/CH2B/meta.json");
    if (folder === "CH3B") return require("@/public/calabogie-properties/CH3B/meta.json");
    if (folder === "1 Bedroom Loft")
      return require("@/public/calabogie-properties/1 Bedroom Loft/meta.json");
  } catch {
    return null;
  }
  return null;
}

function getHotelImage(name?: string, room?: any) {
  const calabogieFolder = getCalabogieRoomFolder(room);
  if (calabogieFolder) return `/calabogie-properties/${calabogieFolder}/hero.png`;
  if (!name) return "";
  const exact = slugMap[name];
  if (exact) return `/properties/${exact}/hero.png`;
  return `/properties/${dashedSlug(name)}/hero.png`;
}

function getCalabogieGalleryImages(room: any, meta: any, fallbackImage: string): string[] {
  const folder = getCalabogieRoomFolder(room);
  const galleryFromMeta = Array.isArray(meta?.gallery) ? meta.gallery : [];
  const gallery = galleryFromMeta
    .map((f: any) => String(f || "").trim())
    .filter(Boolean)
    .map((f: string) => `/calabogie-properties/${folder}/${f}`);

  const base = gallery.length > 0 ? gallery : fallbackImage ? [fallbackImage] : [];
  return Array.from(new Set(base));
}

function money(n: number) {
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function toNum(v: any) {
  if (v == null) return 0;
  const n =
    typeof v === "number"
      ? v
      : Number(String(v).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function sumDailyPricesMap(v: any): number {
  if (!v || typeof v !== "object" || Array.isArray(v)) return 0;
  return Object.values(v).reduce((acc, cur) => acc + toNum(cur), 0);
}

function roomTotalValue(room: any): number {
  const direct = toNum(room?.totalPrice ?? room?.roomSubtotal ?? room?.grossAmountUpstream ?? 0);
  if (direct > 0) return direct;
  const summed = sumDailyPricesMap(room?.dailyPrices);
  return summed > 0 ? summed : 0;
}

function safeArrayData(j: any): any[] | null {
  if (!j) return null;

  const rows = j?.data?.rows;
  if (Array.isArray(rows)) return rows;

  let root: any = j;
  if (root && typeof root === "object" && "data" in root) root = root.data;
  if (typeof root === "string") {
    return null;
  }

  if (Array.isArray(root)) return root;

  // Handle nested shape: { result, flag, data: [...] }
  if (root && typeof root === "object" && Array.isArray(root.data)) {
    return root.data;
  }

  return null;
}

function isPlaceholderRoom(room: any) {
  const id = String(room?.roomTypeId ?? room?.RoomTypeId ?? room?.RoomTypeID ?? "").trim();
  if (!id) return true;
  const total = roomTotalValue(room);
  if (!Number.isFinite(total) || total <= 0) return true;
  return false;
}


function isCalabogieListing(room: any) {
  const hid = String(room?.hotelId ?? room?.hotelNo ?? "").trim().toUpperCase();
  if (hid === "CBE") return true;
  const name = String(room?.hotelName ?? room?.hotelNameEN ?? room?.RoomType ?? "").trim();
  const lower = name.toLowerCase();
  return lower.startsWith("calabogie escapes") || lower.includes("calabogie");
}


//calendar helpers

type Day = { date: Date; currentMonth: boolean };

function buildMonth(monthStart: Date): Day[] {
  const gridStart = startOfWeek(startOfMonth(monthStart), { weekStartsOn: 0 });
  const days: Day[] = [];
  let cur = gridStart;
  for (let i = 0; i < 42; i++) {
    days.push({ date: cur, currentMonth: isSameMonth(cur, monthStart) });
    cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
  }
  return days;
}

const disabledPast = (d: Date) =>
  isBefore(d, new Date(new Date().setHours(0, 0, 0, 0)));

//render page

export default function CalabogieResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const qpStart = searchParams.get("startDate") || searchParams.get("checkIn") || "";
  const qpEnd = searchParams.get("endDate") || searchParams.get("checkOut") || "";
  const qpAdult = Number(searchParams.get("adult") || "1");
  const qpChild = Number(searchParams.get("child") || "0");
  const qpInfant = Number(searchParams.get("infant") || "0");
  const qpRooms = Number(searchParams.get("rooms") || "1");
  const qpPet = (searchParams.get("pet") || "no") === "yes";

  const [checkIn, setCheckIn] = useState<Date | null>(() =>
    qpStart ? parseISO(qpStart) : null
  );
  const [checkOut, setCheckOut] = useState<Date | null>(() =>
    qpEnd ? parseISO(qpEnd) : null
  );
  const [rooms, setRooms] = useState(qpRooms || 1);
  const [adults, setAdults] = useState(qpAdult || 1);
  const [children, setChildren] = useState(qpChild || 0);
  const [infants, setInfants] = useState(qpInfant || 0);
  const [pet, setPet] = useState(qpPet);

  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string>("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxTitle, setLightboxTitle] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const startDate = checkIn ? format(checkIn, "yyyy-MM-dd") : "";
  const endDate = checkOut ? format(checkOut, "yyyy-MM-dd") : "";
  const fmtShort = (d?: Date | null) =>
    d ? format(d, "EEE, MMM d") : "Add dates";

  const [showCal, setShowCal] = useState(false);
  const [viewMonth, setViewMonth] = useState(
    startOfMonth(checkIn || new Date())
  );
  const leftMonth = viewMonth;
  const rightMonth = addMonths(viewMonth, 1);
  const leftDays = buildMonth(leftMonth);
  const rightDays = buildMonth(rightMonth);

  const datesRef = useRef<HTMLDivElement | null>(null);
  const [calPos, setCalPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!showCal || !datesRef.current || isMobile) return;
    const calc = () => {
      const r = datesRef.current!.getBoundingClientRect();
      setCalPos({
        top: r.bottom + 8,
        left: Math.min(r.left, window.innerWidth - 860),
      });
    };
    calc();
    window.addEventListener("scroll", calc, true);
    window.addEventListener("resize", calc);
    return () => {
      window.removeEventListener("scroll", calc, true);
      window.removeEventListener("resize", calc);
    };
  }, [showCal, isMobile]);

  const inRange = (d: Date) =>
    checkIn && checkOut
      ? isWithinInterval(d, { start: checkIn, end: checkOut })
      : false;
  const isStart = (d: Date) => (checkIn ? isSameDay(d, checkIn) : false);
  const isEnd = (d: Date) => (checkOut ? isSameDay(d, checkOut) : false);

  const pickDate = (d: Date) => {
    if (disabledPast(d)) return;
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(d);
      setCheckOut(null);
      return;
    }
    if (isBefore(d, checkIn)) {
      setCheckOut(checkIn);
      setCheckIn(d);
    } else if (isSameDay(d, checkIn)) {
      setCheckOut(addDays(d, 1));
    } else {
      setCheckOut(d);
      if (isMobile) {
        setTimeout(() => setShowCal(false), 120);
      }
    }
  };

  const DayCell = ({ d, muted = false }: { d: Date; muted?: boolean }) => {
    const selectedStart = isStart(d);
    const selectedEnd = isEnd(d);
    const between = inRange(d) && !selectedStart && !selectedEnd;
    const disabled = disabledPast(d);

    return (
      <button
        type="button"
        onClick={() => pickDate(d)}
        disabled={disabled}
        className={[
          "h-10 w-10 flex items-center justify-center rounded-full text-sm transition",
          muted ? "text-gray-300" : "text-gray-800",
          between ? "bg-blue-100" : "",
          selectedStart || selectedEnd
            ? "bg-[#111] text-white font-semibold"
            : "hover:bg-gray-100",
          disabled
            ? "opacity-40 cursor-not-allowed hover:bg-transparent"
            : "",
        ].join(" ")}
        aria-label={format(d, "PPP")}
      >
        {format(d, "d")}
      </button>
    );
  };

  const [showGuests, setShowGuests] = useState(false);
  const guestsRef = useRef<HTMLDivElement | null>(null);
  const [guestPos, setGuestPos] = useState({ top: 0, left: 0, width: 360 });

  useLayoutEffect(() => {
    if (!showGuests || !guestsRef.current || isMobile) return;
    const calc = () => {
      const r = guestsRef.current!.getBoundingClientRect();
      setGuestPos({
        top: r.bottom + 8,
        left: Math.max(8, Math.min(r.left, window.innerWidth - 380)),
        width: Math.min(380, r.width + 120),
      });
    };
    calc();
    window.addEventListener("scroll", calc, true);
    window.addEventListener("resize", calc);
    return () => {
      window.removeEventListener("scroll", calc, true);
      window.removeEventListener("resize", calc);
    };
  }, [showGuests, isMobile]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowRight") {
        setLightboxIndex((prev) =>
          lightboxImages.length ? (prev + 1) % lightboxImages.length : 0
        );
      }
      if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) =>
          lightboxImages.length ? (prev - 1 + lightboxImages.length) % lightboxImages.length : 0
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, lightboxImages.length]);

  const step = (
    setter: (n: number) => void,
    cur: number,
    delta: number,
    min: number,
    max: number
  ) => {
    const next = Math.min(max, Math.max(min, cur + delta));
    setter(next);
  };

  //Fetch availability

  useEffect(() => {
    const run = async () => {
      if (!startDate || !endDate) {
        setAvailableRooms([]);
        setFetchError("Please choose your dates.");
        return;
      }

      setLoading(true);
      setFetchError("");

      const qs = new URLSearchParams({
        startDate,
        endDate,
        adult: String(adults),
        child: String(children),
        infant: String(infants),
        pet: pet ? "yes" : "no",
        currency: "CAD",
      });

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/calabogie/results?${qs.toString()}`
        );
        const j = await res.json();
        const arr = safeArrayData(j);

        if (arr === null) {
          setAvailableRooms([]);
          setFetchError(
            "No available rooms for these dates in this area. Try changing your dates."
          );
        } else {
          const filtered = arr.filter((x: any) => !isPlaceholderRoom(x) && isCalabogieListing(x));
          if (!filtered.length) {
            setAvailableRooms([]);
            setFetchError(
              "No available rooms for these dates. Try changing your dates."
            );
          } else {
            setAvailableRooms(filtered);
          }
        }
      } catch (e) {
        console.error("Calabogie availability error", e);
        setAvailableRooms([]);
        setFetchError(
          "Something went wrong while fetching availability. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [startDate, endDate, adults, children, infants, pet]);

  const visibleRooms = useMemo(
    () => (availableRooms || []).filter((r) => !isPlaceholderRoom(r) && isCalabogieListing(r)),
    [availableRooms]
  );
  const [sortBy, setSortBy] = useState<"recommended" | "price-low" | "price-high">("recommended");
  const [selectedLayouts, setSelectedLayouts] = useState<string[]>([]);
  const [showMobileDatePanel, setShowMobileDatePanel] = useState(false);

  const nightsCount =
    checkIn && checkOut
      ? Math.max(1, differenceInCalendarDays(checkOut, checkIn))
      : 0;

  const getLayoutName = (room: any) =>
    String(room?.roomTypeName || room?.roomType || room?.RoomType || room?.hotelName || "Cottage Layout");

  const layoutOptions = useMemo(() => {
    return Array.from(new Set(visibleRooms.map((room: any) => getLayoutName(room)).filter(Boolean))).sort();
  }, [visibleRooms]);

  const filteredSortedRooms = useMemo(() => {
    let list = [...visibleRooms];

    if (selectedLayouts.length > 0) {
      list = list.filter((room: any) => selectedLayouts.includes(getLayoutName(room)));
    }

    if (sortBy === "price-low") {
      list.sort((a: any, b: any) => {
        const aNight = nightsCount > 0 ? toNum(a?.totalPrice) / nightsCount : toNum(a?.totalPrice);
        const bNight = nightsCount > 0 ? toNum(b?.totalPrice) / nightsCount : toNum(b?.totalPrice);
        return aNight - bNight;
      });
    } else if (sortBy === "price-high") {
      list.sort((a: any, b: any) => {
        const aNight = nightsCount > 0 ? toNum(a?.totalPrice) / nightsCount : toNum(a?.totalPrice);
        const bNight = nightsCount > 0 ? toNum(b?.totalPrice) / nightsCount : toNum(b?.totalPrice);
        return bNight - aNight;
      });
    }

    return list;
  }, [visibleRooms, selectedLayouts, sortBy, nightsCount]);

  //Search apply

  const applySearch = () => {
    if (!startDate || !endDate) return;
    const query = new URLSearchParams({
      startDate,
      endDate,
      adult: String(adults),
      child: String(children),
      infant: String(infants),
      pet: pet ? "yes" : "no",
      rooms: String(rooms),
    });
    router.push(`/calabogieresult?${query.toString()}`);
  };

  // render search

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[210px_minmax(0,1fr)_300px] gap-6 items-start">
        <aside className="order-1 lg:order-1 lg:sticky lg:top-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">Sort & Filter</h2>

            <div className="mt-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2">
                Sort by
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "recommended" | "price-low" | "price-high")}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900"
              >
                <option value="recommended">Recommended</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Cottage Type
                </label>
                <button
                  type="button"
                  className="text-xs text-[#05728f] hover:underline"
                  onClick={() => setSelectedLayouts([])}
                >
                  Clear
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-auto pr-1">
                {layoutOptions.length === 0 && (
                  <p className="text-xs text-gray-500">No layout options yet.</p>
                )}
                {layoutOptions.map((layout) => {
                  const checked = selectedLayouts.includes(layout);
                  return (
                    <label key={layout} className="flex items-start gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedLayouts((prev) =>
                            prev.includes(layout) ? prev.filter((x) => x !== layout) : [...prev, layout]
                          );
                        }}
                        className="mt-0.5"
                      />
                      <span>{layout}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        <div className="order-2 lg:order-2">
          <div className="mb-5">
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
              Search Results
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {loading
                ? "Checking current availability..."
                : `${filteredSortedRooms.length} layout${filteredSortedRooms.length === 1 ? "" : "s"} available`}
            </p>
          </div>

          {!loading && filteredSortedRooms.length === 0 && (
            <div className="mt-4">
              <div className="rounded-2xl border border-gray-200 p-6 text-center bg-white">
                <div className="text-lg font-semibold text-gray-900 mb-1">
                  {fetchError || "No available rooms for these dates."}
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  Try changing your dates, adjusting guest counts, or removing the
                  pet option.
                </div>
              </div>
            </div>
          )}

          {loading && (
            <p className="py-8 text-sm text-gray-700">Loading availability...</p>
          )}

          {!loading && filteredSortedRooms.length > 0 && (
            <div className="space-y-4">
              {filteredSortedRooms.map((room: any, i: number) => {
                if (
                  isPlaceholderRoom(room) ||
                  !isCalabogieListing(room) ||
                  roomTotalValue(room) <= 0 ||
                  !String(room?.roomTypeId ?? room?.RoomTypeId ?? room?.RoomTypeID ?? "").trim()
                ) {
                  return null;
                }

                const hotelName =
                  room.hotelName || room.hotelNameEN || room.RoomType || "Property";
                const layoutName = getLayoutName(room);
                const imgSrc = getHotelImage(hotelName, room);
                const slug = slugMap[hotelName] || dashedSlug(hotelName);
                const calabogieMeta = getCalabogieMeta(room);

                let meta: any = {};
                try {
                  // eslint-disable-next-line @typescript-eslint/no-var-requires
                  meta = require(`@/public/properties/${slug}/meta.json`);
                } catch {
                  meta = {};
                }

                const cardTitle = String(
                  calabogieMeta?.name ||
                    calabogieMeta?.hotelName ||
                    meta?.name ||
                    meta?.hotelName ||
                    layoutName
                ).trim();

                const shortDescription =
                  String(
                    calabogieMeta?.descriptionShort ??
                      calabogieMeta?.shortDescription ??
                      calabogieMeta?.description ??
                    meta?.ShortDescription ??
                      meta?.shortDescription ??
                      meta?.Description ??
                      meta?.description ??
                      "Private cottage stay with premium amenities and resort access."
                  ).trim() || "Private cottage stay with premium amenities and resort access.";
                const galleryImages = getCalabogieGalleryImages(room, calabogieMeta, imgSrc);

                const roomTotal = roomTotalValue(room);
                const petFee = toNum(room.petFeeAmount);
                const grandTotal = roomTotal + petFee;
                const nightlyRoomsOnly =
                  nightsCount > 0 ? roomTotal / nightsCount : roomTotal;
                const currency = room.currencyCode || "CAD";
                const minNights = Number(room?.minNights ?? 1);
                const isAvailableForRange = Object.values(room?.availability ?? {}).every(
                  (v) => Number(v) === 1
                );

                const hotelId = "CBE";
                const hotelNo = "CBE";

                const link = `/calabogie/hotel?hotelId=${encodeURIComponent(
                  hotelId
                )}&hotelNo=${encodeURIComponent(
                  hotelNo
                )}&roomTypeId=${encodeURIComponent(
                  room.roomTypeId || room.RoomTypeId || room.RoomTypeID || ""
                )}&roomTypeName=${encodeURIComponent(
                  room.roomTypeName || room.RoomType || layoutName
                )}&checkIn=${startDate}&checkOut=${endDate}&adult=${adults}&child=${children}&infant=${infants}&pet=${
                  pet ? "yes" : "no"
                }&rooms=${rooms}&total=${grandTotal}&petFee=${petFee}&currency=${currency}&name=${encodeURIComponent(
                  hotelName
                )}`;

                return (
                  <div
                    key={`${hotelId}-${room.roomTypeId || i}`}
                    className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 shadow-sm"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <button
                        type="button"
                        className="w-full md:w-[210px] h-40 md:h-[150px] relative rounded-xl overflow-hidden bg-gray-100 group"
                        onClick={() => {
                          if (!galleryImages.length) return;
                          setLightboxImages(galleryImages);
                          setLightboxTitle(cardTitle);
                          setLightboxIndex(0);
                          setLightboxOpen(true);
                        }}
                        aria-label={`Open ${cardTitle} photos`}
                      >
                        {imgSrc ? (
                          <Image
                            src={imgSrc}
                            alt={cardTitle}
                            fill
                            className="object-cover transition duration-200 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200" />
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2 text-left">
                          <span className="text-xs font-medium text-white">
                            View photos{galleryImages.length > 1 ? ` (${galleryImages.length})` : ""}
                          </span>
                        </div>
                      </button>
                      <div className="min-w-0 flex-1">
                          <h2 className="text-lg md:text-xl font-semibold text-gray-900">{cardTitle}</h2>
                        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                          {shortDescription}
                        </p>
                        {minNights > 1 && (
                          <p className="mt-2 text-xs text-gray-500">
                            Minimum stay: {minNights} nights
                          </p>
                        )}
                      </div>

                      <div className="md:text-right md:min-w-[220px]">
                        <div className="text-sm text-gray-700">Price per night</div>
                        <div className="text-2xl font-semibold text-gray-900">
                          {money(nightlyRoomsOnly)}
                        </div>
                        <div className="text-xs text-gray-500">{currency} / night (room only)</div>
                        <button
                          type="button"
                          onClick={() => {
                            if (isAvailableForRange) router.push(link);
                          }}
                          disabled={!isAvailableForRange}
                          className={`mt-4 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold ${
                            isAvailableForRange
                              ? "bg-[#15153E] text-white hover:brightness-110"
                              : "bg-gray-300 text-gray-600 cursor-not-allowed"
                          }`}
                        >
                          {isAvailableForRange ? "Reserve" : "Unavailable"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <aside className="order-3 lg:order-3 lg:sticky lg:top-6">
          <div className="w-full bg-white/35 backdrop-blur rounded-[1.25rem] md:rounded-[20px] shadow-xl border border-white/40 px-4 py-3 md:px-6 md:py-5">
            <div className="hidden lg:flex items-center gap-2 mb-4 text-[#05728f] uppercase tracking-wide text-[10px] font-semibold">
              <CalIcon className="w-3.5 h-3.5" />
              Date
            </div>

            <button
              type="button"
              className="w-full lg:hidden flex items-center justify-between rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-left"
              onClick={() => setShowMobileDatePanel((prev) => !prev)}
            >
              <span className="text-sm font-semibold text-[#2f2b3a]">Date & Guests</span>
              <span className="text-xs font-medium text-[#5a5568]">
                {showMobileDatePanel ? "Hide" : "Edit"}
              </span>
            </button>

            <div className={`${showMobileDatePanel || !isMobile ? "mt-3 space-y-3" : "hidden"}`}>
              <div ref={datesRef}>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1">
                  Check-in Date
                </label>
                <button
                  type="button"
                  onClick={() => setShowCal(true)}
                  className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-white"
                >
                  {checkIn ? fmtShort(checkIn) : "Add check-in date"}
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1">
                  Check-out Date
                </label>
                <button
                  type="button"
                  onClick={() => setShowCal(true)}
                  className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-white"
                >
                  {checkOut ? fmtShort(checkOut) : "Add check-out date"}
                </button>
              </div>

              <div ref={guestsRef}>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1">
                  Adults
                </label>
                <button
                  type="button"
                  onClick={() => setShowGuests(true)}
                  className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-white"
                >
                  {adults}
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1">
                  Children
                </label>
                <button
                  type="button"
                  onClick={() => setShowGuests(true)}
                  className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-white"
                >
                  {children}
                </button>
              </div>

              <button
                onClick={applySearch}
                disabled={!startDate || !endDate}
                className={`mt-5 w-full font-semibold px-6 py-3 rounded-full inline-flex items-center justify-center gap-2 transition ${
                  startDate && endDate
                    ? "bg-[#05728f] hover:brightness-95 text-white"
                    : "bg-[#05728f] text-white cursor-not-allowed"
                }`}
                type="button"
              >
                SEARCH
              </button>

              <p className="mt-2 text-xs text-gray-600">
                {nightsCount > 0
                  ? `${nightsCount} night${nightsCount > 1 ? "s" : ""} selected`
                  : "Select dates to see rates"}
              </p>
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-52 mx-auto max-w-4xl">
        <ImageCarousel compact />
      </div>

      {/* Guests popover (desktop) */}
      {mounted && !isMobile && showGuests && (
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setShowGuests(false)}
          />
          <div
            className="fixed z-[9999] bg-white border rounded-xl shadow-2xl p-3"
            style={{
              top: guestPos.top,
              left: guestPos.left,
              width: guestPos.width,
            }}
          >
            {[
              { label: "Rooms", value: rooms, setter: setRooms, min: 1, max: 8 },
              {
                label: "Adults (13+)",
                value: adults,
                setter: setAdults,
                min: 1,
                max: 10,
              },
              {
                label: "Children (3–12)",
                value: children,
                setter: setChildren,
                min: 0,
                max: 10,
              },
              {
                label: "Infants (0–2)",
                value: infants,
                setter: setInfants,
                min: 0,
                max: 10,
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between py-3 border-b last:border-b-0"
              >
                <div className="text-[15px] font-medium text-gray-900">
                  {row.label}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    className="w-8 h-8 rounded-full border text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                    onClick={() =>
                      step(
                        row.setter as any,
                        row.value as number,
                        -1,
                        (row as any).min,
                        (row as any).max
                      )
                    }
                    disabled={(row.value as number) <= (row as any).min}
                  >
                    −
                  </button>
                  <div className="w-5 text-center">{row.value}</div>
                  <button
                    className="w-8 h-8 rounded-full border text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                    onClick={() =>
                      step(
                        row.setter as any,
                        row.value as number,
                        +1,
                        (row as any).min,
                        (row as any).max
                      )
                    }
                    disabled={(row.value as number) >= (row as any).max}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between py-3 border-t mt-2">
              <div className="text-[15px] font-medium text-gray-900">
                Bringing a pet?
              </div>
              <select
                value={pet ? "yes" : "no"}
                onChange={(e) => setPet(e.target.value === "yes")}
                className="border rounded-lg px-2 py-1 text-sm"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
                onClick={() => setShowGuests(false)}
              >
                Close
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-[#F05A28] text-white text-sm hover:brightness-95"
                onClick={() => setShowGuests(false)}
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}

      {/* Desktop calendar overlay */}
      {mounted && showCal && !isMobile && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          <div
            className="absolute inset-0 bg-black/40 pointer-events-auto"
            onClick={() => setShowCal(false)}
          />
          <div
            className="absolute pointer-events-none"
            style={{ top: calPos.top, left: calPos.left }}
          >
            <div
              className="relative z-[100000] text-gray-700 bg-white border rounded-2xl shadow-2xl p-4 w-[860px] pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <button
                  className="px-3 py-1 rounded-lg border hover:bg-gray-50"
                  onClick={() =>
                    setViewMonth(
                      new Date(
                        viewMonth.getFullYear(),
                        viewMonth.getMonth() - 1,
                        1
                      )
                    )
                  }
                >
                  Prev
                </button>
              <div className="flex items-center gap-8">
                  <div className="text-base font-semibold text-gray-900">
                    {format(leftMonth, "MMMM yyyy")}
                  </div>
                  <div className="text-base font-semibold text-gray-900">
                    {format(rightMonth, "MMMM yyyy")}
                  </div>
                </div>
                <button
                  className="px-3 py-1 rounded-lg border hover:bg-gray-50"
                  onClick={() =>
                    setViewMonth(
                      new Date(
                        viewMonth.getFullYear(),
                        viewMonth.getMonth() + 1,
                        1
                      )
                    )
                  }
                >
                  Next
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {[leftDays, rightDays].map((days, idx) => (
                  <div key={idx}>
                    <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-1">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                        (d) => (
                          <div key={d} className="py-1">
                            {d}
                          </div>
                        )
                      )}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {days.map(({ date, currentMonth }, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-center"
                        >
                          <DayCell d={date} muted={!currentMonth} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mt-3">
                <button
                  className="text-sm text-gray-700 hover:underline"
                  onClick={() => {
                    setCheckIn(null);
                    setCheckOut(null);
                  }}
                >
                  Reset
                </button>
                <div className="text-sm text-gray-600">
                  {checkIn && !checkOut && "Select a check-out date"}
                  {checkIn &&
                    checkOut &&
                    `${nightsCount} night${
                      nightsCount > 1 ? "s" : ""
                    } selected`}
                  {!checkIn && !checkOut && "Select a check-in date"}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="text-sm px-4 py-2 rounded-lg border hover:bg-gray-50"
                    onClick={() => setShowCal(false)}
                  >
                    Close
                  </button>
                  <button
                    disabled={!checkIn || !checkOut}
                    className={`text-sm px-4 py-2 rounded-full text-white ${
                      checkIn && checkOut
                        ? "bg-[#111]"
                        : "bg-gray-300 cursor-not-allowed"
                    }`}
                    onClick={() => setShowCal(false)}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile calendar bottom sheet */}
      {mounted && showCal && isMobile && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          <div
            className="absolute inset-0 bg-black/40 pointer-events-auto"
            onClick={() => setShowCal(false)}
          />
          <div
            className="absolute inset-x-0 bottom-0 max-h-[92vh] bg-white rounded-t-2xl shadow-2xl p-4
              animate-[slideup_200ms_ease-out] overflow-y-auto pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <style>{`@keyframes slideup{from{transform:translateY(12px);opacity:.95}to{transform:translateY(0);opacity:1}}`}</style>
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-semibold">Select dates</div>
              <button
                className="text-sm px-3 py-1 rounded-lg border hover:bg-gray-50"
                onClick={() => setShowCal(false)}
              >
                Close
              </button>
            </div>

            <div className="flex items-center justify-between mb-2">
              <button
                className="px-3 py-1 rounded-lg border hover:bg-gray-50"
                onClick={() =>
                  setViewMonth(
                    new Date(
                      viewMonth.getFullYear(),
                      viewMonth.getMonth() - 1,
                      1
                    )
                  )
                }
              >
                Prev
              </button>
              <div className="text-base font-semibold text-gray-900">
                {format(leftMonth, "MMMM yyyy")}
              </div>
              <button
                className="px-3 py-1 rounded-lg border hover:bg-gray-50"
                onClick={() =>
                  setViewMonth(
                    new Date(
                      viewMonth.getFullYear(),
                      viewMonth.getMonth() + 1,
                      1
                    )
                  )
                }
              >
                Next
              </button>
            </div>

            <div className="grid grid-cols-7 text-center text-xs text-gray-900 mb-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 mb-3">
              {leftDays.map(({ date, currentMonth }, i) => (
                <div key={i} className="flex items-center justify-center">
                  <DayCell d={date} muted={!currentMonth} />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button
                className="text-sm text-gray-700 hover:underline"
                onClick={() => {
                  setCheckIn(null);
                  setCheckOut(null);
                }}
              >
                Reset
              </button>
              <div className="text-sm text-black mx-auto">
                {checkIn && !checkOut && "Select a check-out date"}
                {checkIn &&
                  checkOut &&
                  `${nightsCount} night${
                    nightsCount > 1 ? "s" : ""
                  } selected`}
                {!checkIn && !checkOut && "Select a check-in date"}
              </div>
              <button
                disabled={!checkIn || !checkOut}
                className={`text-sm px-4 py-2 rounded-full text-white ${
                  checkIn && checkOut
                    ? "bg-[#111]"
                    : "bg-gray-300 cursor-not-allowed"
                }`}
                onClick={() => setShowCal(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxOpen && lightboxImages.length > 0 && (
        <div className="fixed inset-0 z-[10050] bg-black/90 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute top-4 right-4 rounded-full bg-white/15 hover:bg-white/25 text-white w-10 h-10 text-xl"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close photos"
          >
            x
          </button>
          <button
            type="button"
            className="absolute left-4 md:left-6 rounded-full bg-white/15 hover:bg-white/25 text-white w-10 h-10 text-xl"
            onClick={() =>
              setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length)
            }
            aria-label="Previous photo"
          >
            {"<"}
          </button>
          <div className="w-full max-w-5xl">
            <div className="relative w-full h-[60vh] md:h-[70vh] bg-black rounded-2xl overflow-hidden">
              <Image
                src={lightboxImages[lightboxIndex]}
                alt={`${lightboxTitle} photo ${lightboxIndex + 1}`}
                fill
                className="object-contain"
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-white">
              <div className="text-sm md:text-base font-medium">{lightboxTitle}</div>
              <div className="text-xs md:text-sm text-white/80">
                {lightboxIndex + 1} / {lightboxImages.length}
              </div>
            </div>
            {lightboxImages.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {lightboxImages.map((src, idx) => (
                  <button
                    key={`${src}-${idx}`}
                    type="button"
                    onClick={() => setLightboxIndex(idx)}
                    className={`relative h-16 w-24 rounded-lg overflow-hidden border ${
                      idx === lightboxIndex ? "border-white" : "border-white/30"
                    }`}
                  >
                    <Image src={src} alt={`${lightboxTitle} thumbnail ${idx + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            className="absolute right-4 md:right-6 rounded-full bg-white/15 hover:bg-white/25 text-white w-10 h-10 text-xl"
            onClick={() =>
              setLightboxIndex((prev) => (prev + 1) % lightboxImages.length)
            }
            aria-label="Next photo"
          >
            {">"}
          </button>
        </div>
      )}

      <style>{`@keyframes slideup{from{transform:translateY(12px);opacity:.95}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}


