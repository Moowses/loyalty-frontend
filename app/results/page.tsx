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

function isCalabogieListing(room: any) {
  const hid = String(room?.hotelId ?? room?.hotelNo ?? '').trim().toUpperCase();
  if (hid === 'CBE') return true;
  const name = String(room?.hotelName ?? room?.hotelNameEN ?? room?.RoomType ?? '').trim().toLowerCase();
  return name.startsWith('calabogie escapes') || name.includes('calabogie');
}

function roomValueNum(v: any) {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function sumDailyPricesMap(v: any): number {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return 0;
  return Object.values(v).reduce((acc, cur) => acc + roomValueNum(cur), 0);
}

function roomTotalValue(room: any): number {
  const direct = roomValueNum(room?.totalPrice ?? room?.roomSubtotal ?? room?.grossAmountUpstream ?? 0);
  if (direct > 0) return direct;
  const summed = sumDailyPricesMap(room?.dailyPrices);
  return summed > 0 ? summed : 0;
}

function safeArrayDataLoose(j: any): any[] | null {
  if (!j) return null;
  const rows = j?.data?.rows;
  if (Array.isArray(rows)) return rows;
  let root: any = j;
  if (root && typeof root === 'object' && 'data' in root) root = root.data;
  if (typeof root === 'string') return null;
  if (Array.isArray(root)) return root;
  if (root && typeof root === 'object' && Array.isArray(root.data)) return root.data;
  return null;
}

function propertyMetaFromName(name?: string): { meta: any; folder: string } {
  if (!name) return { meta: null, folder: '' };
  const candidates = Array.from(new Set([slugMap[name], dashedSlug(name), condensedSlug(name)].filter(Boolean)));
  for (const folder of candidates) {
    try {
      const meta = require(`@/public/properties/${folder}/meta.json`);
      return { meta, folder: String(folder) };
    } catch {}
  }
  return { meta: null, folder: String(candidates[0] || '') };
}

const CALABOGIE_ROOM_FOLDER_BY_ID: Record<string, string> = {
  'ae50e6a8-29dd-447d-840c-b3f40144635d': 'CA1B',
  '3b427e83-f01e-4cf8-83cc-b3f4014439f6': 'CH2B',
  '82c0ab4c-8a5c-4d77-aaae-b3f40143f53b': 'CH3B',
  '8767d68e-188d-42ff-811e-b31b011b278b': '1 Bedroom Loft',
};

function compactSlug(s: string) {
  return s.replace(/[^a-z0-9]/gi, '').toUpperCase();
}

function getCalabogieRoomFolder(room: any): string {
  const rid = String(room?.roomTypeId ?? room?.RoomTypeId ?? room?.RoomTypeID ?? '').trim();
  const fromId = CALABOGIE_ROOM_FOLDER_BY_ID[rid];
  if (fromId) return fromId;
  const fromName = String(room?.roomTypeName ?? room?.RoomType ?? '').trim();
  if (!fromName) return '';
  const compact = compactSlug(fromName);
  if (compact === '1BEDROOMLOFT') return '1 Bedroom Loft';
  return compact;
}

function getCalabogieMeta(room: any): any {
  const folder = getCalabogieRoomFolder(room);
  try {
    if (folder === 'CA1B') return require('@/public/calabogie-properties/CA1B/meta.json');
    if (folder === 'CH2B') return require('@/public/calabogie-properties/CH2B/meta.json');
    if (folder === 'CH3B') return require('@/public/calabogie-properties/CH3B/meta.json');
    if (folder === '1 Bedroom Loft') return require('@/public/calabogie-properties/1 Bedroom Loft/meta.json');
  } catch {}
  return null;
}

function getRoomModalVisual(room: any) {
  if (isCalabogieListing(room)) {
    const folder = getCalabogieRoomFolder(room);
    const meta = getCalabogieMeta(room);
    const hero = folder ? `/calabogie-properties/${folder}/hero.png` : '';
    const galleryFromMeta = Array.isArray(meta?.gallery)
      ? meta.gallery
          .map((f: any) => String(f || '').trim())
          .filter(Boolean)
          .map((f: string) => `/calabogie-properties/${folder}/${f}`)
      : [];
    return {
      hero,
      gallery: Array.from(new Set(galleryFromMeta.length ? galleryFromMeta : hero ? [hero] : [])),
      meta,
    };
  }

  const name = String(room?.hotelName || room?.hotelNameEN || room?.RoomType || '');
  const hero = getHotelImage(name);
  const { meta, folder } = propertyMetaFromName(name);
  const galleryFromMeta = Array.isArray(meta?.gallery)
    ? meta.gallery
        .map((f: any) => String(f || '').trim())
        .filter(Boolean)
        .map((f: string) => `/properties/${folder}/${f}`)
    : [];
  return {
    hero,
    gallery: Array.from(new Set(galleryFromMeta.length ? galleryFromMeta : hero ? [hero] : [])),
    meta,
  };
}

type RoomPickerContext = {
  hotelId: string;
  hotelNo: string;
  hotelName: string;
  lat: string;
  lng: string;
  seedRoomTypeId: string;
  isCalabogie: boolean;
};

  const [roomPickerOpen, setRoomPickerOpen] = useState(false);
  const [roomPickerLoading, setRoomPickerLoading] = useState(false);
  const [roomPickerError, setRoomPickerError] = useState('');
  const [roomPickerRooms, setRoomPickerRooms] = useState<any[]>([]);
  const [roomPickerSelectedId, setRoomPickerSelectedId] = useState('');
  const [roomPickerCtx, setRoomPickerCtx] = useState<RoomPickerContext | null>(null);
  const [roomPickerStartDate, setRoomPickerStartDate] = useState('');
  const [roomPickerEndDate, setRoomPickerEndDate] = useState('');
  const [roomPickerShowCal, setRoomPickerShowCal] = useState(false);
  const [roomPickerLightboxImages, setRoomPickerLightboxImages] = useState<string[]>([]);
  const [roomPickerLightboxIndex, setRoomPickerLightboxIndex] = useState(0);
  const [roomPickerLightboxTitle, setRoomPickerLightboxTitle] = useState('');

  const loadRoomPickerRooms = async (ctx: RoomPickerContext, dateStart = startDate, dateEnd = endDate) => {
    setRoomPickerLoading(true);
    setRoomPickerError('');
    setRoomPickerRooms([]);
    try {
      let arr: any[] | null = null;
      if (ctx.isCalabogie) {
        const qs = new URLSearchParams({
          startDate: dateStart,
          endDate: dateEnd,
          adult: String(adults),
          child: String(children),
          infant: String(infants),
          pet: pet ? 'yes' : 'no',
          currency: 'CAD',
        });
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/calabogie/results?${qs.toString()}`);
        const j = await res.json();
        const rows = safeArrayDataLoose(j);
        arr = Array.isArray(rows) ? rows.filter((x: any) => isCalabogieListing(x) && !isPlaceholderRoom(x)) : null;
      } else {
        const qs = new URLSearchParams({
          startDate: dateStart,
          endDate: dateEnd,
          adult: String(adults),
          child: String(children),
          infant: String(infants),
          pet: pet ? 'yes' : 'no',
          lat: ctx.lat || lat,
          lng: ctx.lng || lng,
        } as any);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/booking/availability?${qs.toString()}`);
        const j = await res.json();
        const rows = safeArrayData(j);
        arr =
          rows === null
            ? null
            : rows.filter((x: any) => {
                const sameId = ctx.hotelId && String(x?.hotelId || '').trim() === ctx.hotelId;
                const sameNo = ctx.hotelNo && String(x?.hotelNo || '').trim() === ctx.hotelNo;
                const sameName =
                  ctx.hotelName &&
                  String(x?.hotelName || '').trim().toLowerCase() === ctx.hotelName.toLowerCase();
                return !isPlaceholderRoom(x) && (sameId || sameNo || sameName);
              });
      }

      if (!Array.isArray(arr)) {
        setRoomPickerRooms([]);
        setRoomPickerError('No room types available for the selected dates.');
        return;
      }

      const deduped = arr.filter(
        (row: any, idx: number, list: any[]) =>
          list.findIndex((x) => String(x?.roomTypeId || x?.RoomTypeId || x?.RoomTypeID || '') === String(row?.roomTypeId || row?.RoomTypeId || row?.RoomTypeID || '')) === idx
      );

      deduped.sort((a: any, b: any) => {
        const aId = String(a?.roomTypeId || a?.RoomTypeId || a?.RoomTypeID || '');
        const bId = String(b?.roomTypeId || b?.RoomTypeId || b?.RoomTypeID || '');
        if (aId === ctx.seedRoomTypeId && bId !== ctx.seedRoomTypeId) return -1;
        if (bId === ctx.seedRoomTypeId && aId !== ctx.seedRoomTypeId) return 1;
        return roomTotalValue(a) - roomTotalValue(b);
      });

      setRoomPickerRooms(deduped);
      setRoomPickerSelectedId((prev) => prev || String(deduped[0]?.roomTypeId || deduped[0]?.RoomTypeId || deduped[0]?.RoomTypeID || ''));
      if (!deduped.length) setRoomPickerError('No room types available for the selected dates.');
    } catch (e) {
      console.error('room picker fetch error', e);
      setRoomPickerRooms([]);
      setRoomPickerError('Something went wrong while loading room types.');
    } finally {
      setRoomPickerLoading(false);
    }
  };

  const openRoomPicker = async (seedRoom: any) => {
    const ctx: RoomPickerContext = {
      hotelId: String(seedRoom?.hotelId || '').trim(),
      hotelNo: String(seedRoom?.hotelNo || '').trim(),
      hotelName: String(seedRoom?.hotelName || seedRoom?.RoomType || '').trim(),
      lat: String(seedRoom?.lat ?? ''),
      lng: String(seedRoom?.lng ?? ''),
      seedRoomTypeId: String(seedRoom?.roomTypeId || '').trim(),
      isCalabogie: isCalabogieListing(seedRoom),
    };

    setRoomPickerCtx(ctx);
    setRoomPickerSelectedId(ctx.seedRoomTypeId);
    setRoomPickerOpen(true);
    setRoomPickerStartDate(startDate);
    setRoomPickerEndDate(endDate);
    await loadRoomPickerRooms(ctx, startDate, endDate);
  };

  useEffect(() => {
    if (!roomPickerOpen || !roomPickerCtx) return;
    if (!startDate || !endDate) return;
    if (roomPickerStartDate === startDate && roomPickerEndDate === endDate) return;
    setRoomPickerStartDate(startDate);
    setRoomPickerEndDate(endDate);
    void loadRoomPickerRooms(roomPickerCtx, startDate, endDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomPickerOpen, roomPickerCtx, startDate, endDate]);

  const roomPickerSelectedRoom = useMemo(
    () =>
      roomPickerRooms.find((r: any) => String(r?.roomTypeId || r?.RoomTypeId || r?.RoomTypeID || '') === roomPickerSelectedId) ||
      roomPickerRooms[0] ||
      null,
    [roomPickerRooms, roomPickerSelectedId]
  );

  const continueRoomPicker = () => {
    const room = roomPickerSelectedRoom;
    const ctx = roomPickerCtx;
    if (!room || !ctx) return;

    const hotelId = String(room?.hotelId || room?.hotelNo || ctx.hotelId || ctx.hotelNo || '');
    const hotelNo = String(room?.hotelNo || room?.hotelId || ctx.hotelNo || ctx.hotelId || '');
    const roomTypeId = String(room?.roomTypeId || room?.RoomTypeId || room?.RoomTypeID || '');
    const visualMeta = getRoomModalVisual(room);
    const roomTypeName = String(
      visualMeta?.meta?.name ||
      visualMeta?.meta?.hotelName ||
      room?.roomTypeName ||
      room?.RoomType ||
      room?.roomType ||
      'Room Type'
    );
    const roomTotal = roomTotalValue(room);
    const petFeeAmount = roomValueNum(room?.petFeeAmount);
    const currency = String(room?.currencyCode || 'CAD');

    if (ctx.isCalabogie) {
      const query = new URLSearchParams({
        hotelId: 'CBE',
        hotelNo: 'CBE',
        roomTypeId,
        roomTypeName,
        checkIn: roomPickerStartDate || startDate,
        checkOut: roomPickerEndDate || endDate,
        adult: String(adults),
        child: String(children),
        infant: String(infants),
        pet: pet ? 'yes' : 'no',
        rooms: String(roomsCount),
        total: String(roomTotal + petFeeAmount),
        petFee: String(petFeeAmount),
        currency,
        name: String(room?.hotelName || 'Calabogie Escapes'),
      });
      router.push(`/calabogie/hotel?${query.toString()}`);
      return;
    }

    const query = new URLSearchParams({
      hotelId,
      hotelNo,
      roomTypeId,
      roomTypeName,
      checkIn: roomPickerStartDate || startDate,
      checkOut: roomPickerEndDate || endDate,
      adult: String(adults),
      child: String(children),
      infant: String(infants),
      pet: pet ? 'yes' : 'no',
      rooms: String(roomsCount),
      total: String(roomTotal),
      petFee: String(petFeeAmount),
      currency,
      lat: String(room?.lat ?? ctx.lat ?? lat),
      lng: String(room?.lng ?? ctx.lng ?? lng),
      name: String(room?.hotelName || ctx.hotelName),
    });
    router.push(`/hotel/${hotelId}?${query.toString()}`);
  };

  const roomPickerMoney = (n: number) =>
    new Intl.NumberFormat('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    document.body.setAttribute('data-room-picker-open', roomPickerOpen ? '1' : '0');
    (window as any).__dtcHideChatAll = roomPickerOpen;
    window.dispatchEvent(new Event('dtc-chat-visibility-change'));

    const closeBtn = document.getElementById('dtc-chat-launcher-close-btn') as HTMLButtonElement | null;
    if (closeBtn && roomPickerOpen) closeBtn.style.display = 'none';

    // Fallback: hide small floating launchers (chat widgets often inject outside our control).
    const hiddenEls: HTMLElement[] = [];
    if (roomPickerOpen) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const all = Array.from(document.body.querySelectorAll('*')) as HTMLElement[];
      for (const el of all) {
        if (el.closest('[data-room-picker-modal-root="1"]')) continue;
        if (el.id === 'dtc-chat-launcher-close-btn') continue;
        const tag = el.tagName.toLowerCase();
        if (!['iframe', 'div', 'button'].includes(tag)) continue;
        const cs = window.getComputedStyle(el);
        if (cs.position !== 'fixed') continue;
        const z = Number(cs.zIndex || '0');
        if (!Number.isFinite(z) || z < 1000) continue;
        const r = el.getBoundingClientRect();
        const small = r.width > 0 && r.height > 0 && r.width <= 180 && r.height <= 180;
        const nearEdge = r.right >= vw - 40 || r.left <= 40 || r.bottom >= vh - 40;
        if (!small || !nearEdge) continue;
        el.dataset.prevDisplay = el.style.display || '';
        el.style.display = 'none';
        hiddenEls.push(el);
      }
    }

    return () => {
      document.body.removeAttribute('data-room-picker-open');
      (window as any).__dtcHideChatAll = false;
      window.dispatchEvent(new Event('dtc-chat-visibility-change'));
      for (const el of hiddenEls) {
        el.style.display = el.dataset.prevDisplay || '';
        delete el.dataset.prevDisplay;
      }
    };
  }, [roomPickerOpen]);

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

	    const calabogieVisualForCard = isCalabogieListing(room) ? getRoomModalVisual(room) : null;
	    const imgSrc = calabogieVisualForCard?.hero || getHotelImage(room.hotelName);

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
	    const calabogieMetaForCard = calabogieVisualForCard?.meta || null;
	    const displayRoomTypeName = isCalabogieListing(room)
	      ? 'Calabogie Escapes'
	      : String(
	          calabogieMetaForCard?.name ||
	          calabogieMetaForCard?.hotelName ||
	          room?.roomTypeName ||
	          room?.RoomType ||
	          '-'
	        );
    

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
                            <span className="font-medium text-gray-900">{displayRoomTypeName}</span>
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
                                      openRoomPicker(room);
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

      {roomPickerOpen &&
        createPortal(
          <div className="fixed inset-0 z-[10040]" data-room-picker-modal-root="1">
            <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={() => setRoomPickerOpen(false)} />
            <div className="absolute inset-0 p-2 md:p-6">
              <div className="relative mx-auto h-full max-w-6xl overflow-hidden rounded-2xl md:rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 flex flex-col">
                <div className="border-b border-gray-200 px-4 md:px-6 py-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-gray-500">Room Selection</div>
                    <h3 className="mt-1 text-xl md:text-2xl font-semibold text-gray-900">
                      {roomPickerCtx?.hotelName || 'Choose a room type'}
                    </h3>
                    <div className="mt-1 text-sm text-gray-600">
                      {(roomPickerStartDate || startDate)} to {(roomPickerEndDate || endDate)} • {nights > 0 ? nights : 1} night{nights === 1 ? '' : 's'}
                    </div>
                    {roomPickerLoading && <div className="mt-2 text-xs text-gray-500">Updating rooms...</div>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setRoomPickerOpen(false)}
                    className="rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>

                {roomPickerShowCal && (
                  <div className="absolute inset-0 z-[5] bg-black/20 backdrop-blur-[1px] p-3 md:p-5">
                    <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white shadow-2xl p-4 md:p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-base md:text-lg font-semibold text-gray-900">Select dates</div>
                        <button
                          type="button"
                          onClick={() => setRoomPickerShowCal(false)}
                          className="text-sm px-3 py-1 rounded-lg border hover:bg-gray-50"
                        >
                          Close
                        </button>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <button
                          type="button"
                          className="px-3 py-1 rounded-lg border hover:bg-gray-50"
                          onClick={() =>
                            setViewMonth(
                              new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1)
                            )
                          }
                        >
                          Prev
                        </button>
                        <div className="flex items-center gap-4 md:gap-8">
                          <div className="text-sm md:text-base font-semibold text-gray-900">
                            {format(leftMonth, "MMMM yyyy")}
                          </div>
                          {!isMobile && (
                            <div className="text-sm md:text-base font-semibold text-gray-900">
                              {format(rightMonth, "MMMM yyyy")}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
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

                      {!isMobile ? (
                        <div className="grid grid-cols-2 gap-6">
                          {[leftDays, rightDays].map((days, idx) => (
                            <div key={idx}>
                              <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-1">
                                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                                  <div key={d} className="py-1">{d}</div>
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
                      ) : (
                        <>
                          <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-1">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                              <div key={d} className="py-1">{d}</div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {leftDays.map(({ date, currentMonth }, i) => (
                              <div key={i} className="flex items-center justify-center">
                                <DayCell d={date} muted={!currentMonth} />
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      <div className="flex items-center justify-between mt-4 gap-2">
                        <button
                          type="button"
                          className="text-sm text-gray-700 hover:underline"
                          onClick={() => {
                            setCheckIn(null);
                            setCheckOut(null);
                          }}
                        >
                          Reset
                        </button>
                        <div className="text-xs md:text-sm text-gray-600 text-center">
                          {checkIn && !checkOut && "Select a check-out date"}
                          {checkIn && checkOut && `${nights} night${nights > 1 ? "s" : ""} selected`}
                          {!checkIn && !checkOut && "Select a check-in date"}
                        </div>
                        <button
                          type="button"
                          onClick={() => setRoomPickerShowCal(false)}
                          className="text-sm px-4 py-2 rounded-full bg-[#1f2345] text-white disabled:bg-gray-300"
                          disabled={!checkIn || !checkOut}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="min-h-0 flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="min-h-0 overflow-y-auto bg-[#fafbfc] p-4 md:p-6">
                    {roomPickerLoading && (
                      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
                        Loading room types...
                      </div>
                    )}
                    {!roomPickerLoading && roomPickerError && roomPickerRooms.length === 0 && (
                      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
                        {roomPickerError}
                      </div>
                    )}

                    <div className="space-y-4">
                      {roomPickerRooms.map((pickRoom: any, idx: number) => {
                        const rtId = String(pickRoom?.roomTypeId || pickRoom?.RoomTypeId || pickRoom?.RoomTypeID || '').trim();
                        const visual = getRoomModalVisual(pickRoom);
                        const rtName = String(
                          visual?.meta?.name ||
                          visual?.meta?.hotelName ||
                          pickRoom?.roomTypeName ||
                          pickRoom?.RoomType ||
                          pickRoom?.roomType ||
                          'Room Type'
                        ).trim();
                        const total = roomTotalValue(pickRoom);
                        const nightly = nights > 0 ? total / nights : total;
                        const ccy = String(pickRoom?.currencyCode || 'CAD');
                        const selected = rtId === roomPickerSelectedId;
                        const desc = String(
                          visual?.meta?.descriptionShort ??
                            visual?.meta?.shortDescription ??
                            visual?.meta?.description ??
                            'Private stay with premium amenities and curated comfort.'
                        ).trim();
                        const addr = String(visual?.meta?.Address ?? visual?.meta?.address ?? '').trim();

                        return (
                          <div
                            key={`${rtId || idx}`}
                            className={`rounded-2xl border bg-white p-4 md:p-5 shadow-sm transition ${
                              selected ? 'border-[#1f2345] ring-2 ring-[#1f2345]/10' : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex flex-col md:flex-row gap-4">
                              <div className="w-full md:w-[230px] shrink-0">
                                <button
                                  type="button"
                                  className="relative h-40 md:h-[160px] w-full rounded-xl overflow-hidden bg-gray-100 group"
                                  onClick={() => {
                                    if (!visual.gallery?.length && !visual.hero) return;
                                    const imgs = visual.gallery?.length ? visual.gallery : visual.hero ? [visual.hero] : [];
                                    if (!imgs.length) return;
                                    setRoomPickerLightboxImages(imgs);
                                    setRoomPickerLightboxIndex(0);
                                    setRoomPickerLightboxTitle(rtName);
                                  }}
                                  aria-label={`View ${rtName} photos`}
                                >
                                  {visual.hero ? (
                                    <Image src={visual.hero} alt={rtName} fill className="object-cover transition duration-200 group-hover:scale-105" />
                                  ) : (
                                    <div className="w-full h-full bg-gray-200" />
                                  )}
                                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5 text-left">
                                    <span className="text-[11px] font-medium text-white">
                                      View photos{visual.gallery?.length > 1 ? ` (${visual.gallery.length})` : ''}
                                    </span>
                                  </div>
                                </button>
                                {visual.gallery?.length > 1 && (
                                  <div className="mt-2 grid grid-cols-4 gap-2">
                                    {visual.gallery.slice(0, 4).map((src: string, gIdx: number) => (
                                      <button
                                        key={`${src}-${gIdx}`}
                                        type="button"
                                        className="relative h-11 rounded-md overflow-hidden bg-gray-100"
                                        onClick={() => {
                                          setRoomPickerLightboxImages(visual.gallery || []);
                                          setRoomPickerLightboxIndex(gIdx);
                                          setRoomPickerLightboxTitle(rtName);
                                        }}
                                        aria-label={`View ${rtName} photo ${gIdx + 1}`}
                                      >
                                        <Image src={src} alt={`${rtName} ${gIdx + 1}`} fill className="object-cover" />
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-lg font-semibold text-gray-900">{rtName}</h4>
                                  {selected && (
                                    <span className="rounded-full bg-[#1f2345] text-white text-[11px] px-2.5 py-1 uppercase tracking-wide font-semibold">
                                      Selected
                                    </span>
                                  )}
                                  {roomPickerCtx?.seedRoomTypeId === rtId && (
                                    <span className="rounded-full bg-amber-100 text-amber-900 text-[11px] px-2.5 py-1 uppercase tracking-wide font-semibold">
                                      Match from search
                                    </span>
                                  )}
                                </div>
                                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                                  {desc || 'Private stay with premium amenities and curated comfort.'}
                                </p>
                                {addr && <p className="mt-2 text-xs text-gray-500">{addr}</p>}
                              </div>

                              <div className="md:text-right md:min-w-[185px]">
                                <div className="text-xs uppercase tracking-wide text-gray-500">Room only</div>
                                <div className="mt-1 text-2xl font-semibold text-gray-900">{roomPickerMoney(nightly)}</div>
                                <div className="text-xs text-gray-500">{ccy} / night</div>
                                <div className="mt-1 text-xs text-gray-600">{roomPickerMoney(total)} {ccy} total</div>
                                <button
                                  type="button"
                                  onClick={() => setRoomPickerSelectedId(rtId)}
                                  className={`mt-3 w-full rounded-full px-4 py-2 text-sm font-semibold transition ${
                                    selected ? 'bg-[#1f2345] text-white' : 'border border-gray-300 text-gray-800 hover:bg-gray-50'
                                  }`}
                                >
                                  {selected ? 'Selected' : 'Select room'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <aside className="hidden lg:flex border-t lg:border-t-0 lg:border-l border-gray-200 bg-white p-4 md:p-5 flex-col">
                    <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-gray-500">ROOM TYPE SELECTED</div>
                    <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
                      {String(
                        (roomPickerSelectedRoom ? (getRoomModalVisual(roomPickerSelectedRoom)?.meta?.name || getRoomModalVisual(roomPickerSelectedRoom)?.meta?.hotelName) : '') ||
                        roomPickerSelectedRoom?.roomTypeName ||
                        roomPickerSelectedRoom?.RoomType ||
                        'Choose a room type'
                      )}
                    </div>

                    <div className="mt-4 space-y-3 text-sm">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[11px] uppercase tracking-wide text-gray-500">Dates</div>
                          <button
                            type="button"
                            onClick={() => setRoomPickerShowCal(true)}
                            className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <CalIcon className="w-3.5 h-3.5" />
                            Edit
                          </button>
                        </div>
                        <div className="font-medium text-gray-900">{roomPickerStartDate || startDate} → {roomPickerEndDate || endDate}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">Guests</div>
                        <div className="font-medium text-gray-900">{adults + children + infants}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">Nights</div>
                        <div className="font-medium text-gray-900">{nights > 0 ? nights : 1}</div>
                      </div>
                    </div>

                    <div className="my-4 h-px bg-gray-200" />

                    <div>
                      <div className="text-sm text-gray-600">Price per night</div>
                      <div className="mt-1 text-3xl leading-none font-semibold text-gray-900">
                        {roomPickerMoney(roomPickerSelectedRoom ? (nights > 0 ? roomTotalValue(roomPickerSelectedRoom) / nights : roomTotalValue(roomPickerSelectedRoom)) : 0)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {String(roomPickerSelectedRoom?.currencyCode || 'CAD')} / night (room only)
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-[#e6e8f2] bg-[#f6f7fb] p-4">
                      <div className="text-sm text-gray-600">Booking summary</div>
                      <div className="mt-1 text-lg font-semibold text-[#1f2345]">{roomPickerCtx?.hotelName || 'Property'}</div>
                      <p className="mt-2 text-xs text-gray-600">
                        Rates shown are for your selected dates and party size. Final fees and taxes appear on the next step.
                      </p>
                    </div>

                    <div className="mt-auto pt-5">
                      <button
                        type="button"
                        disabled={!roomPickerSelectedRoom || roomPickerLoading}
                        onClick={continueRoomPicker}
                        className={`w-full rounded-full px-5 py-3 text-sm font-semibold transition ${
                          roomPickerSelectedRoom && !roomPickerLoading
                            ? 'bg-[#1f2345] text-white hover:brightness-110'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        Continue to Reserve
                      </button>
                    </div>
                  </aside>
                </div>

                <div className="lg:hidden border-t border-gray-200 bg-white/95 backdrop-blur px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-gray-500">Room Selected</div>
                      <div className="truncate text-sm font-semibold text-gray-900">
                        {String(
                          (roomPickerSelectedRoom ? (getRoomModalVisual(roomPickerSelectedRoom)?.meta?.name || getRoomModalVisual(roomPickerSelectedRoom)?.meta?.hotelName) : '') ||
                          roomPickerSelectedRoom?.roomTypeName ||
                          roomPickerSelectedRoom?.RoomType ||
                          'Choose a room type'
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {String(roomPickerSelectedRoom?.currencyCode || 'CAD')} {roomPickerMoney(roomPickerSelectedRoom ? (nights > 0 ? roomTotalValue(roomPickerSelectedRoom) / nights : roomTotalValue(roomPickerSelectedRoom)) : 0)} / night
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">
                          <CalIcon className="w-3.5 h-3.5" />
                          {roomPickerStartDate || startDate} → {roomPickerEndDate || endDate}
                        </span>
                        <button
                          type="button"
                          onClick={() => setRoomPickerShowCal(true)}
                          className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white w-7 h-7 text-gray-700 hover:bg-gray-50"
                          aria-label="Change dates"
                        >
                          <CalIcon className="w-3.5 h-3.5" />
                        </button>
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">
                          <UsersIcon className="w-3.5 h-3.5" />
                          {adults + children + infants}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">
                          <CalIcon className="w-3.5 h-3.5" />
                          {nights > 0 ? nights : 1}N
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!roomPickerSelectedRoom || roomPickerLoading}
                      onClick={continueRoomPicker}
                      className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                        roomPickerSelectedRoom && !roomPickerLoading
                          ? 'bg-[#1f2345] text-white'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {roomPickerLightboxImages.length > 0 &&
        createPortal(
          <div className="fixed inset-0 z-[10060] bg-black/90 flex items-center justify-center p-3 md:p-5">
            <button
              type="button"
              className="absolute top-3 right-3 md:top-4 md:right-4 rounded-full bg-white/15 hover:bg-white/25 text-white w-10 h-10 text-xl"
              onClick={() => setRoomPickerLightboxImages([])}
              aria-label="Close photos"
            >
              x
            </button>
            {roomPickerLightboxImages.length > 1 && (
              <button
                type="button"
                className="absolute left-3 md:left-5 rounded-full bg-white/15 hover:bg-white/25 text-white w-10 h-10 text-xl"
                onClick={() =>
                  setRoomPickerLightboxIndex((prev) => (prev - 1 + roomPickerLightboxImages.length) % roomPickerLightboxImages.length)
                }
                aria-label="Previous photo"
              >
                {'<'}
              </button>
            )}
            <div className="w-full max-w-5xl">
              <div className="relative w-full h-[52vh] md:h-[70vh] bg-black rounded-2xl overflow-hidden">
                <Image
                  src={roomPickerLightboxImages[roomPickerLightboxIndex]}
                  alt={`${roomPickerLightboxTitle} photo ${roomPickerLightboxIndex + 1}`}
                  fill
                  className="object-contain"
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-white">
                <div className="text-sm md:text-base font-medium">{roomPickerLightboxTitle}</div>
                <div className="text-xs md:text-sm text-white/80">
                  {roomPickerLightboxIndex + 1} / {roomPickerLightboxImages.length}
                </div>
              </div>
            </div>
            {roomPickerLightboxImages.length > 1 && (
              <button
                type="button"
                className="absolute right-3 md:right-5 rounded-full bg-white/15 hover:bg-white/25 text-white w-10 h-10 text-xl"
                onClick={() =>
                  setRoomPickerLightboxIndex((prev) => (prev + 1) % roomPickerLightboxImages.length)
                }
                aria-label="Next photo"
              >
                {'>'}
              </button>
            )}
          </div>,
          document.body
        )}
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
