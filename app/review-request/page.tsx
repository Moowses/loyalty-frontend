'use client';

import { useEffect, useMemo, useState } from 'react';
import MemberBenefitsSection from '@/components/MemberBenefitsSection';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

type GuestInfo = {
  guestName: string;
  listingName: string;
  email: string;
  profileId?: string;
  reservationId?: string;
};

function getFirstName(fullName?: string) {
  if (!fullName) return 'there';
  const cleaned = fullName.trim().replace(/\s+/g, ' ');
  if (!cleaned) return 'there';
  return cleaned.split(' ')[0];
}

function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          className={`text-3xl leading-none transition ${
            disabled ? 'cursor-not-allowed opacity-60' : 'hover:scale-110'
          } ${n <= value ? 'text-yellow-400' : 'text-gray-300'}`}
          aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function ReviewRequestPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(null);

  const [rating, setRating] = useState<number>(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [message, setMessage] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ surveyId: string } | null>(null);

  const params = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const sp = new URLSearchParams(window.location.search);
    return {
      profileId: sp.get('profileId') || sp.get('ProfileId') || '',
      reservationId: sp.get('reservationId') || sp.get('reservationID') || '',
    };
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const profileId = params?.profileId || '';
        const reservationId = params?.reservationId || '';

        if (!profileId || !reservationId) {
          throw new Error('Missing profileId or reservationId in the URL.');
        }

        const url = `${API_BASE}/api/review/guest-info?profileId=${encodeURIComponent(
          profileId
        )}&reservationId=${encodeURIComponent(reservationId)}`;

        const res = await fetch(url, { method: 'GET' });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.details || data?.error || 'Failed to load guest info');
        }

        setGuestInfo(data);
      } catch (e: any) {
        setError(e?.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [params]);

  const canSubmit =
    !!guestInfo &&
    !loading &&
    !submitting &&
    !success &&
    rating >= 1 &&
    rating <= 5 &&
    reviewTitle.trim().length > 0 &&
    message.trim().length > 0;

  const handleSubmit = async () => {
    if (!guestInfo) return;

    setSubmitting(true);
    setError(null);

    try {
      const profileId = params?.profileId || '';
      const reservationId = params?.reservationId || '';

      const res = await fetch(`${API_BASE}/api/review/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          reservationId,
          rating,
          reviewTitle,
          message,
          email: guestInfo.email,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.details || data?.error || 'Failed to submit review');
      }

      setSuccess({ surveyId: data.surveyId });
    } catch (e: any) {
      setError(e?.message || 'Something went wrong while submitting');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Background only for the form area */}
      <div
        className="w-full bg-cover bg-center"
        style={{ backgroundImage: "url('/revbackround.png')" }}
      >
        <div className="w-full flex items-center justify-center px-4 py-12">
          {/* Glass card ONLY for form/success */}
          <div className="w-full max-w-5xl rounded-2xl bg-white/80 backdrop-blur-sm shadow-2xl border border-white/40 overflow-hidden">
            <div className="px-10 md:px-14 py-10 md:py-12">
              {/* SUCCESS SCREEN */}
              {success && guestInfo ? (
                <div className="rounded-2xl bg-white/85 backdrop-blur border border-white/50 shadow-xl px-8 md:px-14 py-12 text-center">
                  <h2 className="text-3xl md:text-4xl font-extrabold text-black">
                    Thank-you for taking the time {getFirstName(guestInfo.guestName)}.
                  </h2>

                  <p className="mt-6 text-sm md:text-base text-gray-800 max-w-2xl mx-auto">
                    When you or your friends/family are ready to book your next stay, send us a
                    message and we’ll arrange your 10% discount.
                  </p>

                  <p className="mt-4 text-sm md:text-base text-gray-800 max-w-2xl mx-auto">
                    If you haven’t already, take a moment to join our Dream Trip Club Rewards
                    program. You’ll get 50 points just for joining and we’ll even add rewards for
                    your recent stay!
                  </p>

                  <div className="mt-8">
                    <a
                      href="https://dreamtripclub.com"
                      className="inline-flex items-center justify-center rounded-full bg-orange-500 px-8 py-3 text-xs font-extrabold tracking-[0.25em] uppercase text-white shadow-md hover:bg-orange-600 transition"
                    >
                      JOIN NOW!
                    </a>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-4xl md:text-5xl font-extrabold text-[#1D1A3A] leading-tight text-center">
                    Your opinion means the <br className="hidden md:block" />
                    world to us!
                  </h1>

                  {/* Alerts */}
                  <div className="mt-4 flex justify-center">
                    <div className="w-full max-w-3xl">
                      {loading && (
                        <div className="text-gray-700 text-sm text-center">
                          Loading your details...
                        </div>
                      )}

                      {error && (
                        <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
                          {error}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Form (centered) */}
                  {!loading && guestInfo && (
                    <div className="mt-8 flex justify-center">
                      <div className="w-full max-w-3xl">
                        {/* Rating */}
                        <div className="mb-6 text-center">
                          <label className="block text-xs font-semibold text-gray-700 mb-2">
                            Rating
                          </label>
                          <StarRating value={rating} onChange={setRating} disabled={submitting} />
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">
                              Listing Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-orange-400"
                              value={guestInfo.listingName || ''}
                              readOnly
                              placeholder="This Should Auto-Populate"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">
                              Guest Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-orange-400"
                              value={guestInfo.guestName || ''}
                              readOnly
                              placeholder="This Should Auto-Populate"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">
                              Email <span className="text-red-500">*</span>
                            </label>
                            <input
                              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-orange-400"
                              value={guestInfo.email || ''}
                              readOnly
                              placeholder="Email"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">
                              Review Title <span className="text-red-500">*</span>
                            </label>
                            <input
                              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-orange-400"
                              value={reviewTitle}
                              onChange={(e) => setReviewTitle(e.target.value)}
                              disabled={submitting}
                              placeholder="Title"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">
                              Message <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              className="w-full min-h-[140px] rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-orange-400"
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              disabled={submitting}
                              placeholder="Message"
                            />
                          </div>

                          <div className="pt-3 flex justify-center">
                            <button
                              type="button"
                              onClick={handleSubmit}
                              disabled={!canSubmit}
                              className={`rounded-full px-10 py-3 text-xs font-extrabold tracking-[0.25em] uppercase text-white shadow-md transition
                                ${
                                  canSubmit
                                    ? 'bg-orange-500 hover:bg-orange-600'
                                    : 'bg-orange-300 cursor-not-allowed'
                                }`}
                            >
                              {submitting ? 'Submitting...' : 'SUBMIT'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* bottom strip like screenshot */}
            <div className="h-24 bg-[#1D1A3A]/20" />
          </div>
        </div>
      </div>

      {/* //start the components */}
      <MemberBenefitsSection
        leftImageSrc="/member-left.jpg"
        rightTopImageSrc="/member-top.jpg"
        rightBottomLeftImageSrc="/member-bot-left.jpg"
        rightBottomRightImageSrc="/member-bot-right.jpg"
        joinHref="https://dreamtripclub.com"
        signInHref="/login"
      />
      {/* //end of components */}
    </div>
  );
}
