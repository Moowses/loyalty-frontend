'use client';

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
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

type Day = { date: Date; currentMonth: boolean };

const PinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      d="M12 21s7-4.35 7-10a7 7 0 10-14 0c0 5.65 7 10 7 10z" />
    <circle cx="12" cy="11" r="2" strokeWidth="2" />
  </svg>
);

const CalIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <rect x="3" y="5" width="18" height="16" rx="2" strokeWidth="2" />
    <path d="M16 3v4M8 3v4M3 11h18" strokeWidth="2" />
  </svg>
);

const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeWidth="2" />
    <circle cx="9" cy="7" r="4" strokeWidth="2" />
    <path d="M22 21v-2a4 4 0 00-3-3.87" strokeWidth="2" />
    <path d="M16 3.13a4 4 0 010 7.75" strokeWidth="2" />
  </svg>
);

export default function SearchBar() {
  const router = useRouter();

  // ----- state -----
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [adults, setAdults] = useState('2');
  const [children, setChildren] = useState('0');

  const [showCal, setShowCal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(new Date())); // left month

  // portal placement
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [calPos, setCalPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!showCal || !triggerRef.current) return;
    const calc = () => {
      const r = triggerRef.current!.getBoundingClientRect();
      const left = Math.min(r.left, window.innerWidth - 700);
      setCalPos({ top: r.bottom + 8, left });
    };
    calc();
    window.addEventListener('scroll', calc, true);
    window.addEventListener('resize', calc);
    return () => {
      window.removeEventListener('scroll', calc, true);
      window.removeEventListener('resize', calc);
    };
  }, [showCal]);

  // ----- derived -----
  const nights = useMemo(
    () =>
      checkIn && checkOut
        ? Math.max(1, differenceInCalendarDays(checkOut, checkIn))
        : 0,
    [checkIn, checkOut]
  );

  const fmtShort = (d?: Date | null) =>
    d ? format(d, 'EEE, MMM d') : 'Select date';
  const fmtParam = (d: Date) => format(d, 'yyyy-MM-dd');

  // ----- router -----
  const handleSearch = () => {
    if (!checkIn || !checkOut) {
      alert('Please select check-in and check-out dates.');
      return;
    }
    const query = new URLSearchParams({
      startDate: fmtParam(checkIn),
      endDate: fmtParam(checkOut),
      adult: adults,
      child: children,
    });
    router.push(`/search/results?${query.toString()}`);
  };

  // ----- calendar helpers -----
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
  const rightMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
  const leftDays = buildMonth(leftMonth);
  const rightDays = buildMonth(rightMonth);

  const inRange = (d: Date) =>
    checkIn && checkOut ? isWithinInterval(d, { start: checkIn, end: checkOut }) : false;
  const isStart = (d: Date) => (checkIn ? isSameDay(d, checkIn) : false);
  const isEnd = (d: Date) => (checkOut ? isSameDay(d, checkOut) : false);
  const disabledPast = (d: Date) =>
    isBefore(d, new Date(new Date().setHours(0, 0, 0, 0)));

  const pickDate = (d: Date) => {
    if (disabledPast(d)) return;
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(d);
      setCheckOut(null);
      if (!isSameMonth(d, leftMonth) && !isSameMonth(d, rightMonth)) {
        setViewMonth(startOfMonth(d));
      }
      return;
    }
    if (isBefore(d, checkIn)) {
      setCheckOut(checkIn);
      setCheckIn(d);
    } else if (isSameDay(d, checkIn)) {
      setCheckOut(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
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
          'h-10 w-10 flex items-center justify-center rounded-full text-sm transition',
          muted ? 'text-gray-300' : 'text-gray-800',
          between ? 'bg-blue-100' : '',
          selectedStart || selectedEnd
            ? 'bg-blue-600 text-white font-semibold'
            : 'hover:bg-gray-100',
          disabled ? 'opacity-40 cursor-not-allowed hover:bg-transparent' : '',
        ].join(' ')}
        aria-label={format(d, 'PPP')}
      >
        {format(d, 'd')}
      </button>
    );
  };

  return (
    <div className="w-full flex justify-center">
      {/* Outer pill */}
      <div className="w-full max-w-5xl bg-white/95 backdrop-blur rounded-[2rem] shadow-xl border border-gray-200 px-5 md:px-6 py-3 md:py-4 flex items-center gap-4">
    

        {/* Dates */}
        <div className="flex-[1.2] min-w-[260px]" ref={triggerRef}>
          <div
            className="cursor-pointer"
            onClick={() => setShowCal((s) => !s)}
          >
            <div className="flex items-center gap-2 text-gray-600 uppercase tracking-wide text-[10px] font-semibold mb-1">
              <CalIcon className="w-3.5 h-3.5" />
              {nights > 0 ? `${nights} Night${nights > 1 ? 's' : ''}` : 'Dates'}
            </div>
            <div className="text-lg md:text-xl font-medium text-gray-900">
              {checkIn ? fmtShort(checkIn) : 'Check-in'}
              <span className="mx-1 text-gray-500">-</span>
              {checkOut ? fmtShort(checkOut) : 'Check-out'}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px self-stretch bg-gray-200" />

        {/* Guests */}
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 text-gray-600 uppercase tracking-wide text-[10px] font-semibold mb-1">
            <UsersIcon className="w-4 h-4" />
            Guests
          </div>
          <div className="flex items-center gap-4 text-gray-900">
            <label className="flex items-center gap-1">
              <span className="text-sm">Adults</span>
              <select
                value={adults}
                onChange={(e) => setAdults(e.target.value)}
                className="bg-transparent text-lg font-medium focus:outline-none focus:ring-0"
              >
                {[...Array(10).keys()].map((i) => (
                  <option key={i + 1} value={i + 1} className="text-black">
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1">
              <span className="text-sm">Children</span>
              <select
                value={children}
                onChange={(e) => setChildren(e.target.value)}
                className="bg-transparent text-lg font-medium focus:outline-none focus:ring-0"
              >
                {[...Array(6).keys()].map((i) => (
                  <option key={i} value={i} className="text-black">
                    {i}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleSearch}
          className="shrink-0 bg-gray-900 hover:bg-black text-white text-sm md:text-base font-semibold px-6 md:px-8 py-3 rounded-full inline-flex items-center gap-2 transition"
          type="button"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="7" strokeWidth="2" />
            <path d="M21 21l-4.35-4.35" strokeWidth="2" />
          </svg>
          Find Hotels
        </button>
      </div>

      {/* Calendar Portal */}
      {mounted && showCal &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[999998] bg-black/0"
              onClick={() => setShowCal(false)}
            />
            <div
              className="fixed z-[999999] bg-white border rounded-xl shadow-2xl p-4 w-[680px] max-w-[95vw]"
              style={{ top: calPos.top, left: calPos.left }}
              role="dialog"
              aria-modal="true"
            >
              {/* Calendar header */}
              <div className="flex items-center justify-between mb-3">
                <button
                  className="px-3 py-1 rounded hover:bg-gray-100"
                  onClick={() =>
                    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
                  }
                  type="button"
                >
                  ←
                </button>
                <div className="text-sm font-semibold">
                  {format(leftMonth, 'MMMM yyyy')} &nbsp;•&nbsp; {format(rightMonth, 'MMMM yyyy')}
                </div>
                <button
                  className="px-3 py-1 rounded hover:bg-gray-100"
                  onClick={() =>
                    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
                  }
                  type="button"
                >
                  →
                </button>
              </div>

              {/* Two-month grid */}
              <div className="grid grid-cols-2 gap-6">
                {[{ days: leftDays }, { days: rightDays }].map(({ days }, idx) => (
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

              {/* Actions */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600">
                  {checkIn && !checkOut && 'Select a check-out date'}
                  {checkIn && checkOut && `${nights} night${nights > 1 ? 's' : ''} selected`}
                  {!checkIn && !checkOut && 'Select a check-in date'}
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-4 py-2 rounded-lg border hover:bg-gray-50"
                    onClick={() => setShowCal(false)}
                    type="button"
                  >
                    Close
                  </button>
                  <button
                    disabled={!checkIn || !checkOut}
                    className={`px-4 py-2 rounded-lg text-white ${
                      checkIn && checkOut ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'
                    }`}
                    onClick={() => setShowCal(false)}
                    type="button"
                  >
                    Apply Dates
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
