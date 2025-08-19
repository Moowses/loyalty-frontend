// app/booking/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

declare global {
  interface Window {
    CollectJS?: any;
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
  nights?: number;
  roomTypeName?: string;
  capacity?: string | number;
  details?: Array<{ date: string; price: number }>;
  startTime?: string;
  endTime?: string;
  adults?: number;
  children?: number;
  infants?: number;
  pets?: number | 'yes' | 'no';
};



export default function BookingPage() {
  const router = useRouter();
  const params = useSearchParams();

  // --- Search params we expect from results page ---
  const hotelNo = params.get('hotelNo') || params.get('hotelId') || '';
  const startTime = params.get('startTime') || '';
  const endTime = params.get('endTime') || '';
  const adults = Number(params.get('adults') || '1');
  const children = Number(params.get('children') || '0');
  const infants = Number(params.get('infants') || '0');
  const pets = params.get('pets') || '0';
  const currency = params.get('currency') || 'CAD';

  // --- Quote + UI state ---
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState('');

  // --- Guest form ---
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [memberNumber, setMemberNumber] = useState('');
  const [country, setCountry] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [smsOpt, setSmsOpt] = useState(false);
  const [billingSame, setBillingSame] = useState(false);
  const [consentEmail, setConsentEmail] = useState(false);
  const [consentSms, setConsentSms] = useState(false);

  const total = useMemo(() => {
    if (!quote) return 0;
    const base = Number(quote.grossAmount || 0);
    const pet = Number(quote.petFeeAmount || 0);
    return base + pet;
  }, [quote]);

  // --- Fetch quote from backend on mount ---
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr('');

        if (!hotelNo || !startTime || !endTime) {
          setErr('Missing booking details. Please return to results.');
          setLoading(false);
          return;
        }

        const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
        const res = await fetch(`${base}/api/booking/quote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hotelNo,                 // server prefers hotelNo (code)
            startTime, endTime,
            adults, children
          })
        });
        const j = await res.json();
        if (!j.success) throw new Error(j.message || 'Failed to get quote');

        const q: Quote = {
          ...j.quote,
          startTime, endTime, adults, children, infants, pets,
          currency: j.quote?.currency || currency,
        };
        setQuote(q);
      } catch (e: any) {
        setErr(e?.message || 'Failed to load quote');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Load Collect.js + mount hosted fields ---
  useEffect(() => {
    const pub = process.env.NEXT_PUBLIC_NMI_PUBLIC_KEY;
    if (!pub) {
      setErr('Missing NEXT_PUBLIC_NMI_PUBLIC_KEY. Contact support.');
      return;
    }
    // Prevent double insert
    if (document.querySelector('script[data-collectjs]')) return;

    const s = document.createElement('script');
    s.src = 'https://secure.nmi.com/token/Collect.js';
    s.async = true;
    s.setAttribute('data-collectjs', '1');
    s.setAttribute('data-tokenization-key', pub);
    s.onload = () => {
      // Mount hosted fields (only supported keys to avoid "too many fields" error)
      window.CollectJS?.configure({
        variant: 'inline',
        fields: {
          ccnumber: { selector: '#ccnumber', placeholder: 'Credit Card Number' },
          ccexp: { selector: '#ccexp', placeholder: 'MM / YY' },
          cvv: { selector: '#cvv', placeholder: 'CVV' },
        },
      });
    };
    document.body.appendChild(s);
  }, []);

  function money(v: number, ccy = 'CAD') {
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: ccy }).format(v); }
    catch { return `${ccy} ${v.toFixed(2)}`; }
  }

  async function onBookNow(e: React.FormEvent) {
    e.preventDefault();
    setErr('');

    if (!quote) {
      setErr('Missing quote. Please return to results.');
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
      const paymentToken: string = await new Promise((resolve, reject) => {
        window.CollectJS.tokenize({
          callback: (resp: any) => {
            if (resp?.payment_token || resp?.token) {
              resolve(resp.payment_token || resp.token);
            } else {
              reject(new Error(resp?.error || 'Tokenization failed'));
            }
          },
        });
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
            phone: '', // add if you collect it
            country, city, address: `${address1}${address2 ? ', ' + address2 : ''}`,
            membershipNo: memberNumber || '',
          },
          payment: { token: paymentToken },
        }),
      });

      const j = await res.json();
      if (!j.success) throw new Error(j.message || 'Payment / reservation failed');

      // 3) Hand off to confirm page with a compact payload
      const payload = {
        reservationNumber: j?.reservation?.reservationNumber || '',
        hotelName: quote.roomTypeName || 'Your Dream Getaway',
        arrivalDate: startTime, departureDate: endTime,
        guests: { adult: adults, child: children, infant: infants, pet: pets },
        charges: { base: Number(quote.grossAmount), petFee: Number(quote.petFeeAmount || 0), total, currency: quote.currency },
        payment: { transactionId: j?.payment?.transactionId || '' },
        rewards: { earned: j?.rewards?.earned || 0 }
      };
      const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      router.push(`/booking/confirm?payload=${encodeURIComponent(b64)}`);
    } catch (e: any) {
      setErr(e?.message || 'Checkout failed');
    } finally {
      setPaying(false);
    }
  }

  // --- UI ---
  if (loading) return <div className="mx-auto max-w-4xl p-6">Loading…</div>;
  if (err) return <div className="mx-auto max-w-4xl p-6 text-red-600">{err}</div>;
  if (!quote) return <div className="mx-auto max-w-4xl p-6">Missing quote.</div>;

  return (
    
    <div className="mx-auto max-w-full px-0 py-0 bg-white">
      {/* Summary strip */}
    
      <div className="w-full border-b border-gray-200 bg-[#EEF2F4]">
        <div className="mx-auto mx-auto max-w-4xl px-4 py-6 px-4 sm:px-0">
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
          Your journey doesn’t end at check-in—earn points, rise through tiers, and enjoy members-only perks year-round.
        </p>

        {/* Guest details */}
        <section className="mt-6">
          <h2 className="text-lg font-medium" style={{ color: '#211F45' }}>Guest details:</h2>

          <form onSubmit={onBookNow} className="mt-4 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4  ">
              <Field label="First Name*" value={firstName} onChange={setFirstName} required />

              <Field label="Last Name*" value={lastName} onChange={setLastName} required />
              <Field label="Email Address*" type="email" value={email} onChange={setEmail} required />
              <Field label="Member Number" value={memberNumber} onChange={setMemberNumber} />
             <div>
                <label
                  htmlFor="country"
                  className="block text-sm font-medium text-gray-700"
                >
                  Country*
                </label>
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
            <div className="pt-2">
              <h2 className="text-lg font-medium" style={{ color: '#211F45' }}>Payment details:</h2>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <HostedField label="Credit Card Number*" fieldId="ccnumber" />
                <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                  <HostedField label="Expiry Date*" fieldId="ccexp" />
                  <div className="hidden sm:block">
                    <Image src="/creditcard.png" alt="3 digits on the back of your card" width={56} height={28} />
                  </div>
                </div>
                <HostedField label="CVV*" fieldId="cvv" />
                <div className="col-span-1 sm:col-span-2">
                  <Field label="Billing Address*" value={billingSame ? `${address1}${address2 ? ', ' + address2 : ''}` : address1}
                         onChange={setAddress1} required disabled={billingSame} />
                </div>

                <div className="col-span-1 sm:col-span-2 flex items-center gap-2 text-sm text-gray-700">
                  <input id="sameAs" type="checkbox" className="h-4 w-4 rounded border-gray-300"
                         checked={billingSame} onChange={e => setBillingSame(e.target.checked)} />
                  <label htmlFor="sameAs">Same as above.</label>
                </div>
              </div>

              {/* Consents + policy box */}
              <div className="mt-4  border border-gray-200 bg-[#93AFB9] p-3 text-[12px] text-white">
                By clicking Submit, you're agreeing to Dream Trip Club Rewards contacting you about offers,
                 updates, and more via email and/or SMS messages. You can unsubscribe, update your preferences or 
                view our <a href="/privacy" className="underline">Privacy Policy</a> at any time. In order to provide you the 
                content requested, we need to store and process your personal data.
                
              
                  <div className="mt-3 space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300"
                         checked={consentEmail} onChange={e => setConsentEmail(e.target.checked)} />
                  <span>I agree to receive email communications Dream Trip Club Rewards</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300"
                         checked={consentSms} onChange={e => setConsentSms(e.target.checked)} />
                  <span>I agree to receive SMS communications Dream Trip Club Rewards</span>
                </label>
              </div>
              </div>
            </div>

            {/* Footer: totals + button */}
            <div className="pt-2">
              <p className="sm:text-1xl font-bold tracking-tight">
                <span className="font-medium font-bold">Total:</span> {money(total, quote.currency)} ({quote.currency})
              </p>
            </div>

            {err ? <div className="text-sm text-red-600">{err}</div> : null}

            <button
              type="submit"
              disabled={paying}
              className="mt-2 inline-flex items-center justify-center rounded-full bg-[#F59E0B] px-6 py-3 font-semibold text-white hover:opacity-95 disabled:opacity-50"
            >
              {paying ? 'Processing…' : 'BOOK NOW'}
            </button> 

            {/* Cancellation Policy (dynamic) */}
              <div className="pt-6 text-sm text-gray-700">
                <h3 className="font-semibold mb-2">Cancellation Policy</h3>
                {(() => {
                  // arrival date → 2 days before, 11:59 PM local hotel time (we display the date)
                  const arrival = quote?.startTime ? new Date(quote.startTime) : null;
                  const deadline = arrival ? new Date(arrival) : null;
                  if (deadline) deadline.setDate(deadline.getDate() - 2);

                  // cost: average nightly (fallback to total if nights unknown)
                  const nights = Number(quote?.nights || (quote?.details?.length || 0));
                  const base = Number(quote?.grossAmount || 0);
                  const perNight = nights > 0 ? base / nights : base;
                  const cost = perNight.toFixed(2);
                  const ccy = quote?.currency || 'CAD';

                  const fmt = (d?: Date | null) =>
                    d ? d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '—';

                  return (
                    <p>
                      You may cancel your reservation for no charge before 11:59 PM local hotel time on <strong>{fmt(deadline)}</strong> (2 day[s] before arrival).
                      {' '}Please note that we will assess a fee of <strong>{cost} {ccy}</strong> if you must cancel after this deadline.
                      {' '}If you have made a prepayment, we will retain all or part of your prepayment. If not, we will charge your credit card.
                    </p>
                  );
                })()}
              </div>
          </form>
        </section>
      </div>
    </div>
    </div>
    
  );
}

/* ---------- Helpers ---------- */

function Field({
  label, value, onChange, required, disabled, type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
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

function HostedField({ label, fieldId }: { label: string; fieldId: 'ccnumber' | 'ccexp' | 'cvv' }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-700">{label}</label>
      <div
        id={fieldId}
        className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus-within:border-[#211F45] focus-within:ring-1 focus-within:ring-[#211F45]"
      />
    </div>
  );
}