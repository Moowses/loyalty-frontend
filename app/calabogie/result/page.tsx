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

// Hard-coded center – same as working main /results link
const CALABOGIE_LAT = 45.0707532;
const CALABOGIE_LNG = -78.0267908;

//icons

const CalIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" strokeWidth="2" />
    <path d="M16 3v4M8 3v4M3 11h18" strokeWidth="2" />
  </svg>
);

const UsersIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeWidth="2" />
    <circle cx="9" cy="7" r="4" strokeWidth="2" />
    <path d="M22 21v-2a4 4 0 00-3-3.87" strokeWidth="2" />
    <path d="M16 3.13a4 4 0 010 7.75" strokeWidth="2" />
  </svg>
);

function dashedSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function condensedSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
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

function getHotelImage(name?: string) {
  if (!name) return "";
  const exact = slugMap[name];
  if (exact) return `/properties/${exact}/hero.png`;
  const dashed = dashedSlug(name);
  const _condensed = condensedSlug(name);
  return `/properties/${dashed}/hero.png`;
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

function safeArrayData(j: any): any[] | null {
  if (!j) return null;

  let root: any = j;


  if (root && typeof root === "object" && "data" in root) {
    root = root.data;
  }
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
  const id = String(room?.roomTypeId ?? room?.RoomTypeId ?? "").trim();
  if (!id) return true;
  const total = Number(room?.totalPrice ?? room?.dailyPrices ?? 0);
  if (!Number.isFinite(total) || total <= 0) return true;
  return false;
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

  const qpStart = searchParams.get("startDate") || "";
  const qpEnd = searchParams.get("endDate") || "";
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

  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const nights = useMemo(
    () =>
      checkIn && checkOut
        ? Math.max(1, differenceInCalendarDays(checkOut, checkIn))
        : 0,
    [checkIn, checkOut]
  );

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

  const summaryLabel = `${rooms} ${
    rooms > 1 ? "Rooms" : "Room"
  } • ${adults} ${adults > 1 ? "Adults" : "Adult"} • ${children} ${
    children === 1 ? "Child" : "Children"
  }${infants > 0 ? ` • ${infants} Infant${infants > 1 ? "s" : ""}` : ""}${
    pet ? " • Pet" : ""
  }`;

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
        // IMPORTANT: always use hard-coded lat/lng
        lat: String(CALABOGIE_LAT),
        lng: String(CALABOGIE_LNG),
      });

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/booking/availability?${qs.toString()}`
        );
        const j = await res.json();
        const arr = safeArrayData(j);

        if (arr === null) {
          setAvailableRooms([]);
          setFetchError(
            "No available rooms for these dates in this area. Try changing your dates."
          );
        } else {
          const filtered = arr.filter((x: any) => !isPlaceholderRoom(x));
          if (!filtered.length) {
            setAvailableRooms([]);
            setFetchError(
              "No available rooms for these dates nearby. Try changing your dates."
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
    () => (availableRooms || []).filter((r) => !isPlaceholderRoom(r)),
    [availableRooms]
  );

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
      lat: String(CALABOGIE_LAT),
      lng: String(CALABOGIE_LNG),
    });
    router.push(`/calabogie/result?${query.toString()}`);
  };

  // render search  

  const nightsCount =
    checkIn && checkOut
      ? Math.max(1, differenceInCalendarDays(checkOut, checkIn))
      : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
      {/* Search pill – same overall style as main results, but no location field */}
      <div className="w-full bg-white rounded-[25px] shadow-xl border border-gray-200 px-4 py-3 md:px-6 md:py-4 mb-6">
        {!isMobile ? (
          <div className="flex items-center gap-4">
            {/* Dates */}
            <div className="flex-1" ref={datesRef}>
              <div className="flex items-center gap-2 text-black uppercase tracking-wide text-[10px] font-semibold mb-1">
                <CalIcon className="w-3.5 h-3.5 text-[#F05A28]" />
                {nightsCount > 0
                  ? `${nightsCount} Night${nightsCount > 1 ? "s" : ""}`
                  : "Dates"}
              </div>
              <button
                className="w-full text-left"
                onClick={() => setShowCal(true)}
                type="button"
              >
                <div className="text-lg md:text-[16px] font-semibold text-gray-900">
                  {checkIn ? fmtShort(checkIn) : "Add dates"}{" "}
                  <span className="mx-1 text-gray-500"></span>
                  {checkOut ? fmtShort(checkOut) : ""}
                </div>
              </button>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px self-stretch bg-gray-200" />

            {/* Guests */}
            <div className="flex-1" ref={guestsRef}>
              <button
                type="button"
                onClick={() => setShowGuests(true)}
                className="w-full text-left"
              >
                <div className="flex items-center gap-2 text-black uppercase tracking-wide text-[10px] font-semibold mb-1">
                  <UsersIcon className="w-4 h-4 text-[#F05A28]" />
                  Rooms & Guests
                </div>
                <div className="text-lg md:text-[16px] font-medium text-gray-900">
                  {summaryLabel}
                </div>
              </button>
            </div>

            {/* Search button */}
            <button
              onClick={applySearch}
              disabled={!startDate || !endDate}
              className={`w-full md:w-auto font-semibold px-6 py-3 md:px-8 md:py-3 rounded-full inline-flex items-center justify-center gap-2 transition ${
                startDate && endDate
                  ? "bg-[#F05A28] hover:brightness-95 text-white"
                  : "bg-[#F05A28] text-white cursor-not-allowed"
              }`}
              type="button"
            >
              SEARCH
            </button>
          </div>
        ) : (
          // Mobile: stacked
          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="w-full flex items-center bg-white border border-gray-300 rounded-xl overflow-hidden shadow-sm"
              onClick={() => setShowCal(true)}
            >
              <div className="flex-1 px-4 py-3 text-left">
                <div className="flex items-center gap-1 text-[10px] uppercase font-semibold tracking-wide text-[#F05A28]">
                  <CalIcon className="w-3.5 h-3.5" /> Dates
                </div>
                <div className="text-sm font-medium text-gray-900 truncate">
                  {checkIn && checkOut
                    ? `${fmtShort(checkIn)} - ${fmtShort(checkOut)}`
                    : "Add dates"}
                </div>
              </div>
            </button>

            <button
              type="button"
              className="w-full flex items-center bg-white border border-gray-300 rounded-xl overflow-hidden shadow-sm"
              onClick={() => setShowGuests(true)}
            >
              <div className="flex-1 px-4 py-3 text-left">
                <div className="flex items-center gap-1 text-[10px] uppercase font-semibold tracking-wide text-[#F05A28]">
                  <UsersIcon className="w-3.5 h-3.5" /> Rooms & Guests
                </div>
                <div className="text-sm font-medium text-gray-900 truncate">
                  {summaryLabel}
                </div>
              </div>
            </button>

            <button
              onClick={applySearch}
              disabled={!startDate || !endDate}
              className={`w-full font-semibold px-6 py-4 rounded-full ${
                startDate && endDate
                  ? "bg-[#F05A28] text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
              type="button"
            >
              SEARCH
            </button>
          </div>
        )}
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

      {/* Empty state + carousel */}
      {!loading && visibleRooms.length === 0 && (
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

          <div className="mt-6">
            <ImageCarousel />
          </div>
        </div>
      )}

      {loading && (
        <p className="py-8 text-sm text-gray-700">Loading availability…</p>
      )}

      {/* Results list – same card style as main results */}
      {!loading && visibleRooms.length > 0 && (
        <div className="mt-6 space-y-6">
          {visibleRooms.map((room: any, i: number) => {
            if (
              isPlaceholderRoom(room) ||
              Number(room?.totalPrice ?? 0) <= 0 ||
              !String(room?.roomTypeId ?? "").trim()
            ) {
              return null;
            }

            const hotelName =
              room.hotelName || room.hotelNameEN || room.RoomType || "Property";
            const imgSrc = getHotelImage(hotelName);

            const roomTotal = toNum(room.totalPrice);
            const petFee = toNum(room.petFeeAmount);
            const grandTotal = roomTotal + petFee;
            const nightlyRoomsOnly =
              nightsCount > 0 ? roomTotal / nightsCount : roomTotal;

            const hero = imgSrc;
            const slug = hero
              ? hero.replace(/^\/properties\/|\/hero\.png$/g, "")
              : "";

            let meta: any = {};
            try {
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              meta = require(`@/public/properties/${slug}/meta.json`);
            } catch {
              meta = {};
            }

            const address = meta?.Address ?? meta?.address ?? null;
            const minNights = Number(room?.minNights ?? 1);
            const currency = room.currencyCode || "CAD";

            const hotelId =
              room.hotelId || room.RoomTypeId || room.RoomTypeID || room.roomTypeId;
            const hotelNo = room.hotelNo || room.hotelCode || "";

            const link = `/hotel/${hotelId}?hotelId=${encodeURIComponent(
              hotelId
            )}&hotelNo=${encodeURIComponent(
              hotelNo
            )}&roomTypeId=${encodeURIComponent(
              room.roomTypeId || ""
            )}&checkIn=${startDate}&checkOut=${endDate}&adult=${adults}&child=${children}&infant=${infants}&pet=${
              pet ? "yes" : "no"
            }&total=${grandTotal}&petFee=${petFee}&currency=${currency}&lat=${CALABOGIE_LAT}&lng=${CALABOGIE_LNG}&name=${encodeURIComponent(
              hotelName
            )}`;

            return (
              <div
                key={`${hotelId}-${room.roomTypeId || i}`}
                className="flex flex-col md:flex-row gap-4 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm"
              >
                {/* Image */}
                <div className="md:w-64 relative h-52 md:h-auto">
                  {imgSrc ? (
                    <Image
                      src={imgSrc}
                      alt={hotelName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-between p-4 md:p-5 gap-3">
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <h2 className="text-base md:text-lg font-semibold text-gray-900">
                        {hotelName}
                      </h2>
                    </div>
                    {address && (
                      <p className="text-xs text-gray-500 mb-1">{address}</p>
                    )}
                    {minNights > 1 && (
                      <p className="text-[11px] text-gray-500">
                        Minimum stay: {minNights} nights
                      </p>
                    )}
                  </div>

                  {/* Price & CTA */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="text-sm text-gray-800">
                      <div className="font-semibold">
                        {money(nightlyRoomsOnly)}{" "}
                        <span className="text-xs font-normal text-gray-500">
                          {currency} / night (room only)
                        </span>
                      </div>
                      {petFee > 0 && (
                        <div className="text-xs text-gray-500">
                          + {money(petFee)} pet fee per stay
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        Est. total:{" "}
                        <span className="font-semibold">
                          {money(grandTotal)} {currency}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <button
                        type="button"
                        onClick={() => router.push(link)}
                        className="inline-flex items-center justify-center rounded-full bg-[#15153E] text-white px-5 py-2.5 text-sm font-semibold hover:brightness-110"
                      >
                        View rates
                      </button>
                      <div className="text-[11px] text-gray-500">
                        Fully managed by Dream Trip Club
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes slideup{from{transform:translateY(12px);opacity:.95}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}