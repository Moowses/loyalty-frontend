// app/login/MiniDashboard.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface DashboardData {
  name: string;
  membershipNo: string;
  tier: string;
  totalPoints: number;
  stays?: number;
  pointsToNextTier?: number;
  transactions?: any[];
}

/* ========= Normalizer (same as main dashboard) ========= */
function normalizeDashboard(json: any): DashboardData {
  const rec = json?.dashboard ?? (Array.isArray(json?.data) ? json.data[0] : json) ?? {};

  const firstname = rec.firstname ?? rec.firstName ?? rec.name?.split?.(' ')?.[0] ?? '';
  const lastname = rec.lastname ?? rec.lastName ?? '';
  const name = (firstname || lastname) ? `${firstname} ${lastname}`.trim() : (rec.name ?? 'Member');

  const membershipNo = rec.membershipno ?? rec.membershipNo ?? rec.membership ?? rec.membershipNumber ?? '—';
  const tier = rec.membershiptier ?? rec.tier ?? rec.membershipTier ?? 'Member';
  const totalPoints = Number(rec.pointsbalance ?? rec.pointsBalance ?? rec.totalPoints ?? 0);
  const stays = Number(rec.nu_stays ?? rec.nu_stay_count_rup ?? rec.stays ?? 0);
  const pointsToNextTier = Number(rec.pointsToNextTier ?? 10000);

  const rawTx: any[] = rec.transactions ?? rec.Micro_Rewards ?? rec.history ?? [];
  const transactions: any[] = rawTx.map((t: any) => ({
    date: t.date ?? t.txn_date ?? t.CREATED_DATE ?? '',
    description: t.description ?? t.META_REDEMPTIONITEMNAME ?? t.type ?? t.CREATED_BY ?? 'Activity',
    points: Number(t.points ?? t.META_POINTSAMOUNT ?? t.amount ?? 0),
  }));

  return { name, membershipNo, tier, totalPoints, transactions, stays, pointsToNextTier };
}

/* ========= UI Components (simplified from main dashboard) ========= */
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
    <div className="rounded-xl border border-[#DCE6EE] bg-white shadow-card">
      <div
        className={`rounded-t-xl bg-[#93AFB9] text-white text-center px-4 py-3 uppercase font-semibold tracking-wide ${headerClassName}`}
      >
        {title}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function MiniDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '');
      const email = localStorage.getItem('email') || '';
      const token = localStorage.getItem('apiToken') || '';

      if (base && email) {
        try {
          // Try to fetch fresh data from API
          const dres = await fetch(`${base}/api/user/dashboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email }),
          });
          
          if (dres.ok) {
            const dj = await dres.json();
            setData(normalizeDashboard(dj));
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error('API fetch failed:', error);
        }
      }

      // Fallback to localStorage data
      try {
        const ls = localStorage.getItem('dashboardData');
        if (ls) {
          setData(normalizeDashboard(JSON.parse(ls)));
        } else {
          // Create basic data from email
          const email = localStorage.getItem('email') || '';
          const name = email.split('@')[0] || 'Member';
          setData({
            name,
            membershipNo: '—',
            tier: 'Member',
            totalPoints: 0,
            stays: 0,
            pointsToNextTier: 10000,
            transactions: []
          });
        }
      } catch (error) {
        console.error('Local storage parse failed:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('email');
    localStorage.removeItem('apiToken');
    localStorage.removeItem('dashboardData');
    document.cookie = 'email=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'apiToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 text-center">
        <div className="animate-pulse text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  const points = (data?.totalPoints ?? 0).toLocaleString();
  const stays = data?.stays ?? 0;
  const toNext = (data?.pointsToNextTier ?? 10000).toLocaleString();

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Greeting banner (simplified from main dashboard) */}
      <div className="w-full bg-[#93AFB9] text-white rounded-md px-4 py-4 mb-6 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full border-2 border-white/70 grid place-items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <div className="text-[20px] font-semibold leading-tight">
            Hello {data?.name?.split(' ')[0] ?? data?.name ?? 'Member'}
          </div>
          <div className="text-[14px] text-white/95">
            Member Number: <span className="font-medium">{data?.membershipNo ?? '—'}</span>
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[12px] uppercase font-semibold tracking-wide text-white/90">YOUR POINTS</div>
          <div className="text-[16px] font-semibold">{points}</div>
        </div>
      </div>

      {/* Current Status Card */}
      <Card title="Current Status">
        <div className="flex flex-col min-h-[180px]">
          <div className="text-center text-[18px] font-bold mb-4">
            {data?.tier ?? 'Member'}
          </div>

          <div className="grid grid-cols-2 items-center text-[14px] gap-y-2 mb-4">
            <div className="text-[#3b4555]">Your points total</div>
            <div className="text-right font-semibold">{points}</div>

            <div className="text-[#3b4555]">Your number of stays</div>
            <div className="text-right font-semibold">{stays}</div>
          </div>

          <div className="mt-auto pt-4 text-center text-[12px] text-[#3b4555]">
            You need <span className="font-semibold">{toNext} points</span> more to reach the next tier.
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 my-6">
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <div className="text-blue-600 font-bold text-lg">{points}</div>
          <div className="text-blue-600 text-xs">Points</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg text-center">
          <div className="text-green-600 font-bold text-lg">{data?.tier || 'Member'}</div>
          <div className="text-green-600 text-xs">Tier</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => alert('Full dashboard features available in the main app')}
          className="bg-[#211F45] text-white py-2 px-3 rounded-lg text-sm hover:opacity-90 transition"
        >
          View Full Dashboard
        </button>
        <button
          onClick={() => alert('Download our mobile app for full features')}
          className="bg-[#93AFB9] text-white py-2 px-3 rounded-lg text-sm hover:opacity-90 transition"
        >
          Download App
        </button>
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="w-full bg-gray-100 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-200 focus:outline-none transition duration-150"
      >
        Sign Out
      </button>
    </div>
  );
}