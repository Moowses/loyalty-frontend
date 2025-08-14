'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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

/* ========= Normalizers ========= */
function normalizeDashboard(json: any): Dashboard {
  const rec =
    json?.dashboard ??
    (Array.isArray(json?.data) ? json.data[0] : json) ??
    {};

  const firstname = rec.firstname ?? rec.firstName ?? rec.name?.split?.(' ')?.[0] ?? '';
  const lastname  = rec.lastname  ?? rec.lastName  ?? '';
  const name = (firstname || lastname) ? `${firstname} ${lastname}`.trim() : (rec.name ?? 'Member');

  const membershipNo = rec.membershipno ?? rec.membershipNo ?? rec.membership ?? rec.membershipNumber ?? '—';
  const tier = rec.membershiptier ?? rec.tier ?? rec.membershipTier ?? 'Member';
  const totalPoints = Number(rec.pointsbalance ?? rec.pointsBalance ?? rec.totalPoints ?? 0);
  const stays = Number(rec.nu_stays ?? rec.nu_stay_count_rup ?? rec.stays ?? 0);
  const pointsToNextTier = Number(rec.pointsToNextTier ?? 10000);

  const rawTx: any[] = rec.transactions ?? rec.Micro_Rewards ?? rec.history ?? [];
  const transactions: Txn[] = rawTx.map((t: any) => ({
    date: t.date ?? t.txn_date ?? t.CREATED_DATE ?? '',
    description: t.description ?? t.META_REDEMPTIONITEMNAME ?? t.type ?? t.CREATED_BY ?? 'Activity',
    points: Number(t.points ?? t.META_POINTSAMOUNT ?? t.amount ?? 0),
  }));

  if (transactions.length === 0 && Array.isArray(rec.history)) {
    const hist: any[] = rec.history;
    return {
      name, membershipNo, tier, totalPoints, stays, pointsToNextTier,
      transactions: hist.map((h) => ({
        date: '',
        description: h.META_REDEMPTIONITEMNAME ?? h.CREATED_BY ?? 'Activity',
        points: Number(h.META_POINTSAMOUNT ?? 0),
      })),
    };
  }

  return { name, membershipNo, tier, totalPoints, transactions, stays, pointsToNextTier };
}

function normalizeReservations(json: any): ReservationsPayload {
  return { upcoming: json?.upcoming ?? [], past: json?.past ?? [] };
}

/* ========= Small UI helpers ========= */
function Card({
  title,
  children,
  headerClassName = "",
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

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 text-[15px]">
      <span className="text-[#5b6572]">{label}</span>
      <span className="font-semibold text-[#1F2042]">{value}</span>
    </div>
  );
}
function Tile({
  icon,
  title,
  desc,
  onClick,
  compact = false, // center-only style (no paragraph) for LB/VIP
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
      className={`rounded-xl border border-transparent bg-[#211F45] text-white shadow-card
                  ${compact ? "p-6 h-28 grid place-items-center" : "p-6 text-left"}`}
    >
      {compact ? (
        // centered, uppercase label (no paragraph)
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
            {icon}
          </span>
          <span className="uppercase tracking-wide font-semibold">{title}</span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              {icon}
            </span>
            <span className="uppercase tracking-wide font-semibold">{title}</span>
          </div>
          {desc && <p className="text-sm leading-5 text-white/80">{desc}</p>}
        </>
      )}
    </button>
  );
}


/* ========= Header (unchanged) ========= */
function NavIcon({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-1 text-[#1F2042]/80 hover:text-[#1F2042] transition"
    >
      <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#D7DBE7] bg-white group-hover:border-[#1F2042]">
        {icon}
      </span>
      <span className="hidden md:block text-[10px] tracking-wide">{label}</span>
    </Link>
  );
}
function SiteHeader({ onSignOut }: { onSignOut: () => void }) {
  return (
    <header className="sticky top-0 z-50 ">
      <div className="h-10 bg-[#1F2042] text-white/90 text-[11px] flex items-center justify-between px-3 md:px-6">
        <button type="button" className="inline-flex items-center gap-2 hover:text-white" onClick={() => alert('Launching chat…')}>
          <span className="inline-block h-3 w-3 rounded-[2px] border border-white/60" />
          CHAT WITH US
        </button>
        <button
          onClick={onSignOut}
          className="hidden sm:inline-flex items-center text-[11px] px-3 py-1 rounded-full border border-white/60 hover:bg-white hover:text-[#1F2042] transition"
        >
          SIGN OUT
        </button> 
      </div>

      <div className="bg-white text-[#1F2042] border-b border-[#E6E8EF]">
        <div className="max-w-7xl mx-auto h-16 md:h-[72px] px-3 md:px-6 flex items-center justify-between gap-4">
             <Link href="/" className="flex items-center gap-3">
            <Image src="/dreamtripclubicon.png" alt="Dream Trip Club" width={160} height={36} className="h-8 md:h-9 w-auto object-contain" priority />
          </Link>
          <div className="flex items-center gap-4 md:gap-6">
          {/*  <NavIcon href="/" icon={<FaHouse className="text-[18px]" />} label="Home" />
            <NavIcon href="/booking" icon={<FaTicket className="text-[18px]" />} label="Bookings" />
            <NavIcon href="/rewards" icon={<FaMedal className="text-[18px]" />} label="Rewards" />
            <NavIcon href="/gifting" icon={<FaGift className="text-[18px]" />} label="Gifting" />
            <NavIcon href="/account" icon={<FaUser className="text-[18px]" />} label="Account" />  */}
            
          </div>
        </div>
      </div>
    </header>
  );
}

/* ========= Page ========= */
export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [reservations, setReservations] = useState<ReservationsPayload>(MOCK_RESV);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const run = async () => {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '');

      // Try backend
      if (base) {
        try {
          const dres = await fetch(`${base}/api/user/dashboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            signal: controller.signal,
          });
          const dj = dres.ok ? await dres.json() : null;
          if (!cancelled) setData(dj ? normalizeDashboard(dj) : null);
        } catch {
          if (!cancelled) setData(null);
        }

        try {
          const rres = await fetch(`${base}/api/user/reservations`, {
            method: 'GET',
            credentials: 'include',
            signal: controller.signal,
          });
          const rj = rres.ok ? await rres.json() : null;
          if (!cancelled) setReservations(rj ? normalizeReservations(rj) : MOCK_RESV);
        } catch {
          if (!cancelled) setReservations(MOCK_RESV);
        }
      }

      // Fallback: localStorage
      if (!data) {
        try {
          const ls = localStorage.getItem('dashboardData');
          if (ls) setData(normalizeDashboard(JSON.parse(ls)));
        } catch {}
      }
      if (!reservations?.past?.length && !reservations?.upcoming?.length) {
        try {
          const rs = localStorage.getItem('reservations');
          if (rs) setReservations(normalizeReservations(JSON.parse(rs)));
        } catch {}
      }

      if (!cancelled) setLoading(false);
    };

    run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = () => router.push('/');

  const recent = useMemo(() => (data?.transactions ?? []).slice(-4).reverse(), [data]);

  // NEW: latest transaction for "Most recent stay at …"
  const latestTxn = useMemo(() => {
    const txns = data?.transactions ?? [];
    if (!txns.length) return null;
    const withTs = txns.map(t => ({ ...t, ts: Date.parse(t.date || '') }));
    const valid = withTs.filter(t => !Number.isNaN(t.ts)).sort((a, b) => a.ts - b.ts);
    return valid.length ? valid[valid.length - 1] : txns[txns.length - 1];
  }, [data]);

  const latestStay = latestTxn?.description ?? reservations.past?.[0]?.hotelName ?? '—';

  const points = (data?.totalPoints ?? 0).toLocaleString();
  const stays = data?.stays ?? reservations.past?.length ?? 0;
  const toNext = (data?.pointsToNextTier ?? 10000).toLocaleString();

  if (loading && !data) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#F6F8FB] text-[#1F2042]">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FB]">
      {/* Header (unchanged) */}
      <SiteHeader onSignOut={handleLogout} />

      {/* ===== BODY: Light DTC layout ===== */}
      
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 text-[#1F2042]">
        {/* Greeting row */}
     {/* Greeting banner (muted blue) */}
        <section className="mb-6">
          <div className="w-full bg-[#93AFB9] text-white rounded-md px-4 md:px-6 py-4
                          flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Left: profile + text */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full border-2 border-white/70 grid place-items-center">
                <FaUser className="text-white/90" />
              </div>
              <div>
                <div className="text-[22px] md:text-[24px] font-semibold leading-tight">
                  Hello {data?.name?.split(' ')[0] ?? data?.name ?? 'Member'}
                </div>
                <div className="text-[16px] md:text-[18px] text-white/95">
                  Member Number: <span className="font-medium">{data?.membershipNo ?? '—'}</span>
                </div>
              </div>
            </div>

            {/* Divider on desktop */}
            <div className="hidden md:block h-12 w-px bg-white/40" />

            {/* Right: points */}
            <div className="md:text-right">
              <div className="text-[11px] uppercase tracking-wide text-white/90">YOUR POINTS</div>
              <div className="text-[20px] md:text-[22px] font-semibold">{points}</div>
              <div className="mt-1 text-[12px] underline flex md:justify-end gap-4">
                <button>Redeem Points</button>
                <button>Purchase Points</button>
              </div>
            </div>
          </div>
        </section>


        {/* Top cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* CURRENT STATUS */}
          <Card title="Current Status" headerClassName="text-[25px]">
            {/* make the card body a column so we can push the note to the bottom */}
            <div className="flex flex-col min-h-[280px]">
              {/* Member tier centered */}
              <div className="text-center text-[20px] md:text-[22px] font-semibold mb-5">
                {data?.tier ?? 'Member'}
              </div>

              {/* Two-column rows */}
              <div className="grid grid-cols-2 items-center text-[16px] gap-y-1">
                <div className="py-2 text-[#3b4555]">Your points total</div>
                <div className="py-2 text-right font-semibold tnum">{points}</div>

                <div className="py-2 text-[#3b4555]">Your number of stays</div>
                <div className="py-2 text-right font-semibold">{stays}</div>
              </div>

              {/* Sentence */}
              <div className="mt-5 text-center text-[15px] text-[#3b4555]">
                You need <span className="font-semibold tnum">{toNext} points</span> more points to
                reach <span className="font-semibold">(next tier)</span>.
              </div>

              {/* NOTE pinned to bottom */}
              <div className="mt-auto pt-4 text-center text-[11px] italic text-[#C66A52]">
                Earn qualifying points to unlock more member benefits.
              </div>
            </div>
          </Card>

          {/* RECENT ACTIVITY */}
            <Card title="Recent Activity" headerClassName="text-[25px]">
              <div className="flex flex-col">
                {/* Title line (same scale as Member Tier: 20/22) */}
                <p className="text-[20px] md:text-[22px] font-semibold mb-3 text-[#1F2042]">
                  Most recent stay at <span className="font-semibold">{latestStay}</span>.
                </p>

                {/* Policy copy */}
                <p className="text-[12px] leading-5 text-slate-600 mb-4">
                  Points and Rewards may take up to 5 business days to be posted after your stay.
                  Please allow up to 6 weeks for points earned from promotions to be posted to your account.
                </p>

                {/* Table — 16px rows, vertical separators like the mock */}
                <div className="overflow-x-auto">
                  <table className="w-full text-[16px] border border-[#DCE6EE] rounded-md">
                    <thead>
                      <tr className="text-[#3b4555]">
                        <th className="text-left font-semibold py-2 px-3">DATE</th>
                        <th className="text-left font-semibold py-2 px-3 border-l border-[#DCE6EE]">DESCRIPTION</th>
                        <th className="text-right font-semibold py-2 px-3 border-l border-[#DCE6EE]">POINTS EARNED</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.length ? (
                        recent.map((t, i) => (
                          <tr key={i} className="border-t border-[#DCE6EE]">
                            <td className="py-2 px-3">{t.date || '—'}</td>
                            <td className="py-2 px-3 border-l border-[#DCE6EE]">{t.description}</td>
                            <td className="py-2 px-3 border-l border-[#DCE6EE] text-right font-semibold tnum">
                              {t.points.toLocaleString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-[#6b7480]">No recent activity.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer links — centered, orange + underline like mock */}
                  <div className="text-[11px] text-right mt-3 text-[#A25A3D]">
                      <button
                        type="button"
                        onClick={() => alert('This feature is available on our mobile app. Please download the Dream Trip Club app to continue.')}
                        className="underline hover:opacity-80 focus:outline-none appearance-none bg-transparent p-0 cursor-pointer"
                      >
                        All activity
                      </button>
                      <span className="mx-2">|</span>
                      <button
                        type="button"
                        onClick={() => alert('This feature is available on our mobile app. Please download the Dream Trip Club app to continue.')}
                        className="underline hover:opacity-80 focus:outline-none appearance-none bg-transparent p-0 cursor-pointer"
                      >
                        Missing points?
                      </button>
                      <span className="mx-2">|</span>
                      <button
                        type="button"
                        onClick={() => alert('This feature is available on our mobile app. Please download the Dream Trip Club app to continue.')}
                        className="underline hover:opacity-80 focus:outline-none appearance-none bg-transparent p-0 cursor-pointer"
                      >
                        Missing a stay?
                      </button>
                    </div>
              </div>
            </Card>

        </div>

        {/* Service tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <Tile
            icon={<FaBellConcierge />}
            title="Private Concierge"
            desc="Enjoy personalized service with our dedicated concierge team. From booking exclusive experiences to arranging seamless travel, we're here to cater to your every need."
            onClick={() => alert('Our concierge team will contact you shortly to arrange this service.')}
          />
          <Tile
            icon={<FaSuitcaseRolling />}
            title="Luxury Booking"
            desc="Curated hotels and experiences tailored for members."
            onClick={() => alert('This feature is available on our mobile app. Please download the Dream Trip Club app to continue.')}
          />
          <Tile
            icon={<FaGift />}
            title="VIP Gifting"
            desc="Surprise someone special with a member-exclusive gift."
            onClick={() => alert('This feature is available on our mobile app. Please download the Dream Trip Club app to continue.')}
          />
        </div>

        {/* Helper links */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-[13px] text-[#6b7480]">
          <div>❓ Questions? <a className="underline hover:text-[#1F2042]" href="#">Browse FAQs</a></div>
          <div>➕ Missing Points? <a className="underline hover:text-[#1F2042]" href="#">Let us know</a></div>
          <div>⭐ Good stay? <a className="underline hover:text-[#1F2042]" href="#">Write a Review</a></div>
          <div>📞 Need help? <a className="underline hover:text-[#1F2042]" href="#">Contact Us</a></div>
        </div>
      </main>
    </div>
  );
}