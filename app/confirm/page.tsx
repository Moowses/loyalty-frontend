'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type ConfirmPayload = {
  reservationNumber?: string;
  hotelName?: string;
  roomTypeName?: string;
  arrivalDate?: string;   // ISO string
  departureDate?: string; // ISO string
  guests?: { adult?: number; child?: number; infant?: number; pet?: 'yes'|'no' };
  charges?: { base: number; petFee?: number; total: number; currency: string };
  payment?: { transactionId?: string };
  rewards?: { earned: number };
  // Optional extras (if you want to pass them later)
  customer?: { firstName?: string; lastName?: string; email?: string };
};

function decodeBase64Json<T = any>(b64?: string | null): T | null {
  if (!b64) return null;
  try {
    const str =
      typeof window === 'undefined'
        ? Buffer.from(b64, 'base64').toString('utf-8')
        : decodeURIComponent(escape(window.atob(b64)));
    return JSON.parse(str) as T;
  } catch {
    return null;
  }
}

function money(v?: number, ccy = 'CAD') {
  if (typeof v !== 'number' || Number.isNaN(v)) return '—';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: ccy }).format(v);
  } catch {
    return `${ccy} ${v.toFixed(2)}`;
  }
}

const BRAND = '#211F45';

export default function ConfirmPage() {
  const router = useRouter();
  const params = useSearchParams();

  const payloadRaw = params.get('payload');                 // base64 JSON (preferred)
  const reservationNumOnly = params.get('reservationNumber'); // minimal fallback

  const data = useMemo(() => decodeBase64Json<ConfirmPayload>(payloadRaw), [payloadRaw]);

  const reservationNumber =
    data?.reservationNumber || reservationNumOnly || '—';

  const hotelName = data?.hotelName || 'Your Hotel';
  const roomType = data?.roomTypeName || 'Selected Room';

  const arrival = data?.arrivalDate ? new Date(data.arrivalDate) : undefined;
  const departure = data?.departureDate ? new Date(data.departureDate) : undefined;

  const guests = data?.guests || {};
  const charges = data?.charges;
  const payment = data?.payment;
  const rewards = data?.rewards;

  const stayDates =
    arrival && departure
      ? `${arrival.toLocaleDateString()} → ${departure.toLocaleDateString()}`
      : '—';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Success Banner */}
      <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 mb-6">
        <div className="flex items-start gap-3">
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-white text-sm"
            style={{ backgroundColor: BRAND }}
          >
            ✓
          </span>
          <div>
            <div className="font-semibold" style={{ color: BRAND }}>
              Booking confirmed
            </div>
            <div className="text-sm text-gray-700">
              We’ve emailed your confirmation. You can view details below.
            </div>
          </div>
        </div>
      </div>

      {/* Header row with reservation # and actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: BRAND }}>
            Reservation #{reservationNumber}
          </h1>
          <p className="text-sm text-gray-600">Thank you for booking with Dream Trip Club.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/search')}
            className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50"
            style={{ borderColor: BRAND, color: BRAND }}
          >
            Book another stay
          </button>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: BRAND }}
          >
            Home
          </button>
        </div>
      </div>

      {/* Cards */}
      <section className="grid grid-cols-1 gap-6">
        {/* Stay details */}
        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-medium mb-3" style={{ color: BRAND }}>Stay details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500 mb-0.5">Hotel</div>
              <div className="text-gray-900">{hotelName}</div>
            </div>
            <div>
              <div className="text-gray-500 mb-0.5">Room</div>
              <div className="text-gray-900">{roomType}</div>
            </div>
            <div>
              <div className="text-gray-500 mb-0.5">Dates</div>
              <div className="text-gray-900">{stayDates}</div>
            </div>
            <div>
              <div className="text-gray-500 mb-0.5">Guests</div>
              <div className="text-gray-900">
                {guests.adult ?? 0} adult · {guests.child ?? 0} child · {guests.infant ?? 0} infant
                {guests.pet ? ` · Pet: ${guests.pet}` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Charges */}
        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-medium mb-3" style={{ color: BRAND }}>Charges</h2>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">Room total</span>
              <span className="text-gray-900">
                {money(charges?.base ?? charges?.total, charges?.currency || 'CAD')}
              </span>
            </div>
            {typeof charges?.petFee === 'number' && charges.petFee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-700">Pet fee</span>
                <span className="text-gray-900">
                  {money(charges.petFee, charges.currency || 'CAD')}
                </span>
              </div>
            )}
            <div className="flex justify-between font-semibold pt-1 border-t mt-2">
              <span>Total</span>
              <span>{money(charges?.total ?? charges?.base, charges?.currency || 'CAD')}</span>
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-medium mb-3" style={{ color: BRAND }}>Payment</h2>
          <div className="text-sm text-gray-700">
            Transaction ID:{' '}
            <span className="font-mono text-gray-900">
              {payment?.transactionId || '—'}
            </span>
          </div>
        </div>

        {/* Loyalty */}
        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-medium mb-3" style={{ color: BRAND }}>Loyalty</h2>
          {rewards?.earned ? (
            <div className="text-sm text-green-700">
              You earned <span className="font-semibold">{rewards.earned}</span> points on this booking.
            </div>
          ) : (
            <div className="text-sm text-gray-600">No points earned on this booking.</div>
          )}
        </div>
      </section>

      {/* Footer CTA (view booking) */}
      <div className="mt-6">
        <button
          onClick={() => router.push(`/booking/status?reservationNum=${encodeURIComponent(reservationNumber)}`)}
          className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50"
          style={{ borderColor: BRAND, color: BRAND }}
        >
          View booking status
        </button>
      </div>
    </div>
  );
}
