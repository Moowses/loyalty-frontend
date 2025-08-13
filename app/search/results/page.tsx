'use client';

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
} from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
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
} from 'date-fns';

// Always render dynamically (avoid prerender errors for query-driven page)
export const dynamic = 'force-dynamic';

/* ───────────────── Icons ───────────────── */
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

/* ───────────────── Types ───────────────── */
type Place = { label: string; lat?: number; lng?: number };
type Day = { date: Date; currentMonth: boolean };

/* ───────────────── Destination Picker (shared) ───────────────── */
function DestinationPicker({
  isMobile,
  value,
  setValue,
}: {
  isMobile: boolean;
  value: Place | null;
  setValue: (p: Place | null) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // recents
  const [recents, setRecents] = useState<Place[]>([]);
  useEffect(() => {
    const raw = localStorage.getItem('recentSearches');
    if (raw) setRecents(JSON.parse(raw));
  }, []);
  const pushRecent = (item: Place) => {
    const next = [item, ...recents.filter((r) => r.label !== item.label)].slice(
      0,
      5
    );
    setRecents(next);
    localStorage.setItem('recentSearches', JSON.stringify(next));
  };

  // desktop dropdown
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<
    Array<{ label: string; lat: number; lon: number }>
  >([]);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 360 });

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || isMobile) return;
    const calc = () => {
      const r = triggerRef.current!.getBoundingClientRect();
      setPos({
        top: r.bottom + 8,
        left: Math.max(8, Math.min(r.left, window.innerWidth - 380)),
        width: Math.min(360, r.width),
      });
    };
    calc();
    window.addEventListener('scroll', calc, true);
    window.addEventListener('resize', calc);
    return () => {
      window.removeEventListener('scroll', calc, true);
      window.removeEventListener('resize', calc);
    };
  }, [open, isMobile]);

  useEffect(() => {
    if (!open || !query.trim()) {
      setResults([]);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&q=${encodeURIComponent(
          query
        )}`;
        const res = await fetch(url);
        const data = await res.json();
        setResults(
          data.map((d: any) => ({
            label: d.display_name,
            lat: +d.lat,
            lon: +d.lon,
          }))
        );
      } catch {}
    }, 250);
    return () => clearTimeout(id);
  }, [query, open]);

  // mobile modal
  const [showDest, setShowDest] = useState(false);
  const [destQuery, setDestQuery] = useState('');
  const [mResults, setMResults] = useState<typeof results>([]);
  useEffect(() => {
    if (!showDest || !destQuery.trim()) {
      setMResults([]);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=10&q=${encodeURIComponent(
          destQuery
        )}`;
        const res = await fetch(url);
        const data = await res.json();
        setMResults(
          data.map((d: any) => ({
            label: d.display_name,
            lat: +d.lat,
            lon: +d.lon,
          }))
        );
      } catch {}
    }, 250);
    return () => clearTimeout(id);
  }, [showDest, destQuery]);

  const finalizePick = (place: Place) => {
    setValue(place);
    pushRecent(place);
    setShowDest(false);
    setOpen(false);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (p) => {
      const { latitude, longitude } = p.coords;
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
        const r = await fetch(url);
        const j = await r.json();
        finalizePick({
          label: j.display_name || 'Current location',
          lat: latitude,
          lng: longitude,
        });
      } catch {
        finalizePick({ label: 'Current location', lat: latitude, lng: longitude });
      }
    });
  };

  return (
    <div className="flex-1 min-w-[220px]">
      <div className="flex items-center gap-2 text-[#F05A28] uppercase tracking-wide text-[10px] font-semibold mb-1">
        <PinIcon className="w-3.5 h-3.5" /> Destination
      </div>
      <div ref={triggerRef}>
        <button
          type="button"
          className="w-full text-left text-lg md:text-[16px] font-medium text-gray-900"
          onClick={() => {
            if (isMobile) {
              setDestQuery(value?.label || '');
              setShowDest(true);
            } else {
              setQuery(value?.label || '');
              setOpen(true);
            }
          }}
        >
          {value?.label || 'Where can we take you?'}
        </button>
      </div>

      {/* Desktop dropdown */}
      {mounted &&
        open &&
        !isMobile &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
            <div
              className="fixed z-[9999] bg-white border rounded-2xl shadow-2xl p-2"
              style={{ top: pos.top, left: pos.left, width: pos.width }}
            >
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a city, hotel, landmark…"
                className="w-full text-[15px] px-3 py-2 rounded-lg bg-gray-50 outline-none mb-2"
              />
              <div
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer"
                onClick={useCurrentLocation}
              >
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M12 2v2m0 16v2M22 12H20M4 12H2m15.5 0a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z"
                      strokeWidth="2"
                    />
                  </svg>
                </span>
                <div className="text-sm font-medium text-gray-900">
                  Use current location
                </div>
              </div>
              {recents.length > 0 && (
                <>
                  <div className="mx-2 my-2 border-t" />
                  <div className="px-3 py-1 text-xs uppercase tracking-wide text-gray-400">
                    Recent Searches
                  </div>
                  {recents.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer"
                      onClick={() => finalizePick(r)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="w-4 h-4 mt-1"
                        fill="none"
                        stroke="currentColor"
                      >
                        <circle cx="11" cy="11" r="7" strokeWidth="2" />
                        <path d="M21 21l-4.35-4.35" strokeWidth="2" />
                      </svg>
                      <div className="text-sm text-gray-800">{r.label}</div>
                    </div>
                  ))}
                </>
              )}
              {query && (
                <>
                  <div className="mx-2 my-2 border-t" />
                  <div className="max-h-72 overflow-auto">
                    {results.map((r, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer"
                        onClick={() =>
                          finalizePick({ label: r.label, lat: r.lat, lng: r.lon })
                        }
                      >
                        <PinIcon className="w-4 h-4 mt-1" />
                        <div className="text-sm text-[#F05A28]">{r.label}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>,
          document.body
        )}

      {/* Mobile full-screen */}
      {mounted &&
        showDest &&
        isMobile &&
        createPortal(
          <div className="fixed inset-0 z-[10000]">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setShowDest(false)}
            />
            <div className="absolute inset-x-0 bottom-0 top-12 bg-white rounded-t-2xl shadow-2xl p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xl font-semibold">Where are you headed?</div>
                <button
                  className="p-2 rounded-full hover:bg-gray-100"
                  onClick={() => setShowDest(false)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className="text-[11px] uppercase tracking-wide font-semibold text-gray-500 mb-1 flex items-center gap-2">
                <PinIcon className="w-4 h-4" /> Destination
              </div>
              <input
                autoFocus
                value={destQuery}
                onChange={(e) => setDestQuery(e.target.value)}
                placeholder="Search a city, hotel, landmark…"
                className="w-full text-[16px] pb-2 border-b border-gray-300 outline-none placeholder:text-gray-400"
              />
              <div
                className="mt-4 flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  if (!navigator.geolocation) return;
                  navigator.geolocation.getCurrentPosition(async (p) => {
                    const { latitude, longitude } = p.coords;
                    try {
                      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
                      const r = await fetch(url);
                      const j = await r.json();
                      finalizePick({
                        label: j.display_name || 'Current location',
                        lat: latitude,
                        lng: longitude,
                      });
                    } catch {
                      finalizePick({
                        label: 'Current location',
                        lat: latitude,
                        lng: longitude,
                      });
                    }
                  });
                }}
              >
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M12 2v2m0 16v2M22 12H20M4 12H2m15.5 0a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z"
                      strokeWidth="2"
                    />
                  </svg>
                </span>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Use current location
                  </div>
                  <div className="text-xs text-gray-500">Use device location</div>
                </div>
              </div>

              {recents.length > 0 && (
                <>
                  <div className="my-3 border-t" />
                  <div className="px-1 py-1 text-xs uppercase tracking-wide text-gray-400">
                    Recent Searches
                  </div>
                  <div className="max-h-48 overflow-auto">
                    {recents.map((r, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 px-1 py-2 rounded-xl hover:bg-gray-50 cursor-pointer"
                        onClick={() => finalizePick(r)}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="w-4 h-4 mt-1"
                          fill="none"
                          stroke="currentColor"
                        >
                          <circle cx="11" cy="11" r="7" strokeWidth="2" />
                          <path d="M21 21l-4.35-4.35" strokeWidth="2" />
                        </svg>
                        <div className="text-sm text-gray-800">{r.label}</div>
                      </div>
                    ))}
                  </div>
                  <button
                    className="w-full text-left text-xs text-gray-500 hover:text-gray-700 px-1 py-2"
                    onClick={() => {
                      setRecents([]);
                      localStorage.removeItem('recentSearches');
                    }}
                  >
                    Clear Recents
                  </button>
                </>
              )}

              {destQuery && (
                <>
                  <div className="my-3 border-t" />
                  <div className="max-h-72 overflow-auto">
                    {mResults.map((r, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 px-1 py-2 rounded-xl hover:bg-gray-50 cursor-pointer"
                        onClick={() =>
                          finalizePick({ label: r.label, lat: r.lat, lng: r.lon })
                        }
                      >
                        <PinIcon className="w-4 h-4 mt-1" />
                        <div className="text-sm text-gray-800">{r.label}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

/* ───────── Calendar helpers ───────── */
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

/* ───────────────── Results Content (moved under Suspense) ───────────────── */
function ResultsContent() {
  const router = useRouter();
  const params = useSearchParams();

  // URL → state
  const initialStart = params.get('startDate') || '';
  const initialEnd = params.get('endDate') || '';
  const initialAdult = params.get('adult') || '1';
  const initialChild = params.get('child') || '0';
  const initialPlace = params.get('place') || '';
  const initialLat = params.get('lat') ? Number(params.get('lat')) : undefined;
  const initialLng = params.get('lng') ? Number(params.get('lng')) : undefined;

  const [dest, setDest] = useState<Place | null>(
    initialPlace ? { label: initialPlace, lat: initialLat, lng: initialLng } : null
  );
  const [checkIn, setCheckIn] = useState<Date | null>(
    initialStart ? parseISO(initialStart) : null
  );
  const [checkOut, setCheckOut] = useState<Date | null>(
    initialEnd ? parseISO(initialEnd) : null
  );

  // Guests
  const [roomsCount, setRoomsCount] = useState<number>(1);
  const [adults, setAdults] = useState<number>(Number(initialAdult || 1));
  const [children, setChildren] = useState<number>(Number(initialChild || 0));
  const [infants, setInfants] = useState<number>(0);

  // Responsiveness
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const r = () => setIsMobile(window.innerWidth < 768);
    r();
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);

  // Calendar + Guests popovers (desktop)
  const [showCal, setShowCal] = useState(false);
  const [showGuests, setShowGuests] = useState(false);

  const datesRef = useRef<HTMLDivElement | null>(null);
  const guestsRef = useRef<HTMLDivElement | null>(null);
  const [calPos, setCalPos] = useState({ top: 0, left: 0 });
  const [guestPos, setGuestPos] = useState({ top: 0, left: 0, width: 360 });

  useLayoutEffect(() => {
    if (!showCal || !datesRef.current || isMobile) return;
    const calc = () => {
      const r = datesRef.current!.getBoundingClientRect();
      setCalPos({ top: r.bottom + 8, left: Math.min(r.left, window.innerWidth - 860) });
    };
    calc();
    window.addEventListener('scroll', calc, true);
    window.addEventListener('resize', calc);
    return () => {
      window.removeEventListener('scroll', calc, true);
      window.removeEventListener('resize', calc);
    };
  }, [showCal, isMobile]);

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
    window.addEventListener('scroll', calc, true);
    window.addEventListener('resize', calc);
    return () => {
      window.removeEventListener('scroll', calc, true);
      window.removeEventListener('resize', calc);
    };
  }, [showGuests, isMobile]);

  // Calendar model
  const [viewMonth, setViewMonth] = useState<Date>(
    startOfMonth(checkIn || new Date())
  );
  const leftMonth = viewMonth;
  const rightMonth = addMonths(viewMonth, 1);
  const leftDays = buildMonth(leftMonth);
  const rightDays = buildMonth(rightMonth);

  const disabledPast = (d: Date) =>
    isBefore(d, new Date(new Date().setHours(0, 0, 0, 0)));
  const inRange = (d: Date) =>
    checkIn && checkOut ? isWithinInterval(d, { start: checkIn, end: checkOut }) : false;
  const isStart = (d: Date) => (checkIn ? isSameDay(d, checkIn) : false);
  const isEnd = (d: Date) => (checkOut ? isSameDay(d, checkOut) : false);

  const nights = useMemo(
    () =>
      checkIn && checkOut ? Math.max(1, differenceInCalendarDays(checkOut, checkIn)) : 0,
    [checkIn, checkOut]
  );
  const fmtShort = (d?: Date | null) => (d ? format(d, 'EEE, MMM d') : 'Add dates');
  const fmtParam = (d: Date) => format(d, 'yyyy-MM-dd');

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
          'h-10 w-10 text-sm flex items-center justify-center rounded-full transition',
          disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-100',
          between ? 'bg-blue-100' : '',
          selectedStart || selectedEnd
            ? 'bg-[#111] text-white font-semibold'
            : muted
            ? 'text-gray-300'
            : 'text-gray-800',
        ].join(' ')}
        aria-label={format(d, 'PPP')}
      >
        {format(d, 'd')}
      </button>
    );
  };

  // Guests helpers
  const step = (
    setter: (n: number) => void,
    cur: number,
    delta: number,
    min: number,
    max: number
  ) => setter(Math.min(max, Math.max(min, cur + delta)));
  const summaryLabel = `${roomsCount} ${
    roomsCount > 1 ? 'Rooms' : 'Room'
  } • ${adults} ${adults > 1 ? 'Adults' : 'Adult'} • ${children} ${
    children !== 1 ? 'Children' : 'Child'
  }${infants > 0 ? ` • ${infants} Infant${infants > 1 ? 's' : ''}` : ''}`;

  // Availability fetch
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string>('');

  const lat = dest?.lat?.toString() || '';
  const lng = dest?.lng?.toString() || '';
  const startDate = checkIn ? fmtParam(checkIn) : '';
  const endDate = checkOut ? fmtParam(checkOut) : '';

  useEffect(() => {
    const run = async () => {
      if (!startDate || !endDate || !lat || !lng) {
        setRooms([]);
        return;
      }
      try {
        setLoading(true);
        setFetchError('');
        const qs = new URLSearchParams({
          startDate,
          endDate,
          lng,
          lat,
          adult: String(adults),
          child: String(children),
          infant: '0',
          pet: 'no',
        });
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/booking/availability?${qs.toString()}`
        );
        const data = await res.json();
        if (data.success && data.data?.data) setRooms(data.data.data);
        else {
          setRooms([]);
          setFetchError('No availability found.');
        }
      } catch {
        setRooms([]);
        setFetchError('Failed to fetch availability.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [startDate, endDate, lat, lng, adults, children]);

  const applySearch = () => {
    const query = new URLSearchParams({
      startDate,
      endDate,
      adult: String(adults),
      child: String(children),
      place: dest?.label || '',
      lat,
      lng,
    });
    router.push(`/search/results?${query.toString()}`);
  };

  /* Static image mapping */
  const imageMap: Record<string, string> = {
    'Your Dream Getaway': '/yourdreamgetaway.png',
    'Escape From Life': '/escapefromlife.png',
    'The Perfect Getaway': '/perfectgetaway.png',
    'Spa Getaway': '/spagetaway.png',
  };
  const getHotelImage = (name?: string) => (name && imageMap[name]) || '';

  /* ─────────────── Render ─────────────── */
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6">
      {/* Search pill */}
      <div className="w-full bg-white rounded-[1.25rem] md:rounded-[2rem] shadow-xl border border-gray-200 px-4 py-3 md:px-6 md:py-4 mb-6">
        {!isMobile ? (
          <div className="flex items-center gap-4">
            {/* Destination */}
            <div className="flex-1 min-w-[220px]">
              <DestinationPicker isMobile={false} value={dest} setValue={setDest} />
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px self-stretch bg-gray-200" />

            {/* Dates */}
            <div className="flex-1" ref={datesRef}>
              <div className="flex items-center gap-2 text-[#F05A28] uppercase tracking-wide text-[10px] font-semibold mb-1">
                <CalIcon className="w-3.5 h-3.5" />{' '}
                {nights > 0 ? `${nights} Night${nights > 1 ? 's' : ''}` : 'Dates'}
              </div>
              <button
                className="w-full text-left"
                onClick={() => setShowCal(true)}
                type="button"
              >
                <div className="text-lg md:text-[16px] font-medium text-gray-900">
                  {checkIn ? fmtShort(checkIn) : 'Add dates'}{' '}
                  <span className="mx-1 text-gray-500">-</span>{' '}
                  {checkOut ? fmtShort(checkOut) : 'Add dates'}
                </div>
              </button>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px self-stretch bg-gray-200" />

            {/* Rooms & Guests + Search */}
            <div className="flex items-center gap-4 flex-1">
              <div className="flex-1" ref={guestsRef}>
                <div className="flex items-center gap-2 text-[#F05A28] uppercase tracking-wide text-[10px] font-semibold mb-1">
                  <UsersIcon className="w-4 h-4" /> Rooms & Guests
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuests(true)}
                  className="w-full text-left text-lg md:text-[16px] font-medium text-gray-900"
                >
                  {summaryLabel}
                </button>
              </div>

              <button
                onClick={applySearch}
                disabled={!dest || !checkIn || !checkOut}
                className={`font-semibold tracking-wide px-7 py-3 rounded-full transition ${
                  dest && checkIn && checkOut
                    ? 'bg-[#F05A28] hover:brightness-95 text-white'
                    : 'bg-[#F05A28] text-white/70 cursor-not-allowed'
                }`}
                type="button"
              >
                SEARCH
              </button>
            </div>
          </div>
        ) : (
          // Mobile: compact split button
          <div className="col-span-2">
            <button
              type="button"
              className="w-full flex items-center bg-white border border-gray-300 rounded-xl overflow-hidden shadow-sm"
            >
              {/* Destination */}
              <div
                className="flex-1 px-4 py-3 text-left hover:bg-gray-50 cursor-pointer"
                onClick={() => window.dispatchEvent(new Event('open-dest-modal'))}
              >
                <div className="flex items-center gap-1 text-[#F05A28] text-[10px] uppercase font-semibold tracking-wide">
                  <PinIcon className="w-3.5 h-3.5" /> Destination
                </div>
                <div className="text-sm font-medium text-gray-900 truncate">
                  {dest?.label || 'Where next?'}
                </div>
              </div>
              <div className="w-px bg-gray-300 self-stretch" />
              {/* Dates */}
              <div
                className="flex-1 px-4 py-3 text-left hover:bg-gray-50 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCal(true);
                }}
              >
                <div className="flex items-center gap-1 text-[#F05A28] text-[10px] uppercase font-semibold tracking-wide">
                  <CalIcon className="w-3.5 h-3.5" /> Dates
                </div>
                <div className="text-sm font-medium text-gray-900 truncate">
                  {checkIn && checkOut
                    ? `${fmtShort(checkIn)} - ${fmtShort(checkOut)}`
                    : 'Add dates'}
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Desktop: Calendar Popover */}
      {!isMobile &&
        showCal &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setShowCal(false)} />
            <div
              className="fixed z-[9999] bg-white border rounded-2xl shadow-2xl p-4 w-[860px]"
              style={{ top: calPos.top, left: calPos.left }}
            >
              <div className="flex items-center justify-between mb-3">
                <button
                  className="px-3 py-1 rounded-lg border hover:bg-gray-50"
                  onClick={() =>
                    setViewMonth(
                      new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1)
                    )
                  }
                >
                  Prev
                </button>
                <div className="flex items-center gap-8">
                  <div className="text-base font-semibold text-gray-900">
                    {format(leftMonth, 'MMMM yyyy')}
                  </div>
                  <div className="text-base font-semibold text-gray-900">
                    {format(rightMonth, 'MMMM yyyy')}
                  </div>
                </div>
                <button
                  className="px-3 py-1 rounded-lg border hover:bg-gray-50"
                  onClick={() =>
                    setViewMonth(
                      new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1)
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
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
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
                  {checkIn && !checkOut && 'Select a check-out date'}
                  {checkIn && checkOut && `${nights} night${nights > 1 ? 's' : ''} selected`}
                  {!checkIn && !checkOut && 'Select a check-in date'}
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
                      checkIn && checkOut ? 'bg-[#111]' : 'bg-gray-300 cursor-not-allowed'
                    }`}
                    onClick={() => setShowCal(false)}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

      {/* Mobile: Calendar sheet */}
      {isMobile &&
        showCal &&
        createPortal(
          <div className="fixed inset-0 z-[9999]">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowCal(false)} />
            <div className="absolute inset-x-0 bottom-0 max-h-[92vh] bg-white rounded-t-2xl shadow-2xl p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="text-lg font-semibold">Select dates</div>
                <button
                  className="text-sm px-3 py-1 rounded-lg border hover:bg-gray-50"
                  onClick={() => setShowCal(false)}
                >
                  Close
                </button>
              </div>
              <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 mb-3">
                {buildMonth(viewMonth).map(({ date, currentMonth }, i) => (
                  <div key={i} className="flex items-center justify-center">
                    <DayCell d={date} muted={!currentMonth} />
                  </div>
                ))}
              </div>
              <div className="text-sm text-gray-600 text-center pb-2">
                {checkIn && !checkOut && 'Select a check-out date'}
                {checkIn && checkOut && `${nights} night${nights > 1 ? 's' : ''} selected`}
                {!checkIn && !checkOut && 'Select a check-in date'}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Desktop: Guests Popover */}
      {!isMobile &&
        showGuests &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setShowGuests(false)} />
            <div
              className="fixed z-[9999] bg-white border rounded-xl shadow-2xl p-3 w-[380px]"
              style={{ top: guestPos.top, left: guestPos.left }}
            >
              {[
                { label: 'Rooms', value: roomsCount, setter: setRoomsCount, min: 1, max: 8 },
                { label: 'Adults', value: adults, setter: setAdults, min: 1, max: 10 },
                { label: 'Children', value: children, setter: setChildren, min: 0, max: 10 },
                { label: 'Infants', value: infants, setter: setInfants, min: 0, max: 10 },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-3 border-b last:border-b-0">
                  <div className="text-[15px] font-medium text-gray-900">{row.label}</div>
                  <div className="flex items-center gap-3">
                    <button
                      className="w-8 h-8 rounded-full border text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                      onClick={() => step(row.setter as any, row.value as number, -1, (row as any).min, (row as any).max)}
                      disabled={(row.value as number) <= (row as any).min}
                    >
                      −
                    </button>
                    <div className="w-5 text-center">{row.value}</div>
                    <button
                      className="w-8 h-8 rounded-full border text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                      onClick={() => step(row.setter as any, row.value as number, +1, (row as any).min, (row as any).max)}
                      disabled={(row.value as number) >= (row as any).max}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  className="px-4 py-2 rounded-lg text-black border hover:bg-gray-50"
                  onClick={() => setShowGuests(false)}
                >
                  Close
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-white bg-[#F05A28] hover:brightness-100"
                  onClick={() => setShowGuests(false)}
                >
                  Apply
                </button>
              </div>
            </div>
          </>,
          document.body
        )}

      {/* Results header */}
      <div className="flex items-center justify-between mb-3">
        {!loading && !fetchError ? (
          <p className="text-gray-700">
            Showing {rooms.length} {rooms.length === 1 ? 'Result' : 'Results'}
          </p>
        ) : (
          <div />
        )}
      </div>

      {/* Loading / Error */}
      {loading && <p className="py-8">Loading availability...</p>}
      {fetchError && <p className="py-4 text-red-600">{fetchError}</p>}

      {/* Results list */}
      <div className="space-y-6">
        {rooms.map((room: any) => {
          const nightsCount =
            checkIn && checkOut ? Math.max(1, differenceInCalendarDays(checkOut, checkIn)) : 0;
          const total = Number(room.totalPrice ?? 0);
          const nightly = nightsCount > 0 ? total / nightsCount : total;
          const imgSrc = getHotelImage(room.hotelName);

          return (
            <div
              key={`${room.roomTypeId}-${room.hotelId}-${room.hotelName}`}
              className="flex flex-col md:flex-row border rounded-xl p-4 shadow-sm bg-white"
            >
              {/* Image */}
              <div className="md:w-72 w-full md:mr-6 mb-3 md:mb-0">
                {imgSrc ? (
                  <div className="relative w-full h-44 md:h-44 rounded-lg overflow-hidden bg-gray-100">
                    <Image
                      src={imgSrc}
                      alt={room.hotelName || 'Hotel'}
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>
                ) : (
                  <div className="w-full h-44 bg-gray-200 flex items-center justify-center rounded-lg">
                    <span className="text-gray-500 text-sm">No Image</span>
                  </div>
                )}
              </div>

              {/* Info + CTA */}
              <div className="flex-1 flex flex-col md:flex-row">
                <div className="flex-1 pr-0 md:pr-6">
                  <h2 className="text-[18px] md:text-[20px] font-semibold text-gray-900 mb-1">
                    {room.hotelName}
                  </h2>
                  <p className="text-sm text-gray-700 mb-1">
                    Room Type:{' '}
                    <span className="font-medium text-gray-900">{room.RoomType}</span>
                  </p>
                  <p className="text-sm text-gray-700 mb-1">
                    Capacity:{' '}
                    <span className="font-medium text-gray-900">
                      {room.capacity} guest{room.capacity > 1 ? 's' : ''}
                    </span>
                  </p>
                  <p className="text-sm text-gray-700 mb-2">
                    {nightsCount} {nightsCount === 1 ? 'night' : 'nights'} — Total:{' '}
                    <span className="font-semibold text-gray-900">
                      ${total.toFixed(2)}
                    </span>
                    {nightsCount > 0 && (
                      <span className="text-gray-500"> ({nightly.toFixed(2)} / night)</span>
                    )}
                  </p>
                </div>

                <div className="mt-3 md:mt-0 md:w-56 flex md:flex-col md:items-end items-start gap-3">
                  <div className="md:text-right">
                    <div className="text-[22px] md:text-[24px] font-semibold text-gray-900 leading-none">
                      ${nightly.toFixed(2)}
                    </div>
                    <div className="text-[11px] text-gray-500">USD / Night</div>
                  </div>
                  <button
                    onClick={() => {
                      const q = new URLSearchParams({
                        hotelId: room.hotelId,
                        roomId: room.roomTypeId,
                        startDate,
                        endDate,
                        adult: String(adults),
                        child: String(children),
                      });
                      router.push(`/booking/confirm?${q.toString()}`);
                    }}
                    className="bg-[#211F45] text-white text-sm md:text-base px-4 py-2 rounded-full hover:brightness-110 transition"
                  >
                    View Rates
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────── Default export wrapped in Suspense ───────────────── */
export default function SearchResultsPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-6">Loading…</div>}>
      <ResultsContent />
    </Suspense>
  );
}
