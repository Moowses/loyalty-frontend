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
  fromRate?: number;
  currency?: string;
};

type DayCellT = { date: Date; currentMonth: boolean };

const PinIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 21s7-4.35 7-10a7 7 0 10-14 0c0 5.65 7 10 7 10z"
    />
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
  return `/properties/${dashedSlug(propertyName)}/hero.png`;
}
function fmtParam(d: Date) {
  return format(d, "yyyy-MM-dd");
}
function fmtShort(d: Date) {
  return format(d, "MMM d");
}

function step(
  setter: React.Dispatch<React.SetStateAction<number>>,
  current: number,
  delta: number,
  min: number,
  max: number
) {
  const next = Math.max(min, Math.min(max, current + delta));
  setter(next);
}

/** Result-row UI (like app/result/page.tsx screenshot) */
function PropertyResultRow({
  p,
  canSearch,
  href,
  heroSrc,
  onMorePhotos,
}: {
  p: PropertyItem;
  canSearch: boolean;
  href: string;
  heroSrc: string;
  onMorePhotos: () => void;
}) {
  const currency = (p.currency || "CAD").toUpperCase();
  const hasPrice = typeof p.fromRate === "number" && !Number.isNaN(p.fromRate);
  const nightly = hasPrice ? Number(p.fromRate).toFixed(2) : null;

  return (
    <div className="w-full rounded-2xl border border-black/10 bg-white shadow-sm">
      <div className="flex flex-col gap-4 p-4 md:flex-row md:gap-6">
        {/* Image */}
        <div className="w-full md:w-[320px] md:flex-none">
          <div className="relative h-[190px] w-full overflow-hidden rounded-xl bg-black/5">
            <Image src={heroSrc} alt={p.propertyName} fill className="object-cover" />
          </div>

          <button
            type="button"
            onClick={onMorePhotos}
            className="mt-3 inline-flex items-center rounded-full border border-black/15 bg-white px-4 py-2 text-sm text-black/80 hover:bg-black/5"
          >
            More + photos
          </button>
        </div>

        {/* Details */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-w-0">
            <div className="text-lg font-semibold text-black">{p.propertyName}</div>

            {p.address ? <div className="mt-1 text-sm text-black/70">{p.address}</div> : null}

            {p.description ? (
              <div className="mt-2 text-sm text-black/70 line-clamp-3">{p.description}</div>
            ) : null}

            <div className="mt-3 text-xs text-black/50">
              ID: <span className="font-semibold text-black/60">{p.hotelId}</span>
              {p.hotelNo ? (
                <>
                  {" "}
                  • Code: <span className="font-semibold text-black/60">{p.hotelNo}</span>
                </>
              ) : null}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-5 border-t border-black/10 pt-4">
            <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
              <div className="leading-tight">
                {nightly ? (
                  <>
                    <div className="text-2xl font-semibold text-black">
                      {nightly} <span className="text-sm font-medium text-black/70">{currency}</span>
                    </div>
                    <div className="text-xs text-black/50">{currency} / NIGHT</div>
                  </>
                ) : (
                  <div className="text-sm text-black/50">Rates available on next step</div>
                )}
              </div>

              <Link
                href={href}
                aria-disabled={!canSearch}
                className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold ${
                  canSearch
                    ? "bg-[#151642] text-white hover:opacity-95 active:opacity-90"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
                onClick={(e) => {
                  if (!canSearch) {
                    e.preventDefault();
                    alert("Please select check-in and check-out dates first.");
                  }
                }}
              >
                View rates
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const n = differenceInCalendarDays(checkOut, checkIn);
    return Math.max(1, n);
  }, [checkIn, checkOut]);

  const canSearch = Boolean(checkIn && checkOut);

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

  // Calendar popover
  const [showCal, setShowCal] = useState(false);
  const calTriggerRef = useRef<HTMLDivElement | null>(null);
  const [calPos, setCalPos] = useState({ top: 0, left: 0 });
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(new Date()));

  useLayoutEffect(() => {
    if (!showCal || !calTriggerRef.current || isMobile) return;
    const calc = () => {
      const r = calTriggerRef.current!.getBoundingClientRect();
      setCalPos({
        top: r.bottom + 8,
        left: Math.max(8, Math.min(r.left, window.innerWidth - 860)),
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

  const DayCell = ({ d, muted }: { d: Date; muted?: boolean }) => {
    const disabled = disabledPast(d);
    const start = isStart(d);
    const end = isEnd(d);
    const range = inRange(d);
    const base = "h-9 w-9 rounded-full text-sm flex items-center justify-center transition select-none";
    const cls = disabled
      ? "text-gray-300 cursor-not-allowed"
      : start || end
      ? "bg-[#111] text-white"
      : range
      ? "bg-black/5 text-black"
      : muted
      ? "text-gray-400 hover:bg-black/5"
      : "text-gray-900 hover:bg-black/5";
    return (
      <button type="button" className={`${base} ${cls}`} onClick={() => pickDate(d)} disabled={disabled}>
        {d.getDate()}
      </button>
    );
  };

  // Guests popover
  const [showGuests, setShowGuests] = useState(false);
  const guestTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [guestPos, setGuestPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!showGuests || !guestTriggerRef.current || isMobile) return;
    const calc = () => {
      const r = guestTriggerRef.current!.getBoundingClientRect();
      setGuestPos({ top: r.bottom + 8, left: Math.max(8, Math.min(r.left, window.innerWidth - 420)) });
    };
    calc();
    window.addEventListener("scroll", calc, true);
    window.addEventListener("resize", calc);
    return () => {
      window.removeEventListener("scroll", calc, true);
      window.removeEventListener("resize", calc);
    };
  }, [showGuests, isMobile]);

  // Gallery modal
  const [showPhotos, setShowPhotos] = useState(false);
  const [activeTitle, setActiveTitle] = useState("");
  const [activeGallery, setActiveGallery] = useState<string[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

  const gallerySrc = (filename: string) => `/properties/${dashedSlug(activeTitle)}/${filename}`;
  const galleryFallbackSrc = (filename: string) => `/properties/${condensedSlug(activeTitle)}/${filename}`;

  // ✅ FIXED + reads meta.gallery (your real format)
  const openGallery = async (propertyName: string) => {
    setActiveTitle(propertyName);
    setShowPhotos(true);
    setGalleryLoading(true);
    setActiveGallery([]);

    try {
      const slugA = dashedSlug(propertyName);
      const slugB = condensedSlug(propertyName);

      const tryFetch = async (path: string) => {
        const res = await fetch(path, { cache: "no-store" });
        if (!res.ok) throw new Error("not ok");
        return res.json();
      };

      let meta: any = null;
      try {
        meta = await tryFetch(`/properties/${slugA}/meta.json`);
      } catch {
        meta = await tryFetch(`/properties/${slugB}/meta.json`);
      }

      let photos: string[] = [];

      if (Array.isArray(meta)) {
        photos = meta;
      } else if (meta && typeof meta === "object") {
        const candidate =
          meta.gallery ?? // ✅ your meta.json uses this
          meta.photos ??
          meta.images ??
          meta.files ??
          meta.items;

        if (Array.isArray(candidate)) photos = candidate;
      }

      photos = (photos || [])
        .filter((x) => typeof x === "string")
        .map((x) => x.trim())
        .filter(Boolean);

      if (!photos.length) photos = ["hero.png"];

      setActiveGallery(photos);
    } catch {
      setActiveGallery(["hero.png"]);
    } finally {
      setGalleryLoading(false);
    }
  };

  const buildHotelUrl = (p: PropertyItem) => {
    const params = new URLSearchParams({
      hotelId: p.hotelId,
      checkIn: checkIn ? fmtParam(checkIn) : "",
      checkOut: checkOut ? fmtParam(checkOut) : "",
      rooms: String(rooms),
      adults: String(adults),
      children: String(children),
      infants: String(infants),
      pet: pet ? "1" : "0",
    });
    return `/hotel/${encodeURIComponent(p.hotelId)}?${params.toString()}`;
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6">
      {/* Top search bar */}
      <div className="mb-6">
        {isMobile ? (
          <div className="w-full rounded-2xl border border-gray-300 bg-white p-3 shadow-sm">
            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-xl border px-3 py-3">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-black">
                  <PinIcon className="h-3.5 w-3.5 text-[#F05A28]" /> Property
                </div>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search…"
                  className="mt-1 w-full bg-transparent text-base font-semibold text-gray-900 outline-none"
                />
              </div>

              <button
                ref={calTriggerRef as any}
                type="button"
                className="rounded-xl border px-3 py-3 text-left"
                onClick={() => setShowCal(true)}
              >
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-black">
                  <CalIcon className="h-3.5 w-3.5 text-[#F05A28]" /> Dates
                </div>
                <div className="mt-1 text-base font-semibold text-gray-900">
                  {checkIn && checkOut ? `${fmtShort(checkIn)} – ${fmtShort(checkOut)}` : "Add dates"}
                </div>
              </button>

              <button
                type="button"
                className="rounded-xl border px-3 py-3 text-left"
                onClick={() => setShowGuests(true)}
              >
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-black">
                  <UsersIcon className="h-4 w-4 text-[#F05A28]" /> Guests
                </div>
                <div className="mt-1 text-base font-semibold text-gray-900">
                  {adults} adult{adults > 1 ? "s" : ""} • {children} child{children !== 1 ? "ren" : ""}
                </div>
              </button>

              <button
                type="button"
                disabled={!canSearch}
                className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white ${
                  canSearch ? "bg-[#F05A28]" : "bg-gray-300 cursor-not-allowed"
                }`}
                onClick={() => {
                  if (!canSearch) alert("Please select check-in and check-out dates first.");
                }}
              >
                SEARCH
              </button>
            </div>
          </div>
        ) : (
          <div className="flex w-full items-stretch overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm">
            {/* Property */}
            <div className="min-w-0 flex-[1.2] px-3 py-3">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#F05A28]">
                <PinIcon className="h-3.5 w-3.5" /> Property
              </div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="mt-1 w-full truncate bg-transparent text-sm font-medium text-black outline-none"
              />
            </div>

            <div className="w-px self-stretch bg-gray-300" />

            {/* Dates */}
            <div ref={calTriggerRef} className="flex-1 min-w-0">
              <button
                type="button"
                className="h-full w-full px-3 py-3 text-left hover:bg-gray-50"
                onClick={() => setShowCal(true)}
              >
                <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#F05A28]">
                  <CalIcon className="h-3.5 w-3.5" /> Dates
                </div>
                <div className="mt-1 truncate text-sm font-medium text-gray-900">
                  {checkIn && checkOut ? `${fmtShort(checkIn)} – ${fmtShort(checkOut)}` : "Add dates"}
                </div>
              </button>
            </div>

            <div className="w-px self-stretch bg-gray-300" />

            {/* Guests */}
            <button
              ref={guestTriggerRef}
              type="button"
              className="min-w-0 flex-[0.9] px-3 py-3 text-left hover:bg-gray-50"
              onClick={() => setShowGuests(true)}
            >
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#F05A28]">
                <UsersIcon className="h-4 w-4" /> Guests
              </div>
              <div className="mt-1 truncate text-sm font-medium text-gray-900">
                {adults}A • {children}C
              </div>
            </button>

            {/* Search */}
            <button
              type="button"
              disabled={!canSearch}
              className={`px-4 font-semibold text-white ${canSearch ? "bg-[#F05A28]" : "bg-gray-300"}`}
              onClick={() => {
                if (!canSearch) alert("Select dates first.");
              }}
            >
              SEARCH
            </button>
          </div>
        )}
      </div>

      {/* Sort + status */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">{loading ? "Loading…" : `${filtered.length} properties`}</div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
          className="rounded-lg border bg-white px-3 py-2 text-sm"
        >
          <option value="name-asc">Sort: Name (A–Z)</option>
          <option value="name-desc">Sort: Name (Z–A)</option>
        </select>
      </div>

      {err ? <div className="mb-4 text-sm text-red-600">{err}</div> : null}

      {/* RESULT-STYLE ROW LIST */}
      <div className="flex flex-col gap-5">
        {!loading &&
          filtered.map((p) => {
            const hero = getHeroImg(p.propertyName);
            const href = canSearch ? buildHotelUrl(p) : "#";
            return (
              <PropertyResultRow
                key={`${p.hotelId}-${p.propertyName}`}
                p={p}
                canSearch={canSearch}
                href={href}
                heroSrc={hero}
                onMorePhotos={() => openGallery(p.propertyName)}
              />
            );
          })}
      </div>

      {!loading && filtered.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed p-8 text-center text-sm text-gray-600">
          No properties match your search.
        </div>
      ) : null}

      {/* Guests popover (desktop) */}
      {mounted && !isMobile && showGuests
        ? createPortal(
            <>
              <div className="fixed inset-0 z-[999998]" onClick={() => setShowGuests(false)} />
              <div
                className="fixed z-[999999] w-[380px] rounded-xl border bg-white p-3 shadow-2xl"
                style={{ top: guestPos.top, left: guestPos.left }}
              >
                {[
                  { label: "Rooms", value: rooms, setter: setRooms, min: 1, max: 8 },
                  { label: "Adults (13+)", value: adults, setter: setAdults, min: 1, max: 10 },
                  { label: "Children (3–12)", value: children, setter: setChildren, min: 0, max: 10 },
                  { label: "Infants (0–2)", value: infants, setter: setInfants, min: 0, max: 10 },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between border-b py-3 last:border-b-0">
                    <div className="text-[15px] font-medium text-gray-900">{row.label}</div>
                    <div className="flex items-center gap-3">
                      <button
                        className="h-8 w-8 rounded-full border text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                        onClick={() => step(row.setter as any, row.value as number, -1, row.min, row.max)}
                        disabled={(row.value as number) <= row.min}
                      >
                        −
                      </button>
                      <div className="w-5 text-center">{row.value}</div>
                      <button
                        className="h-8 w-8 rounded-full border text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                        onClick={() => step(row.setter as any, row.value as number, +1, row.min, row.max)}
                        disabled={(row.value as number) >= row.max}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between border-b py-3">
                  <div className="text-[15px] font-medium text-gray-900">Bringing a pet?</div>
                  <select
                    value={pet ? "yes" : "no"}
                    onChange={(e) => setPet(e.target.value === "yes")}
                    className="rounded-lg border px-2 py-1 text-sm"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    className="rounded-lg border px-4 py-2 text-black hover:bg-gray-50"
                    onClick={() => setShowGuests(false)}
                  >
                    Close
                  </button>
                  <button
                    className="rounded-lg bg-[#F05A28] px-4 py-2 text-white hover:brightness-95"
                    onClick={() => setShowGuests(false)}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </>,
            document.body
          )
        : null}

      {/* Guests modal (mobile) */}
      {mounted && isMobile && showGuests
        ? createPortal(
            <div className="fixed inset-0 z-[999999]">
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowGuests(false)} />
              <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-lg font-semibold">Guests</div>
                  <button
                    className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
                    onClick={() => setShowGuests(false)}
                  >
                    Close
                  </button>
                </div>

                {[
                  { label: "Rooms", value: rooms, setter: setRooms, min: 1, max: 8 },
                  { label: "Adults (13+)", value: adults, setter: setAdults, min: 1, max: 10 },
                  { label: "Children (3–12)", value: children, setter: setChildren, min: 0, max: 10 },
                  { label: "Infants (0–2)", value: infants, setter: setInfants, min: 0, max: 10 },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between border-b py-3 last:border-b-0">
                    <div className="text-[15px] font-medium text-gray-900">{row.label}</div>
                    <div className="flex items-center gap-3">
                      <button
                        className="h-9 w-9 rounded-full border text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                        onClick={() => step(row.setter as any, row.value as number, -1, row.min, row.max)}
                        disabled={(row.value as number) <= row.min}
                      >
                        −
                      </button>
                      <div className="w-6 text-center">{row.value}</div>
                      <button
                        className="h-9 w-9 rounded-full border text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                        onClick={() => step(row.setter as any, row.value as number, +1, row.min, row.max)}
                        disabled={(row.value as number) >= row.max}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between py-3">
                  <div className="text-[15px] font-medium text-gray-900">Bringing a pet?</div>
                  <select
                    value={pet ? "yes" : "no"}
                    onChange={(e) => setPet(e.target.value === "yes")}
                    className="rounded-lg border px-2 py-1 text-sm"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>

                <button
                  className="mt-3 w-full rounded-xl bg-[#F05A28] px-4 py-3 text-sm font-semibold text-white"
                  onClick={() => setShowGuests(false)}
                >
                  Done
                </button>
              </div>
            </div>,
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
                  className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-lg font-semibold">Select dates</div>
                    <button
                      className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
                      onClick={() => setShowCal(false)}
                    >
                      Close
                    </button>
                  </div>

                  <div className="mb-2 flex items-center justify-between">
                    <button
                      className="rounded-lg border px-3 py-1 hover:bg-gray-50"
                      onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                    >
                      Prev
                    </button>
                    <div className="text-base font-semibold text-gray-900">{format(leftMonth, "MMMM yyyy")}</div>
                    <button
                      className="rounded-lg border px-3 py-1 hover:bg-gray-50"
                      onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                    >
                      Next
                    </button>
                  </div>

                  <div className="mb-1 grid grid-cols-7 text-center text-xs text-gray-900">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                      <div key={d} className="py-1">
                        {d}
                      </div>
                    ))}
                  </div>

                  <div className="mb-3 grid grid-cols-7 gap-1">
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

                    <div className="mx-auto text-sm text-black">
                      {checkIn && !checkOut && "Select a check-out date"}
                      {checkIn && checkOut && `${nights} night${nights > 1 ? "s" : ""} selected`}
                      {!checkIn && !checkOut && "Select a check-in date"}
                    </div>

                    <button
                      disabled={!checkIn || !checkOut}
                      className={`rounded-full px-4 py-2 text-sm text-white ${
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
                  <div className="pointer-events-auto relative z-[100000] w-[860px] rounded-2xl border bg-white p-4 shadow-2xl">
                    <div className="mb-3 flex items-center justify-between">
                      <button
                        className="rounded-lg border px-3 py-1 hover:bg-gray-50"
                        onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                      >
                        Prev
                      </button>
                      <div className="flex items-center gap-8">
                        <div className="text-base font-semibold text-gray-900">{format(leftMonth, "MMMM yyyy")}</div>
                        <div className="text-base font-semibold text-gray-900">{format(rightMonth, "MMMM yyyy")}</div>
                      </div>
                      <button
                        className="rounded-lg border px-3 py-1 hover:bg-gray-50"
                        onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                      >
                        Next
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      {[leftDays, rightDays].map((days, idx) => (
                        <div key={idx}>
                          <div className="mb-1 grid grid-cols-7 text-center text-xs text-gray-500">
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

                    <div className="mt-3 flex items-center justify-between">
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
                        <button
                          className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                          onClick={() => setShowCal(false)}
                        >
                          Close
                        </button>
                        <button
                          disabled={!checkIn || !checkOut}
                          className={`rounded-full px-4 py-2 text-sm text-white ${
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
            <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/70 p-4">
              <div className="max-h-[85vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xl font-semibold">{activeTitle} — Photos</h3>
                  <button
                    onClick={() => setShowPhotos(false)}
                    className="rounded-lg border px-3 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>

                {galleryLoading ? (
                  <div className="text-sm text-gray-600">Loading photos…</div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {activeGallery.map((g, idx) => (
                      <img
                        key={idx}
                        src={gallerySrc(g)}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = galleryFallbackSrc(g);
                        }}
                        className="h-[240px] w-full rounded-lg object-cover"
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
