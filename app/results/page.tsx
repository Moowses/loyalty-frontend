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
  endOfMonth,
  startOfWeek,
} from 'date-fns';

import { HOTEL_POINTS } from '@/data/hotels';
import { ONTARIO_CENTROIDS } from '@/data/centroids';
import dynamic1 from 'next/dynamic';

// Always render dynamically (avoid prerender errors for query-driven page)
export const dynamic = 'force-dynamic';

/* Icons */
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

/*  Types */
type Place = { label: string; lat?: number; lng?: number };
type Day = { date: Date; currentMonth: boolean };

/*chat bot*/
const ChatbotWidget = dynamic1(() => import('@/components/ChatbotWidget'), {
  ssr: false,
  loading: () => null,
});



/* Destination Picker */
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
  const QUICK_CITY_LABELS = [
  'Toronto, Ontario',
  'Ottawa, Ontario',
  'Kingston, Ontario',
  'Peterborough, Ontario',
  'Kawartha Lakes, Ontario',
  'Niagara Falls, Ontario',
  'Barrie, Ontario',
] as const;

function quickPick(label: (typeof QUICK_CITY_LABELS)[number]) {
  const c = ONTARIO_CENTROIDS.find(x => x.label === label);
  if (!c) return;
  finalizePick({ label: c.label, lat: c.lat, lng: c.lng });
}



useEffect(() => {
  if (!open || !query.trim()) {
    setResults([]);
    return;
  }

  const id = setTimeout(async () => {
    const q = query.toLowerCase();

    // --- Quick-pick config (must match labels in ONTARIO_CENTROIDS) ---
  

    // Normalize lon->lng when clicking a typed suggestion
    function choose(r: { label: string; lat: number; lon: number }) {
      finalizePick({ label: r.label, lat: r.lat, lng: r.lon });
}


    // 1)hotels first (only those with coords)
    const hotelMatches = HOTEL_POINTS
      .filter((h: AnyHotel) => hotelHaystack(h).includes(q))
      .filter(hasCoords)
      .slice(0, 5)
      .map((h) => ({ label: hotelTitle(h), lat: h.lat!, lon: h.lng! }));

    // 2) Ontario centroids (fallback)
    const centroidMatches = ONTARIO_CENTROIDS
      .filter((c) => c.label.toLowerCase().includes(q))
      .slice(0, 5)
      .map((c) => ({ label: c.label, lat: c.lat, lon: c.lng }));

    // 3) OSM (Canada-only), format label "City, Province"
    let osmResults: Array<{ label: string; lat: number; lon: number }> = [];
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=ca&addressdetails=1&accept-language=en&q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      const data = await res.json();
      osmResults = (Array.isArray(data) ? data : []).map((d: any) => {
        const city  = d.address?.city || d.address?.town || d.address?.village || d.address?.county || '';
        const state = d.address?.state || d.address?.region || '';
        const label = [city, state].filter(Boolean).join(', ')
          || (d.display_name?.split(',').slice(0, 2).join(', ') ?? '');
        return { label, lat: +d.lat, lon: +d.lon };
      });
    } catch {}

    // Merge (hotels → centroids → OSM) + de-dupe by label
    const merged: Record<string, { label: string; lat: number; lon: number }> = {};
    [...hotelMatches, ...centroidMatches, ...osmResults].forEach((x) => (merged[x.label] = x));
    setResults(Object.values(merged).slice(0, 6));
  }, 250); // <-- debounce delay

  return () => clearTimeout(id); // <-- cleanup on change/unmount
}, [query, open]); // <-- dependency array goes here (on useEffect)


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
          label: d.display_name.split(',').slice(0, 2).join(', '), // shorter label
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
      try {
        localStorage.setItem('lastDestPick', JSON.stringify({ lat: place.lat, lng: place.lng }));
      } catch {}
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
      <div className="flex items-center gap-2  text-black uppercase tracking-wide text-[10px] font-semibold mb-1">
        <PinIcon className="w-3.5 h-3.5 b text-[#F05A28]" /> Destination
      </div>
      <div ref={triggerRef}>
        <button
          type="button"
          className="w-full text-left text-lg md:text-[16px] font-semibold text-gray-900"
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
                className="w-full text-[15px] px-3 py-2 rounded-lg bg-gray-50 outline-none text-black mb-2"
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
                 
                  
                </>
              )}

              {/* Quick suggestions when the input is empty */}
                {!query && (
                  <>
                    <div className="mx-2 my-2 border-t" />
                    <div className="px-3 py-1 text-xs uppercase tracking-wide text-gray-500">
                      Popular in Ontario
                    </div>
                    <div className="flex flex-wrap gap-2 px-3 pb-3">
                      {QUICK_CITY_LABELS.map((label) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => quickPick(label)}
                          className="rounded-full border px-3 py-1.5 text-sm hover:bg-gray-50"
                        >
                          {label.replace(', Ontario', '')}
                        </button>
                      ))}
                    </div>
                  </>
                )}
             {query && (
                <>
                  <div className="mx-2 my-2 border-t" />
                  <div className="max-h-72 overflow-auto">
                   {results.map((r, i) => (
                    <div
                      key={`${r.label}-${r.lat}-${r.lon}`}           // stable key (less list churn)
                      className="flex items-start gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer"
                      onMouseDown={() => finalizePick({ label: r.label, lat: r.lat, lng: r.lon })} // fires before blur
                    >
                      <PinIcon className="w-4 h-4 mt-1" />
                      <div className="text-sm text-black">{r.label}</div>
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
              <div className="text-[11px] uppercase tracking-wide font-semibold text-black mb-1 flex items-center gap-2">
                <PinIcon className="w-4 h-4" /> Destination
              </div>
              <input
                autoFocus
                value={destQuery}
                onChange={(e) => setDestQuery(e.target.value)}
                placeholder="Search a city, hotel, landmark…"
                className="w-full text-[16px] pb-2 border-b border-gray-300 text-black outline-none placeholder:text-gray-400"
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

function isPlaceholderRoom(item: any) {
  const rt = String(item?.RoomType ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  const roomTypeId = String(item?.roomTypeId ?? '').trim();

  const noAvailText = /(no\s+(rooms?\s+)?available|no\s+availability|sold\s*out)/i.test(rt);

  const total = Number(item?.totalPrice ?? 0);
  const daily = item?.dailyPrices;
  const dailyIsZero =
    daily == null
      ? false
      : typeof daily === 'string'
        ? Number(daily) <= 0
        : typeof daily === 'number'
          ? daily <= 0
          : typeof daily === 'object'
            ? Object.keys(daily).length === 0
            : false;

  return noAvailText || total <= 0 || dailyIsZero || roomTypeId.length === 0;
}





function safeArrayData(apiData: any): any[] | null {
  
  const payload = apiData?.data?.data;
  if (Array.isArray(payload)) return payload;
  if (typeof payload === 'string') return null; // signal "no hotels in area"
  return Array.isArray(apiData) ? apiData : null;
}

function toRad(x: number) { return (x * Math.PI) / 180; }
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}



/* Calendar helpers */
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

type AnyHotel = {
  name?: string; label?: string; address?: string; city?: string; region?: string;
  lat?: number; lng?: number;
};

const hasCoords = (h: AnyHotel): h is AnyHotel & { lat: number; lng: number } =>
  typeof h.lat === 'number' && Number.isFinite(h.lat) &&
  typeof h.lng === 'number' && Number.isFinite(h.lng);

const hotelHaystack = (h: AnyHotel) =>
  `${h.name ?? ''} ${h.label ?? ''} ${h.address ?? ''} ${h.city ?? ''} ${h.region ?? ''}`.toLowerCase();

const hotelTitle = (h: AnyHotel) => {
  const title = h.name ?? h.label ?? 'Hotel';
  const cityRegion = [h.city, h.region].filter((x): x is string => !!x).join(', ');
  return cityRegion ? `${title} (${cityRegion})` : title;
};



/* Filter helpers  */

  function encodeBase64(obj: unknown) {
  const s = JSON.stringify(obj);
  return typeof window !== 'undefined'
    ? btoa(unescape(encodeURIComponent(s)))
    : Buffer.from(s, 'utf-8').toString('base64'); // SSR fallback
}
/* Results Content (moved under Suspense) */
const PROVINCE_ANCHORS: Record<string, { lat: number; lng: number }[]> = {
  Ontario: [
    { lat: 45.202, lng: -78.217 }, // Harcourt, ON
    { lat: 44.926, lng: -78.723 }, // Minden, ON
    { lat: 44.520, lng: -78.170 }, // Stoney Lake, ON
     { lat: 45.065773, lng: -78.023035 }, // Hastings Highlands (Old Diamond Lake Rd)
  ],
   'Prince Edward Island': [
    { lat: 46.307, lng: -63.580 }, // Albany area
  ],
};


function anchorsForProvince(label?: string) {
  if (!label) return null;
  // Extract the first token before the comma: "Ontario" from "Ontario, Canada"
  const province = label.split(',')[0].trim();
  return PROVINCE_ANCHORS[province] || null;
}

function dedupeBy<T>(arr: T[], key: (x: T) => string) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of arr) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

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
  const initialPet = (params.get('pet') || 'no').toLowerCase();



  const [dest, setDest] = useState<Place | null>(
    initialPlace ? { label: initialPlace, lat: initialLat, lng: initialLng } : null
    
  );
   // hydrate dest from localStorage (if URL didn't provide one)
      useEffect(() => {
            if (dest) return;

            let hydrated = false;
            try {
              const raw = typeof window !== 'undefined'
                ? localStorage.getItem('lastDestPick')
                : null;
              if (raw) {
                const v = JSON.parse(raw);
                if (typeof v?.lat === 'number' && typeof v?.lng === 'number') {
                  setDest({ label: initialPlace || 'Selected area', lat: v.lat, lng: v.lng });
                  hydrated = true;
                }
              }
            } catch {}

            if (!hydrated) {
              // Google Maps base coords (example)
              const fallback = { lat: 46.3097491, lng: -63.7612867 };
              setDest({ label: initialPlace || 'Selected area', ...fallback });
            }
          }, [dest, initialPlace]);

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
  const [pet, setPet] = useState<boolean>(initialPet === 'yes' || initialPet === '1');

  
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

  
  // daily rates
  // Guests helpers
  const step = (
    setter: (n: number) => void,
    cur: number,
    delta: number,
    min: number,
    max: number
  ) => setter(Math.min(max, Math.max(min, cur + delta)));
  const summaryLabel = `${roomsCount} ${roomsCount > 1 ? 'Rooms' : 'Room'} • ${adults} ${ // summary search label
  adults > 1 ? 'Adults' : 'Adult'
} • ${children} ${children !== 1 ? 'Children' : 'Child'}${
  infants > 0 ? ` • ${infants} Infant${infants > 1 ? 's' : ''}` : ''
}${pet ? ' • Pet' : ''}`;

  // Availability fetch
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string>('');

const visibleRooms = useMemo(
  () => (rooms || []).filter((r: any) => !isPlaceholderRoom(r)),
  [rooms]
);


  const lat = dest?.lat?.toString() || '';
  const lng = dest?.lng?.toString() || '';
  const startDate = checkIn ? fmtParam(checkIn) : '';
  const endDate = checkOut ? fmtParam(checkOut) : '';

useEffect(() => {
  const run = async () => {
    const start = checkIn ? fmtParam(checkIn) : '';
    const end   = checkOut ? fmtParam(checkOut) : '';

    // Need dates + a destination label
    if (!start || !end || !dest?.label) {
      setRooms([]);
      return;
    }

    setLoading(true);
    setFetchError('');

    // Common (non-location) params
    const baseParams = {
      startDate: start,
      endDate: end,
      adult: String(adults),
      child: String(children),
      infant: String(infants),
      pet: pet ? 'yes' : 'no',
    } as const;

    try {
      //  Province-level search: fan out to anchor points and merge
      const provinceAnchors = anchorsForProvince(dest.label);
      if (provinceAnchors) {
        const responses = await Promise.all(
          provinceAnchors.map(async (a) => {
            const qs = new URLSearchParams({
              ...baseParams,
              lat: a.lat.toString(),
              lng: a.lng.toString(),
            } as any);
            try {
              const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/booking/availability?${qs.toString()}`
              );
              return res.json();
            } catch {
              return null;
            }
          })
        );

        // Merge & de-dupe
        const merged: any[] = [];
        for (const r of responses) {
          const arr = safeArrayData(r);
          if (arr === null) continue; // this anchor returned string "No available rooms"
          merged.push(...arr);
        }
        const unique = dedupeBy(
          merged,
          (x: any) => `${x.hotelId || x.hotelNo}-${x.roomTypeId || x.RoomType || ''}`
        );

        // Filter placeholders
        const filtered = unique.filter((x: any) => !isPlaceholderRoom(x));

        // Sort by distance then price
        const qLat = dest!.lat!;
        const qLng = dest!.lng!;
        filtered.sort((a: any, b: any) => {
          const da = haversineKm(qLat, qLng, Number(a.lat), Number(a.lng));
          const db = haversineKm(qLat, qLng, Number(b.lat), Number(b.lng));
          if (da !== db) return da - db;
          return Number(a.totalPrice ?? a.dailyPrices ?? 0) - Number(b.totalPrice ?? b.dailyPrices ?? 0);
        });

        if (filtered.length) {
          setRooms(filtered);
          setFetchError('');
        } else {
          setRooms([]);
          setFetchError(`No available rooms for these dates nearby in ${dest.label}.`);
        }
        return; // IMPORTANT: stop here if we handled province fan-out
      }

      //  City-level search: single lat/lng 
      const latStr = dest?.lat?.toString() || '';
      const lngStr = dest?.lng?.toString() || '';
      if (!latStr || !lngStr) {
        setRooms([]);
        setFetchError('Please select a city or town.');
        return;
      }

      const qs = new URLSearchParams({
        ...baseParams,
        lat: latStr,
        lng: lngStr,
      } as any);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/booking/availability?${qs.toString()}`
      );
      const j = await res.json();
      const arr = safeArrayData(j);

      if (arr === null) {
        // API returned "No available rooms" (string) for this location (no hotels in area)
        setRooms([]);
        setFetchError('No available hotels in this area. Try another location.');
      } else {
        const filtered = arr.filter((x: any) => !isPlaceholderRoom(x));
        if (!filtered.length) {
          setRooms([]);
          setFetchError('No available rooms for these dates nearby. Try changing your dates or filters.');
        } else {
          const qLat = dest!.lat!;
          const qLng = dest!.lng!;
          filtered.sort((a: any, b: any) => {
            const da = haversineKm(qLat, qLng, Number(a.lat), Number(a.lng));
            const db = haversineKm(qLat, qLng, Number(b.lat), Number(b.lng));
            if (da !== db) return da - db;
            return Number(a.totalPrice ?? a.dailyPrices ?? 0) - Number(b.totalPrice ?? b.dailyPrices ?? 0);
          });
          setRooms(filtered);
          setFetchError('');
        }
      }
    } catch (err) {
      console.error('availability fetch error', err);
      setRooms([]);
      setFetchError('Something went wrong while fetching availability.');
    } finally {
      setLoading(false);
    }
  };

  run();
  // Depend on dest (label/lat/lng), dates, and guest vars
}, [checkIn, checkOut, dest, adults, children, infants, pet]);


  const applySearch = () => {
    const query = new URLSearchParams({
      startDate,
      endDate,
      adult: String(adults),
      child: String(children),
      place: dest?.label || '',
      lat,
      lng,
      pet: pet ? 'yes' : 'no', 
    });
    router.push(`/results?${query.toString()}`);
   
    
  };
function dashedSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
function condensedSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

//Exact folder names in /public/properties
const slugMap: Record<string, string> = {
  'Your Dream Getaway': 'your-dream-getaway',
  'Escape From Life': 'escape-from-life',
  'The Perfect Getaway': 'the-perfect-getaway',
  'Scandinavian-Inspired Tiny Home Experience': 'tiny-home-experience',
  'Fern Woods Escape': 'fern-woods-escape',
  'Nordic Spa Retreat PEI': 'nordic-spa-retreat-pei',
  'Nordic Spa Getaway on Stoney Lake': 'nordic-spa-get-away-on-stoney-lake', 
  'Gull River Escape: Nordic Spa': 'gull-river-escape-nordic-spa', 
};

//Return the correct static image path (with fallbacks) */
function getHotelImage(name?: string) {
  if (!name) return '';
  const exact = slugMap[name];
  // 1) prefer explicit mapping
  if (exact) return `/properties/${exact}/hero.png`;
  // 2) otherwise try derived slugs used elsewhere in the app
  const dashed = dashedSlug(name);
  const condensed = condensedSlug(name);
  return `/properties/${dashed}/hero.png`; // UI will still render if this 404s
  
} 

  //Render 
  return (
   
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
      {/* Search pill */}
      <div className="w-full bg-white rounded-[25px] shadow-xl border border-gray-200 px-4 py-3 md:px-6 md:py-4 mb-6">
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
              <div className="flex items-center gap-2 text-black uppercase tracking-wide text-[10px] font-semibold mb-1">
                <CalIcon className="w-3.5 h-3.5 text-[#F05A28]" />{' '}
                {nights > 0 ? `${nights} Night${nights > 1 ? 's' : ''}` : 'Dates'}
              </div>
              <button
                className="w-full text-left"
                onClick={() => setShowCal(true)}
                type="button"
              >
                <div className="text-lg md:text-[16px] font-semibold text-gray-900">
                  {checkIn ? fmtShort(checkIn) : 'Add dates'}{' '}
                  <span className="mx-1 text-gray-500"></span>{' '}
                  {checkOut ? fmtShort(checkOut) : ''}
                </div>
              </button>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px self-stretch bg-gray-200" />

            {/* Rooms & Guests + Search */}
            <div className="flex items-center gap-4 flex-1">
              <div className="flex-1" ref={guestsRef}>
                <div className="flex items-center gap-2 text-black uppercase tracking-wide text-[10px] font-semibold mb-1">
                  <UsersIcon className="w-4 h-4 text-[#F05A28]" /> Rooms & Guests
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
                disabled={!checkIn || !checkOut}
                className={`font-semibold tracking-wide px-7 py-3 rounded-full transition ${
                   checkIn && checkOut
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
                  <PinIcon className="w-3.5 h-3.5 text-black" /> Destination
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
                  <CalIcon className="w-3.5 h-3.5 text-black" /> Dates
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
                { label: 'Adults (13+)', value: adults, setter: setAdults, min: 1, max: 10 },
                { label: 'Children (3–12)', value: children, setter: setChildren, min: 0, max: 10 },
                { label: 'Infants (0–2)', value: infants, setter: setInfants, min: 0, max: 10 },
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

              

              {/* NEW: Pet row (Yes/No) */}
                <div className="flex items-center justify-between py-3 border-b">
                  <div className="text-[15px] font-medium text-gray-900">Bringing a pet?</div>
                  <select
                    value={pet ? 'yes' : 'no'}
                    onChange={(e) => setPet(e.target.value === 'yes')}
                    className="border rounded-lg px-2 py-1 text-sm"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>

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

{/* Results header / Empty state */}
{!loading && visibleRooms.length === 0 && (
  <div className="mt-8 rounded-2xl border border-gray-200 p-8 text-center">
    <div className="text-xl font-semibold text-gray-900 mb-1">
      {fetchError || 'No results'}
    </div>
    <div className="text-sm text-gray-600">
      {fetchError?.includes('area')
        ? 'Try another city or landmark.'
        : 'Try adjusting your dates or clearing the Pet filter.'}
    </div>
    <div className="mt-4 flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => setShowCal(true)}
        className="px-4 py-2 rounded-full border border-gray-300 hover:bg-gray-50"
      >
        Change dates
      </button>
      {/* Show only if pet is on */}
      {pet && (
        <button
          type="button"
          onClick={() => setPet(false)}
          className="px-4 py-2 rounded-full border border-gray-300 hover:bg-gray-50"
        >
          Clear Pet filter
        </button>
      )}
    </div>
  </div>
)}

{/* Loading */}
{loading && <p className="py-8">Loading availability...</p>}

      {/* Results list */}
    <div className="space-y-6">
  {visibleRooms.map((room: any) => {
    // Belt & suspenders — never render placeholders
    if (
      isPlaceholderRoom(room) ||
      Number(room?.totalPrice ?? 0) <= 0 ||
      !String(room?.roomTypeId ?? '').trim()
    ) {
      return null;
    }

    const nightsCount =
      checkIn && checkOut ? Math.max(1, differenceInCalendarDays(checkOut, checkIn)) : 0;

    const imgSrc = getHotelImage(room.hotelName);

    const toNum = (v: any) => {
      if (v == null) return 0;
      const n = typeof v === 'number' ? v : Number(String(v).replace(/[^0-9.-]/g, ''));
      return Number.isFinite(n) ? n : 0;
    };

    const roomTotal = toNum(room.totalPrice); 
    const petFee = toNum(room.petFeeAmount);  
    const grandTotal = roomTotal + petFee;    
    const nightlyRoomsOnly = nightsCount > 0 ? roomTotal / nightsCount : roomTotal;
    const hero = getHotelImage(room.hotelName); 
    const slug = hero ? hero.replace(/^\/properties\/|\/hero\.png$/g, "") : "";

    // Try load meta.json 
    let meta: any = {};
    try {
      meta = require(`@/public/properties/${slug}/meta.json`);
    } catch (e) {
      meta = {};
    }

    const address = meta?.Address ?? meta?.address ?? null;
    const minNights = Number(room?.minNights ?? 1);
    

    const currency = room.currencyCode || 'CAD';
    const distanceLabel =typeof room.formattedDistance === 'string' && room.formattedDistance.trim() ? room.formattedDistance: 
                          room.distance && room.distanceUnit? `${Number(room.distance).toFixed(2)} ${room.distanceUnit}`: '';

    // Return number-only string for formatting
    const money = (n: number) =>
      new Intl.NumberFormat('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

    return (
      <div
        key={`${room.roomTypeId}-${room.hotelId}-${room.hotelName}`}
        className="flex flex-col md:flex-row rounded-xl p-4 bg-white shadow-md ring-1 ring-black/5"
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
                onError={(e) => {
                  const el = e.currentTarget as HTMLImageElement;
                  const name = room.hotelName || '';
                  const c = `/properties/${condensedSlug(name)}/hero.png`;
                  if (el.src.endsWith('/hero.png') && !el.src.includes('/' + condensedSlug(name) + '/')) {
                    el.src = c;
                  }
                }}
              />
            </div>
          ) : (
            <div className="w-full h-44 bg-gray-200 flex items-center justify-center rounded-lg">
              <span className="text-gray-500 text-sm">No Image</span>
            </div>
          )}
        </div>

              {/* Info + CTA */}
              
                      <div className="flex-1 flex flex-col">
            

                        {/* Details stack */}
                        <div className="mt-2 text-sm text-gray-700 space-y-1.5">
                          <div>
                            Room Type:{' '}
                            <span className="font-medium text-gray-900">{room.RoomType || '—'}</span>
                          </div>
                          
                          <div>
                            Guests:{' '}
                            <span className="font-medium text-gray-900">
                              {adults} adult{adults > 1 ? 's' : ''}
                              {Number(children) > 0 ? ` • ${children} child${Number(children) > 1 ? 'ren' : ''}` : ''}
                              {Number(infants) > 0 ? ` • ${infants} infant${Number(infants) > 1 ? 's' : ''}` : ''}
                            </span>
                          </div>
                          <div>
                            {nightsCount} {nightsCount === 1 ? 'night' : 'nights'}:{' '}
                            <span className="font-semibold text-gray-900">{money(roomTotal)}</span>
                            {nightsCount > 0 && (
                              <span className="text-gray-500"> ({money(nightlyRoomsOnly)} / night)</span>
                            )}
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">Minimum stay:</span>{" "}
                            <span className="text-gray-700">
                              {minNights} night{minNights > 1 ? "s" : ""}
                            </span>
                          </div>
                          <div>
                            Pet fee:{' '}
                            <span className="font-medium text-gray-900">
                              {petFee > 0 ? money(petFee) : '0'}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">Address:</span>{" "}
                            <span className="text-gray-700">{address}</span>
                          </div>
                        </div>
                        {distanceLabel && (
                          <div>
                            <span className="font-medium text-gray-890">Distance:</span>{" "}
                            <span className="text-gray-700">
                              {distanceLabel} from your search area
                            </span>
                          </div>
                        )}

                        {/* Bottom bar */}
                        <div className="mt-4 pt-3 border-t">
                          <div className="flex items-center justify-end gap-4">
                            {/* Grand total (left of button) */}
                            <div className="text-right">
                              <div className="flex items-baseline justify-end gap-1 leading-none">
                                <span className="text-xl md:text-2xl font-bold text-gray-900">
                                  {money(nightlyRoomsOnly)}
                                </span>
                                <span className="text-sm text-gray-700">CAD</span>
                              </div>
                              <div className="text-[11px] text-gray-500 uppercase tracking-wide">
                                CAD / Night
                              </div>
                            </div>
                          

                            {/* View rates button (go to Hotel Info) */}
                                 <button
                                    onClick={() => {
                                      
                                    const params = new URLSearchParams({
                                      hotelId: String(room.hotelId || ''),
                                      hotelNo: String(room.hotelNo || ''),
                                      roomTypeId: String(room.roomTypeId || ''),

                                      // dates / party
                                      checkIn: startDate,
                                      checkOut: endDate,
                                      adult: String(adults),
                                      child: String(children),
                                      infant: String(infants),
                                      pet: pet ? 'yes' : 'no',

                                      // seed UI
                                      total: String(room.totalPrice || 0),
                                      petFee: String(room.petFeeAmount || 0),
                                      currency: room.currencyCode || 'CAD',

                                      // helps hotel page re-price without another geocode
                                      lat: String(room.lat ?? ''),
                                      lng: String(room.lng ?? ''),

                                      // name for meta/images (make safe)
                                     name: room.hotelName || room.RoomType || '',

                                    });
                                    router.push(`/hotel/${room.hotelId}?${params.toString()}`);

                                    }}
                                     className="bg-[#211F45] text-white font-semibold px-8 py-3 rounded-[25px] hover:opacity-90 transition"
                                  >
                                    View rates
                                  </button>
                          </div>
                        </div>
                      </div>


                
                  {/* END Bottom bar: button + grand total */}
                         
            </div>
          );
        })}
      </div>
      </div>
    
  );
}

/* Default export wrapped in Suspense*/
export default function SearchResultsPage() {
  return (
     <>
      <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-6">Loading…</div>}>
        <ResultsContent />
      </Suspense>

      {/* Chatbot shows only on this page */}
      <Suspense fallback={null}>
        <ChatbotWidget />
      </Suspense>
    </>
  );
}
