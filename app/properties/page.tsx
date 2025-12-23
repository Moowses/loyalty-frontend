"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createPortal } from "react-dom";
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

type PropertyItem = {
  hotelId: string;       
  hotelNo?: string;      
  propertyName: string;
  address?: string;
  description?: string;
};

type DayCellT = { date: Date; currentMonth: boolean };

const PinIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-4.35 7-10a7 7 0 10-14 0c0 5.65 7 10 7 10z" />
    <circle cx="12" cy="11" r="2" strokeWidth="2" />
  </svg>
);
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

// slug helpers
function dashedSlug(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function condensedSlug(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}
function getHeroImg(propertyName: string) {
  // direct path under public/properties/<slug>/hero.png
  return `/properties/${dashedSlug(propertyName)}/hero.png`;
}
function fmtParam(d: Date) {
  return format(d, "yyyy-MM-dd");
}

//Page component
export default function PropertiesPage() {
  const [all, setAll] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // search
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"name-asc" | "name-desc">("name-asc");

  // dates + guests
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);

  const [rooms, setRooms] = useState<number>(1);
  const [adults, setAdults] = useState<number>(1);
  const [children, setChildren] = useState<number>(0);
  const [infants, setInfants] = useState<number>(0);
  const [pet, setPet] = useState<boolean>(false);

  // responsive
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  
  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErr("");

        const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
        const url = `${base}/api/properties/list`;

        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();

        // expected shape: { ok: true, properties: [...] }
        const list: PropertyItem[] = Array.isArray(json) ? json : json.properties ?? [];
        setAll(list);
      } catch (e: any) {
        setErr(e?.message || "Failed to load properties");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = needle
      ? all.filter((p) => (p.propertyName || "").toLowerCase().includes(needle))
      : [...all];

    list.sort((a, b) => {
      const A = (a.propertyName || "").toLowerCase();
      const B = (b.propertyName || "").toLowerCase();
      return sort === "name-asc" ? A.localeCompare(B) : B.localeCompare(A);
    });

    return list;
  }, [all, q, sort]);

  /*Calendar popover */
  const [showCal, setShowCal] = useState(false);
  const calTriggerRef = useRef<HTMLDivElement | null>(null);
  const [calPos, setCalPos] = useState({ top: 0, left: 0 });
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(new Date()));

  useLayoutEffect(() => {
    if (!showCal || !calTriggerRef.current || isMobile) return;
    const calc = () => {
      const r = calTriggerRef.current!.getBoundingClientRect();
      setCalPos({ top: r.bottom + 8, left: Math.max(8, Math.min(r.left, window.innerWidth - 860)) });
    };
    calc();
    window.addEventListener("scroll", calc, true);
    window.addEventListener("resize", calc);
    return () => {
      window.removeEventListener("scroll", calc, true);
      window.removeEventListener("resize", calc);
    };
  }, [showCal, isMobile]);

  const buildMonth = (monthStart: Date): DayCellT[] => {
    const gridStart = startOfWeek(startOfMonth(monthStart), { weekStartsOn: 0 });
    const days: DayCellT[] = [];
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

  const disabledPast = (d: Date) => isBefore(d, new Date(new Date().setHours(0, 0, 0, 0)));
  const inRange = (d: Date) =>
    checkIn && checkOut ? isWithinInterval(d, { start: checkIn, end: checkOut }) : false;
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
    }
  };

  const nights = useMemo(
    () => (checkIn && checkOut ? Math.max(1, differenceInCalendarDays(checkOut, checkIn)) : 0),
    [checkIn, checkOut]
  );

  const fmtShort = (d?: Date | null) => (d ? format(d, "EEE, MMM d") : "Add dates");

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
          "h-10 w-10 text-sm flex items-center justify-center rounded-full transition",
          muted ? "text-gray-300" : "text-gray-800",
          between ? "bg-blue-100" : "",
          selectedStart || selectedEnd ? "bg-[#111] text-white font-semibold" : "hover:bg-gray-100",
          disabled ? "opacity-40 cursor-not-allowed hover:bg-transparent" : "",
        ].join(" ")}
        aria-label={format(d, "PPP")}
      >
        {format(d, "d")}
      </button>
    );
  };

  //
  const [showGuests, setShowGuests] = useState(false);
  const guestsRef = useRef<HTMLDivElement | null>(null);
  const [guestPos, setGuestPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!showGuests || !guestsRef.current || isMobile) return;
    const calc = () => {
      const r = guestsRef.current!.getBoundingClientRect();
      setGuestPos({ top: r.bottom + 8, left: Math.max(8, Math.min(r.left, window.innerWidth - 380)) });
    };
    calc();
    window.addEventListener("scroll", calc, true);
    window.addEventListener("resize", calc);
    return () => {
      window.removeEventListener("scroll", calc, true);
      window.removeEventListener("resize", calc);
    };
  }, [showGuests, isMobile]);

  const step = (setter: (n: number) => void, cur: number, delta: number, min: number, max: number) =>
    setter(Math.min(max, Math.max(min, cur + delta)));

  const summaryLabel = `${rooms} ${rooms > 1 ? "Rooms" : "Room"} • ${adults} ${
    adults > 1 ? "Adults" : "Adult"
  } • ${children} ${children !== 1 ? "Children" : "Child"}${infants > 0 ? ` • ${infants} Infant${infants > 1 ? "s" : ""}` : ""}${
    pet ? " • Pet" : ""
  }`;

  const canSearch = !!checkIn && !!checkOut;

  // Gallery modal 
  const [showPhotos, setShowPhotos] = useState(false);
  const [activeTitle, setActiveTitle] = useState("");
  const [activeSlugDashed, setActiveSlugDashed] = useState("");
  const [activeSlugCondensed, setActiveSlugCondensed] = useState("");
  const [activeGallery, setActiveGallery] = useState<string[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

  const openGallery = async (propertyName: string) => {
    const sDashed = dashedSlug(propertyName);
    const sCondensed = condensedSlug(propertyName);

    setActiveTitle(propertyName);
    setActiveSlugDashed(sDashed);
    setActiveSlugCondensed(sCondensed);
    setGalleryLoading(true);

    // fallback if meta.json doesn't exist
    let gallery = ["hero.png", "1.png", "2.png", "3.png", "4.png", "5.png"];

    const candidates = [`/properties/${sDashed}/meta.json`, `/properties/${sCondensed}/meta.json`];

    for (const url of candidates) {
      try {
        const r = await fetch(url, { cache: "no-store" });
        if (r.ok) {
          const meta = await r.json();

          const g =
            (Array.isArray(meta?.gallery) && meta.gallery) ||
            (Array.isArray(meta?.photos) && meta.photos) ||
            (Array.isArray(meta?.images) && meta.images);

          if (Array.isArray(g) && g.length) {
            gallery = g;
          }
          break;
        }
      } catch {
        // ignore and fallback
      }
    }

    setActiveGallery(gallery);
    setShowPhotos(true);
    setGalleryLoading(false);
  };

  const gallerySrc = (f: string) => {
    // if meta.json stores full paths, use them as-is
    if (f.startsWith("/")) return f;
    if (f.startsWith("http")) return f;
    return `/properties/${activeSlugDashed}/${f}`;
  };
  const galleryFallbackSrc = (f: string) => {
    if (f.startsWith("/")) return f;
    if (f.startsWith("http")) return f;
    return `/properties/${activeSlugCondensed}/${f}`;
  };

  /*Build hotel URL*/
  const buildHotelUrl = (p: PropertyItem) => {
    const hotelNo = p.hotelNo || ""; 
    const params = new URLSearchParams({
      hotelId: p.hotelId,
      hotelNo: hotelNo || p.hotelId,                 
      roomTypeId: p.hotelId,                  // per your current rule
      checkIn: fmtParam(checkIn!),
      checkOut: fmtParam(checkOut!),
      adult: String(adults),
      child: String(children),
      infant: String(infants),
      pet: pet ? "yes" : "no",
      name: p.propertyName,
    });

    return `/hotel/${p.hotelId}?${params.toString()}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
      {/*Search Bar */}
      <div className="w-full flex justify-center mb-8">
        <div className="w-full max-w-7xl bg-white/95 backdrop-blur rounded-[20px] shadow-xl border border-gray-200 px-4 py-4 md:px-6 md:py-4">
          {!isMobile ? (
            <div className="flex items-center gap-4">
              {/* Property */}
              <div className="flex-1 min-w-[220px]">
                <div className="flex items-center gap-2 text-black uppercase tracking-wide text-[10px] font-semibold mb-1">
                  <PinIcon className="w-3.5 h-3.5 text-[#F05A28]" /> Property
                </div>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search property…"
                  className="w-full text-left text-lg md:text-[18px] font-semibold text-black bg-transparent outline-none"
                />
              </div>

              <div className="hidden md:block w-px self-stretch bg-gray-200" />

              {/* Dates */}
              <div className="flex-1" ref={calTriggerRef}>
                <button type="button" className="w-full text-left" onClick={() => setShowCal(true)}>
                  <div className="flex items-center gap-2 text-black uppercase tracking-wide text-[10px] font-semibold mb-1">
                    <CalIcon className="w-3.5 h-3.5 text-[#F05A28]" /> {nights > 0 ? `${nights} Night${nights > 1 ? "s" : ""}` : "Dates"}
                  </div>
                  <div className="text-lg md:text-[16px] font-semibold text-black">
                    {checkIn ? fmtShort(checkIn) : "Add dates"}
                    {checkOut ? ` – ${fmtShort(checkOut)}` : ""}
                  </div>
                </button>
              </div>

              <div className="hidden md:block w-px self-stretch bg-gray-200" />

              {/* Guests */}
              <div className="flex-1" ref={guestsRef}>
                <button type="button" onClick={() => setShowGuests(true)} className="w-full text-left">
                  <div className="flex items-center gap-2 text-black uppercase tracking-wide text-[10px] font-semibold mb-1">
                    <UsersIcon className="w-4 h-4 text-[#F05A28]" /> Rooms & Guests
                  </div>
                  <div className="text-lg md:text-[16px] font-medium text-gray-900">{summaryLabel}</div>
                </button>
              </div>

              {/* Search button*/}
              <button
                type="button"
                disabled={!canSearch}
                className={`w-full md:w-auto font-semibold px-6 py-3 md:px-8 rounded-full inline-flex items-center justify-center transition bg-[#F05A28] text-white hover:brightness-95 ${
                  canSearch ? "" : "cursor-not-allowed opacity-70"
                }`}
                onClick={() => {
                  // filtering is already live via q

                  if (!canSearch) alert("Please select check-in and check-out dates first.");
                }}
              >
                SEARCH
              </button>
            </div>
          ) : (
         
            <div className="w-full flex items-stretch bg-white border border-gray-300 rounded-xl overflow-hidden shadow-sm">
              {/* Property */}
              <div className="flex-[1.2] px-3 py-3 min-w-0">
                <div className="flex items-center gap-1 text-[#F05A28] text-[10px] uppercase font-semibold tracking-wide">
                  <PinIcon className="w-3.5 h-3.5" /> Property
                </div>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search…"
                  className="mt-1 w-full text-sm font-medium text-black bg-transparent outline-none truncate"
                />
              </div>

              <div className="w-px bg-gray-300 self-stretch" />

              {/* Dates */}
              <button
                type="button"
                className="flex-1 px-3 py-3 text-left hover:bg-gray-50 min-w-0"
                onClick={() => setShowCal(true)}
              >
                <div className="flex items-center gap-1 text-[#F05A28] text-[10px] uppercase font-semibold tracking-wide">
                  <CalIcon className="w-3.5 h-3.5" /> Dates
                </div>
                <div className="mt-1 text-sm font-medium text-gray-900 truncate">
                  {checkIn && checkOut ? `${fmtShort(checkIn)} – ${fmtShort(checkOut)}` : "Add dates"}
                </div>
              </button>

              <div className="w-px bg-gray-300 self-stretch" />

              {/* Guests (inline) */}
              <button
                type="button"
                className="flex-[0.9] px-3 py-3 text-left hover:bg-gray-50 min-w-0"
                onClick={() => setShowGuests(true)}
              >
                <div className="flex items-center gap-1 text-[#F05A28] text-[10px] uppercase font-semibold tracking-wide">
                  <UsersIcon className="w-4 h-4" /> Guests
                </div>
                <div className="mt-1 text-sm font-medium text-gray-900 truncate">
                  {adults}A • {children}C
                </div>
              </button>

              {/* Search */}
              <button
                type="button"
                disabled={!canSearch}
                className={`px-4 font-semibold bg-[#F05A28] text-white ${canSearch ? "" : "opacity-70"}`}
                onClick={() => {
                  if (!canSearch) alert("Select dates first.");
                }}
              >
                SEARCH
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sort + status */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">{loading ? "Loading…" : `${filtered.length} properties`}</div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
          className="border rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="name-asc">Sort: Name (A–Z)</option>
          <option value="name-desc">Sort: Name (Z–A)</option>
        </select>
      </div>

      {err && <div className="text-sm text-red-600 mb-4">{err}</div>}

      {/*Cards*/}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {!loading &&
          filtered.map((p) => {
            const hero = getHeroImg(p.propertyName);
            const href = canSearch ? buildHotelUrl(p) : "#";

            return (
              <div key={`${p.hotelId}-${p.propertyName}`} className="bg-white rounded-2xl shadow border overflow-hidden">
                <div className="relative h-48 w-full bg-gray-100">
                  <Image
                    src={hero}
                    alt={p.propertyName}
                    fill
                    className="object-cover"
                    onError={(e: any) => {
                      // fallback to condensed folder if dashed doesn't exist
                      const fb = `/properties/${condensedSlug(p.propertyName)}/hero.png`;
                      if (e?.currentTarget && !e.currentTarget.src.includes(fb)) e.currentTarget.src = fb;
                    }}
                  />

                  {/* More photos button */}
                  <button
                    type="button"
                    onClick={() => openGallery(p.propertyName)}
                    className="absolute bottom-3 right-3 bg-white/95 backdrop-blur text-gray-900 text-xs font-semibold px-3 py-2 rounded-full shadow"
                  >
                    More + photos
                  </button>
                </div>

                <div className="p-4">
                  <div className="text-lg font-semibold text-gray-900">{p.propertyName}</div>
                  {p.address && <div className="text-sm text-gray-600 mt-1">{p.address}</div>}
                  {p.description && <div className="text-sm text-gray-600 mt-2 line-clamp-3">{p.description}</div>}

                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      ID: <span className="font-semibold">{p.hotelId}</span>
                      {p.hotelNo ? (
                        <>
                          {" "}
                          • Code: <span className="font-semibold">{p.hotelNo}</span>
                        </>
                      ) : null}
                    </div>

                    <Link
                      href={href}
                      aria-disabled={!canSearch}
                      className={`inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-semibold ${
                        canSearch
                          ? "bg-[#F05A28] text-white hover:brightness-95"
                          : "bg-gray-200 text-gray-500 cursor-not-allowed"
                      }`}
                      onClick={(e) => {
                        if (!canSearch) {
                          e.preventDefault();
                          alert("Please select check-in and check-out dates first");
                        }
                      }}
                    >
                      View rate
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Guests popover desktop*/}
      {mounted && !isMobile && showGuests
        ? createPortal(
            <>
              <div className="fixed inset-0 z-[999998]" onClick={() => setShowGuests(false)} />
              <div
                className="fixed z-[999999] bg-white border rounded-xl shadow-2xl p-3 w-[380px]"
                style={{ top: guestPos.top, left: guestPos.left }}
              >
                {[
                  { label: "Rooms", value: rooms, setter: setRooms, min: 1, max: 8 },
                  { label: "Adults (13+)", value: adults, setter: setAdults, min: 1, max: 10 },
                  { label: "Children (3–12)", value: children, setter: setChildren, min: 0, max: 10 },
                  { label: "Infants (0–2)", value: infants, setter: setInfants, min: 0, max: 10 },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-3 border-b last:border-b-0">
                    <div className="text-[15px] font-medium text-gray-900">{row.label}</div>
                    <div className="flex items-center gap-3">
                      <button
                        className="w-8 h-8 rounded-full border text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                        onClick={() => step(row.setter as any, row.value as number, -1, row.min, row.max)}
                        disabled={(row.value as number) <= row.min}
                      >
                        −
                      </button>
                      <div className="w-5 text-center">{row.value}</div>
                      <button
                        className="w-8 h-8 rounded-full border text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                        onClick={() => step(row.setter as any, row.value as number, +1, row.min, row.max)}
                        disabled={(row.value as number) >= row.max}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between py-3 border-b">
                  <div className="text-[15px] font-medium text-gray-900">Bringing a pet?</div>
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
                  <button className="px-4 py-2 rounded-lg text-black border hover:bg-gray-50" onClick={() => setShowGuests(false)}>
                    Close
                  </button>
                  <button className="px-4 py-2 rounded-lg text-white bg-[#F05A28] hover:brightness-95" onClick={() => setShowGuests(false)}>
                    Apply
                  </button>
                </div>
              </div>
            </>,
            document.body
          )
        : null}

      {/* Calendar popover */}
      {mounted && showCal
        ? createPortal(
            <div className="fixed inset-0 z-[99999] pointer-events-none">
              <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={() => setShowCal(false)} />

              {isMobile ? (
                <div
                  className="absolute inset-x-0 bottom-0 max-h-[92vh] bg-white rounded-t-2xl shadow-2xl p-4 overflow-y-auto pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-lg font-semibold">Select dates</div>
                    <button className="text-sm px-3 py-1 rounded-lg border hover:bg-gray-50" onClick={() => setShowCal(false)}>
                      Close
                    </button>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <button
                      className="px-3 py-1 rounded-lg border hover:bg-gray-50"
                      onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                    >
                      Prev
                    </button>
                    <div className="text-base font-semibold text-gray-900">{format(leftMonth, "MMMM yyyy")}</div>
                    <button
                      className="px-3 py-1 rounded-lg border hover:bg-gray-50"
                      onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
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
                      {checkIn && checkOut && `${nights} night${nights > 1 ? "s" : ""} selected`}
                      {!checkIn && !checkOut && "Select a check-in date"}
                    </div>

                    <button
                      disabled={!checkIn || !checkOut}
                      className={`text-sm px-4 py-2 rounded-full text-white ${
                        checkIn && checkOut ? "bg-[#111]" : "bg-gray-300 cursor-not-allowed"
                      }`}
                      onClick={() => setShowCal(false)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="absolute pointer-events-none"
                  style={{ top: calPos.top, left: calPos.left }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="relative z-[100000] bg-white border rounded-2xl shadow-2xl p-4 w-[860px] pointer-events-auto">
                    <div className="flex items-center justify-between mb-3">
                      <button
                        className="px-3 py-1 rounded-lg border hover:bg-gray-50"
                        onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                      >
                        Prev
                      </button>
                      <div className="flex items-center gap-8">
                        <div className="text-base font-semibold text-gray-900">{format(leftMonth, "MMMM yyyy")}</div>
                        <div className="text-base font-semibold text-gray-900">{format(rightMonth, "MMMM yyyy")}</div>
                      </div>
                      <button
                        className="px-3 py-1 rounded-lg border hover:bg-gray-50"
                        onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                      >
                        Next
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      {[leftDays, rightDays].map((days, idx) => (
                        <div key={idx}>
                          <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-1">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                              <div key={d} className="py-1">
                                {d}
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {days.map(({ date, currentMonth }, i) => (
                              <div key={i} className="flex items-center justify-center">
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
                        {checkIn && checkOut && `${nights} night${nights > 1 ? "s" : ""} selected`}
                        {!checkIn && !checkOut && "Select a check-in date"}
                      </div>

                      <div className="flex items-center gap-2">
                        <button className="text-sm px-4 py-2 rounded-lg border hover:bg-gray-50" onClick={() => setShowCal(false)}>
                          Close
                        </button>
                        <button
                          disabled={!checkIn || !checkOut}
                          className={`text-sm px-4 py-2 rounded-full text-white ${
                            checkIn && checkOut ? "bg-[#111]" : "bg-gray-300 cursor-not-allowed"
                          }`}
                          onClick={() => setShowCal(false)}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>,
            document.body
          )
        : null}

      {/* Photos modal */}
      {mounted && showPhotos
        ? createPortal(
            <div className="fixed inset-0 z-[1000000] bg-black/70 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-5xl p-5 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-semibold">{activeTitle} — Photos</h3>
                  <button
                    onClick={() => setShowPhotos(false)}
                    className="px-3 py-2 rounded-lg border hover:bg-gray-50 text-gray-700"
                  >
                    Close
                  </button>
                </div>

                {galleryLoading ? (
                  <div className="text-sm text-gray-600">Loading photos…</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {activeGallery.map((g, idx) => (
                      <img
                        key={idx}
                        src={gallerySrc(g)}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = galleryFallbackSrc(g);
                        }}
                        className="w-full h-[240px] object-cover rounded-lg"
                        alt={`${activeTitle} photo ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
