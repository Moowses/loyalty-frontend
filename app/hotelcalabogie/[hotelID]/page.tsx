'use client';

import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Bath,
  ShowerHead,
  Wind,
  Wifi,
  Tv,
  Utensils,
  Flame,
  Waves,
  PawPrint,
  Baby,
  UserRound,
  Cigarette,
  CigaretteOff,
  PartyPopper,
  Ban,
  Car,
  AlertTriangle,
  SprayCan,
  Clock,
  Info,
  CheckCircle2,
  ImagePlus,
} from 'lucide-react';

type Meta = {
  hotelId: string;
  hotelNo?: string;
  name: string;
  brandName?: string;
  tagline?: string;
  descriptionShort?: string;
  descriptionLong?: string[];
  amenities?: string[] | Record<string, string[]>;
  houseRules?: string[];
  gallery?: string[];
};

function normalizeMeta(raw: any): Meta | null {
  if (!raw || typeof raw !== 'object') return null;
  const longRaw = raw.descriptionLong ?? raw.longDescription ?? [];
  const longList = Array.isArray(longRaw)
    ? longRaw.filter(Boolean).map(String)
    : longRaw
    ? [String(longRaw)]
    : [];

  return {
    hotelId: String(raw.hotelId ?? raw.hotelNo ?? ''),
    hotelNo: raw.hotelNo ? String(raw.hotelNo) : undefined,
    name: String(raw.name ?? raw.hotelName ?? ''),
    brandName: raw.brandName ? String(raw.brandName) : undefined,
    tagline: raw.tagline ? String(raw.tagline) : undefined,
    descriptionShort: String(raw.descriptionShort ?? raw.shortDescription ?? ''),
    descriptionLong: longList,
    amenities: raw.amenities,
    houseRules: Array.isArray(raw.houseRules) ? raw.houseRules.map(String) : undefined,
    gallery: Array.isArray(raw.gallery) ? raw.gallery.map(String) : undefined,
  };
}

function parseMaybeLooseJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    // tolerate common trailing-comma mistakes in hand-edited JSON files
    const sanitized = text.replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(sanitized);
  }
}

type RoomTypeOption = {
  roomTypeId: string;
  roomTypeName: string;
};

// ===== Helpers =====
const toNum = (v: any) => Number(String(v ?? 0).replace(/[^0-9.-]/g, '')) || 0;
const money = (n: number, ccy = 'CAD') =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: ccy }).format(n || 0);

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const slugCondensed = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const roomTypeFolder = (s: string) => String(s || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
const CALABOGIE_ROOM_FOLDER_BY_ID: Record<string, string> = {
  'ae50e6a8-29dd-447d-840c-b3f40144635d': 'CA1B',
  '3b427e83-f01e-4cf8-83cc-b3f4014439f6': 'CH2B',
  '82c0ab4c-8a5c-4d77-aaae-b3f40143f53b': 'CH3B',
  '8767d68e-188d-42ff-811e-b31b011b278b': '1BEDROOMLOFT',
};

// LOCAL y-m-d (fixes UTC shift)
const ymd = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const addMonths = (date: Date, m: number) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + m);
  return d;
};

const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const normalizeId = (v: unknown) => String(v ?? '').trim().toLowerCase();

function pickDateNumberMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.entries(raw as Record<string, unknown>).reduce<Record<string, number>>((acc, [k, v]) => {
    if (!ISO_DATE_RE.test(k)) return acc;
    acc[k] = toNum(v);
    return acc;
  }, {});
}

function pickFromDaysMap(rawDays: unknown, field: 'price' | 'available' | 'minStay' | 'maxStay') {
  if (!rawDays || typeof rawDays !== 'object' || Array.isArray(rawDays)) return {} as Record<string, number>;
  return Object.entries(rawDays as Record<string, any>).reduce<Record<string, number>>((acc, [key, day]) => {
    const iso = ISO_DATE_RE.test(key) ? key : String(day?.date ?? '');
    if (!ISO_DATE_RE.test(iso)) return acc;

    if (field === 'available') {
      const v = day?.available;
      acc[iso] = v === true || String(v) === '1' ? 1 : 0;
      return acc;
    }

    acc[iso] = toNum(day?.[field]);
    return acc;
  }, {});
}

function preferNonEmptyMap(primary: Record<string, number>, fallback: Record<string, number>) {
  return Object.keys(primary).length > 0 ? primary : fallback;
}

function isAvailableValue(v: unknown) {
  if (v === true) return true;
  if (v === 1) return true;
  const s = String(v ?? '').trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
}

function normalizeDailyPrices(raw: any, selectedRoomTypeId?: string | null): Record<string, number> {
  const pickDatePriceMap = (candidate: any): Record<string, number> => {
    const normalized = pickDateNumberMap(candidate);
    return Object.entries(normalized).reduce<Record<string, number>>((acc, [k, v]) => {
      if (v > 0) acc[k] = v;
      return acc;
    }, {});
  };

  const direct = pickDatePriceMap(raw);
  if (Object.keys(direct).length > 0) return direct;

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  if (selectedRoomTypeId && raw[selectedRoomTypeId]) {
    const targeted = pickDatePriceMap(raw[selectedRoomTypeId]);
    if (Object.keys(targeted).length > 0) return targeted;
  }

  for (const value of Object.values(raw)) {
    const nested = pickDatePriceMap(value);
    if (Object.keys(nested).length > 0) return nested;
  }

  return {};
}

function diffInDays(start: string, end: string) {
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  const sDate = new Date(sy, (sm || 1) - 1, sd || 1);
  const eDate = new Date(ey, (em || 1) - 1, ed || 1);
  const ms = eDate.getTime() - sDate.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

const normalizeMinNights = (v: unknown) => {
  const n = Math.floor(toNum(v));
  return n > 0 ? n : 1;
};

const normalizeMaxNights = (v: unknown, min: number) => {
  const n = Math.floor(toNum(v));
  if (n <= 0) return Math.max(365, min);
  return Math.max(n, min);
};

function getStayBoundsForDate(
  dateIso: string,
  minStayMap: Record<string, number>,
  maxStayMap: Record<string, number>,
  defaultMinStay: number | null,
  defaultMaxStay: number | null
) {
  const min = normalizeMinNights(minStayMap[dateIso] ?? defaultMinStay ?? 1);
  const max = normalizeMaxNights(maxStayMap[dateIso] ?? defaultMaxStay ?? 365, min);
  return { min, max };
}

// Hard disable only if unavailable (PMS availability)
function isDayUnavailableFactory(availableDates: Set<string>, isCalLoading: boolean) {
  return (iso: string) => {
    if (isCalLoading) return true;
    if (!iso) return true;
    return !availableDates.has(iso);
  };
}

// Checkout guard: prevents invalid end-date selection (min/max stay, gaps)
function isCheckoutBlockedFactory(
  availableDates: Set<string>,
  tmpStart: string | null,
  minStayMap: Record<string, number>,
  maxStayMap: Record<string, number>,
  defaultMinStay: number | null,
  defaultMaxStay: number | null
) {
  return (iso: string) => {
    if (!iso) return true;

    // no start yet- rules don't apply
    if (!tmpStart) return false;

    // cannot pick same/before start as checkout
    if (iso <= tmpStart) return true;

    const nights = diffInDays(tmpStart, iso);

    const { min, max } = getStayBoundsForDate(
      tmpStart,
      minStayMap,
      maxStayMap,
      defaultMinStay,
      defaultMaxStay
    );

    if (nights < min) return true;
    if (nights > max) return true;

    // ensure all intermediate nights are available
    const [sy, sm, sd] = tmpStart.split('-').map(Number);
    let cursor = new Date(sy, (sm || 1) - 1, sd || 1);

    for (let i = 0; i < nights; i++) {
      cursor.setDate(cursor.getDate() + 1);
      const midIso = ymd(cursor);
      if (!availableDates.has(midIso)) return true;
    }

    return false;
  };
}

function hasUnavailableInRange(available: Set<string>, start?: string, end?: string) {
  if (!start || !end) return false;
  // check every night from start -> end (exclusive of checkout)
  const startDate = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');

  const cur = new Date(startDate);
  while (cur < endDate) {
    const iso = ymd(cur);
    if (!available.has(iso)) return true;
    cur.setDate(cur.getDate() + 1);
  }
  return false;
}

/* icons */
type IconC = ComponentType<{ className?: string }>;

const amenityIcon = (name: string): IconC => {
  const s = name.toLowerCase();
  if (s.includes('hot tub')) return Bath;
  if (s.includes('shower')) return ShowerHead;
  if (s.includes('washing')) return SprayCan;
  if (s.includes('air conditioning') || s.includes('ac')) return Wind;
  if (s.includes('wifi') || s.includes('wireless')) return Wifi;
  if (s === 'tv' || s.includes('television')) return Tv;
  if (s.includes('kitchen')) return Utensils;
  if (s.includes('grill') || s.includes('bbq')) return Flame;
  if (s.includes('beach')) return Waves;
  if (s.includes('parking')) return Car;
  if (s.includes('first aid') || s.includes('smoke')) return AlertTriangle;
  if (s.includes('children')) return UserRound;
  if (s.includes('infant') || s.includes('baby')) return Baby;
  if (s.includes('pet')) return PawPrint;
  return CheckCircle2;
};

const ruleIcon = (text: string): IconC => {
  const s = text.toLowerCase();
  if (s.startsWith('check-in') || s.startsWith('check-in')) return Clock;
  if (s.startsWith('check-out') || s.startsWith('check-out')) return Clock;
  if (s.includes('children')) return UserRound;
  if (s.includes('infants')) return Baby;
  if (s.includes('pets')) return PawPrint;
  if (s.includes('parties') || s.includes('events')) return PartyPopper;
  if (s.includes('smoking') && s.includes('not')) return CigaretteOff;
  if (s.includes('smoking')) return Cigarette;
  if (s.includes('not allowed') || s.startsWith('no ')) return Ban;
  return Info;
};

const Row = ({ Icon, text }: { Icon: IconC; text: string }) => (
  <div className="flex items-start gap-3 py-2">
    <Icon className="h-5 w-5 shrink-0 text-gray-600" />
    <span className="text-[15px] leading-6 text-gray-800">{text}</span>
  </div>
);

// ===== Reserve Choice Modal =====
function ReserveChoiceModal({
  open,
  onClose,
  onMember,
  onGuest,
}: {
  open: boolean;
  onClose: () => void;
  onMember: () => void;
  onGuest: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Continue to Reserve</h3>
            <p className="mt-1 text-sm text-gray-600">
              Choose how you’d like to continue.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <button
            type="button"
            onClick={onMember}
            className="w-full rounded-xl bg-[#211F45] py-3 font-medium text-white hover:opacity-95"
          >
            Member Login
          </button>

          <button
            type="button"
            onClick={onGuest}
            className="w-full rounded-xl border border-gray-300 bg-white py-3 font-medium text-gray-900 hover:bg-gray-50"
          >
            Continue as Guest
          </button>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Members may see perks and faster checkout. Guests can still complete payment.
        </p>
      </div>
    </div>
  );
}

// ===== Calendar Picker =====
function DateRangePicker({
  start,
  end,
  onChange,
  onClose,
  onApply,
  isDayUnavailable,
  isCheckoutBlocked,
  isLoading,
  loadingText,
  prices,
  currencyCode,
}: {
  start?: string;
  end?: string;
  onChange: (s: string, e: string) => void;
  onClose: () => void;
  onApply: () => void;
  isDayUnavailable?: (iso: string) => boolean;
  isCheckoutBlocked?: (iso: string) => boolean;
  isLoading?: boolean;
  loadingText?: string;
  prices?: Record<string, number>;
  currencyCode?: string;
}) {
  const today = new Date();
  const [view, setView] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  function toISO(d: Date) {
    return ymd(d);
  }

  function Month({ base }: { base: Date }) {
    const days = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    const offset = new Date(base.getFullYear(), base.getMonth(), 1).getDay();

    const y = base.getFullYear();
    const m = base.getMonth();

    const cells: (string | null)[] = Array(offset)
      .fill(null)
      .concat(Array.from({ length: days }, (_, i) => toISO(new Date(y, m, i + 1))));

    return (
      <div>
        <div className="text-center font-semibold mb-2">
          {base.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
        </div>

        <div className="grid grid-cols-7 text-xs text-gray-500 mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <div key={d} className="text-center">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((iso, idx) => {
            const unavailable = !!iso && !!isDayUnavailable?.(iso);
            const blockedEnd = !!iso && !!isCheckoutBlocked?.(iso);
            const isDisabled = !iso || unavailable;

            const isStart = !!start && iso === start;
            const isEnd = !!end && iso === end;

            const inRange = !!start && !!end && !!iso && iso > start && iso < end;
            const active = isStart || isEnd;
            const isSingle = !!start && !end && iso === start;

            const rawPrice = iso ? toNum(prices?.[iso]) : 0;
            const showPrice = !!iso && rawPrice > 0;

            const priceLabel = showPrice
              ? new Intl.NumberFormat('en-CA', {
                  style: 'currency',
                  currency: (currencyCode || 'CAD').toUpperCase(),
                  maximumFractionDigits: 0,
                }).format(rawPrice)
              : '';

            const canClick = !!iso && !isDisabled && !blockedEnd;
            const isSelectedDay = (active || isSingle) && !isDisabled;

            return (
              <button
                key={idx}
                type="button"
                disabled={isDisabled}
                onClick={() => {
                  if (!iso) return;

                  // Start selection (or reset)
                  if (!start || (start && end)) {
                    if (unavailable) return;
                    onChange(iso!, '');
                    return;
                  }

                  // End selection
                  if (start && !end) {
                    if (!canClick) return;
                    if (iso! < start) onChange(iso!, start);
                    else onChange(start, iso!);
                  }
                }}
                className={[
                  'h-12 w-12 rounded-full flex items-center justify-center text-sm transition select-none border mx-auto',

                  isDisabled
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-70 border-gray-200'
                    : 'bg-white text-gray-900 border-gray-200',

                  canClick ? 'hover:bg-gray-100 cursor-pointer' : '',

                  isSingle && !isDisabled
                    ? '!bg-[#211F45] !text-white !border-[#211F45]'
                    : active && !isDisabled
                    ? '!bg-[#211F45] !text-white !border-[#211F45]'
                    : inRange && !isDisabled
                    ? '!bg-[#E9E7F2] !text-[#211F45] !border-[#E9E7F2]'
                    : '',
                ].join(' ')}
              >
                <div className="flex flex-col items-center leading-none">
                  <span>{iso ? Number(iso.slice(8, 10)) : ''}</span>

                  {showPrice && (
                    <span
                      className={[
                        'text-[10px] mt-1',
                        isSelectedDay ? '!text-white' : isDisabled ? 'text-gray-400' : 'text-gray-500',
                        unavailable ? 'line-through opacity-70' : '',
                      ].join(' ')}
                    >
                      {priceLabel}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const next = new Date(view);
  next.setMonth(view.getMonth() + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white p-4 rounded-xl shadow-xl max-w-3xl w-full relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 rounded-xl flex items-center justify-center">
            <div className="animate-pulse text-slate-700 text-sm">
              {loadingText || 'Getting availability…'}
            </div>
          </div>
        )}

        <div className="flex justify-between mb-3">
          <button
            type="button"
            onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
          >
            Prev
          </button>
          <div className="font-semibold">Select dates</div>
          <button
            type="button"
            onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
          >
            Next
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Month base={view} />
          <Month base={next} />
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={() => onChange('', '')}>
            Reset
          </button>
          <button type="button" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            disabled={!start || !end}
            onClick={onApply}
            className="bg-[#211F45] text-white px-4 py-2 rounded"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HotelInfoPage() {
  const params = useParams<{ hotelID: string }>();
  const hotelId = String(params?.hotelID || 'CBE');
  const sp = useSearchParams();
  const router = useRouter();

  // IMPORTANT: /booking is your payment/checkout route
  const PAYMENTS_PATH = '/booking';

  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  // calendar min/max stay
  const [minStayMap, setMinStayMap] = useState<Record<string, number>>({});
  const [maxStayMap, setMaxStayMap] = useState<Record<string, number>>({});
  const [defaultMinStay, setDefaultMinStay] = useState<number | null>(null);
  const [defaultMaxStay, setDefaultMaxStay] = useState<number | null>(null);

  const [activeMinStay, setActiveMinStay] = useState<number | null>(null);
  const [activeMaxStay, setActiveMaxStay] = useState<number | null>(null);

  /* values from search */
  const nameQP = sp.get('name') || '';
  const currency = sp.get('currency') || 'CAD';
  const hotelNo = sp.get('hotelNo') || '';
  const roomTypeId = sp.get('roomTypeId') || '';
  const roomTypeNameQP = sp.get('roomTypeName') || '';

  const totalFromSearch = Number(sp.get('total') || '0');
  const petFromSearch = Number(sp.get('petFee') || '0');

  /* inputs */
  const [checkIn, setCheckIn] = useState(sp.get('checkIn') || sp.get('startTime') || '');
  const [checkOut, setCheckOut] = useState(sp.get('checkOut') || sp.get('endTime') || '');
  const [adult, setAdult] = useState(Number(sp.get('adult') || sp.get('adults') || '1'));
  const [child, setChild] = useState(Number(sp.get('child') || sp.get('children') || '0'));
  const [infant, setInfant] = useState(Number(sp.get('infant') || sp.get('infants') || '0'));
  const [pet, setPet] = useState(
    (sp.get('pet') || (sp.get('pets') === '1' ? 'yes' : 'no') || 'no') === 'yes' ? 'yes' : 'no'
  );

  const [showCalendar, setShowCalendar] = useState(false);
  const [tmpStart, setTmpStart] = useState<string>(checkIn || '');
  const [tmpEnd, setTmpEnd] = useState<string>(checkOut || '');

  function fmtHuman(s: string) {
    if (!s) return '';
    const [y, m, d] = s.split('-').map(Number);
    const date = new Date(y, (m || 1) - 1, d || 1);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /* meta */
  const displayName = nameQP || '';
  const calabogieRoomFolder =
    CALABOGIE_ROOM_FOLDER_BY_ID[String(roomTypeId).trim()] ||
    roomTypeFolder(roomTypeNameQP);
  const isCalabogieHotel = String(hotelId).toUpperCase() === 'CBE' || String(hotelNo).toUpperCase() === 'CBE';
  const sDashed = slugify(displayName);
  const sCondensed = slugCondensed(displayName);
  const [meta, setMeta] = useState<Meta | null>(null);

  const amenitiesList = useMemo(() => {
    const a = (meta as any)?.amenities;
    if (!a) return [] as string[];
    if (Array.isArray(a)) return a.filter(Boolean);
    if (typeof a === 'object') {
      return Object.values(a)
        .flatMap((v) => (Array.isArray(v) ? v : []))
        .filter(Boolean);
    }
    return [] as string[];
  }, [meta]);

  useEffect(() => {
    async function load() {
      const candidates = [
        ...(isCalabogieHotel && calabogieRoomFolder
          ? [`/calabogie-properties/${calabogieRoomFolder}/meta.json`]
          : []),
        `/properties/${sDashed}/meta.json`,
        `/properties/${sCondensed}/meta.json`,
      ];
      for (const url of candidates) {
        try {
          const r = await fetch(url, { cache: 'no-store' });
          if (r.ok) {
            const payload = parseMaybeLooseJson(await r.text());
            setMeta(normalizeMeta(payload));
            return;
          }
        } catch {}
      }
      setMeta(null);
    }
    if (displayName || (isCalabogieHotel && calabogieRoomFolder)) load();
  }, [displayName, sDashed, sCondensed, isCalabogieHotel, calabogieRoomFolder]);

  const gallery = meta?.gallery?.length
    ? meta.gallery
    : ['hero.png', '1.png', '2.png', '3.png', '4.png', '5.png'];

  const img = (f: string) =>
    isCalabogieHotel && calabogieRoomFolder
      ? `/calabogie-properties/${calabogieRoomFolder}/${f}`
      : `/properties/${sDashed}/${f}`;
  const imgFallback = (f: string) =>
    isCalabogieHotel && calabogieRoomFolder
      ? `/calabogie-properties/${calabogieRoomFolder}/${f}`
      : `/properties/${sCondensed}/${f}`;

  /* totals & availability */
  const [petFee, setPetFee] = useState(petFromSearch);
  const [available, setAvailable] = useState(totalFromSearch > 0);
  const [loading, setLoading] = useState(false);
  const [nights, setNights] = useState(0);
  const [roomSubtotal, setRoomSubtotal] = useState(totalFromSearch);
  const [cleaningFee, setCleaningFee] = useState(0);
  const [vat, setVat] = useState(0);
  const [noRooms, setNoRooms] = useState(false);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string | null>(
    roomTypeId ? String(roomTypeId) : null
  );
  const [roomTypeOptions, setRoomTypeOptions] = useState<RoomTypeOption[]>([]);
  const selectedRoomTypeLabel = useMemo(() => {
    const fromMeta = String(meta?.name || meta?.hotelName || '').trim();
    if (fromMeta) return fromMeta;

    const fromOptions = roomTypeOptions.find(
      (rt) => normalizeId(rt.roomTypeId) === normalizeId(selectedRoomTypeId || roomTypeId)
    )?.roomTypeName;
    if (fromOptions) return String(fromOptions).trim();

    const fromQuery = String(roomTypeNameQP || '').trim();
    if (fromQuery) return fromQuery;

    return 'Selected room';
  }, [meta, roomTypeOptions, selectedRoomTypeId, roomTypeId, roomTypeNameQP]);

  useEffect(() => {
    setSelectedRoomTypeId(roomTypeId ? String(roomTypeId) : null);
  }, [roomTypeId]);

  // Calendar availability state
  const [calPrices, setCalPrices] = useState<Record<string, number>>({});
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [isCalLoading, setIsCalLoading] = useState<boolean>(false);
  const [calendarFallbackMode, setCalendarFallbackMode] = useState<boolean>(false);
  const [calendarResponseRoomTypeId, setCalendarResponseRoomTypeId] = useState<string | null>(null);

  const nightsCalc = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const a = new Date(checkIn).getTime();
    const b = new Date(checkOut).getTime();
    const d = Math.round((b - a) / 86400000);
    return Number.isFinite(d) && d > 0 ? d : 0;
  }, [checkIn, checkOut]);

  useEffect(() => {
    setNights(nightsCalc);
  }, [nightsCalc]);

  // Auth status
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://member.dreamtripclub.com';
    fetch(`${base}/api/auth/status`, { credentials: 'include' })
      .then((r) => setIsAuthed(r.ok))
      .catch(() => setIsAuthed(false));
  }, []);


  // After successful login from modal, redirect to pending payment url
  useEffect(() => {
    if (isAuthed !== true) return;
    const redirect = sessionStorage.getItem('dtc_post_login_redirect');
    if (redirect) {
      sessionStorage.removeItem('dtc_post_login_redirect');
      router.replace(redirect);
    }
  }, [isAuthed, router]);

  // listerner 

  useEffect(() => {
  const tryRedirect = () => {
    const redirect = sessionStorage.getItem('dtc_post_login_redirect');
    if (redirect) {
      sessionStorage.removeItem('dtc_post_login_redirect');
      router.replace(redirect);
    }
  };

  const onMsg = (ev: MessageEvent) => {
    if (ev?.data?.type !== 'auth-success') return;
    tryRedirect();
  };

  const onStorage = (e: StorageEvent) => {
    if (e.key !== 'dtc_auth_changed') return;
    tryRedirect();
  };

  window.addEventListener('message', onMsg);
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener('message', onMsg);
    window.removeEventListener('storage', onStorage);
  };
}, [router]);


  const nightly = useMemo(() => (nights ? roomSubtotal / nights : 0), [roomSubtotal, nights]);

  const grandTotal = useMemo(
    () => (roomSubtotal || 0) + (petFee || 0) + (cleaningFee || 0) + (vat || 0),
    [roomSubtotal, petFee, cleaningFee, vat]
  );

  // Quote (unchanged)
  async function fetchQuote() {
    setNoRooms(false);
    if (!checkIn || !checkOut) return;

    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
      const selected = selectedRoomTypeId || roomTypeId;
      if (!selected) {
        setAvailable(false);
        setRoomSubtotal(0);
        return;
      }
      const preferredBookingId = String(selected);
      const qs = new URLSearchParams({
        startDate: checkIn,
        endDate: checkOut,
        roomTypeId: preferredBookingId,
        adult: String(adult),
        child: String(child),
        infant: String(infant),
        pet: pet === 'yes' ? 'yes' : 'no',
        currency: String(currency || 'CAD').toUpperCase(),
      });
      const r = await fetch(`${base}/api/calabogie/quote?${qs.toString()}`, { cache: 'no-store' });
      const j = await r.json();
      const row = j?.data ?? null;
      const ok = !!row && Number(row.roomSubtotal ?? row.grossAmountUpstream ?? 0) > 0;
      const subtotal = Number(row?.roomSubtotal ?? row?.grossAmountUpstream ?? 0);
      const pfee = pet === 'yes' ? Number(row?.petFeeAmount ?? 0) : 0;
      const cfee = Number(row?.cleaningFeeAmount ?? 0);
      const tax = Number(row?.vatAmount ?? 0);
      const nightsSrv = row?.dailyPrices ? Object.keys(row.dailyPrices).length : 0;
      if (nightsSrv > 0) setNights(nightsSrv);
      const noRoomsFlag = !ok;

      setAvailable(!!ok);
      setRoomSubtotal(ok ? subtotal : 0);
      setPetFee(ok ? pfee : 0);
      setCleaningFee(ok ? cfee : 0);
      setVat(ok ? tax : 0);
      setNoRooms(noRoomsFlag);
    } catch (e) {
      console.error('refreshAvailability error', e);
      setAvailable(false);
      setRoomSubtotal(0);
      setPetFee(0);
      setCleaningFee(0);
      setVat(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(fetchQuote, 250);
    return () => clearTimeout(t);
  }, [checkIn, checkOut, adult, child, infant, pet, hotelNo, currency, selectedRoomTypeId]);

  // Calendar availability fetcher
  async function loadCalendarAvailability() {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

    const start = ymd(new Date());
    const endExclusive = ymd(addDays(addMonths(new Date(), 6), 1));

    setIsCalLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: start,
        endDate: endExclusive,
        currency: String(currency || 'CAD').toUpperCase(),
      });
      if (selectedRoomTypeId) params.set('roomTypeId', selectedRoomTypeId);

      const [availabilityRes, roomTypesRes] = await Promise.all([
        fetch(`${base}/api/calabogie/availability?${params.toString()}`, { cache: 'no-store' }),
        fetch(`${base}/api/calabogie/view-all-rooms`, { cache: 'no-store' }),
      ]);
      const j = await availabilityRes.json();
      const data = j?.data ?? {};
      const roomTypesJson = roomTypesRes.ok ? await roomTypesRes.json() : null;

      const fallbackMode =
        !!selectedRoomTypeId &&
        (data?.roomTypeId == null ||
          normalizeId(data?.roomTypeId) !== normalizeId(selectedRoomTypeId));
      setCalendarFallbackMode(fallbackMode);
      setCalendarResponseRoomTypeId(data?.roomTypeId == null ? null : String(data.roomTypeId));

      const roomTypes = (
        Array.isArray(roomTypesJson?.data?.roomTypes)
          ? roomTypesJson.data.roomTypes
          : Array.isArray(data.roomTypes)
          ? data.roomTypes
          : []
      )
        .map((rt: any) => ({
          roomTypeId: String(rt?.roomTypeId ?? ''),
          roomTypeName: String(rt?.roomTypeName ?? rt?.name ?? rt?.roomTypeId ?? ''),
        }))
        .filter((rt: RoomTypeOption) => !!rt.roomTypeId);

      const availability = preferNonEmptyMap(
        pickDateNumberMap(data.availability),
        pickFromDaysMap(data.days, 'available')
      );
      const prices = preferNonEmptyMap(
        normalizeDailyPrices(data.dailyPrices, selectedRoomTypeId),
        pickFromDaysMap(data.days, 'price')
      );
      const minStay = preferNonEmptyMap(
        pickDateNumberMap(data.minStay),
        pickFromDaysMap(data.days, 'minStay')
      );
      const maxStay = preferNonEmptyMap(
        pickDateNumberMap(data.maxStay),
        pickFromDaysMap(data.days, 'maxStay')
      );

      // 1 = clickable, 0 = not clickable
      const enabled = Object.keys(availability).filter((d) => isAvailableValue(availability[d]));

      setAvailableDates(new Set(enabled));
      setCalPrices(prices);
      setRoomTypeOptions(roomTypes);

      // per-day rules + defaults from backend
      setMinStayMap(minStay);
      setMaxStayMap(maxStay);
      const normalizedDefaultMin = normalizeMinNights(data.defaults?.minNights ?? 1);
      const normalizedDefaultMax = normalizeMaxNights(
        data.defaults?.maxNights ?? 365,
        normalizedDefaultMin
      );
      setDefaultMinStay(normalizedDefaultMin);
      setDefaultMaxStay(normalizedDefaultMax);
    } catch (err) {
      console.error('Calendar availability failed', err);
      setCalendarFallbackMode(false);
      setAvailableDates(new Set());
      setRoomTypeOptions([]);
      setMinStayMap({});
      setMaxStayMap({});
      setDefaultMinStay(null);
      setDefaultMaxStay(null);
    } finally {
      setIsCalLoading(false);
    }
  }

  useEffect(() => {
    if (!calendarFallbackMode || !selectedRoomTypeId) return;
    const telemetryKey = [
      'dtc_cal_fallback',
      String(hotelNo || hotelId || ''),
      String(selectedRoomTypeId || ''),
      String(calendarResponseRoomTypeId ?? 'null'),
    ].join(':');
    if (sessionStorage.getItem(telemetryKey) === '1') return;
    sessionStorage.setItem(telemetryKey, '1');

    const detail = {
      hotelNo: String(hotelNo || hotelId || ''),
      requestedRoomTypeId: String(selectedRoomTypeId),
      responseRoomTypeId: calendarResponseRoomTypeId,
      at: new Date().toISOString(),
    };
    window.dispatchEvent(new CustomEvent('dtc:calendar-fallback', { detail }));
    console.info('[calendar-fallback]', detail);
  }, [calendarFallbackMode, calendarResponseRoomTypeId, hotelId, hotelNo, selectedRoomTypeId]);

  // guards for incoming search dates
  const [incomingRangeInvalid, setIncomingRangeInvalid] = useState(false);
  const [initialGuardChecked, setInitialGuardChecked] = useState(false);

  useEffect(() => {
    if (initialGuardChecked) return;
    if (isCalLoading) return;
    if (!checkIn || !checkOut) return;
    if (!availableDates || availableDates.size === 0) return;

    const hasGap = hasUnavailableInRange(availableDates, checkIn, checkOut);

    if (hasGap) {
      setIncomingRangeInvalid(true);
      setTmpStart('');
      setTmpEnd('');
      setActiveMinStay(null);
      setActiveMaxStay(null);
      setShowCalendar(true);
    }

    setInitialGuardChecked(true);
  }, [availableDates, isCalLoading, checkIn, checkOut, initialGuardChecked]);

  useEffect(() => {
    setInitialGuardChecked(false);
  }, [selectedRoomTypeId]);

  useEffect(() => {
    loadCalendarAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId, hotelNo, currency, selectedRoomTypeId]);

  // Modals
  const [showAmenities, setShowAmenities] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  // Reserve modal
  const [showReserveModal, setShowReserveModal] = useState(false);

  const GRID_SHOWN = 5;
  const extraPhotos = Math.max(0, (gallery?.length || 0) - GRID_SHOWN);

  // Build payment (booking) URL
  function buildBookingUrl(isGuest: boolean) {
    const bookingHotelId = String(hotelId || 'CBE');
    const bookingTargetId = selectedRoomTypeId || roomTypeId || '';
    const params = new URLSearchParams({
      hotelId: bookingHotelId,
      hotelNo: String(hotelNo || bookingHotelId),
      roomTypeId: bookingTargetId,
      startTime: checkIn,
      endTime: checkOut,
      adults: String(adult),
      children: String(child),
      infants: String(infant),
      pets: pet === 'yes' ? '1' : '0',
      currency: currency || 'CAD',
      total: String(roomSubtotal),
      petFee: String(petFee),

      // optional extra context for summary display
      name: String(displayName || ''),
      cleaningFee: String(cleaningFee),
      vat: String(vat),
      grandTotal: String(grandTotal),
    });

    if (isGuest) params.set('guest', '1');
    return `${PAYMENTS_PATH}?${params.toString()}`;
  }

  function persistBookingContext(nextUrl: string) {
    const bookingHotelId = String(hotelId || 'CBE');
    const bookingTargetId = selectedRoomTypeId || roomTypeId || '';
    sessionStorage.setItem(
      'dtc_pending_payment',
      JSON.stringify({
        nextUrl,
        hotelId: bookingHotelId,
        roomTypeId: bookingTargetId,
        hotelNo: String(hotelNo || bookingHotelId),
        checkIn,
        checkOut,
        adult,
        child,
        infant,
        pet,
        currency,
        roomSubtotal,
        petFee,
        cleaningFee,
        vat,
        grandTotal,
        displayName,
        ts: Date.now(),
      })
    );
    sessionStorage.setItem('dtc_post_login_redirect', nextUrl);
  }

  // Reserve click -> open modal
 function onClickReserve() {
  if (!available || roomSubtotal <= 0 || !checkIn || !checkOut) return;
  if (incomingRangeInvalid) return;

  // if already logged in, go straight to booking (member flow)
  if (isAuthed === true) {
    const nextUrl = buildBookingUrl(false);
    persistBookingContext(nextUrl);
    router.push(nextUrl);
    return;
  }

  // otherwise show reserve choice modal
  setShowReserveModal(true);
}

  // Member path -> open auth modal, then redirect to /booking after login
function onMemberLogin() {
  const nextUrl = buildBookingUrl(false);
  persistBookingContext(nextUrl);
  setShowReserveModal(false);

  try {
    sessionStorage.setItem('dtc_login_close_target', 'hotel-reserve');
    window.dispatchEvent(new CustomEvent('dtc:open-login'));
  } catch {}
}

  // Guest path -> go straight to /booking as guest
  function onContinueGuest() {
    const nextUrl = buildBookingUrl(true);
    // Keep for debugging/tracking; harmless even for guest
    persistBookingContext(nextUrl);
    setShowReserveModal(false);
    router.push(nextUrl);
  }

  const canReserve =
    !!checkIn &&
    !!checkOut &&
    available &&
    roomSubtotal > 0 &&
    !incomingRangeInvalid;

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6">
      <h1 className="text-2xl md:text-3xl font-semibold mb-2">
        {meta?.brandName || displayName || meta?.name || 'Property'}
      </h1>

      {meta?.tagline && <div className="text-gray-600 mb-4">{meta.tagline}</div>}

      {/* GALLERY */}
      <div className="mb-6">
        {/* mobile */}
        <div className="md:hidden relative">
          <img
            src={img(gallery[0])}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = imgFallback(gallery[0]);
            }}
            className="w-full h-[260px] object-cover rounded-xl"
            alt={`${displayName} main`}
          />
          {gallery.length > 1 && (
            <button
              onClick={() => setShowPhotos(true)}
              className="absolute bottom-3 right-3 bg-white/95 backdrop-blur text-gray-900 text-sm font-medium px-3 py-1.5 rounded-full shadow inline-flex items-center gap-1"
            >
              <ImagePlus className="w-4 h-4" /> + {gallery.length - 1} photos
            </button>
          )}
        </div>

        {/* desktop */}
        <div className="hidden md:grid grid-cols-4 gap-3">
          <div className="col-span-2 row-span-2">
            <img
              src={img(gallery[0])}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = imgFallback(gallery[0]);
              }}
              className="w-full h-[420px] object-cover rounded-xl"
              alt={`${displayName} main`}
            />
          </div>

          {gallery.slice(1, 5).map((g, i) => {
            const isLast = i === 3;
            return (
              <div key={i} className="relative">
                <img
                  src={img(g)}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = imgFallback(g);
                  }}
                  className="w-full h-[200px] object-cover rounded-xl"
                  alt={`${displayName} photo ${i + 2}`}
                />
                {isLast && extraPhotos > 0 && (
                  <button
                    onClick={() => setShowPhotos(true)}
                    className="absolute bottom-3 right-3 bg-white/90 backdrop-blur text-gray-900 text-sm font-medium px-3 py-1.5 rounded-full shadow"
                  >
                    + {extraPhotos} photos
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* MAIN 2-COLUMN */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_380px] gap-8">
        {/* LEFT */}
        <div>
          {meta?.descriptionShort && (
            <div className="text-[15px] leading-7 text-gray-700">{meta.descriptionShort}</div>
          )}

          {(meta?.descriptionLong?.length || 0) > 0 && (
            <button
              onClick={() => setShowAbout(true)}
              className="mt-3 inline-flex items-center justify-center px-4 py-2 rounded-full border text-sm"
            >
              Show more
            </button>
          )}

          {!!amenitiesList.length && (
            <div className="mt-10">
              <h2 className="text-xl font-semibold mb-3">Amenities</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2">
                {amenitiesList.slice(0, 8).map((a, i) => (
                  <Row key={i} Icon={amenityIcon(a)} text={a} />
                ))}
              </div>
              {amenitiesList.length > 8 && (
                <button
                  onClick={() => setShowAmenities(true)}
                  className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-full border text-sm"
                >
                  Show all {amenitiesList.length} amenities
                </button>
              )}
            </div>
          )}

          {!!meta?.houseRules?.length && (
            <div className="mt-10">
              <h2 className="text-xl font-semibold mb-3">Good to know</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2">
                {meta.houseRules.slice(0, 6).map((r, i) => (
                  <Row key={i} Icon={ruleIcon(r)} text={r} />
                ))}
              </div>
              {meta.houseRules.length > 6 && (
                <button
                  onClick={() => setShowRules(true)}
                  className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-full border text-sm"
                >
                  Show more house rules
                </button>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: pricing card */}
        <div className="border-2 border-gray-200 rounded-[16px] p-4 shadow-sm h-fit md:sticky md:top-4">
          <div className="flex items-baseline gap-2 mb-4">
            <div className="text-xl font-semibold">{nights && available ? money(nightly, currency) : '—'}</div>
            <div className="text-gray-500 text-sm">per night</div>
          </div>

          {incomingRangeInvalid && (
            <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              Some dates in your selected range are no longer available. Please choose new dates.
            </div>
          )}
          {calendarFallbackMode && (
            <div className="mb-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              Selected room type is unavailable right now. Showing hotel-level availability.
            </div>
          )}

          <div className="mb-3">
            <label className="text-xs text-gray-500">DATES</label>
            <button
              onClick={() => {
                setTmpStart(checkIn || '');
                setTmpEnd(checkOut || '');
                loadCalendarAvailability(); // re-fetch on open
                setShowCalendar(true);
              }}
              className="border rounded-lg px-3 py-2 w-full text-left"
            >
              {checkIn && checkOut ? `${fmtHuman(checkIn)} → ${fmtHuman(checkOut)}` : 'Add dates'}
            </button>
          </div>

          <div className="mb-3">
            <label className="text-xs text-gray-500">ROOM TYPE SELECTED</label>
            <div className="border rounded-lg px-3 py-2 w-full bg-gray-50 text-sm text-gray-900">
              {selectedRoomTypeLabel}
            </div>
          </div>

          {activeMinStay && (
            <p className="mb-2 text-sm font-medium text-slate-700">
              Minimum stay is {activeMinStay} night{activeMinStay > 1 ? 's' : ''}{' '}
              {activeMaxStay && <> (maximum {activeMaxStay} nights)</>}
            </p>
          )}

          {showCalendar && (
            <DateRangePicker
              start={tmpStart}
              end={tmpEnd}
              onChange={(start, end) => {
                setTmpStart(start);
                setTmpEnd(end);

                if (start) {
                  const { min, max } = getStayBoundsForDate(
                    start,
                    minStayMap,
                    maxStayMap,
                    defaultMinStay,
                    defaultMaxStay
                  );
                  setActiveMinStay(min);
                  setActiveMaxStay(max);
                } else {
                  setActiveMinStay(null);
                  setActiveMaxStay(null);
                }
              }}
              onClose={() => setShowCalendar(false)}
              onApply={() => {
                if (tmpStart && tmpEnd) {
                  if (hasUnavailableInRange(availableDates, tmpStart, tmpEnd)) {
                    alert(
                      'Your selected dates include at least one unavailable night. Please choose only dates that are not greyed out.'
                    );
                    return;
                  }

                  const nights = diffInDays(tmpStart, tmpEnd);

                  const { min, max } = getStayBoundsForDate(
                    tmpStart,
                    minStayMap,
                    maxStayMap,
                    defaultMinStay,
                    defaultMaxStay
                  );

                  if (nights < min) {
                    alert(`Minimum stay for this start date is ${min} night${min > 1 ? 's' : ''}.`);
                    return;
                  }

                  if (nights > max) {
                    alert(`Maximum stay for this start date is ${max} nights.`);
                    return;
                  }

                  setCheckIn(tmpStart);
                  setCheckOut(tmpEnd);
                  setIncomingRangeInvalid(false);
                }

                setShowCalendar(false);
              }}
              isDayUnavailable={isDayUnavailableFactory(availableDates, isCalLoading)}
              isCheckoutBlocked={isCheckoutBlockedFactory(
                availableDates,
                tmpStart || null,
                minStayMap,
                maxStayMap,
                defaultMinStay,
                defaultMaxStay
              )}
              isLoading={isCalLoading}
              loadingText={isCalLoading ? 'Getting availability…' : undefined}
              prices={calPrices}
              currencyCode={currency}
            />
          )}

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="flex flex-col">
              <label className="text-xs text-gray-500">ADULTS</label>
              <input
                type="number"
                min={1}
                value={adult}
                onChange={(e) => setAdult(+e.target.value)}
                className="border rounded-lg px-2 py-2"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-500">CHILDREN</label>
              <input
                type="number"
                min={0}
                value={child}
                onChange={(e) => setChild(+e.target.value)}
                className="border rounded-lg px-2 py-2"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-500">INFANTS</label>
              <input
                type="number"
                min={0}
                value={infant}
                onChange={(e) => setInfant(+e.target.value)}
                className="border rounded-lg px-2 py-2"
              />
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <label className="text-xs text-gray-500">PETS</label>
            <select
              value={pet}
              onChange={(e) => setPet(e.target.value as 'yes' | 'no')}
              className="border rounded-lg px-2 py-2"
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>

          <div className="text-sm text-gray-700 space-y-1 mb-3">
            <div className="flex items-center justify-between">
              <span>Nights</span>
              <b>{nights || 0}</b>
            </div>

            <div className="flex items-center justify-between">
              <span>Room subtotal</span>
              <b>{available ? money(roomSubtotal, currency) : '$0.00'}</b>
            </div>

            <div className="flex items-center justify-between">
              <span>Cleaning fee</span>
              <b>{money(cleaningFee, currency)}</b>
            </div>

            <div className="flex items-center justify-between">
              <span>Tax / GST</span>
              <b>{money(vat, currency)}</b>
            </div>

            <div className="flex items-center justify-between">
              <span>Pet fee</span>
              <b>{money(petFee, currency)}</b>
            </div>

            <div className="h-px bg-gray-200 my-2" />

            <div className="flex items-center justify-between">
              <span>Total</span>
              <b>{available ? money(grandTotal, currency) : '$0.00'}</b>
            </div>
          </div>

          <button
            disabled={!canReserve}
            onClick={onClickReserve}
            className={`w-full rounded-xl py-3 font-medium ${
              canReserve ? 'bg-[#211F45] text-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'
            }`}
          >
            Reserve
          </button>

          {loading && <div className="text-xs text-gray-500 mt-2">Updating rates…</div>}
        </div>
      </div>

      {/* Reserve Modal */}
      <ReserveChoiceModal
        open={showReserveModal}
        onClose={() => setShowReserveModal(false)}
        onMember={onMemberLogin}
        onGuest={onContinueGuest}
      />

      {/* PHOTOS MODAL */}
      {showPhotos && gallery?.length ? (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-full max-w-5xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-semibold">Photos</h3>
              <button onClick={() => setShowPhotos(false)} className="p-1 text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {gallery.map((g, idx) => (
                <img
                  key={idx}
                  src={img(g)}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = imgFallback(g);
                  }}
                  className="w-full h-[240px] object-cover rounded-lg"
                  alt={`${displayName} photo ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* ABOUT MODAL */}
      {showAbout && (meta?.descriptionLong?.length || 0) > 0 ? (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-semibold">About this property</h3>
              <button onClick={() => setShowAbout(false)} className="p-1 text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <div className="space-y-3 text-[15px] leading-7 text-gray-800">
              {meta!.descriptionLong!.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* AMENITIES MODAL */}
      {showAmenities && amenitiesList.length ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-semibold">Amenities</h3>
              <button onClick={() => setShowAmenities(false)} className="p-1 text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <div className="divide-y">
              {amenitiesList.map((a, i) => (
                <div key={i} className="py-2">
                  <Row Icon={amenityIcon(a)} text={a} />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* HOUSE RULES MODAL */}
      {showRules && meta?.houseRules?.length ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-semibold">House Rules</h3>
              <button onClick={() => setShowRules(false)} className="p-1 text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <div className="divide-y">
              {meta!.houseRules!.map((r, i) => (
                <div key={i} className="py-2">
                  <Row Icon={ruleIcon(r)} text={r} />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
