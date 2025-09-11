// app/login/MiniDashboard.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface DashboardData {
  name: string;
  firstName: string;
  lastName: string;
  primaryEmail: string;
  membershipNo: string;
  tier: string;
  totalPoints: number;
  stays?: number;
  pointsToNextTier?: number;
  transactions?: any[];
}
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

/* ========= Normalizer (updated to extract firstName, lastName, primaryEmail) ========= */
function normalizeDashboard(json: any): DashboardData {
  const rec = json?.dashboard ?? (Array.isArray(json?.data) ? json.data[0] : json) ?? {};

  const firstName = rec.firstname ?? rec.firstName ?? rec.name?.split?.(' ')?.[0] ?? '';
  const lastName = rec.lastname ?? rec.lastName ?? (rec.name ? rec.name.split(' ').slice(1).join(' ') : '') ??'';
  const name = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : (rec.name ?? 'Member');
  const primaryEmail = rec.primaryemail ?? rec.primaryEmail ?? rec.email ?? '';

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

  return { name, firstName, lastName, primaryEmail, membershipNo, tier, totalPoints, transactions, stays, pointsToNextTier };
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

      // helper: persist + emit
 const persist = (dash: DashboardData) => {
  try {
    // Set lightweight cookies for booking flow
    const opts = "Path=/; Domain=.dreamtripclub.com; Secure; SameSite=None";
    if (dash.firstName) document.cookie = `dtc_firstName=${encodeURIComponent(dash.firstName)}; ${opts}`;
    if (dash.lastName)  document.cookie = `dtc_lastName=${encodeURIComponent(dash.lastName)}; ${opts}`;
    if (dash.primaryEmail) document.cookie = `dtc_email=${encodeURIComponent(dash.primaryEmail)}; ${opts}`;
    if (dash.membershipNo) document.cookie = `dtc_membershipNo=${encodeURIComponent(dash.membershipNo)}; ${opts}`;

    // Optionally still keep dashboardData in localStorage for this iframe’s quick rendering
    localStorage.setItem('dashboardData', JSON.stringify(dash));
  } catch (err) {
    console.warn("Persist error:", err);
  }

  // Also broadcast to parent (WordPress) if needed
  window.parent?.postMessage(
    {
      type: 'member-data',
      membershipNo: dash.membershipNo,
      name: dash.name,
      firstName: dash.firstName,
      lastName: dash.lastName,
      primaryEmail: dash.primaryEmail,
      tier: dash.tier,
    },
    '*'
  );
};


      try {
        // 1) Fresh API (best)
        if (base && email) {
          const dres = await fetch(`${base}/api/user/dashboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email }),
          });

          if (dres.ok) {
            const dj = await dres.json();
            const dash = normalizeDashboard(dj);
            setData(dash);
            persist(dash);
            setLoading(false);
            return;
          }
        }

        // 2) Fallback: cached dashboard
        const ls = localStorage.getItem('dashboardData');
        if (ls) {
          const dash = normalizeDashboard(JSON.parse(ls));
          setData(dash);
          persist(dash); // refresh cache/emit for consistency
        } else {
          // 3) Last resort: skeleton using email + any cached membershipno
          const name = email.split('@')[0] || 'Member';
          const cachedMember = localStorage.getItem('membershipno') || '';
          const cachedFirstName = localStorage.getItem('firstname') || '';
          const cachedLastName = localStorage.getItem('lastname') || '';
          const cachedEmail = localStorage.getItem('primaryemail') || email;
          
          const dash: DashboardData = {
            name,
            firstName: cachedFirstName,
            lastName: cachedLastName,
            primaryEmail: cachedEmail,
            membershipNo: cachedMember || '—',
            tier: 'Member',
            totalPoints: 0,
            stays: 0,
            pointsToNextTier: 10000,
            transactions: [],
          };
          setData(dash);
          persist(dash);
        }
      } catch (error) {
        console.error('MiniDashboard hydrate error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
async function handleLogout() {
  try {
    await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Expire cookies manually (belt & suspenders; backend also does this)
    const expireOpts = "Path=/; Domain=.dreamtripclub.com; Max-Age=0; Secure; SameSite=None";
    document.cookie = `dtc_firstName=; ${expireOpts}`;
    document.cookie = `dtc_lastName=; ${expireOpts}`;
    document.cookie = `dtc_email=; ${expireOpts}`;
    document.cookie = `dtc_membershipNo=; ${expireOpts}`;

    // Clear localStorage cache if you want
    localStorage.removeItem('dashboardData');

    window.parent?.postMessage({ type: 'logout-complete' }, '*');
    window.location.reload();
  }
}


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
      <div className="w-full bg-[#93AFB9] text-white rounded-md px-4 py-4 mb-7 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full border-2 border-white/70 grid place-items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <div className="text-[20px] font-semibold leading-tight">
            Hello {data?.firstName ?? data?.name?.split(' ')[0] ?? data?.name ?? 'Member'}
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
  onClick={() => window.open("https://member.dreamtripclub.com/dashboard", "_blank")}
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