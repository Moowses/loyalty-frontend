'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { addDays, differenceInCalendarDays, format, isBefore, isSameDay, isSameMonth, isWithinInterval, startOfMonth, startOfWeek } from 'date-fns';

/* ================= Icons ================= */
const PinIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-4.35 7-10a7 7 0 10-14 0c0 5.65 7 10 7 10z"/>
    <circle cx="12" cy="11" r="2" strokeWidth="2"/>
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

/* ================= Shared types ================= */
type Place = { label: string; lat?: number; lng?: number };
type Day = { date: Date; currentMonth: boolean };

/* ================= Destination Picker ================= */
function DestinationPicker({ isMobile, value, setValue }: { isMobile: boolean; value: Place | null; setValue: (p: Place | null) => void; }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Recents
  const [recents, setRecents] = useState<Place[]>([]);
  useEffect(() => {
    const raw = localStorage.getItem('recentSearches');
    if (raw) setRecents(JSON.parse(raw));
  }, []);
  const pushRecent = (item: Place) => {
    const next = [item, ...recents.filter(r => r.label !== item.label)].slice(0, 5);
    setRecents(next);
    localStorage.setItem('recentSearches', JSON.stringify(next));
  };

  /* Desktop dropdown */
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ label: string; lat: number; lon: number }>>([]);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 360 });

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || isMobile) return;
    const calc = () => {
      const r = triggerRef.current!.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: Math.max(8, Math.min(r.left, window.innerWidth - 380)), width: Math.min(360, r.width) });
    };
    calc();
    window.addEventListener('scroll', calc, true);
    window.addEventListener('resize', calc);
    return () => { window.removeEventListener('scroll', calc, true); window.removeEventListener('resize', calc); };
  }, [open, isMobile]);

  useEffect(() => {
    if (!open || !query.trim()) { setResults([]); return; }
    const id = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&q=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        const data = await res.json();
        setResults(data.map((d: any) => ({ label: d.display_name, lat: +d.lat, lon: +d.lon })));
      } catch {}
    }, 250);
    return () => clearTimeout(id);
  }, [query, open]);

  // Event bridge so parent can open this modal
  useEffect(() => {
    const openHandler = () => { if (isMobile) setShowDest(true); else setOpen(true); };
    window.addEventListener('open-dest-modal', openHandler);
    return () => window.removeEventListener('open-dest-modal', openHandler);
  }, [isMobile]);

  const finalizePick = (place: Place) => {
    setValue(place);
    pushRecent(place);
    setShowDest(false);
    setOpen(false);
    window.dispatchEvent(new Event('dest-picked'));
  };

  const choose = (item: { label: string; lat: number; lon: number }) => finalizePick({ label: item.label, lat: item.lat, lng: item.lon });

  /* Mobile full-screen modal */
  const [showDest, setShowDest] = useState(false);
  const [destQuery, setDestQuery] = useState('');
  const [mResults, setMResults] = useState<typeof results>([]);
  useEffect(() => {
    if (!showDest || !destQuery.trim()) { setMResults([]); return; }
    const id = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=10&q=${encodeURIComponent(destQuery)}`;
        const res = await fetch(url);
        const data = await res.json();
        setMResults(data.map((d: any) => ({ label: d.display_name, lat: +d.lat, lon: +d.lon })));
      } catch {}
    }, 250);
    return () => clearTimeout(id);
  }, [showDest, destQuery]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (p) => {
      const { latitude, longitude } = p.coords;
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
        const r = await fetch(url);
        const j = await r.json();
        finalizePick({ label: j.display_name || 'Current location', lat: latitude, lng: longitude });
      } catch {
        finalizePick({ label: 'Current location', lat: latitude, lng: longitude });
      }
    });
  };

  return (
    <div className="flex-1 min-w-[220px]">
      <div className="flex items-center gap-2 text-gray-600 uppercase tracking-wide text-[10px] font-semibold mb-1">
        <PinIcon className="w-3.5 h-3.5" /> Destination
      </div>

      <div ref={triggerRef}>
        <button
          type="button"
          className="w-full text-left text-lg md:text-[15px] font-medium text-gray-900"
          onClick={() => { if (isMobile) { setDestQuery(value?.label || ''); setShowDest(true); } else { setQuery(value?.label || ''); setOpen(true); } }}
        >
          {value?.label || 'Where next?'}
        </button>
      </div>

      {/* Desktop dropdown */}
      {mounted && open && !isMobile && createPortal(
        <>
          <div className="fixed inset-0 z-[999998]" onClick={() => setOpen(false)} />
          <div className="fixed z-[999999] bg-white border rounded-2xl shadow-2xl p-2" style={{ top: pos.top, left: pos.left, width: pos.width }}>
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Where can we take you?" className="w-full text-[15px] px-3 py-2 rounded-lg bg-gray-50 outline-none mb-2" />
            <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer" onClick={useCurrentLocation}>
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor"><path d="M12 2v2m0 16v2M22 12h-2M4 12H2m15.5 0a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z" strokeWidth="2"/></svg>
              </span>
              <div className="text-sm font-medium text-gray-900">Current Location</div>
            </div>
            {recents.length > 0 && (<>
              <div className="mx-2 my-2 border-t" />
              <div className="px-3 py-1 text-xs uppercase tracking-wide text-gray-400">Recent Searches</div>
              {recents.map((r, i) => (
                <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer" onClick={() => finalizePick(r)}>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 mt-1" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7" strokeWidth="2" /><path d="M21 21l-4.35-4.35" strokeWidth="2" /></svg>
                  <div className="text-sm text-gray-800">{r.label}</div>
                </div>
              ))}
            </>)}
            {query && (<>
              <div className="mx-2 my-2 border-t" />
              <div className="max-h-72 overflow-auto">
                {results.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer" onClick={() => choose(r)}>
                    <PinIcon className="w-4 h-4 mt-1" />
                    <div className="text-sm text-gray-800">{r.label}</div>
                  </div>
                ))}
                {results.length === 0 && <div className="px-3 py-4 text-sm text-gray-500">No matches…</div>}
              </div>
            </>)}
          </div>
        </>, document.body)}

      {/* Mobile full-screen "Where next?" modal */}
      {mounted && showDest && isMobile && createPortal(
        <div className="fixed inset-0 z-[100000]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDest(false)} />
          <div className="absolute inset-x-0 bottom-0 top-12 bg-white rounded-t-2xl shadow-2xl p-4 animate-[slideup_200ms_ease-out] overflow-y-auto">
            <style>{`@keyframes slideup{from{transform:translateY(12px);opacity:.95}to{transform:translateY(0);opacity:1}}`}</style>
            <div className="flex items-center justify-between mb-2"><div className="text-xl font-semibold">Where next?</div><button className="p-2 rounded-full hover:bg-gray-100" onClick={() => setShowDest(false)} aria-label="Close">✕</button></div>
            <div className="text-[11px] uppercase tracking-wide font-semibold text-gray-500 mb-1 flex items-center gap-2"><PinIcon className="w-4 h-4" /> Destination</div>
            <input autoFocus value={destQuery} onChange={(e) => setDestQuery(e.target.value)} placeholder="Where next?" className="w-full text-[16px] pb-2 border-b border-gray-300 outline-none placeholder:text-gray-400" />
            <div className="mt-4 flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer" onClick={useCurrentLocation}>
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100"><svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor"><path d="M12 2v2m0 16v2M22 12H20M4 12H2m15.5 0a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z" strokeWidth="2"/></svg></span>
              <div><div className="text-sm font-medium text-gray-900">Current Location</div><div className="text-xs text-gray-500">Use device location</div></div>
            </div>
            {recents.length > 0 && (<>
              <div className="my-3 border-t" />
              <div className="px-1 py-1 text-xs uppercase tracking-wide text-gray-400">Recent Searches</div>
              <div className="max-h-48 overflow-auto">
                {recents.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 px-1 py-2 rounded-xl hover:bg-gray-50 cursor-pointer" onClick={() => finalizePick(r)}>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 mt-1" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7" strokeWidth="2" /><path d="M21 21l-4.35-4.35" strokeWidth="2" /></svg>
                    <div className="text-sm text-gray-800">{r.label}</div>
                  </div>
                ))}
              </div>
              <button className="w-full text-left text-xs text-gray-500 hover:text-gray-700 px-1 py-2" onClick={() => { setRecents([]); localStorage.removeItem('recentSearches'); }}>Clear Recents</button>
            </>)}
            {destQuery && (<>
              <div className="my-3 border-t" />
              <MobileResults query={destQuery} onPick={(p) => finalizePick(p)} />
            </>)}
          </div>
        </div>, document.body)}
    </div>
  );
}

/* helper: mobile results list */
function MobileResults({ query, onPick }: { query: string; onPick: (p: Place) => void }) {
  const [list, setList] = useState<Array<{ label: string; lat: number; lon: number }>>([]);
  useEffect(() => {
    let cancel = false;
    const run = async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=10&q=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!cancel) setList(data.map((d: any) => ({ label: d.display_name, lat: +d.lat, lon: +d.lon })));
      } catch {}
    };
    run();
    return () => { cancel = true; };
  }, [query]);
  return (
    <div className="max-h-72 overflow-auto">
      {list.map((r, i) => (
        <div key={i} className="flex items-start gap-3 px-1 py-2 rounded-xl hover:bg-gray-50 cursor-pointer" onClick={() => onPick({ label: r.label, lat: r.lat, lng: r.lon })}>
          <PinIcon className="w-4 h-4 mt-1" />
          <div className="text-sm text-gray-800">{r.label}</div>
        </div>
      ))}
      {list.length === 0 && <div className="px-1 py-4 text-sm text-gray-500">Searching…</div>}
    </div>
  );
}

/* ===================== Main Search Bar ===================== */
function SearchBar() {
  const router = useRouter();

  const [dest, setDest] = useState<Place | null>(null);
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [adults, setAdults] = useState('2');
  const [children, setChildren] = useState('0');

  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setMounted(true);
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const [showCal, setShowCal] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [calPos, setCalPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!showCal || !triggerRef.current || isMobile) return;
    const calc = () => { const r = triggerRef.current!.getBoundingClientRect(); setCalPos({ top: r.bottom + 8, left: Math.min(r.left, window.innerWidth - 700) }); };
    calc();
    window.addEventListener('scroll', calc, true);
    window.addEventListener('resize', calc);
    return () => { window.removeEventListener('scroll', calc, true); window.removeEventListener('resize', calc); };
  }, [showCal, isMobile]);

  useEffect(() => {
    const onDestPicked = () => { if (!checkIn || !checkOut) setShowCal(true); else setShowSummary(true); };
    window.addEventListener('dest-picked', onDestPicked);
    return () => window.removeEventListener('dest-picked', onDestPicked);
  }, [checkIn, checkOut]);

  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(new Date()));
  const buildMonth = (monthStart: Date): Day[] => {
    const gridStart = startOfWeek(startOfMonth(monthStart), { weekStartsOn: 0 });
    const days: Day[] = []; let cur = gridStart; for (let i = 0; i < 42; i++) { days.push({ date: cur, currentMonth: isSameMonth(cur, monthStart) }); cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1); }
    return days;
  };
  const leftMonth = viewMonth;
  const leftDays = buildMonth(leftMonth);

  const disabledPast = (d: Date) => isBefore(d, new Date(new Date().setHours(0, 0, 0, 0)));
  const inRange = (d: Date) => checkIn && checkOut ? isWithinInterval(d, { start: checkIn, end: checkOut }) : false;
  const isStart = (d: Date) => (checkIn ? isSameDay(d, checkIn) : false);
  const isEnd = (d: Date) => (checkOut ? isSameDay(d, checkOut) : false);

  const pickDate = (d: Date) => {
    if (disabledPast(d)) return;
    if (!checkIn || (checkIn && checkOut)) { setCheckIn(d); setCheckOut(null); return; }
    if (isBefore(d, checkIn)) { setCheckOut(checkIn); setCheckIn(d); }
    else if (isSameDay(d, checkIn)) { setCheckOut(addDays(d, 1)); }
    else { setCheckOut(d); if (isMobile) setTimeout(() => { setShowCal(false); setShowSummary(true); }, 120); }
  };

  const DayCell = ({ d, muted=false, size='md' }:{ d: Date; muted?: boolean; size?: 'md'|'lg' }) => {
    const selectedStart = isStart(d); const selectedEnd = isEnd(d); const between = inRange(d) && !selectedStart && !selectedEnd; const disabled = disabledPast(d);
    const base = size === 'lg' ? 'h-12 w-12 text-base' : 'h-10 w-10 text-sm';
    return (
      <button type="button" onClick={() => pickDate(d)} disabled={disabled}
        className={[base,'flex items-center justify-center rounded-full transition', muted?'text-gray-300':'text-gray-800', between?'bg-blue-100':'', selectedStart||selectedEnd?'bg-blue-600 text-white font-semibold':'hover:bg-gray-100', disabled?'opacity-40 cursor-not-allowed hover:bg-transparent':''].join(' ')} aria-label={format(d,'PPP')}>
        {format(d,'d')}
      </button>
    );
  };

  const nights = useMemo(() => (checkIn && checkOut ? Math.max(1, differenceInCalendarDays(checkOut, checkIn)) : 0), [checkIn, checkOut]);
  const fmtShort = (d?: Date | null) => (d ? format(d, 'EEE, MMM d') : 'Add dates');
  const fmtParam = (d: Date) => format(d, 'yyyy-MM-dd');

  const handleSearch = () => {
    if (!dest || !checkIn || !checkOut) return;
    const query = new URLSearchParams({ startDate: fmtParam(checkIn), endDate: fmtParam(checkOut), adult: adults, child: children, place: dest?.label || '', lat: dest?.lat?.toString() || '', lng: dest?.lng?.toString() || '' });
    router.push(`/search/results?${query.toString()}`);
  };

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-5xl bg-white/95 backdrop-blur rounded-[1.25rem] md:rounded-[2rem] shadow-xl border border-gray-200 px-4 py-3 md:px-6 md:py-4">
        {isMobile ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-2 text-gray-600 uppercase tracking-wide text-[10px] font-semibold mb-1"><PinIcon className="w-3.5 h-3.5" /> Destination</div>
              <button type="button" onClick={() => window.dispatchEvent(new Event('open-dest-modal'))} className="w-full text-left bg-white border border-gray-200 rounded-xl px-3 py-3 text-[16px] font-medium text-gray-900">{dest?.label || 'Where next?'}</button>
            </div>
            <div ref={triggerRef}>
              <div className="flex items-center gap-2 text-gray-600 uppercase tracking-wide text-[10px] font-semibold mb-1"><CalIcon className="w-3.5 h-3.5" /> {nights>0?`${nights} Night${nights>1?'s':''}`:'Dates'}</div>
              <button type="button" onClick={() => setShowCal(true)} className="w-full text-left bg-white border border-gray-200 rounded-xl px-3 py-3  font-medium text-gray-900">{checkIn ? fmtShort(checkIn) : 'Add dates'} <span className="mx-1 text-gray-500">-</span> {checkOut ? fmtShort(checkOut) : 'Add dates'}</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-row items-center gap-4">
            <div className="flex-1 min-w-[220px]"><DestinationPicker isMobile={false} value={dest} setValue={setDest} /></div>
            <div className="hidden md:block w-px self-stretch bg-gray-200" />
            <div className="flex-1" ref={triggerRef}>
              <button className="w-full text-left" onClick={() => setShowCal(true)} type="button">
                <div className="flex items-center gap-2 text-gray-600 uppercase tracking-wide text-[10px] font-semibold mb-1"><CalIcon className="w-3.5 h-3.5" /> {nights>0?`${nights} Night${nights>1?'s':''}`:'Dates'}</div>
                <div className="text-lg md:text-[16px] font-medium text-gray-900">{checkIn?fmtShort(checkIn):'Add dates'} <span className="mx-1 text-gray-500">-</span> {checkOut?fmtShort(checkOut):'Add dates'}</div>
              </button>
            </div>
            <div className="hidden md:block w-px self-stretch bg-gray-200" />
            <div className="flex-1">
              <div className="flex items-center gap-2 text-gray-600 uppercase tracking-wide text-[10px] font-semibold mb-1"><UsersIcon className="w-4 h-4" /> Guests</div>
              <div className="flex items-center gap-6 text-gray-900">
                <label className="flex items-center gap-2"><span className="text-sm">Adults</span><select value={adults} onChange={(e)=>setAdults(e.target.value)} className="bg-transparent text-lg font-medium focus:outline-none">{[...Array(10).keys()].map((i)=>(<option key={i+1} value={i+1} className="text-black">{i+1}</option>))}</select></label>
                <label className="flex items-center gap-2"><span className="text-sm">Children</span><select value={children} onChange={(e)=>setChildren(e.target.value)} className="bg-transparent text-lg font-medium focus:outline-none">{[...Array(6).keys()].map((i)=>(<option key={i} value={i} className="text-black">{i}</option>))}</select></label>
              </div>
            </div>
            <button onClick={handleSearch} disabled={!dest || !checkIn || !checkOut} className={`w-full md:w-auto font-semibold px-6 py-3 md:px-8 md:py-3 rounded-full inline-flex items-center justify-center gap-2 transition ${dest && checkIn && checkOut ? 'bg-gray-900 hover:bg-black text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`} type="button">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7" strokeWidth="2" /><path d="M21 21l-4.35-4.35" strokeWidth="2" /></svg>
              Find Hotels
            </button>
          </div>
        )}
      </div>

      {/* ===== Mobile: Calendar full-screen sheet ===== */}
      {mounted && isMobile && showCal && createPortal(
        <div className="fixed inset-0 z-[999999]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCal(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[92vh] bg-white rounded-t-2xl shadow-2xl p-4 animate-[slideup_200ms_ease-out]">
            <style>{`@keyframes slideup{from{transform:translateY(12px);opacity:.95}to{transform:translateY(0);opacity:1}}`}</style>
            <div className="flex items-center justify-between mb-2"><div className="text-lg font-semibold">Select dates</div><button className="text-sm px-3 py-1 rounded-lg border hover:bg-gray-50" onClick={() => setShowCal(false)}>Close</button></div>
            {/* Month header */}
            <div className="flex items-center justify-between mb-2">
              <button className="px-3 py-1 rounded-lg border hover:bg-gray-50" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}>Prev</button>
              <div className="text-base font-semibold">{format(viewMonth, 'MMMM yyyy')}</div>
              <button className="px-3 py-1 rounded-lg border hover:bg-gray-50" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}>Next</button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-1">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d)=>(<div key={d} className="py-1">{d}</div>))}</div>
            <div className="grid grid-cols-7 gap-1 mb-3">{leftDays.map(({date,currentMonth},i)=>(<div key={i} className="flex items-center justify-center"><DayCell d={date} muted={!currentMonth} size="lg" /></div>))}</div>
            <div className="flex items-center justify-between"><div className="text-sm text-gray-600 mx-auto">{checkIn && !checkOut && 'Select a check-out date'}{checkIn && checkOut && `${nights} night${nights>1?'s':''} selected`}{!checkIn && !checkOut && 'Select a check-in date'}</div></div>
          </div>
        </div>, document.body)}

      {/* ===== Mobile: Summary bottom sheet ===== */}
      {mounted && isMobile && showSummary && checkIn && checkOut && createPortal(
        <div className="fixed inset-0 z-[999998]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSummary(false)} />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-4 pb-6 max-h-[85vh] animate-[slideup_200ms_ease-out]">
            <style>{`@keyframes slideup{from{transform:translateY(12px);opacity:.95}to{transform:translateY(0);opacity:1}}`}</style>
            <div className="flex items-center justify-between mb-3"><div className="text-xl font-semibold">Search</div><button className="p-2 rounded-full hover:bg-gray-100" onClick={() => setShowSummary(false)} aria-label="Close">✕</button></div>
            {/* Destination (clickable) */}
            <div className="pb-3 border-b">
              <div className="text-[11px] uppercase tracking-wide font-semibold text-gray-500 mb-1 flex items-center gap-2"><PinIcon className="w-4 h-4" /> Destination</div>
              <button type="button" onClick={() => window.dispatchEvent(new Event('open-dest-modal'))} className="w-full text-left text-base text-gray-900 hover:underline underline-offset-2">{dest?.label || 'Add destination'}</button>
            </div>
            {/* Dates */}
            <div className="py-3 border-b">
              <div className="text-[11px] uppercase tracking-wide font-semibold text-gray-500 mb-1 flex items-center gap-2"><CalIcon className="w-4 h-4" /> {nights>0?`${nights} Night${nights>1?'s':''}`:'Dates'}</div>
              <div className="text-base text-gray-900">{fmtShort(checkIn)} <span className="text-gray-400">—</span> {fmtShort(checkOut)}</div>
            </div>
            {/* Guests */}
            <div className="py-3 border-b">
              <div className="text-[11px] uppercase tracking-wide font-semibold text-gray-500 mb-1 flex items-center gap-2"><UsersIcon className="w-4 h-4" /> Rooms & Guests</div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2"><span className="text-sm">Adults</span><select value={adults} onChange={(e)=>setAdults(e.target.value)} className="bg-transparent text-base font-medium focus:outline-none">{[...Array(10).keys()].map((i)=>(<option key={i+1} value={i+1} className="text-black">{i+1}</option>))}</select></label>
                <label className="flex items-center gap-2"><span className="text-sm">Children</span><select value={children} onChange={(e)=>setChildren(e.target.value)} className="bg-transparent text-base font-medium focus:outline-none">{[...Array(6).keys()].map((i)=>(<option key={i} value={i} className="text-black">{i}</option>))}</select></label>
              </div>
            </div>
            <button onClick={handleSearch} disabled={!dest || !checkIn || !checkOut} className={`mt-4 w-full font-semibold px-6 py-4 rounded-full inline-flex items-center justify-center gap-2 ${dest && checkIn && checkOut ? 'bg-gray-900 hover:bg-black text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`} type="button">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7" strokeWidth="2" /><path d="M21 21l-4.35-4.35" strokeWidth="2" /></svg>
              Find Hotels
            </button>
          </div>
        </div>, document.body)}

      {/* ===== Desktop: popover calendar ===== */}
      {mounted && !isMobile && showCal && createPortal(
        <>
          <div className="fixed inset-0 z-[999998] bg-black/0" onClick={() => setShowCal(false)} />
          <div className="fixed z-[999999] bg-white border rounded-xl shadow-2xl p-4 w-[680px] max-w-[95vw]" style={{ top: calPos.top, left: calPos.left }}>
            <div className="flex items-center justify-between mb-3">
              <button className="px-3 py-1 rounded hover:bg-gray-100" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}>←</button>
              <div className="text-sm font-semibold">{format(viewMonth,'MMMM yyyy')}</div>
              <button className="px-3 py-1 rounded hover:bg-gray-100" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}>→</button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-1">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d)=>(<div key={d} className="py-1">{d}</div>))}</div>
            <div className="grid grid-cols-7 gap-1">{leftDays.map(({date,currentMonth},i)=>(<div key={i} className="flex items-center justify-center"><DayCell d={date} muted={!currentMonth} /></div>))}</div>
            <div className="flex items-center justify-between mt-4"><div className="text-sm text-gray-600">{checkIn && !checkOut && 'Select a check-out date'}{checkIn && checkOut && `${nights} night${nights>1?'s':''} selected`}{!checkIn && !checkOut && 'Select a check-in date'}</div><div className="flex gap-2"><button className="px-4 py-2 rounded-lg border hover:bg-gray-50" onClick={() => setShowCal(false)}>Close</button><button disabled={!checkIn || !checkOut} className={`px-4 py-2 rounded-lg text-white ${checkIn && checkOut ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'}`} onClick={() => setShowCal(false)}>Apply Dates</button></div></div>
          </div>
        </>, document.body)}
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="bg-transparent min-h-[120px] flex items-center justify-center px-3">
      <SearchBar />
      <style>{`@keyframes slideup{from{transform:translateY(12px);opacity:.95}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}
