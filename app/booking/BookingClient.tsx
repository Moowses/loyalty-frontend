// app/booking/page.tsx
'use client';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from "next/script";
import { Suspense } from "react";

declare global {
  interface Window {
    CollectJS?: {
      configure: (cfg: any) => void;
      tokenize: (
        opts: { amount?: number },
        onSuccess: (resp: any) => void,
        onError?: (err: any) => void
      ) => void;
    };
  }
}

type Quote = {
  quoteId: string;
  hotelId: string;
  roomTypeId?: string;
  rateId?: string;
  currency: string;
  grossAmount: number;
  petFeeAmount?: number | string;
  cleaningFeeAmount?: number | string;
  vatAmount?: number | string;
  grandTotal?: number;
  nights?: number;
  roomTypeName?: string;
  capacity?: string | number;
  details?: Array<{ date?: string; price: number }>;
  startTime?: string;
  endTime?: string;
  adults?: number;
  children?: number;
  infants?: number;
  pets?: number | 'yes' | 'no';
};

const toNum = (v: any) => Number(String(v ?? 0).replace(/[^0-9.-]/g, '')) || 0;
const money = (v: number, ccy = 'CAD') => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: ccy }).format(v);
  } catch {
    return `${ccy} ${v.toFixed(2)}`;
  }
};

export default function BookingPage() {
  const router = useRouter();
  const params = useSearchParams();

  // --- Read params ---
  const hotelIdParam = params.get('hotelId') || params.get('roomTypeId') || '';
  const hotelNoParam = params.get('hotelNo') || '';
  const startTime = params.get('startTime') || params.get('startDate') || '';
  const endTime   = params.get('endTime')   || params.get('endDate')   || '';
  const adults    = Number(params.get('adults')   || params.get('adult')  || '1');
  const children  = Number(params.get('children') || params.get('child')  || '0');
  const infants   = Number(params.get('infants')  || params.get('infant') || '0');
  const petParam  = params.get('pet') || params.get('pets') || '0';
  const currency  = (params.get('currency') || 'CAD').toUpperCase();

  const petYN: 'yes' | 'no' =
    String(petParam).toLowerCase() === 'yes' || String(petParam) === '1' ? 'yes' : 'no';

  const nights = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const a = new Date(startTime).getTime();
    const b = new Date(endTime).getTime();
    const d = Math.round((b - a) / 86400000);
    return isFinite(d) && d > 0 ? d : 0;
  }, [startTime, endTime]);

  // --- State ---
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState('');
  const [available, setAvailable] = useState(true);

  const total = useMemo(() => {
    if (!quote) return 0;
    if (toNum(quote.grandTotal) > 0) return toNum(quote.grandTotal);
    return toNum(quote.grossAmount) +
           toNum(quote.petFeeAmount) +
           toNum((quote as any).cleaningFeeAmount) +
           toNum((quote as any).vatAmount);
  }, [quote]);

  // Guest form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [memberNumber, setMemberNumber] = useState('');
  const [country, setCountry]     = useState('');
  const [address1, setAddress1]   = useState('');
  const [address2, setAddress2]   = useState('');
  const [city, setCity]           = useState('');
  const [state, setState]         = useState('');
  const [zip, setZip]             = useState('');
  const [smsOpt, setSmsOpt]       = useState(false);
  const [billingSame, setBillingSame] = useState(false);
  const [consentEmail, setConsentEmail] = useState(false);
  const [consentSms, setConsentSms]     = useState(false);

  // poppulate member number from cache if available or localstorage

  useEffect(() => {
  try {
    const ls = localStorage.getItem('dashboardData');
    if (ls) {
      const dash = JSON.parse(ls);
      const m = dash?.membershipNo || dash?.membershipno || dash?.membershipNumber;
      if (m) setMemberNumber(String(m));
    } else {
      const cachedMember = localStorage.getItem('membershipno');
      if (cachedMember) setMemberNumber(String(cachedMember));
    }
  } catch (e) {
    console.error('Failed to load member number:', e);
  }
}, []);


  // --- Fetch FINAL price from /availability ---
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr('');

        if (!hotelIdParam || !startTime || !endTime) {
          setErr('Missing booking details. Please return to results.');
          setAvailable(false);
          setLoading(false);
          return;
        }
        if (!/^\d+$/.test(hotelIdParam)) {
          setErr('Invalid hotelId. Please return to results.');
          setAvailable(false);
          setLoading(false);
          return;
        }

        const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
        const qs = new URLSearchParams({
          hotelId: hotelIdParam,
          hotelNo: hotelNoParam,  
          startDate: startTime,
          endDate: endTime,
          adults: String(adults),
          children: String(children),
          infant: String(infants),
          pet: petYN,
          currency
        });

        const res = await fetch(`${base}/api/booking/availability?${qs.toString()}`, {
          credentials: 'include'
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const j = await res.json();
        const payload = j?.data;

        if (!j?.success || !payload) throw new Error(j?.message || 'Failed to get availability');

        if (payload?.data === 'No available rooms') {
          setAvailable(false);
          setQuote(null);
          return;
        }

        const arr = Array.isArray(payload?.data) ? payload.data : [];
        const first = arr[0];
        if (!first) {
          setAvailable(false);
          setQuote(null);
          return;
        }

        // Prefer summing dailyPrices for [startTime, endTime)
        let grossAmount = 0;
        let details: Quote['details'] = [];
        if (first.dailyPrices && nights > 0) {
          const startDt = new Date(startTime);
          for (let i = 0; i < nights; i++) {
            const d = new Date(startDt);
            d.setDate(startDt.getDate() + i);
            const key = d.toISOString().slice(0, 10);
            const p = toNum(first.dailyPrices[key]);
            grossAmount += p;
            details.push({ date: key, price: p });
          }
        } else {
          grossAmount = toNum(first.totalPrice);
        }

        const petFeeAmount = petYN === 'yes' ? toNum(first.petFeeAmount) : 0;
        const cleaningFeeAmount = toNum(first.cleaningFeeAmount);
        const vatAmount = toNum(first.vatAmount ?? first.VAT ?? first.Vat);
        const computedGrandTotal = toNum(first.grandTotal) || (grossAmount + petFeeAmount + cleaningFeeAmount + vatAmount);

        const q: Quote = {
          quoteId: `q_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          hotelId: String(hotelIdParam),
          roomTypeId: String(first?.roomTypeId || hotelIdParam),
          rateId: '',
          currency: (first?.currencyCode || currency || 'CAD').toUpperCase(),
          grossAmount,
          petFeeAmount,
          cleaningFeeAmount,
          vatAmount,
          grandTotal: computedGrandTotal,
          nights,
          details,
          roomTypeName: first?.RoomType || first?.roomTypeName || '',
          capacity: first?.capacity || '',
          startTime,
          endTime,
          adults,
          children,
          infants,
          pets: petYN
        };

        setAvailable(grossAmount > 0);
        setQuote(q);
      } catch (e: any) {
        console.error('Availability fetch error:', e);
        setErr(e?.message || 'Failed to load availability');
        setAvailable(false);
        setQuote(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [hotelIdParam, hotelNoParam, startTime, endTime, adults, children, infants, petYN, currency, nights]);

  // --- Collect.js Configuration ---
  const configuredRef = useRef(false);
  const tokenizationKey = process.env.NEXT_PUBLIC_NMI_PUBLIC_KEY || "z78ur3-68sE66-c3YWM3-ZC6Q56";

  const configureCollect = useCallback(() => {
    if (!window.CollectJS || configuredRef.current) return;
    
    // Check if DOM elements exist
    if (!document.querySelector("#ccnumber") || !document.querySelector("#ccexp") || !document.querySelector("#cvv")) {
      console.log('Collect.js fields not found in DOM');
      return;
    }

    try {
      window.CollectJS.configure({
        variant: "inline",
        fields: {
          ccnumber: { selector: "#ccnumber", placeholder: "Card number" },
          ccexp:    { selector: "#ccexp",    placeholder: "MM / YY" },
          cvv:      { selector: "#cvv",      placeholder: "CVV" },
        },
        styleSniffer: "off",
        
      });
      configuredRef.current = true;
      console.log('Collect.js configured successfully');
    } catch (error) {
      console.error('Collect.js configuration error:', error);
    }
  }, []);

  // Load Collect.js script and configure
  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.CollectJS && !configuredRef.current) {
        configureCollect();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [configureCollect]);

  // --- Booking Handler ---
  const onBookNow = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');

    if (!quote) {
      setErr('Missing price check. Please return to results.');
      return;
    }
    if (!available) {
      setErr('This room is not available for your dates.');
      return;
    }
    if (!firstName || !lastName || !email || !country || !address1 || !city || !state || !zip) {
      setErr('Please fill in all required fields.');
      return;
    }
    if (!window.CollectJS) {
      setErr('Payment fields not ready. Please wait a moment and try again.');
      return;
    }

    try {
      setPaying(true);

      // 1) Tokenize card
      const paymentToken = await new Promise<string>((resolve, reject) => {
        const amt = Number(quote?.grandTotal ?? quote?.grossAmount ?? 0) || 0;

        if (!window.CollectJS) {
          return reject(new Error("Payment fields not ready. Please try again."));
        }

        window.CollectJS.tokenize(
          { amount: amt },
          (resp: any) => {
            console.log('Tokenization response:', resp);
            const tok: string | undefined = resp?.payment_token || resp?.token;
            if (tok) {
              resolve(tok);
            } else {
              reject(new Error(resp?.error?.message || resp?.error || "Tokenization failed"));
            }
          },
          (err: any) => {
            console.error('Tokenization error:', err);
            reject(new Error(err?.message || "Tokenization error"));
          }
        );
      });

      // 2) Confirm on backend
      const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/api/booking/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote,
          guest: {
            firstName, lastName, email,
            phone: '',
            country, city, address: `${address1}${address2 ? ', ' + address2 : ''}`,
            membershipNo: memberNumber || '',
          },
          payment: { token: paymentToken },
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const j = await res.json();
      if (!j.success) throw new Error(j.message || 'Payment / reservation failed');

      // 3) Redirect to confirmation page
      const payload = {
        reservationNumber: j?.reservation?.reservationNumber || '',
        hotelName: quote.roomTypeName || 'Your Dream Getaway',
        arrivalDate: startTime, departureDate: endTime,
        guests: { adult: adults, child: children, infant: infants, pet: petYN },
        charges: { base: Number(quote.grossAmount), petFee: Number(quote.petFeeAmount || 0), total, currency: quote.currency },
        payment: { transactionId: j?.payment?.transactionId || '' },
        rewards: { earned: j?.rewards?.earned || 0 }
      };
      
      const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      router.push(`/booking/confirm?payload=${encodeURIComponent(b64)}`);
    } catch (e: any) {
      console.error('Booking error:', e);
      setErr(e?.message || 'Checkout failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <div className="mx-auto max-w-4xl p-6">Loading…</div>;
  if (err) return <div className="mx-auto max-w-4xl p-6 text-red-600">{err}</div>;
  if (!quote) return <div className="mx-auto max-w-4xl p-6">Not available for your dates.</div>;

  return (
    <div className="mx-auto max-w-full px-0 py-0 bg-white">
      {/* Summary strip */}
      <div className="w-full border-b border-gray-200 bg-[#EEF2F4]">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="grid grid-cols-2 items-center py-3">
            <div>
              <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-black">
                Stay Dates
              </div>
              <div className="mt-0.5 font-semibold text-sm text-black">
                {quote?.startTime && quote?.endTime
                  ? `${new Date(quote.startTime).toLocaleDateString()} – ${new Date(quote.endTime).toLocaleDateString()}`
                  : '—'}
              </div>
            </div>
            <div className="border-l border-[#1F2A44]/20 pl-6">
              <div className="text-[13px] font-bold uppercase tracking-[0.08em] text-black">
                Total
              </div>
              <div className="mt-0.5 font-semibold text-sm text-black">
                {money(total, quote?.currency || 'CAD')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Member strip */}
      <div className="flex items-center justify-center gap-3 border-t border-gray-200 bg-white px-6 py-2.5">
        <Image src="/missingpoints.png" alt="" width={18} height={18} />
        <p className="text-[14px] font-semibold text-black">
          Get exclusive member rates and rewards. Sign in or create an account with the Dream Trip Club Rewards program.
        </p>
      </div>

      {/* Panel */}
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 sm:p-8">
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight" style={{ color: '#211F45' }}>
            Complete your booking.
          </h1>
          <p className="mt-2 text-sm text-black">
            Your journey doesn't end at check-in—earn points, rise through tiers, and enjoy members-only perks year-round.
          </p>

          {/* Guest details */}
          <section className="mt-6">
            <h2 className="text-lg font-medium" style={{ color: '#211F45' }}>Guest details:</h2>

            <form onSubmit={onBookNow} className="mt-4 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="First Name*" value={firstName} onChange={setFirstName} required />
                <Field label="Last Name*" value={lastName} onChange={setLastName} required />
                <Field label="Email Address*" type="email" value={email} onChange={setEmail} required />
                <Field label="Member Number" value={memberNumber} onChange={setMemberNumber} disabled={!!memberNumber}/>
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700">Country*</label>
                  <select
                    id="country"
                    name="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900 shadow-sm focus:border-[#211F45] focus:ring-[#211F45] sm:text-sm"
                  >
                    <option value="">Select a country</option>
                    <option value="Canada">Canada</option>
                    <option value="United States">United States</option>
                    <option value="Philippines">Philippines</option>
                    <option value="Australia">Australia</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <input id="smsOpt" type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={smsOpt} onChange={e => setSmsOpt(e.target.checked)} />
                  <label htmlFor="smsOpt">Send my confirmation details by SMS.</label>
                </div>
                <Field label="Address 1*" value={address1} onChange={setAddress1} required />
                <Field label="Address 2" value={address2} onChange={setAddress2} />
                <Field label="City*" value={city} onChange={setCity} required />
                <Field label="State/Province*" value={state} onChange={setState} required />
                <Field label="Zip/Postal Code*" value={zip} onChange={setZip} required />
              </div>

              {/* Payment details */}
             {tokenizationKey && (
              <Script
                src="https://secure.nmi.com/token/Collect.js"
                strategy="afterInteractive"
                onLoad={configureCollect}
                data-tokenization-key={tokenizationKey}
                data-variant="inline"
              />
)}
              
              <div className="pt-2">
                <h2 className="text-lg font-medium" style={{ color: '#211F45' }}>
                  Payment details:
                </h2>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Credit card number */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Credit Card Number*</label>
                    <div id="ccnumber" className="nmi-field h-10 border rounded-md px-2 py-2 bg-white" />
                  </div>

                  {/* Expiration date */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Expiry Date*</label>
                    <div id="ccexp" className="nmi-field h-10 border rounded-md px-2 py-2 bg-white" />
                  </div>

                  {/* CVV */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">CVV*</label>
                    <div id="cvv" className="nmi-field h-10 border rounded-md px-2 py-2 bg-white" />
                  </div>

                  {/* Billing Address */}
                  <div className="col-span-1 sm:col-span-2">
                    <Field
                      label="Billing Address*"
                      value={billingSame ? `${address1}${address2 ? ', ' + address2 : ''}` : address1}
                      onChange={setAddress1}
                      required
                      disabled={billingSame}
                    />
                  </div>

                  {/* Same as above checkbox */}
                  <div className="col-span-1 sm:col-span-2 flex items-center gap-2 text-sm text-gray-700">
                    <input
                      id="sameAs"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={billingSame}
                      onChange={e => setBillingSame(e.target.checked)}
                    />
                    <label htmlFor="sameAs">Same as above.</label>
                  </div>
                </div>
              </div>

              {/* Consents + policy box */}
              <div className="mt-4 border border-gray-200 bg-[#93AFB9] p-3 text-[12px] text-white">
                By clicking Submit, you're agreeing to Dream Trip Club Rewards contacting you about offers,
                updates, and more via email and/or SMS messages. You can unsubscribe, update your preferences or
                view our <a href="/privacy" className="underline">Privacy Policy</a> at any time.
                
                <div className="mt-3 space-y-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300"
                      checked={consentEmail} onChange={e => setConsentEmail(e.target.checked)} />
                    <span>I agree to receive email communications</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300"
                      checked={consentSms} onChange={e => setConsentSms(e.target.checked)} />
                    <span>I agree to receive SMS communications</span>
                  </label>
                </div>
              </div>

              {/* Footer: totals + button */}
              <div className="pt-2">
                <p className="sm:text-1xl font-bold tracking-tight">
                  <span className="font-medium font-bold">Total:</span> {money(total, quote.currency)} ({quote.currency})
                </p>
              </div>

              {err && <div className="text-sm text-red-600 p-2 bg-red-50 rounded">{err}</div>}

              <button
                type="submit"
                disabled={paying || !available || nights <= 0}
                className="mt-2 inline-flex items-center justify-center rounded-full bg-[#F59E0B] px-6 py-3 font-semibold text-white hover:opacity-95 disabled:opacity-50"
              >
                {paying ? 'Processing…' : (available ? 'BOOK NOW' : 'Not available')}
              </button>

              {/* Cancellation Policy */}
              <div className="pt-6 text-sm text-gray-700">
                <h3 className="font-semibold mb-2">Cancellation Policy</h3>
                {(() => {
                  const arrival = quote?.startTime ? new Date(quote.startTime) : null;
                  const deadline = arrival ? new Date(arrival) : null;
                  if (deadline) deadline.setDate(deadline.getDate() - 2);

                  const n = Number(quote?.nights || (quote?.details?.length || 0));
                  const base = Number(quote?.grossAmount || 0);
                  const perNight = n > 0 ? base / n : base;
                  const cost = perNight.toFixed(2);
                  const ccy = quote?.currency || 'CAD';

                  const fmt = (d?: Date | null) =>
                    d ? d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '—';

                  return (
                    <p>
                      You may cancel your reservation for no charge before 11:59 PM local hotel time on <strong>{fmt(deadline)}</strong> (2 day[s] before arrival).
                      {' '}Please note that we will assess a fee of <strong>{cost} {ccy}</strong> if you must cancel after this deadline.
                    </p>
                  );
                })()}
              </div>
            </form>
          </section>
        </div>
      </div>

      <style jsx>{`
        #ccnumber, #ccexp, #cvv { 
          position: relative; 
          z-index: 10; 
          min-height: 44px; 
          display: flex;
          align-items: center;
        }
        .nmi-field iframe {
          width: 100% !important;
          height: 100% !important;
          border: 0;
        }
      `}</style>
    </div>
  );
}

function Field({
  label, value, onChange, required, disabled, type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;s
  required?: boolean;
  disabled?: boolean;
  type?: string;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-gray-700">{label}</label>
      <input
        id={id}
        type={type}
        className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#211F45] focus:ring-1 focus:ring-[#211F45]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
      />
    </div>
  );
}