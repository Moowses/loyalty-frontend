"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
} from "date-fns";

/* --- small icons, same style as main search --- */
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

function CalabogieSearchBar() {
  const router = useRouter();

  /* ---- dates ---- */
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);

  /* ---- guests ---- */
  const [rooms, setRooms] = useState(1);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [pet, setPet] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setMounted(true);
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* ---- calendar ---- */
  const [showCal, setShowCal] = useState(false);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [calPos, setCalPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!showCal || !triggerRef.current || isMobile) return;
    const calc = () => {
      const r = triggerRef.current!.getBoundingClientRect();
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

  const [viewMonth, setViewMonth] = useState(startOfMonth(new Date()));

  type Day = { date: Date; currentMonth: boolean };
  const buildMonth = (monthStart: Date): Day[] => {
    const gridStart = startOfWeek(startOfMonth(monthStart), {
      weekStartsOn: 0,
    });
    const days: Day[] = [];
    let cur = gridStart;
    for (let i = 0; i < 42; i++) {
      days.push({ date: cur, currentMonth: isSameMonth(cur, monthStart) });
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
    }
    return days;
  };

  const leftMonth = viewMonth;
  const rightMonth = addMonths(viewMonth, 1);
  const leftDays = buildMonth(leftMonth);
  const rightDays = buildMonth(rightMonth);

  const disabledPast = (d: Date) =>
    isBefore(d, new Date(new Date().setHours(0, 0, 0, 0)));

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
        setTimeout(() => {
          setShowCal(false);
        }, 120);
      }
    }
  };

  const DayCell = ({
    d,
    muted = false,
  }: {
    d: Date;
    muted?: boolean;
  }) => {
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

  const nights = useMemo(
    () =>
      checkIn && checkOut
        ? Math.max(1, differenceInCalendarDays(checkOut, checkIn))
        : 0,
    [checkIn, checkOut]
  );
  const fmtShort = (d?: Date | null) =>
    d ? format(d, "EEE, MMM d") : "Add dates";
  const fmtParam = (d: Date) => format(d, "yyyy-MM-dd");

  /* ---- guests popover ---- */
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

  // Fixed Calabogie coords (for future use / query string)
 const place = "Calabogie Highlands";
  const lat = 45.294288;
  const lng = -76.7453235;

  const handleSearch = () => {
    if (!checkIn || !checkOut) return;

      const params: Record<string, string> = {
        startDate: fmtParam(checkIn),
        endDate: fmtParam(checkOut),
        adult: String(adults),
        child: String(children),
        infant: String(infants),
        pet: pet ? "yes" : "no",
        rooms: String(rooms),
        place: place,          // 🔹 NEW
        lat: String(lat),
        lng: String(lng),
      };

    router.push(`/calabogieresult?${new URLSearchParams(params).toString()}`);
  };

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-4xl bg-white/95 backdrop-blur rounded-[1.25rem] md:rounded-[20px] shadow-xl border border-gray-200 px-4 py-4 md:px-6 md:py-4 h-[95px]">
        {/* Desktop */}
        {!isMobile ? (
          <div className="flex items-center gap-4">
            {/* Dates */}
            <div className="flex-1" ref={triggerRef}>
              <button
                className="w-full text-left"
                onClick={() => setShowCal(true)}
                type="button"
              >
                <div className="flex items-center gap-2 text-black uppercase tracking-wide text-[10px] font-semibold mb-1">
                  <CalIcon className="w-3.5 h-3.5 text-[#05728f]" />
                  {nights > 0
                    ? `${nights} Night${nights > 1 ? "s" : ""}`
                    : "Dates"}
                </div>
                <div className="text-lg md:text-[16px] font-semibold text-[#000000]">
                  {checkIn ? fmtShort(checkIn) : "Add dates"}{" "}
                  {checkOut && (
                    <>
                      <span className="mx-1 text-black"></span>
                      {fmtShort(checkOut)}
                    </>
                  )}
                </div>
              </button>
            </div>

            <div className="hidden md:block w-px self-stretch bg-gray-200" />

            {/* Guests */}
            <div className="flex-1" ref={guestsRef}>
              <button
                type="button"
                onClick={() => setShowGuests(true)}
                className="w-full text-left"
              >
                <div className="flex items-center gap-2 text-black uppercase tracking-wide text-[10px] font-semibold mb-1">
                  <UsersIcon className="w-4 h-4 text-[#05728f]" />
                  Rooms & Guests
                </div>
                <div className="text-lg md:text-[16px] font-medium text-gray-900">
                  {summaryLabel}
                </div>
              </button>
            </div>

            {/* Search button */}
            <button
              onClick={handleSearch}
              disabled={!checkIn || !checkOut}
              className={`w-full md:w-auto font-semibold px-6 py-3 md:px-8 md:py-3 rounded-full inline-flex items-center justify-center gap-2 transition ${
                checkIn && checkOut
                  ? "bg-[#05728f] hover:brightness-95 text-white"
                  : "bg-[#05728f] text-white cursor-not-allowed"
              }`}
              type="button"
            >
              SEARCH
            </button>
          </div>
        ) : (
          /* Mobile – simple stacked layout */
          <div className="flex flex-col gap-3">
            {/* Dates button */}
            <button
              type="button"
              className="w-full flex items-center bg-white border border-gray-300 rounded-xl overflow-hidden shadow-sm"
              onClick={() => setShowCal(true)}
            >
              <div className="flex-1 px-4 py-3 text-left">
                <div className="flex items-center gap-1 text-[10px] uppercase font-semibold tracking-wide text-[#05728f]">
                  <CalIcon className="w-3.5 h-3.5" /> Dates
                </div>
                <div className="text-sm font-medium text-gray-900 truncate">
                  {checkIn && checkOut
                    ? `${fmtShort(checkIn)} - ${fmtShort(checkOut)}`
                    : "Add dates"}
                </div>
              </div>
            </button>

            {/* Guests button */}
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
              onClick={handleSearch}
              disabled={!checkIn || !checkOut}
              className={`w-full font-semibold px-6 py-4 rounded-full ${
                checkIn && checkOut
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
      {mounted &&
        !isMobile &&
        showGuests &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[99998]"
              onClick={() => setShowGuests(false)}
            />
            <div
              className="fixed z-[99999] bg-white border rounded-xl shadow-2xl p-3"
              style={{
                top: guestPos.top,
                left: guestPos.left,
                width: guestPos.width,
              }}
            >
              {[
                {
                  label: "Rooms",
                  value: rooms,
                  setter: setRooms,
                  min: 1,
                  max: 8,
                },
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
                  className="px-4 py-2 rounded-lg bg-[#05728f] text-white text-sm hover:brightness-95"
                  onClick={() => setShowGuests(false)}
                >
                  Apply
                </button>
              </div>
            </div>
          </>,
          document.body
        )}

      {/* Calendar (desktop + mobile) */}
      {mounted &&
        showCal &&
        createPortal(
          <div className="fixed inset-0 z-[99999] pointer-events-none">
            <div
              className="absolute inset-0 bg-black/40 pointer-events-auto"
              onClick={() => setShowCal(false)}
            />
            {!isMobile ? (
              // Desktop floating 2-month calendar
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
                          {[
                            "Sun",
                            "Mon",
                            "Tue",
                            "Wed",
                            "Thu",
                            "Fri",
                            "Sat",
                          ].map((d) => (
                            <div key={d} className="py-1">
                              {d}
                            </div>
                          ))}
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
                        `${nights} night${nights > 1 ? "s" : ""} selected`}
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
                            ? "bg-[#05728f]"
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
            ) : (
              // Mobile bottom-sheet calendar
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
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (d) => (
                      <div key={d} className="py-1">
                        {d}
                      </div>
                    )
                  )}
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
                      `${nights} night${nights > 1 ? "s" : ""} selected`}
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
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

export default function CalabogieSearchPage() {
  useEffect(() => {
    const htmlPrev = document.documentElement.style.background;
    const bodyPrev = document.body.style.background;
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = htmlPrev;
      document.body.style.background = bodyPrev;
    };
  }, []);

  return (
    <div className="bg-transparent min-h-[120px] flex items-center justify-center px-3">
      <CalabogieSearchBar />
      <style>{`@keyframes slideup{from{transform:translateY(12px);opacity:.95}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}