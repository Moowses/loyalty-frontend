'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Bath, ShowerHead, Wind, Wifi, Tv, Utensils, Flame, Waves,
  PawPrint, Baby, UserRound, Cigarette, CigaretteOff, PartyPopper, Ban,
  Car, AlertTriangle, SprayCan, Clock, Info, CheckCircle2, ImagePlus
} from 'lucide-react';

/* ========= types aligned to your meta.json ========= */
type Meta = {
  hotelId: string;
  hotelNo?: string;
  name: string;
  brandName?: string;
  tagline?: string;
  descriptionShort?: string;
  descriptionLong?: string[];
  amenities?: string[];
  houseRules?: string[];
  gallery?: string[];
};

/* ========= helpers ========= */
const toNum = (v: any) => Number(String(v ?? 0).replace(/[^0-9.-]/g, '')) || 0;
const money = (n: number, ccy = 'CAD') =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: ccy }).format(n || 0);
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
const slugCondensed = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/* ========= icons ========= */
type IconC = (props: { className?: string }) => JSX.Element;
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
  if (s.startsWith('check-in') || s.startsWith('check‑in')) return Clock;
  if (s.startsWith('check-out') || s.startsWith('check‑out')) return Clock;
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

export default function HotelInfoPage() {
  const { hotelId } = useParams<{ hotelId: string }>();
  const sp = useSearchParams();
  const router = useRouter();

  /* ==== values carried from Search page (unchanged) ==== */
  const nameQP      = sp.get('name') || '';
  const currency    = sp.get('currency') || 'CAD';
  const hotelNo     = sp.get('hotelNo') || '';
  const roomTypeId  = sp.get('roomTypeId') || '';
  const lat         = sp.get('lat') || '';
  const lng         = sp.get('lng') || '';
  

  const totalFromSearch = Number(sp.get('total') || '0');
  const petFromSearch   = Number(sp.get('petFee') || '0');

  /* ==== user-editable inputs (seeded from QPs) ==== */
  const [checkIn,  setCheckIn]  = useState(sp.get('checkIn')  || sp.get('startTime') || '');
  const [checkOut, setCheckOut] = useState(sp.get('checkOut') || sp.get('endTime')   || '');
  const [adult,    setAdult]    = useState(Number(sp.get('adult')  || sp.get('adults')  || '1'));
  const [child,    setChild]    = useState(Number(sp.get('child')  || sp.get('children')|| '0'));
  const [infant,   setInfant]   = useState(Number(sp.get('infant') || sp.get('infants') || '0'));
  const [pet,      setPet]      = useState((sp.get('pet') || (sp.get('pets') === '1' ? 'yes' : 'no') || 'no') === 'yes' ? 'yes' : 'no');

  /* ==== meta + images (public/properties/<slug>/meta.json) ==== */
  const displayName = nameQP || '';
  const sDashed     = slugify(displayName);
  const sCondensed  = slugCondensed(displayName);
  const [meta, setMeta] = useState<Meta | null>(null);
 

  useEffect(() => {
    async function load() {
      const candidates = [
        `/properties/${sDashed}/meta.json`,
        `/properties/${sCondensed}/meta.json`,
      ];
      for (const url of candidates) {
        try {
          const r = await fetch(url, { cache: 'no-store' });
          if (r.ok) { setMeta(await r.json()); return; }
        } catch {}
      }
      setMeta(null);
    }
    if (displayName) load();
  }, [displayName, sDashed, sCondensed]);

  const gallery = meta?.gallery?.length ? meta.gallery : ['hero.png','1.png','2.png','3.png','4.png','5.png'];
  const img = (f: string) => `/properties/${sDashed}/${f}`;
  const imgFallback = (f: string) => `/properties/${sCondensed}/${f}`;
  

  /* ===== totals & availability (seeded from search, then re‑quoted) ===== */
  const [roomTotal, setRoomTotal]   = useState(totalFromSearch); // room-only, excludes pet
  const [petFee, setPetFee]         = useState(petFromSearch);
  const [available, setAvailable]   = useState(totalFromSearch > 0);
  const [loading, setLoading]       = useState(false);
  const [nights, setNights]         = useState(0); 
  const [roomSubtotal, setRoomSubtotal] = useState(totalFromSearch); // nightly sum (no fees)
  const [cleaningFee, setCleaningFee]   = useState(0);
  const [vat, setVat]                   = useState(0);
  const [grossAmount, setGrossAmount]   = useState(0); 
  const [resolvedHotelId, setResolvedHotelId] = useState<string>('');
 
  const nightsCalc = useMemo(() => {
  if (!checkIn || !checkOut) return 0;
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  const d = Math.round((b - a) / 86400000);
  return Number.isFinite(d) && d > 0 ? d : 0;
}, [checkIn, checkOut]);

// (roomSubtotal / nights) for the “per night” display


useEffect(() => {
  setNights(nightsCalc);
}, [nightsCalc]);



// (roomSubtotal / nights) for the “per night” display
const nightly = useMemo(
  () => (nights ? roomSubtotal / nights : 0),
  [roomSubtotal, nights]
);

// The amount you’ll show as “Total:”
const grandTotal = useMemo(
  () => (roomSubtotal || 0) + (petFee || 0) + (cleaningFee || 0) + (vat || 0),
  [roomSubtotal, petFee, cleaningFee, vat]
);

  function num(v: any) { return Number(String(v ?? 0).replace(/[^0-9.-]/g, '')) || 0; }

  // ---- re‑quote from backend using your booking quote endpoint ----
async function fetchQuote() {
  if (!checkIn || !checkOut) return;

  setLoading(true);
  try {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

    // 1) Accurate pricing for ONE hotel (backend single-hotel branch)
    const qs1 = new URLSearchParams({
      hotelId: String(hotelId),
      hotelNo: String(hotelNo || ''),
      startDate: checkIn,
      endDate: checkOut,
      startTime: checkIn,
      endTime: checkOut,
      adults: String(adult),
      children: String(child),
      infant: String(infant),
      pet: pet === 'yes' ? 'yes' : 'no',
      currency: currency || 'CAD',
    });

    let ok = false;

    // these are the values we will commit to state at the end
    let subtotal = 0;         // nightly sum only
    let pfee     = 0;
    let cfee     = 0;
    let tax      = 0;
    let gross    = 0;
    let nightsSrv = 0;
    
    // ---- primary call: single-hotel ----
    const r1 = await fetch(`${base}/api/booking/availability?${qs1.toString()}`, { cache: 'no-store' });
    if (r1.ok) {
      const j1 = await r1.json();
      const row = Array.isArray(j1?.data?.data) ? j1.data.data[0] : null;

      if (row && row !== 'No available rooms') {
        // server nightly map; checkout-exclusive
        const nightlyMap = row.dailyPrices || {};
        nightsSrv = Object.keys(nightlyMap).length;
        if (nightsSrv > 0) setNights(nightsSrv);

        // normalized numeric fields from backend
        subtotal = Number(row.roomSubtotal ?? row.totalPrice ?? row.grossAmountUpstream ?? 0);
        pfee     = pet === 'yes' ? Number(row.petFeeAmount ?? 0) : 0;
        cfee     = Number(row.cleaningFeeAmount ?? 0);
        tax      = Number(row.vatAmount ?? 0);
        gross    = Number(row.grossAmountUpstream ?? 0);

        ok = subtotal > 0;
      }
      setResolvedHotelId(String(row.roomTypeId || row.hotelId || hotelId));
    }
    

    // ---- fallback: nearby list (only if single-hotel didn’t return data) ----
    if (!ok && lat && lng) {
      const qs2 = new URLSearchParams({
        startDate: checkIn,
        endDate: checkOut,
        lng, lat,
        adult: String(adult),
        child: String(child),
        infant: String(infant),
        pet: pet === 'yes' ? 'yes' : 'no',
      });

      const r2 = await fetch(`${base}/api/booking/availability?${qs2.toString()}`, { cache: 'no-store' });
      if (r2.ok) {
        const j2 = await r2.json();
        const list: any[] = Array.isArray(j2?.data?.data) ? j2.data.data : [];

        const item =
          list.find(x => String(x.hotelId) === String(hotelId)) ||
          list.find(x => String(x.hotelNo) === String(hotelNo));

        if (item) {
          // We already have local `nights`; sum only the nights in range
          let summed = 0;
          if (item.dailyPrices && nights > 0) {
            const start = new Date(checkIn);
            for (let i = 0; i < nights; i++) {
              const d = new Date(start); d.setDate(start.getDate() + i);
              const key = d.toISOString().slice(0, 10);
              const v = Number(String(item.dailyPrices[key] ?? 0).replace(/[^0-9.-]/g, '')) || 0;
              summed += v;
            }
          } else {
            summed = Number(String(item.totalPrice ?? 0).replace(/[^0-9.-]/g, '')) || 0;
          }

          subtotal = summed;
          pfee     = pet === 'yes'
            ? (Number(String(item.petFeeAmount ?? 0).replace(/[^0-9.-]/g, '')) || 0)
            : 0;

          // nearby payload typically lacks these — keep 0s
          cfee     = 0;
          tax      = 0;
          gross    = 0;

          ok = subtotal > 0;
        }
      }
    }

    // Commit to state (single source of truth for the UI)
    setAvailable(!!ok);
    setRoomSubtotal(ok ? subtotal : 0);
    setPetFee(ok ? pfee : 0);
    setCleaningFee(ok ? cfee : 0);
    setVat(ok ? tax : 0);
    setGrossAmount(ok ? gross : 0);
    

  } catch (e) {
    console.error('refreshAvailability error', e);
    setAvailable(false);
    setRoomSubtotal(0);
    setPetFee(0);
    setCleaningFee(0);
    setVat(0);
    setGrossAmount(0);
  } finally {
    setLoading(false);
  }
}


  // Re‑quote whenever inputs change (small debounce)
    useEffect(() => {
      const t = setTimeout(fetchQuote, 250);
      return () => clearTimeout(t);
    }, [checkIn, checkOut, adult, child, infant, pet, lat, lng, hotelNo, currency]);


  // Modals
  const [showAmenities, setShowAmenities] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  // photos count for desktop badge
  const GRID_SHOWN = 5; // hero + 4 thumbs
  const extraPhotos = Math.max(0, (gallery?.length || 0) - GRID_SHOWN);

  /* ==== booking nav (unchanged params you used before) ==== */
function goBooking() {
  if (!available || !roomTotal || !checkIn || !checkOut) return;

  const params = new URLSearchParams({
  hotelId: resolvedHotelId || String(hotelId),
  hotelNo: String(hotelNo || ''),
  startTime: checkIn,
  endTime: checkOut,
  adults: String(adult),
  children: String(child),
  infants: String(infant),
  pets: pet === 'yes' ? '1' : '0',
  currency: currency || 'CAD',

  // optional legacy fields your BookingClient can read:
  total: String(roomTotal),       // room-only subtotal
  petFee: String(petFee),         // pet fee
});
router.push(`/booking?${params.toString()}`);

}


  /* ================== UI (unchanged design) ================== */
  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6">
      <h1 className="text-2xl md:text-3xl font-semibold mb-2">
        {meta?.brandName || displayName || meta?.name || 'Property'}
      </h1>
      {meta?.tagline && <div className="text-gray-600 mb-4">{meta.tagline}</div>}

      {/* GALLERY */}
      <div className="mb-6">
        {/* mobile: hero only + count button */}
        <div className="md:hidden relative">
          <img
            src={img(gallery[0])}
            onError={(e)=>{ (e.currentTarget as HTMLImageElement).src = imgFallback(gallery[0]); }}
            className="w-full h-[260px] object-cover rounded-xl"
            alt={`${displayName} main`}
          />
          {gallery.length > 1 && (
            <button
              onClick={()=>setShowPhotos(true)}
              className="absolute bottom-3 right-3 bg-white/95 backdrop-blur text-gray-900 text-sm font-medium px-3 py-1.5 rounded-full shadow inline-flex items-center gap-1"
            >
              <ImagePlus className="w-4 h-4" /> + {gallery.length - 1} photos
            </button>
          )}
        </div>

        {/* desktop: hero + 4 thumbs (same grid) */}
        <div className="hidden md:grid grid-cols-4 gap-3">
          <div className="col-span-2 row-span-2">
            <img
              src={img(gallery[0])}
              onError={(e)=>{ (e.currentTarget as HTMLImageElement).src = imgFallback(gallery[0]); }}
              className="w-full h-[420px] object-cover rounded-xl"
              alt={`${displayName} main`}
            />
          </div>

          {gallery.slice(1,5).map((g,i)=>{
            const isLast = i === 3;
            return (
              <div key={i} className="relative">
                <img
                  src={img(g)}
                  onError={(e)=>{ (e.currentTarget as HTMLImageElement).src = imgFallback(g); }}
                  className="w-full h-[200px] object-cover rounded-xl"
                  alt={`${displayName} photo ${i+2}`}
                />
                {isLast && extraPhotos > 0 && (
                  <button
                    onClick={()=>setShowPhotos(true)}
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

      {/* MAIN 2-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_380px] gap-8">
        {/* LEFT */}
        <div>
          {meta?.descriptionShort && (
            <div className="text-[15px] leading-7 text-gray-700">
              {meta.descriptionShort}
            </div>
          )}
          {(meta?.descriptionLong?.length || 0) > 0 && (
            <button
              onClick={()=>setShowAbout(true)}
              className="mt-3 inline-flex items-center justify-center px-4 py-2 rounded-full border text-sm"
            >
              Show more
            </button>
          )}

          {!!meta?.amenities?.length && (
            <div className="mt-10">
              <h2 className="text-xl font-semibold mb-3">Amenities</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2">
                {meta.amenities.slice(0,8).map((a,i)=>(<Row key={i} Icon={amenityIcon(a)} text={a} />))}
              </div>
              {meta.amenities.length > 8 && (
                <button
                  onClick={()=>setShowAmenities(true)}
                  className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-full border text-sm"
                >
                  Show all {meta.amenities.length} amenities
                </button>
              )}
            </div>
          )}

          {!!meta?.houseRules?.length && (
            <div className="mt-10">
              <h2 className="text-xl font-semibold mb-3">Good to know</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2">
                {meta.houseRules.slice(0,6).map((r,i)=>(<Row key={i} Icon={ruleIcon(r)} text={r} />))}
              </div>
              {meta.houseRules.length > 6 && (
                <button
                  onClick={()=>setShowRules(true)}
                  className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-full border text-sm"
                >
                  Show more house rules
                </button>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: pricing card (same visual) */}
        <div className="border-2 border-gray-200 rounded-[16px] p-4 shadow-sm h-fit md:sticky md:top-4">
          <div className="flex items-baseline gap-2 mb-4">
            <div className="text-xl font-semibold">{nights && available ? money(nightly, currency) : '—'}</div>
            <div className="text-gray-500 text-sm">per night</div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="flex flex-col">
              <label className="text-xs text-gray-500">CHECK‑IN</label>
              <input type="date" value={checkIn} onChange={e=>setCheckIn(e.target.value)} className="border rounded-lg px-2 py-2" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-500">CHECK‑OUT</label>
              <input type="date" value={checkOut} onChange={e=>setCheckOut(e.target.value)} className="border rounded-lg px-2 py-2" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="flex flex-col">
              <label className="text-xs text-gray-500">ADULTS</label>
              <input type="number" min={1} value={adult} onChange={e=>setAdult(+e.target.value)} className="border rounded-lg px-2 py-2" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-500">CHILDREN</label>
              <input type="number" min={0} value={child} onChange={e=>setChild(+e.target.value)} className="border rounded-lg px-2 py-2" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-500">INFANTS</label>
              <input type="number" min={0} value={infant} onChange={e=>setInfant(+e.target.value)} className="border rounded-lg px-2 py-2" />
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <label className="text-xs text-gray-500">PETS</label>
            <select value={pet} onChange={e=>setPet(e.target.value as 'yes'|'no')} className="border rounded-lg px-2 py-2">
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

            {/* Optional: show upstream gross if you want a reference line */}
            {/* {grossAmount > 0 && (
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Upstream gross</span>
                <b>{money(grossAmount, currency)}</b>
              </div>
            )} */}
          </div>


         <button
          disabled={!checkIn || !checkOut || !available || roomSubtotal <= 0}
          onClick={goBooking}
          className={`w-full rounded-xl py-3 font-medium ${
            available && roomSubtotal > 0
              ? 'bg-[#211F45] text-white'
              : 'bg-gray-300 text-gray-600 cursor-not-allowed'
          }`}
        >
          {available && roomSubtotal > 0 ? 'Book now' : 'Not available'}
        </button>

          {loading && <div className="text-xs text-gray-500 mt-2">Updating rates…</div>}
        </div>
      </div>

      {/* PHOTOS MODAL */}
      {showPhotos && gallery?.length ? (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-full max-w-5xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-semibold">Photos</h3>
              <button onClick={()=>setShowPhotos(false)} className="p-1 text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {gallery.map((g, idx) => (
                <img
                  key={idx}
                  src={img(g)}
                  onError={(e)=>{ (e.currentTarget as HTMLImageElement).src = imgFallback(g); }}
                  className="w-full h-[240px] object-cover rounded-lg"
                  alt={`${displayName} photo ${idx+1}`}
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
              <button onClick={()=>setShowAbout(false)} className="p-1 text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="space-y-3 text-[15px] leading-7 text-gray-800">
              {meta!.descriptionLong!.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>
        </div>
      ) : null}

      {/* AMENITIES MODAL */}
      {showAmenities && meta?.amenities?.length ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-semibold">Amenities</h3>
              <button onClick={()=>setShowAmenities(false)} className="p-1 text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="divide-y">
              {meta.amenities.map((a,i)=>(<div key={i} className="py-2"><Row Icon={amenityIcon(a)} text={a} /></div>))}
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
              <button onClick={()=>setShowRules(false)} className="p-1 text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="divide-y">
              {meta.houseRules.map((r,i)=>(<div key={i} className="py-2"><Row Icon={ruleIcon(r)} text={r} /></div>))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
