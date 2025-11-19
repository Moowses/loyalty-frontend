'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import {
  FaBellConcierge,
  FaSuitcaseRolling,
  FaGift,
  FaHouse,
  FaTicket,
  FaMedal,
  FaUser,
} from 'react-icons/fa6';

/* ========= Types ========= */
type Txn = { date: string; description: string; points: number };

type Dashboard = {
  name: string;
  membershipNo: string;
  tier: string;
  totalPoints: number;
  transactions: Txn[];
  stays?: number;
  pointsToNextTier?: number;
};

type Reservation = { hotelName?: string; checkIn?: string; checkOut?: string };

type ReservationsPayload = { upcoming: Reservation[]; past: Reservation[] };

type StayType = 'stay' | 'booking' | 'cancellation' | 'missing';

type StayBooking = {
  type: StayType;
  status: string;
  confirmationNumber?: string | null;
  hotelName: string;
  arrivalDate?: string | null;
  departureDate?: string | null;
  pointsEarned?: number | null;
  pointsForStay?: number | null;
  raw?: any;
};

type StaysPayload = {
  upcoming: StayBooking[];
  past: StayBooking[];
  cancellations?: StayBooking[];
  missing?: StayBooking[];
};

/* chatbot - dynamically import to avoid SSR issues */
const ChatbotWidget = dynamic(() => import('@/components/ChatbotWidget'), {
  ssr: false,
  loading: () => null,
});

/* image carousel */
const ImageCarousel = dynamic(() => import('@/components/ImageCarousel'), {
  ssr: false,
});

/* ========= Mocks (only if API + local fallback fail) ========= */
const MOCK_DASH: Dashboard = {
  name: 'Member',
  membershipNo: '—',
  tier: 'Member',
  totalPoints: 0,
  stays: 0,
  pointsToNextTier: 10000,
  transactions: [],
};
const MOCK_RESV: ReservationsPayload = { upcoming: [], past: [] };
const MOCK_STAYS: StaysPayload = { upcoming: [], past: [] };

/* ========= Helpers ========= */

// cookie helper
const getCookie = (name: string): string => {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(
    new RegExp(
      '(?:^|; )' +
        name.replace(/[$()*+.?[\\\]^{|}]/g, '\\$&') +
        '=([^;]*)'
    )
  );
  return m ? decodeURIComponent(m[1]) : '';
};

/*  Normalizers */
function normalizeDashboard(json: any): Dashboard {
  const rec =
    json?.dashboard ??
    (Array.isArray(json?.data) ? json.data[0] : json) ??
    {};

  const firstname =
    rec.firstname ??
    rec.firstName ??
    rec.name?.split?.(' ')?.[0] ??
    '';
  const lastname = rec.lastname ?? rec.lastName ?? '';
  const name =
    firstname || lastname
      ? `${firstname} ${lastname}`.trim()
      : rec.name ?? 'Member';

  const membershipNo =
    rec.membershipno ??
    rec.membershipNo ??
    rec.membership ??
    rec.membershipNumber ??
    '—';

  const tier =
    rec.membershiptier ??
    rec.tier ??
    rec.membershipTier ??
    'Member';

  const totalPoints = Number(
    rec.pointsbalance ??
      rec.pointsBalance ??
      rec.totalPoints ??
      0
  );

  const stays = Number(
    rec.nu_stays ??
      rec.nu_stay_count_rup ??
      rec.stays ??
      0
  );

  const pointsToNextTier = Number(
    rec.pointsToNextTier ?? 10000
  );

  const rawTx: any[] =
    rec.transactions ??
    rec.Micro_Rewards ??
    rec.history ??
    [];

  const transactions: Txn[] = rawTx.map((t: any) => ({
    date:
      t.date ??
      t.txn_date ??
      t.CREATED_DATE ??
      t.META_TRANSACTIONDATEORDER ??
      '',
    description:
      t.description ??
      t.META_REDEMPTIONITEMNAME ??
      t.type ??
      t.CREATED_BY ??
      'Activity',
    points: Number(
      t.points ??
        t.META_POINTSAMOUNT ??
        t.amount ??
        0
    ),
  }));

  if (!transactions.length && Array.isArray(rec.history)) {
    const hist: any[] = rec.history;
    return {
      name,
      membershipNo,
      tier,
      totalPoints,
      stays,
      pointsToNextTier,
      transactions: hist.map((h) => ({
        date: '',
        description:
          h.META_REDEMPTIONITEMNAME ??
          h.CREATED_BY ??
          'Activity',
        points: Number(h.META_POINTSAMOUNT ?? 0),
      })),
    };
  }

  return {
    name,
    membershipNo,
    tier,
    totalPoints,
    transactions,
    stays,
    pointsToNextTier,
  };
}

function normalizeReservations(json: any): ReservationsPayload {
  const src =
    json?.reservations ??
    json ??
    {};
  return {
    upcoming: Array.isArray(src.upcoming) ? src.upcoming : [],
    past: Array.isArray(src.past) ? src.past : [],
  };
}

function normalizeStays(json: any): StaysPayload {
  return {
    upcoming: Array.isArray(json?.upcoming) ? json.upcoming : [],
    past: Array.isArray(json?.past) ? json.past : [],
    cancellations: Array.isArray(json?.cancellations)
      ? json.cancellations
      : [],
    missing: Array.isArray(json?.missing) ? json.missing : [],
  };
}

/* ========= Small UI helpers ========= */
function Card({
  title,
  children,
  headerClassName = '',
}: {
  title: string;
  children: React.ReactNode;
  headerClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-[#DCE6EE] bg-dtc-card shadow-card">
      <div
        className={`
          rounded-t-xl bg-[#93AFB9] text-white text-center
          px-4 py-3 uppercase font-semibold tracking-wide
          ${headerClassName}
        `}
      >
        {title}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function StatRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2 text-[15px]">
      <span className="text-[#5b6572]">{label}</span>
      <span className="font-semibold text-[#1F2042]">
        {value}
      </span>
    </div>
  );
}

function Tile({
  icon,
  title,
  desc,
  onClick,
  compact = false,
}: {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  onClick?: () => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full h-full rounded-[12px] border border-transparent bg-[#211F45] text-white shadow-card
              ${
                compact
                  ? 'p-6 h-28 grid place-items-center'
                  : 'p-6 text-left'
              }`}
    >
      {compact ? (
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
            {icon}
          </span>
          <span className="uppercase tracking-wide font-semibold">
            {title}
          </span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              {icon}
            </span>
            <span className="uppercase tracking-wide font-semibold">
              {title}
            </span>
          </div>
          {desc && (
            <p className="text-sm leading-5 text-white/80">
              {desc}
            </p>
          )}
        </>
      )}
    </button>
  );
}

/* ========= Header (unchanged) ========= */
function NavIcon({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-1 text-[#1F2042]/80 hover:text-[#1F2042] transition"
    >
      <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#D7DBE7] bg-white group-hover:border-[#1F2042]">
        {icon}
      </span>
      <span className="hidden md:block text-[10px] tracking-wide">
        {label}
      </span>
    </Link>
  );
}

/* ========= Page ========= */
export default function DashboardPage() {
  const router = useRouter();

  const [data, setData] = useState<Dashboard | null>(null);
  const [reservations, setReservations] =
    useState<ReservationsPayload>(MOCK_RESV);
  const [stayBookings, setStayBookings] =
    useState<StaysPayload>(MOCK_STAYS);
  const [activityTab, setActivityTab] = useState<
    'points' | 'stays'
  >('points');
  const [selectedStay, setSelectedStay] =
    useState<StayBooking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const HOME = 'https://dreamtripclub.com';
    const base =
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '') ||
      '';

    const safeRedirect = (becauseLogout = false) => {
      if (cancelled) return;
      setLoading(false);
      if (
        becauseLogout ||
        sessionStorage.getItem('justLoggedOut')
      ) {
        sessionStorage.removeItem('justLoggedOut');
        router.replace(HOME);
        return;
      }
      setTimeout(() => {
        alert('You must Log In first.');
        router.replace(HOME);
      }, 1500);
    };

    const run = async () => {
      const cookieEmail = getCookie('dtc_email');

      // Authoritative session check via backend (HttpOnly cookie)
      let loggedIn = false;
      try {
        if (base) {
          const meRes = await fetch(`${base}/api/auth/me`, {
            credentials: 'include',
            signal: controller.signal,
          });
          const me = await meRes
            .json()
            .catch(() => ({} as any));
          loggedIn = !!me?.loggedIn;
        }
      } catch {
        loggedIn = !!cookieEmail;
      }

      if (!loggedIn) {
        safeRedirect(false);
        return;
      }

      const email =
        cookieEmail || localStorage.getItem('email') || '';

      if (!email) {
        safeRedirect(false);
        return;
      }

      const legacyToken =
        localStorage.getItem('apiToken') || '';

      try {
        if (!base) {
          if (!cancelled) {
            setData(MOCK_DASH);
            setReservations(MOCK_RESV);
            setStayBookings(MOCK_STAYS);
            setLoading(false);
          }
          return;
        }

        // 1) Dashboard
        const dres = await fetch(
          `${base}/api/user/dashboard`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ email }),
            signal: controller.signal,
          }
        );
        const dj = dres.ok ? await dres.json() : null;
        if (!cancelled)
          setData(dj ? normalizeDashboard(dj) : MOCK_DASH);

        // 2) Legacy reservations
        try {
          const rres = await fetch(
            `${base}/api/user/reservations`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify(
                legacyToken
                  ? { email, token: legacyToken }
                  : { email }
              ),
              signal: controller.signal,
            }
          );
          const rj = rres.ok ? await rres.json() : null;
          if (!cancelled)
            setReservations(
              rj ? normalizeReservations(rj) : MOCK_RESV
            );
        } catch {
          if (!cancelled) setReservations(MOCK_RESV);
        }

        // 3) Stays & bookings via /stays
        try {
          const sres = await fetch(
            `${base}/api/user/stays`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({ email }),
              signal: controller.signal,
            }
          );
          const sj = sres.ok ? await sres.json() : null;
          if (!cancelled && sj?.success) {
            setStayBookings(normalizeStays(sj));
          } else if (!cancelled) {
            setStayBookings(MOCK_STAYS);
          }
        } catch {
          if (!cancelled) setStayBookings(MOCK_STAYS);
        }
      } catch {
        if (!cancelled) {
          try {
            const ls =
              localStorage.getItem('dashboardData');
            if (ls)
              setData(
                normalizeDashboard(JSON.parse(ls))
              );
          } catch {}
          try {
            const rs =
              localStorage.getItem('reservations');
            if (rs)
              setReservations(
                normalizeReservations(JSON.parse(rs))
              );
          } catch {}
          setStayBookings(MOCK_STAYS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [router]);

  const recent = useMemo(
    () =>
      (data?.transactions ?? [])
        .slice(-4)
        .reverse(),
    [data]
  );

  const latestTxn = useMemo(() => {
    const txns = data?.transactions ?? [];
    if (!txns.length) return null;
    const withTs = txns.map((t) => ({
      ...t,
      ts: Date.parse(t.date || ''),
    }));
    const valid = withTs
      .filter((t) => !Number.isNaN(t.ts))
      .sort((a, b) => a.ts - b.ts);
    return valid.length
      ? valid[valid.length - 1]
      : txns[txns.length - 1];
  }, [data]);

  const latestStay = useMemo(() => {
    if (stayBookings.past.length) {
      return stayBookings.past[0].hotelName || '—';
    }
    if (reservations.past?.length) {
      return reservations.past[0].hotelName || '—';
    }
    return latestTxn?.description ?? '—';
  }, [stayBookings, reservations, latestTxn]);

  const points = (data?.totalPoints ?? 0).toLocaleString();

  const staysCount = useMemo(() => {
    if (stayBookings.past.length) return stayBookings.past.length;
    if (typeof data?.stays === 'number') return data.stays;
    if (reservations.past?.length)
      return reservations.past.length;
    return 0;
  }, [stayBookings, data, reservations]);

  const toNext = (data?.pointsToNextTier ?? 10000).toLocaleString();

  const isCancellable = (stay: StayBooking | null) => {
    if (!stay) return false;
    if (
      stay.type === 'booking' ||
      stay.status === 'upcoming'
    ) {
      if (!stay.arrivalDate) return true;
      const today = new Date();
      const arrival = new Date(stay.arrivalDate);
      return arrival >= today;
    }
    return false;
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#F6F8FB] text-[#1F2042]">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FB]">
      {/* ===== BODY: Light DTC layout ===== */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 text-[#1F2042]">
        <ChatbotWidget />

        {/* Greeting banner */}
        <section className="mb-6">
          <div className="w-full bg-[#93AFB9] text-white rounded-md px-4 md:px-6 py-4
                          flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Left: profile + text */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full border-2 border-white/70 grid place-items-center">
                <FaUser className="text-white/90" />
              </div>
              <div>
                <div className="text-[25px] md:text-[30px] font-semibold leading-tight">
                  Hello {data?.name?.split(' ')[0] ?? data?.name ?? 'Member'}
                </div>
                <div className="text-[25px] md:text-[20px] text-white/95">
                  Member Number:{' '}
                  <span className="font-medium">
                    {data?.membershipNo ?? '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Divider on desktop */}
            <div className="hidden md:block h-12 w-px bg-white/40" />

            {/* Right: points */}
            <div className="md:text-right">
              <div className="text-[16px] uppercase font-semibold tracking-wide text-white/90">
                YOUR POINTS
              </div>
              <div className="text-[20px] md:text-[22px] font-semibold">
                {points}
              </div>
            </div>
          </div>
        </section>

        {/* Top cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* CURRENT STATUS */}
          <Card title="Current Status" headerClassName="text-[25px]">
            <div className="flex flex-col min-h-[280px]">
              {/* Tier */}
              <div className="text-center text-[20px] md:text-[27px] font-bold mb-5">
                {data?.tier ?? 'Member'}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 items-center text-[25px] font-semibold gap-y-1">
                <div className="py-2 text-[#3b4555]">
                  Your points total
                </div>
                <div className="py-2 text-right font-semibold tnum">
                  {points}
                </div>

                <div className="py-2 text-[#3b4555]">
                  Your number of stays
                </div>
                <div className="py-2 text-right font-semibold">
                  {staysCount}
                </div>
              </div>

              {/* Bottom sentence */}
              <div
                className="mt-auto pt-4 text-center"
                style={{
                  fontFamily: 'Avenir, sans-serif',
                  fontWeight: 500,
                  fontSize: '30px',
                  lineHeight: '102.5%',
                  letterSpacing: '-0.02em',
                  color: '#3b4555',
                }}
              >
                You need{' '}
                <span className="font-semibold tnum">
                  {toNext} points
                </span>{' '}
                more points to reach{' '}
                <span className="font-semibold">
                  (next tier)
                </span>
                .
              </div>
            </div>
          </Card>

          {/* RECENT ACTIVITY (with tabs) */}
          <Card title="Recent Activity" headerClassName="text-[25px]">
            <div className="flex flex-col">
              {/* Tabs */}
              <div className="flex gap-4 mb-4 border-b border-[#DCE6EE]">
                <button
                  type="button"
                  onClick={() => setActivityTab('points')}
                  className={`pb-2 text-sm font-semibold uppercase ${
                    activityTab === 'points'
                      ? 'text-[#1F2042] border-b-2 border-[#1F2042]'
                      : 'text-[#8A94A6]'
                  }`}
                >
                  Points History
                </button>
                <button
                  type="button"
                  onClick={() => setActivityTab('stays')}
                  className={`pb-2 text-sm font-semibold uppercase ${
                    activityTab === 'stays'
                      ? 'text-[#1F2042] border-b-2 border-[#1F2042]'
                      : 'text-[#8A94A6]'
                  }`}
                >
                  Stays &amp; Bookings
                </button>
              </div>

              {/* Shared header */}
              <p className="text-[20px] md:text-[27px] font-bold mb-3 text-[#1F2042]">
                Most recent stay at{' '}
                <span className="font-semibold">
                  {latestStay}
                </span>
              </p>
              <p className="text-[15px] leading-5 text-slate-600 font-bold mb-4">
                Reward points will be reflected after your stay, and any points adjustments are updated in real time.
              </p>

              {/* Tab 1: Points History (existing design) */}
              {activityTab === 'points' && (
                <>
                  <div className="overflow-x-auto rounded-[14px] border border-[#93AFB9]">
                    <table className="w-full text-[16px] bg-white ">
                      <thead>
                        <tr className="text-[#3b4555]">
                          <th className="text-left font-bold py-2 px-3">DATE</th>
                          <th className="text-left font-bold py-2 px-3 border-l border-[#DCE6EE]">
                            DESCRIPTION
                          </th>
                          <th className="text-right font-bold py-2 px-3 border-l border-[#DCE6EE]">
                            POINTS EARNED
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {recent.length ? (
                          recent.map((t, i) => (
                            <tr key={i} className="border-t border-[#DCE6EE]">
                              <td className="py-2 px-3">
                                {t.date || '—'}
                              </td>
                              <td className="py-2 px-3 border-l border-[#DCE6EE]">
                                {t.description}
                              </td>
                              <td className="py-2 px-3 border-l border-[#DCE6EE] text-right font-semibold tnum">
                                {t.points.toLocaleString()}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="py-4 text-center text-[#6b7480]">
                              No recent activity.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                </>
              )}

              {/* Tab 2: Stays & Bookings */}
              {activityTab === 'stays' && (
                <>
                  <div className="overflow-x-auto rounded-[14px] border border-[#93AFB9]">
                    <table className="w-full text-[16px] bg-white">
                      <thead>
                        <tr className="text-[#3b4555]">
                          <th className="text-left font-bold py-2 px-3">
                            DATE
                          </th>
                          <th className="text-left font-bold py-2 px-3 border-l border-[#DCE6EE]">
                            HOTEL
                          </th>
                          <th className="text-right font-bold py-2 px-3 border-l border-[#DCE6EE]">
                            DETAILS
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {stayBookings.upcoming.length ||
                        stayBookings.past.length ? (
                          <>
                            {stayBookings.upcoming.map(
                              (s, i) => (
                                <tr
                                  key={`u-${i}`}
                                  className="border-t border-[#DCE6EE]"
                                >
                                  <td className="py-2 px-3">
                                    {s.arrivalDate ||
                                      '—'}
                                  </td>
                                  <td className="py-2 px-3 border-l border-[#DCE6EE]">
                                    {s.hotelName ||
                                      '—'}
                                  </td>
                                  <td className="py-2 px-3 border-l border-[#DCE6EE] text-right">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setSelectedStay(
                                          s
                                        )
                                      }
                                      className="text-[#A25A3D] underline text-sm"
                                    >
                                      Details
                                    </button>
                                  </td>
                                </tr>
                              )
                            )}
                            {stayBookings.past.map(
                              (s, i) => (
                                <tr
                                  key={`p-${i}`}
                                  className="border-t border-[#DCE6EE]"
                                >
                                  <td className="py-2 px-3">
                                    {s.arrivalDate ||
                                      '—'}
                                  </td>
                                  <td className="py-2 px-3 border-l border-[#DCE6EE]">
                                    {s.hotelName ||
                                      '—'}
                                  </td>
                                  <td className="py-2 px-3 border-l border-[#DCE6EE] text-right">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setSelectedStay(
                                          s
                                        )
                                      }
                                      className="text-[#A25A3D] underline text-sm"
                                    >
                                      Details
                                    </button>
                                  </td>
                                </tr>
                              )
                            )}
                          </>
                        ) : (
                          <tr>
                            <td
                              colSpan={3}
                              className="py-4 text-center text-[#6b7480]"
                            >
                              No stays or bookings found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Service tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 md:auto-rows-fr gap-5 items-stretch mb-8">
          {/* Col 1: Private Concierge */}
          <div className="md:row-start-1 md:row-span-2 md:col-start-1">
            <Tile
              icon={
                <Image
                  src="/dashcon.png"
                  alt="Private Concierge"
                  width={28}
                  height={28}
                  priority
                />
              }
              title="PRIVATE CONCIERGE"
              desc="Enjoy personalized service with our dedicated concierge team. From booking exclusive experiences to arranging seamless travel, we're here to cater to your every need."
              onClick={() => window.open("https://dreamtripclub.com/rewards/", "_blank")}
            />
          </div>

          {/* Col 2: Luxury Booking */}
          <div className="md:row-start-1 md:col-start-2">
            <Tile
              icon={
                <Image
                  src="/dashlux.png"
                  alt="Luxury Booking"
                  width={28}
                  height={28}
                />
              }
              title="LUXURY BOOKING"
              desc="Earn qualifying points to unlock more member benefits at curated resorts and cottages."
             onClick={() => window.open("https://dreamtripclub.com/rewards/", "_blank")}
            />
          </div>

          {/* Col 3: Member-Only Events */}
          <div className="md:row-start-1 md:col-start-3">
            <Tile
              icon={
                <Image
                  src="/dashmem.png"
                  alt="Member-only Events"
                  width={28}
                  height={28}
                />
              }
              title="MEMBER-ONLY EVENTS"
              desc="First access to book prime weekends and holiday periods before they open to the general public."
              onClick={() => window.open("https://dreamtripclub.com/rewards/", "_blank")}
            />
          </div>

          {/* Row 2: Gifts for Anniversaries and Referrals */}
          <div className="md:row-start-2 md:col-start-2 md:col-span-2">
            <Tile
              icon={
                <Image
                  src="/dashgift.png"
                  alt="Gifts for Anniversaries and Referrals"
                  width={28}
                  height={28}
                />
              }
              title="GIFTS FOR ANNIVERSARIES AND REFERRALS"
              desc="Receive 5,000 bonus points each year on your membership anniversary and a delightful surprise on your birthday. Plus, gift your friends with a Dream Trip Club referral and get points for your friend and extra points for yourself."
              onClick={() => window.open("https://dreamtripclub.com/rewards/", "_blank")}
            />
          </div>
        </div>

        {/* Helper links */}
        <div className="flex items-center justify-center gap-10 text-sm md:text-base">
          <a
            href="https://dreamtripclub.com/help/"
            className="flex items-center gap-1.5 text-[#211F45] hover:opacity-80"
          >
            <Image
              src="/questions.png"
              alt="Questions"
              width={18}
              height={18}
            />
            <span className="uppercase underline font-medium tracking-normal text-[12px] md:text-[13px]">
              Questions?
            </span>
          </a>

          <a
            href="#"
            className="flex items-center gap-1.5 text-[#211F45] hover:opacity-80"
          >
            <Image
              src="/missingpoints.png"
              alt="Missing points"
              width={18}
              height={18}
            />
            <span className="uppercase underline font-medium tracking-normal text-[12px] md:text-[13px]">
              Missing Points?
            </span>
          </a>
        </div>

        {/* Image-only carousel */}
        <ImageCarousel />
      </main>

      {/* Stay Details Modal */}
      {selectedStay && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5">
            <h3 className="text-lg font-semibold text-[#1F2042] mb-2">
              Stay Details
            </h3>
            <p className="text-sm text-[#4B5563] mb-1">
              <span className="font-semibold">Hotel:</span>{' '}
              {selectedStay.hotelName || '—'}
            </p>
            <p className="text-sm text-[#4B5563] mb-1">
              <span className="font-semibold">
                Confirmation #:
              </span>{' '}
              {selectedStay.confirmationNumber || '—'}
            </p>
            <p className="text-sm text-[#4B5563] mb-1">
              <span className="font-semibold">Arrival:</span>{' '}
              {selectedStay.arrivalDate || '—'}
            </p>
            <p className="text-sm text-[#4B5563] mb-3">
              <span className="font-semibold">
                Departure:
              </span>{' '}
              {selectedStay.departureDate || '—'}
            </p>

            {(selectedStay.pointsEarned != null ||
              selectedStay.pointsForStay != null) && (
              <p className="text-sm text-[#4B5563] mb-3">
                <span className="font-semibold">
                  Points:
                </span>{' '}
                {(selectedStay.pointsEarned ??
                  selectedStay.pointsForStay ??
                  0
                ).toLocaleString()}
              </p>
            )}

            <p className="text-xs text-[#9CA3AF] mb-4">
              Status:{' '}
              {selectedStay.status || selectedStay.type}
            </p>

            {isCancellable(selectedStay) && (
              <button
                type="button"
                onClick={() =>
                  alert(
                    'To modify or cancel this booking, please use the Dream Trip Club mobile app or chat with us below.'
                  )
                }
                className="w-full mb-3 py-2 rounded-lg bg-[#211F45] text-white text-sm font-semibold hover:opacity-90"
              >
                Cancel booking
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedStay(null)}
              className="w-full py-2 rounded-lg border border-[#D1D5DB] text-sm font-semibold text-[#374151] bg-white hover:bg-[#F9FAFB]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
