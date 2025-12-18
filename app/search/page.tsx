'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { HOTEL_POINTS } from '@/data/hotels';
import { ONTARIO_CENTROIDS } from '@/data/centroids';

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
} from 'date-fns';
  import Script from 'next/script';

const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';



/* Icons  */
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

/* Shared types */
type Place = { label: string; lat?: number; lng?: number };
type Day = { date: Date; currentMonth: boolean };


/*Destination Picker  */
function DestinationPicker({
  isMobile,
  value,
  setValue,
 
}: {
  isMobile: boolean;
  value: Place | null;
  setValue: (p: Place | null) => void;
  onPropertySelect?: (baseUrl: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Recents
  const [recents, setRecents] = useState<Place[]>([]);
  useEffect(() => {
    const raw = localStorage.getItem('recentSearches');
    if (raw) setRecents(JSON.parse(raw));
  }, []);
  const pushRecent = (item: Place) => {
    const next = [item, ...recents.filter((r) => r.label !== item.label)].slice(0, 5);
    setRecents(next);
    localStorage.setItem('recentSearches', JSON.stringify(next));
  };

  /* Desktop dropdown */
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<
    Array<{ label: string; lat: number; lon: number }>
  >([]);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 300 });

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || isMobile) return;
    const calc = () => {
      const r = triggerRef.current!.getBoundingClientRect();
      setPos({
        top: r.bottom + 8,
        left: Math.max(8, Math.min(r.left, window.innerWidth - 300)),
        width: Math.min(300, r.width),
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

    // Fixed popular properties for direct booking
  const POPULAR_PROPERTIES = [
    {
      label: "Nordic Spa Getaway",
      url: "https://dreamtripclub.com/hotel/276302?hotelId=276302&hotelNo=GSL&roomTypeId=276302&&name=Getaway+on+Stoney+Lake",
    },
    {
      label: "Your Dream Getaway",
      url: "https://dreamtripclub.com/hotel/276301?hotelId=276301&hotelNo=YDG&roomTypeId=425356&&name=Your+dream+getaway",
    },
    {
      label: "Escape From Life",
      url: "https://dreamtripclub.com/hotel/276303?hotelId=276303&hotelNo=EFL&roomTypeId=276303&&name=escape+from+life",
    },
    {
      label: "Tiny Home Experience",
      url: "https://dreamtripclub.com/hotel/302995?hotelId=302995&hotelNo=SITHE&roomTypeId=302995&&name=Tiny+Home+Experience",
    },
  ];


 // In your DestinationPicker component, modify the search effect:
useEffect(() => {
  if (!open || !query.trim()) {
    setResults([]);
    return;
  }

  const id = setTimeout(async () => {
    try {
      const q = query.toLowerCase();

      // 1) Your hotels first (only those with lat/lng defined)
const hotelMatches = HOTEL_POINTS
  .filter((h: AnyHotel) => hotelHaystack(h).includes(q))
  .filter(hasCoords)
  .slice(0, 5)
  .map((h: AnyHotel & { lat: number; lng: number }) => ({
    label: hotelTitle(h),
    lat: h.lat,
    lon: h.lng,
  }));



      // 2) Ontario centroids (fallback)
      const centroidMatches = ONTARIO_CENTROIDS
        .filter(c => c.label.toLowerCase().includes(q))
        .slice(0, 5)
        .map(c => ({ label: c.label, lat: c.lat, lon: c.lng }));

      // 3) OSM (Canada-biased) – optional
      let osmResults: Array<{ label: string; lat: number; lon: number }> = [];
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=ca&addressdetails=1&q=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        const data = await res.json();
        osmResults = (Array.isArray(data) ? data : []).map((d: any) => {
          const city = d.address?.city || d.address?.town || d.address?.village || d.address?.county || '';
          const state = d.address?.state || d.address?.region || '';
          const label = [city, state].filter(Boolean).join(', ') || (d.display_name?.split(',').slice(0, 2).join(', ') ?? '');
          return { label, lat: +d.lat, lon: +d.lon };
        });
      } catch {}

      // Merge (hotels → centroids → OSM) and de-dupe by label
      const merged: Record<string, { label: string; lat: number; lon: number }> = {};
      [...hotelMatches, ...centroidMatches, ...osmResults].forEach(x => (merged[x.label] = x));
      setResults(Object.values(merged).slice(0, 6));
    } catch {
      // Fallback: centroids only
      const centroidMatches = ONTARIO_CENTROIDS
        .filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 6)
        .map(c => ({ label: c.label, lat: c.lat, lon: c.lng }));
      setResults(centroidMatches);
    }
  }, 250);

  return () => clearTimeout(id);
}, [query, open]);


  // Event bridge so parent can open this modal
  useEffect(() => {
    const openHandler = () => {
      if (isMobile) setShowDest(true);
      else setOpen(true);
    };
    window.addEventListener('open-dest-modal', openHandler);
    return () => window.removeEventListener('open-dest-modal', openHandler);
  }, [isMobile]);

  const finalizePick = (place: Place) => {
  setValue(place);
  // NEW: share the anchor for the map
  try { localStorage.setItem('lastDestPick', JSON.stringify({ lat: place.lat, lng: place.lng })); } catch {}
  window.dispatchEvent(new Event('dest-picked')); // notify listeners
  pushRecent(place);
  setShowDest(false);
  setOpen(false);
};


  const choose = (item: { label: string; lat: number; lon: number }) =>
    finalizePick({ label: item.label, lat: item.lat, lng: item.lon });

  /* Mobile full-screen modal */
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
          destQuery,
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

  const useCurrentLocation = () => {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(async (p) => {
    const { latitude, longitude } = p.coords;
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
      const r = await fetch(url);
      const j = await r.json();
      
      // Extract just the city/town name from the address
      const address = j.address;
      let cityName = 'Current location';
      
      // Try to get the most specific locality name
      if (address.city) {
        cityName = address.city;
      } else if (address.town) {
        cityName = address.town;
      } else if (address.village) {
        cityName = address.village;
      } else if (address.municipality) {
        cityName = address.municipality;
      } else if (address.county) {
        cityName = address.county;
      } else if (address.state) {
        cityName = address.state;
      }
      
      finalizePick({
        label: cityName,
        lat: latitude,
        lng: longitude,
      });
    } catch {
      // Fallback to just coordinates if reverse geocoding fails
      finalizePick({ 
        label: 'Current location', 
        lat: latitude, 
        lng: longitude 
      });
    }
  }, (error) => {
    console.error('Geolocation error:', error);
    // Handle geolocation errors (permission denied, etc.)
  }, {
    timeout: 10000, // 10 second timeout
    maximumAge: 600000, // 10 minute cache
    enableHighAccuracy: true
  });
};

  return (
    <div className="flex-1 min-w-[220px]">
      <div className="flex items-center gap-2 text-black uppercase tracking-wide text-[10px] font-semibold mb-1">
        <PinIcon className="w-3.5 h-3.5 text-[#F05A28]" /> Destination
      </div>

      <div ref={triggerRef}>
        <button
          type="button"
          className="w-full text-left text-lg md:text-[18px] font-semibold text-[#000000]"
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
      {mounted && open && !isMobile &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[999998]" onClick={() => setOpen(false)} />
            <div
              className="fixed z-[999999] bg-white border rounded-2xl shadow-2xl p-2"
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
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor">
                    <path d="M12 2v2m0 16v2M22 12H20M4 12H2m15.5 0a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z" strokeWidth="2" />
                  </svg>
                </span>
                <div className="text-sm font-medium text-gray-900">Use current location</div>
              </div>
              {/* show matches when user types */}
      {query && (
        <div className="mt-1">
          {results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">Searching…</div>
          ) : (
            results.map((r) => (
              <div
                key={`${r.label}-${r.lat}-${r.lon}`}
                className="flex items-start gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer"
                onClick={() => choose(r)}
              >
                <PinIcon className="w-4 h-4 mt-1 text-[#F05A28]" />
                <div className="text-sm text-gray-900">{r.label}</div>
              </div>
            ))
          )}
        </div>
      )}
              
     {!query && (
        <>
          <div className="mx-2 my-2 border-t" />
          <div className="text-xs uppercase tracking-wide text-gray-500 px-3 py-1">
            Popular Properties
          </div>
          {POPULAR_PROPERTIES.map((p) => (
            <div
              key={p.label}
              className="flex items-start gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                // Behave like a normal destination: set label, open calendar via dest-picked
                finalizePick({ label: p.label });
              }}
            >
              <PinIcon className="w-4 h-4 mt-1 text-[#F05A28]" />
              <div className="text-sm text-gray-900">{p.label}</div>
            </div>
          ))}
        </>
      )}
      </div>
          </>,
          document.body,
        )}

      {/* Mobile full-screen modal */}
      {mounted && showDest && isMobile &&
        createPortal(
          <div className="fixed inset-0 z-[100000]">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowDest(false)} />
            <div className="absolute inset-x-0 bottom-0 top-12 bg-white rounded-t-2xl shadow-2xl p-4 animate-[slideup_200ms_ease-out] overflow-y-auto">
              <style>{`@keyframes slideup{from{transform:translateY(12px);opacity:.95}to{transform:translateY(0);opacity:1}}`}</style>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xl font-semibold text-black">Where are you headed?</div>
                <button
                  className="p-2 rounded-full hover:bg-gray-100"
                  onClick={() => setShowDest(false)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className="text-[12px] uppercase tracking-wide font-semibold text-black mb-1 flex items-center gap-2">
                <PinIcon className="w-4 h-4" /> Destination
              </div>
              <input
                autoFocus
                value={destQuery}
                onChange={(e) => setDestQuery(e.target.value)}
                placeholder="Search a city, hotel, landmark…"
                className="w-full text-[16px] pb-2 border-b border-gray-300 outline-none placeholder:text-gray-800"
              />
              <div
                className="mt-4 flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer"
                onClick={useCurrentLocation}
              >
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor">
                    <path d="M12 2v2m0 16v2M22 12H20M4 12H2m15.5 0a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z" strokeWidth="2" />
                  </svg>
                </span>
                <div>
                  <div className="text-sm font-medium text-gray-900">Use current location</div>
                  <div className="text-xs text-gray-500">Use device location</div>
                </div>
              </div>
              {recents.length > 0 && (
                <>
                  <div className="my-3 border-t" />
                  

                </>
              )}
              {destQuery && (
                <>
                  <div className="my-3 border-t" />
                  <MobileResults query={destQuery} onPick={(p) => finalizePick(p)} />
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

/* helper: mobile results list */

type AnyHotel = {
  name?: string;
  label?: string;
  address?: string;
  city?: string;
  region?: string;
  lat?: number;
  lng?: number;
};

const hasCoords = (h: AnyHotel): h is Required<Pick<AnyHotel, 'lat' | 'lng'>> & AnyHotel =>
  typeof h.lat === 'number' && Number.isFinite(h.lat) &&
  typeof h.lng === 'number' && Number.isFinite(h.lng);

const hotelHaystack = (h: AnyHotel) =>
  `${h.name ?? ''} ${h.label ?? ''} ${h.address ?? ''} ${h.city ?? ''} ${h.region ?? ''}`
    .toLowerCase();

const hotelTitle = (h: AnyHotel) => {
  const title = h.name ?? h.label ?? 'Hotel';
  const cityRegion = [h.city, h.region].filter((x): x is string => !!x).join(', ');
  return cityRegion ? `${title} (${cityRegion})` : title;
};



function MobileResults({
  query,
  onPick,
}: {
  query: string;
  onPick: (p: Place) => void;
}) {
  const [list, setList] = useState<Array<{ label: string; lat: number; lon: number }>>([]);
  
 useEffect(() => {
  let cancel = false;

  const run = async () => {
    const q = query.toLowerCase();

    // 1) Hotels first (only with coords)
    // 1) Hotels first (only with coords)
const hotelMatches = HOTEL_POINTS
  .filter((h: AnyHotel) => hotelHaystack(h).includes(q))
  .filter(hasCoords)
  .slice(0, 4)
  .map((h: AnyHotel & { lat: number; lng: number }) => ({
    label: hotelTitle(h),
    lat: h.lat,
    lon: h.lng,
  }));



    // 2) Ontario centroids (fallback)
    const centroidMatches = ONTARIO_CENTROIDS
      .filter(c => c.label.toLowerCase().includes(q))
      .slice(0, 4)
      .map(c => ({ label: c.label, lat: c.lat, lon: c.lng }));

    // 3) OSM (Canada-biased)
    let osmResults: Array<{ label: string; lat: number; lon: number }> = [];
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=7&countrycodes=ca&addressdetails=1&q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      const data = await res.json();
      osmResults = (Array.isArray(data) ? data : []).map((d: any) => {
        const city = d.address?.city || d.address?.town || d.address?.village || d.address?.county || '';
        const state = d.address?.state || d.address?.region || '';
        const label = [city, state].filter(Boolean).join(', ') || (d.display_name?.split(',').slice(0, 3).join(', ') ?? '');
        return { label, lat: +d.lat, lon: +d.lon };
      });
    } catch {}

    // Merge & de-dupe
    const merged: Record<string, { label: string; lat: number; lon: number }> = {};
    [...hotelMatches, ...centroidMatches, ...osmResults].forEach(x => (merged[x.label] = x));

    if (!cancel) setList(Object.values(merged).slice(0, 10));
  };

  if (query.trim()) run();
  else {
    // default quick picks when empty
    setList(ONTARIO_CENTROIDS.slice(0, 6).map(c => ({ label: c.label, lat: c.lat, lon: c.lng })));
  }

  return () => { cancel = true; };
}, [query]);

  
  return (
    <div className="max-h-72 overflow-auto">
      {query && list.length === 0 && (
        <div className="px-1 py-4 text-sm text-gray-500">Searching…</div>
      )}
      
      {!query && (
        <div className="text-xs uppercase tracking-wide text-gray-500 px-1 py-2">
          Popular Canadian Destinations
        </div>
      )}
      
      {list.map((r, i) => (
        <div
          key={i}
          className="flex items-start gap-3 px-1 py-2 rounded-xl hover:bg-gray-50 cursor-pointer"
          onClick={() => onPick({ label: r.label, lat: r.lat, lng: r.lon })}
        >
          <PinIcon className="w-4 h-4 mt-1 text-[#F05A28]" />
          <div className="text-sm text-black">{r.label}</div>
        </div>
      ))}
    </div>
  );
}
/* Main Bias Search Bar */


/* Main Search Bar */
function SearchBar() {
  const router = useRouter();

  const [dest, setDest] = useState<Place | null>(null);
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);

  const [rooms, setRooms] = useState<number>(1);
  const [adults, setAdults] = useState<number>(1);
  const [children, setChildren] = useState<number>(0);
  const [infants, setInfants] = useState<number>(0); // added last august 10

  const [pet, setPet] = useState<boolean>(false); // added last august 13

  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setMounted(true);
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* ===== Dates ===== */
  const [showCal, setShowCal] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [calPos, setCalPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!showCal || !triggerRef.current || isMobile) return;
    const calc = () => {
      const r = triggerRef.current!.getBoundingClientRect();
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

  useEffect(() => {
    const onDestPicked = () => {
      setShowCal(true);
    };
    window.addEventListener('dest-picked', onDestPicked);
    return () => window.removeEventListener('dest-picked', onDestPicked);
  }, []);

  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(new Date()));
  const buildMonth = (monthStart: Date): Day[] => {
    const gridStart = startOfWeek(startOfMonth(monthStart), { weekStartsOn: 0 });
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
      if (isMobile) setTimeout(() => { setShowCal(false); setShowSummary(true); }, 120);
    }
  };

  const DayCell = ({
    d,
    muted = false,
    size = 'md',
  }: {
    d: Date;
    muted?: boolean;
    size?: 'md' | 'lg';
  }) => {
    const selectedStart = isStart(d);
    const selectedEnd = isEnd(d);
    const between = inRange(d) && !selectedStart && !selectedEnd;
    const disabled = disabledPast(d);
    const base = size === 'lg' ? 'h-12 w-12 text-base' : 'h-10 w-10 text-sm';
    return (
      <button
        type="button"
        onClick={() => pickDate(d)}
        disabled={disabled}
        className={[
          base,
          'flex items-center justify-center rounded-full transition',
          muted ? 'text-gray-300' : 'text-gray-800',
          between ? 'bg-blue-100' : '',
          selectedStart || selectedEnd ? 'bg-[#111] text-white font-semibold' : 'hover:bg-gray-100',
          disabled ? 'opacity-40 cursor-not-allowed hover:bg-transparent' : '',
        ].join(' ')}
        aria-label={format(d, 'PPP')}
      >
        {format(d, 'd')}
      </button>
    );
  };

  const nights = useMemo(
    () => (checkIn && checkOut ? Math.max(1, differenceInCalendarDays(checkOut, checkIn)) : 0),
    [checkIn, checkOut],
  );
  const fmtShort = (d?: Date | null) => (d ? format(d, 'EEE, MMM d') : 'Add dates');
  const fmtParam = (d: Date) => format(d, 'yyyy-MM-dd');

  /* ===== Guests popover ===== */
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
    window.addEventListener('scroll', calc, true);
    window.addEventListener('resize', calc);
    return () => {
      window.removeEventListener('scroll', calc, true);
      window.removeEventListener('resize', calc);
    };
  }, [showGuests, isMobile]);

  const step = (
    setter: (n: number) => void,
    cur: number,
    delta: number,
    min: number,
    max: number,
  ) => {
    const next = Math.min(max, Math.max(min, cur + delta));
    setter(next);
  };
  //search popular property direct urls

  const POPULAR_PROPERTY_URLS: Record<string, string> = {
    'Nordic Spa Getaway':
      'https://dreamtripclub.com/hotel/276302?hotelId=276302&hotelNo=GSL&roomTypeId=276302&&name=Getaway+on+Stoney+Lake',
    'Your Dream Getaway':
      'https://dreamtripclub.com/hotel/276301?hotelId=276301&hotelNo=YDG&roomTypeId=425356&&name=Your+dream+getaway',
    'Escape From Life':
      'https://dreamtripclub.com/hotel/276303?hotelId=276303&hotelNo=EFL&roomTypeId=276303&&name=escape+from+life',
    'Tiny Home Experience':
      'https://dreamtripclub.com/hotel/302995?hotelId=302995&hotelNo=SITHE&roomTypeId=302995&&name=Tiny+Home+Experience',
  };


  //togger for adults rooms and etch
  const summaryLabel = `${rooms} ${rooms > 1 ? 'Rooms' : 'Room'} • ${adults} ${
    adults > 1 ? 'Adults' : 'Adult'
  } • ${children} ${children !== 1 ? 'Children' : 'Child'}${
    infants > 0 ? ` • ${infants} Infant${infants > 1 ? 's' : ''}` : ''
  }${pet ? ' • Pet' : ''}`;

  const handlePopularPropertySelect = (baseUrl: string) => {
    // Require dates because we must attach checkIn/checkOut
    if (!checkIn || !checkOut) {
      alert('Please select check-in and check-out dates first');
      return;
    }

    const params: Record<string, string> = {
      checkIn: fmtParam(checkIn),
      checkOut: fmtParam(checkOut),
      adult: String(adults),
      child: String(children),
      infant: String(infants),
      pet: pet ? 'yes' : 'no',
    };

    if (typeof rooms === 'number') {
      params.rooms = String(rooms);
    }

    const qs = new URLSearchParams(params).toString();
    const url = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${qs}`;

    // Break out of iframe if needed
    if (typeof window !== 'undefined' && window.top) {
      window.top.location.href = url;
    } else if (typeof window !== 'undefined') {
      window.location.href = url;
    }
  };

     const handleSearch = () => {
    // allow searching without a destination; only require dates
    if (!checkIn || !checkOut) return;

    // Common params for dates & guests
    const dateGuestParams: Record<string, string> = {
      checkIn: fmtParam(checkIn),
      checkOut: fmtParam(checkOut),
      adult: String(adults),
      child: String(children),
      infant: String(infants),
      pet: pet ? 'yes' : 'no',
    };

    if (typeof rooms === 'number') {
      dateGuestParams.rooms = String(rooms);
    }

    // 1) If destination is one of our Popular Properties => go directly to that hotel URL
    const popularUrl = dest?.label ? POPULAR_PROPERTY_URLS[dest.label] : undefined;

    if (popularUrl) {
      const url = `${popularUrl}${
        popularUrl.includes('?') ? '&' : '?'
      }${new URLSearchParams(dateGuestParams).toString()}`;

      if (window.top) {
        window.top.location.href = url;
      } else {
        window.location.href = url;
      }
      return;
    }

    // 2) Otherwise: go to /results with full params (existing behavior)
    const params: Record<string, string> = {
      startDate: dateGuestParams.checkIn,
      endDate: dateGuestParams.checkOut,
      adult: dateGuestParams.adult,
      child: dateGuestParams.child,
      infant: dateGuestParams.infant,
      pet: dateGuestParams.pet,
    };

    if (dateGuestParams.rooms) {
      params.rooms = dateGuestParams.rooms;
    }

    // include destination only if present
    if (dest?.label) params.place = dest.label;
    if (dest?.lat != null && dest?.lng != null) {
      params.lat = String(dest.lat);
      params.lng = String(dest.lng);
    }

    const url = `/results?${new URLSearchParams(params).toString()}`;

    // keep iframe-friendly redirect
    if (window.top) {
      window.top.location.href = url;
    } else {
      window.location.href = url;
    }
  };
  return (
    <div className="w-full flex justify-center">
      {/* Hidden mobile DestinationPicker instance (ONLY to handle modal events) */}
        {isMobile && (
        <div className="hidden">
          <DestinationPicker isMobile={true} value={dest} setValue={setDest} />
        </div>
      )}
      <div className="w-full max-w-7xl bg-white/95 backdrop-blur rounded-[1.25rem] md:rounded-[20px] shadow-xl border border-gray-200 px-4 py-4 md:px-6 md:py-4 h-[95px]">
        {/* Desktop layout */}
        {!isMobile ? (
          <div className="flex items-center md:justify-start gap-4">
        {/* Destination */}
            <div className="flex-1 min-w-[220px]">
              <DestinationPicker
                isMobile={false}
                value={dest}
                setValue={setDest}
                onPropertySelect={handlePopularPropertySelect}
              />
            </div>


            <div className="hidden md:block w-px self-stretch bg-gray-200" />

            {/* Dates */}
            <div className="flex-1" ref={triggerRef}>
              <button className="w-full text-left" onClick={() => setShowCal(true)} type="button"> 
                <div className="flex items-center gap-2 text-black uppercase tracking-wide text-[10px] font-semibold mb-1 ">
                  <CalIcon className="w-3.5 h-3.5 text-[#F05A28]" /> {nights > 0 ? `${nights} Night${nights > 1 ? 's' : ''}` : 'Dates'}
                </div>
                <div className="text-lg md:text-[16px] font-semibold text-[#000000]">
                  {checkIn ? fmtShort(checkIn) : 'Add dates'}{' '}
                  <span className="mx-1 text-black"></span> {checkOut ? fmtShort(checkOut) : ''}
                </div>
              </button>
            </div>

            <div className="hidden md:block w-px self-stretch bg-gray-200" />

            {/* Rooms & Guests trigger */}
            <div className="flex-1" ref={guestsRef}>
              <button type="button" onClick={() => setShowGuests(true)} className="w-full text-left">
                <div className="flex items-center gap-2 text-black uppercase tracking-wide text-[10px] font-semibold mb-1">
                  <UsersIcon className="w-4 h-4 text-[#F05A28]" /> Rooms & Guests
                </div>
                <div className="text-lg md:text-[16px] font-medium text-gray-900">{summaryLabel}</div>
              </button>
            </div>

            {/* Search button */}
            <button
              onClick={handleSearch}
              disabled={!checkIn || !checkOut}
              className={`w-full md:w-auto font-semibold px-6 py-3 md:px-8 md:py-3 rounded-full inline-flex items-center justify-center gap-2 transition bg-[#F05A28] hover:brightness-95 text-white ${
                 checkIn && checkOut
                  ? 'bg-[#F05A28] hover:brightness-95 text-white'
                  : 'bg-[#F05A28] text-white cursor-not-allowed'
              }`}
              type="button"
            >
              SEARCH
            </button>
          </div>
        ) : (
          
          /* Mobile layout*/
          <div className="col-span-2">
            <button
              type="button"
              className="w-full flex items-center bg-white border border-gray-300 rounded-xl overflow-hidden shadow-sm">
            
              {/* Destination section */}
              <div
                className="flex-1 px-4 py-3 text-left hover:bg-gray-50 cursor-pointer"
                onClick={() => window.dispatchEvent(new Event('open-dest-modal'))}
              >
                <div className="flex items-center gap-1 text-[#F05A28] text-[10px] uppercase font-semibold tracking-wide text-[#000000]">
                  <PinIcon className="w-3.5 h-3.5" /> Destination
                </div>
                <div className="text-sm font-medium text-black truncate">
                  {dest?.label || 'Where next?'}
                </div>
              </div>

              {/* Divider */}
              <div className="w-px bg-gray-300 self-stretch" />

              {/* Dates section */}
              <div
                className="flex-1 px-4 py-3 text-left hover:bg-gray-50 cursor-pointer"
                onClick={(e) => { e.stopPropagation(); setShowCal(true); }}
              >
                <div className="flex items-center gap-1 text-[#F05A28] text-[10px] uppercase font-semibold tracking-wide">
                  <CalIcon className="w-3.5 h-3.5" /> Dates
                </div>
                <div className="text-sm font-medium text-gray-900 truncate">
                  {checkIn && checkOut ? `${fmtShort(checkIn)} - ${fmtShort(checkOut)}` : 'Add dates'}
                </div>
              </div>
            </button>
          </div>
        )}
        
      </div>

   {/* Desktop Guests Popover*/}
          {mounted && !isMobile && showGuests &&
            createPortal(
              <>
                <div className="fixed inset-0 z-[999998]" onClick={() => setShowGuests(false)} />
                <div
                  className="fixed z-[999999] bg-white border rounded-xl shadow-2xl p-3 w-[380px]"
                  style={{ top: guestPos.top, left: guestPos.left }}
                >
                  {[
                    { label: 'Rooms',   value: rooms,   setter: setRooms,   min: 1, max: 8  },
                    { label: 'Adults (13+)',  value: adults,  setter: setAdults,  min: 1, max: 10 },
                    { label: 'Children (3–12)',value: children,setter: setChildren,min: 0, max: 10 },
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
                  {/* Pet row (Yes/No) */}
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
                    <button className="px-4 py-2 rounded-lg text-black border hover:bg-gray-80" onClick={() => setShowGuests(false)}>Close</button>
                    <button className="px-4 py-2 rounded-lg text-white bg-[#F05A28] hover:brightness-100" onClick={() => setShowGuests(false)}>Apply</button>
                  </div>
                </div>
              </>,
              document.body,
            )
          }
        {/*Desktop: Calendar Popover (two months) */}
           {mounted && showCal && createPortal(
  <div className="fixed inset-0 z-[99999] pointer-events-none">
    <div
      className="absolute inset-0 bg-black/40 pointer-events-auto"
      onClick={() => setShowCal(false)}
    />

    {isMobile ? (
      // Mobile: full-screen bottom sheet 
      <div
        className="absolute inset-x-0 bottom-0 max-h-[92vh] bg-white rounded-t-2xl shadow-2xl p-4
                   animate-[slideup_200ms_ease-out] overflow-y-auto pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`@keyframes slideup{from{transform:translateY(12px);opacity:.95}to{transform:translateY(0);opacity:1}}`}</style>

        <div className="flex items-center justify-between mb-2">
          <div className="text-lg font-semibold">Select dates</div>
          <button className="text-sm px-3 py-1 rounded-lg border hover:bg-gray-50"
                  onClick={() => setShowCal(false)}>
            Close
          </button>
        </div>

        {/* Month header */}
        <div className="flex items-center justify-between mb-2">
          <button className="px-3 py-1 rounded-lg border hover:bg-gray-50"
                  onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}>
            Prev
          </button>
          <div className="text-base font-semibold text-gray-900">
            {format(leftMonth, 'MMMM yyyy')}
          </div>
          <button className="px-3 py-1 rounded-lg border hover:bg-gray-50"
                  onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}>
            Next
          </button>
        </div>

        <div className="grid grid-cols-7 text-center text-xs text-gray-900 mb-1">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d)=>(<div key={d} className="py-1">{d}</div>))}
        </div>
        <div className="grid grid-cols-7 gap-1 mb-3">
          {leftDays.map(({date,currentMonth},i)=>(
            <div key={i} className="flex items-center justify-center">
              <DayCell d={date} muted={!currentMonth} size="lg" />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button className="text-sm text-gray-700 hover:underline"
                  onClick={() => { setCheckIn(null); setCheckOut(null); }}>
            Reset
          </button>
          <div className="text-sm text-black mx-auto">
            {checkIn && !checkOut && 'Select a check-out date'}
            {checkIn && checkOut && `${nights} night${nights > 1 ? 's' : ''} selected`}
            {!checkIn && !checkOut && 'Select a check-in date'}
          </div>
          <button
            disabled={!checkIn || !checkOut}
            className={`text-sm px-4 py-2 rounded-full text-white ${
              checkIn && checkOut ? 'bg-[#111]' : 'bg-gray-300 cursor-not-allowed'
            }`}
            onClick={() => { setShowCal(false); if (checkIn && checkOut) setShowSummary(true); }}
          >
            Done
          </button>
        </div>
      </div>
    ) : (
      //  Desktop: anchored popover (two months) 
      <div
        className="absolute pointer-events-none"
        style={{ top: calPos.top, left: calPos.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative z-[100000] text-gray-700 bg-white border rounded-2xl shadow-2xl p-4 w-[860px] pointer-events-auto"
        >
          {/*month nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              className="px-3 py-1 rounded-lg border hover:bg-gray-50"
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
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
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
            >
              Next
            </button>
          </div>

          {/* Weekday headers + grids */}
          <div className="grid grid-cols-2 gap-6">
            {[leftDays, rightDays].map((days, idx) => (
              <div key={idx}>
                <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-1">
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
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

          {/* Footer actions */}
          <div className="flex items-center justify-between mt-3">
            <button
              className="text-sm text-gray-700 hover:underline"
              onClick={() => { setCheckIn(null); setCheckOut(null); }}
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
      </div>
    )}
  </div>,
  document.body
)}


      {/* Mobile: Guests bottom sheet  */}
      {mounted && isMobile && showGuests &&
        createPortal(
          <div className="fixed inset-0 z-[999998]">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowGuests(false)} />
            <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-4 pb-6 max-h-[85vh] animate-[slideup_200ms_ease-out]">
              <style>{`@keyframes slideup{from{transform:translateY(12px);opacity:.95}to{transform:translateY(0);opacity:1}}`}</style>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xl font-semibold">Rooms & Guests</div>
                <button className="p-2 rounded-full hover:bg-gray-100 text-black" onClick={() => setShowGuests(false)} aria-label="Close">
                  ✕
                </button>
              </div>
              {[
                { label: 'Rooms', value: rooms, setter: setRooms, min: 1, max: 8 },
                { label: 'Adults (13+)', value: adults, setter: setAdults, min: 1, max: 10 },
                { label: 'Children (3–12)', value: children, setter: setChildren, min: 0, max: 10 },
                { label: 'Infants (0–2)', value: infants, setter: setInfants, min: 0, max: 10 },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-3 border-b">
                  <div className="text-base font-medium text-gray-900">{row.label}</div>
                  <div className="flex items-center gap-4">
                    <button
                      className="w-8 h-8 rounded-full border text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                      onClick={() => step(row.setter as any, row.value as number, -1, (row as any).min, (row as any).max)}
                      disabled={(row.value as number) <= (row as any).min}
                    >
                      −
                    </button>
                    <div className="w-6 text-center">{row.value}</div>
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

                {/*Pet row (Yes/No) - mobile */}
                <div className="flex items-center justify-between py-3">
                  <div className="text-base font-medium text-gray-900">Bringing a pet?</div>
                  <select
                    value={pet ? 'yes' : 'no'}
                    onChange={(e) => setPet(e.target.value === 'yes')}
                    className="border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>

              <button
                onClick={() => setShowGuests(false)}
                className="mt-3 w-full font-semibold px-6 py-4 rounded-full bg-[#F05A28] text-white"
              >
                Apply
              </button>
            </div>
          </div>,
          document.body,
        )
      }

      {/*Mobile Summary bottom sheet  */}
      {mounted && isMobile && showSummary &&
        createPortal(
          <div className="fixed inset-0 z-[999997]">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowSummary(false)} />
            <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-4 pb-6 max-h-[85vh] animate-[slideup_200ms_ease-out]">
              <style>{`@keyframes slideup{from{transform:translateY(12px);opacity:.95}to{transform:translateY(0);opacity:1}}`}</style>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xl font-semibold text-black">Search</div>
                <button className="p-2 rounded-full hover:bg-gray-100 " onClick={() => setShowSummary(false)} aria-label="Close">✕</button>
              </div>
              {/* Destination */}
              <div className="pb-3 border-b">
                <div className="text-[11px] uppercase tracking-wide font-semibold text-gray-500 mb-1 flex items-center gap-2"><PinIcon className="w-4 h-4" /> Destination</div>
                <button type="button" onClick={() => window.dispatchEvent(new Event('open-dest-modal'))} className="w-full text-left text-base text-gray-900 hover:underline underline-offset-2">{dest?.label || 'Add destination'}</button>
              </div>
              {/* Dates */}
              <div className="py-3 border-b">
                <div className="text-[11px] uppercase tracking-wide font-semibold text-gray-500 mb-1 flex items-center gap-2"><CalIcon className="w-4 h-4" /> {nights>0?`${nights} Night${nights>1?'s':''}`:'Dates'}</div>
                <button type="button" onClick={() => { setShowSummary(false); setShowCal(true); }} className="w-full text-left text-base text-gray-900 hover:underline underline-offset-2">{fmtShort(checkIn)} <span className="text-gray-400">—</span> {fmtShort(checkOut)}</button>
              </div>
              {/* Guests */}
              <div className="py-3 border-b">
                <div className="text-[11px] uppercase tracking-wide font-semibold text-gray-500 mb-1 flex items-center gap-2"><UsersIcon className="w-4 h-4" /> Rooms & Guests</div>
                <button type="button" onClick={() => { setShowSummary(false); setShowGuests(true); }} className="w-full text-left text-base text-gray-900 hover:underline underline-offset-2">{summaryLabel}</button>
              </div>
              <button onClick={handleSearch} disabled={ !checkIn || !checkOut} className={`mt-4 w-full font-semibold px-6 py-4 rounded-full ${checkIn && checkOut ? 'bg-[#F05A28] text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`} type="button">SEARCH</button>
            </div>
          </div>,
          document.body,
        )
      }
    </div>
  );
}




export default function SearchPage() {
  // Route-local transparent background
  useEffect(() => {
    const htmlPrev = document.documentElement.style.background;
    const bodyPrev = document.body.style.background;
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    return () => {
      document.documentElement.style.background = htmlPrev;
      document.body.style.background = bodyPrev;
    };
  }, []);

  return (
    <div className="bg-transparent min-h-[120px] flex items-center justify-center px-3">
      <SearchBar />
      <style>{`@keyframes slideup{from{transform:translateY(12px);opacity:.95}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}