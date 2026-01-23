'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import ChatbotWidget, { type ChatbotMember } from "./ChatbotWidget";
const BRAND = '#211F45';

// Define API base
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

interface AuthResponse {
  loggedIn: boolean;
  user?: {
    id: string;
    email: string;
    // token if needed.
  };
}

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [member, setMember] = useState<ChatbotMember | null>(null);

 const pathname = usePathname();
  const currentPath = pathname || '';

  const isInsideMemberApp =
    currentPath.startsWith('/dashboard') || currentPath.startsWith('/account');
  const accountHref = loggedIn
    ? isInsideMemberApp
      ? '/account/settings'
      : '/dashboard'
    : '/dashboard';

  const checkAuth = useCallback(async () => {
  setChecking(true);

  try {
    // 1) Check auth + get cached identity
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) {
      setLoggedIn(false);
      setMember(null);
      return;
    }

    const data = await res.json();
    const isLogged = Boolean(data?.loggedIn);
    setLoggedIn(isLogged);

    if (!isLogged) {
      setMember(null);
      return;
    }

    const m = data?.member;

    // 2) If /auth/me already has membershipNo (future-proof)
    if (m?.membershipNo && m?.email) {
      setMember({
        membershipNo: String(m.membershipNo),
        name:
          `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() ||
          String(m.email),
        email: String(m.email),
      });
      return;
    }

    // 3) CURRENT FLOW: /auth/me gives email only → fetch dashboard
    if (m?.email) {
      const dashRes = await fetch(`${API_BASE}/api/user/dashboard`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: m.email }),
      });

      if (!dashRes.ok) {
        throw new Error("Failed to fetch dashboard");
      }

      const dashData = await dashRes.json();
      const d = dashData?.dashboard;

      if (!d?.membershipNo || !d?.email) {
        throw new Error("Dashboard missing identity");
      }

      setMember({
        membershipNo: String(d.membershipNo),
        name: String(d.name || d.email),
        email: String(d.email),
        tier: d.tier ?? undefined,
        points: d.totalPoints ?? undefined,
      });
      return;
    }

    // fallback
    setMember(null);
  } catch (err) {
    console.warn("[SiteHeader] checkAuth failed:", err);
    setLoggedIn(false);
    setMember(null);
  } finally {
    setChecking(false);
  }
}, []);



  useEffect(() => {
    checkAuth();

    // Re check when tab becomes visible
    const onVis = () => {
      if (document.visibilityState === 'visible') checkAuth();
    };
    document.addEventListener('visibilitychange', onVis);

    // Cross tab auth change broadcast
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'dtc_auth_changed') checkAuth();
    };
    window.addEventListener('storage', onStorage);

    // Periodic check for token expiry (every 5 minutes)
    const interval = setInterval(checkAuth, 5 * 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('storage', onStorage);
      clearInterval(interval);
    };
  }, [checkAuth]);

  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      if (!ev?.data?.type) return;

      if (ev.data.type === 'auth-success' || ev.data.type === 'auth-logout') {
        setShowLoginModal(false);

        try {
          localStorage.setItem('dtc_auth_changed', String(Date.now()));
        } catch {}

        checkAuth();

        // Hotel page only: continue to booking after successful login
        if (ev.data.type === 'auth-success') {
          const path = window.location.pathname || '';
          if (path.startsWith('/hotel/')) {
            const redirect = sessionStorage.getItem('dtc_post_login_redirect');
            if (redirect) {
              sessionStorage.removeItem('dtc_post_login_redirect');
              window.location.assign(redirect);
            }
          }
        }
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [checkAuth]);

  // login modal open requests
useEffect(() => {
  const handler = () => {
    if (loggedIn) return; // ← key line
    setShowLoginModal(true);
  };

  window.addEventListener('dtc:open-login' as any, handler as any);
  return () =>
    window.removeEventListener('dtc:open-login' as any, handler as any);
}, [loggedIn]);

async function logout() {
  
  setChecking(true);
  setLoggedIn(false);
  setOpen(false);
  setMember(null);

 
  try {
    localStorage.setItem('dtc_auth_changed', String(Date.now()));
  } catch {}

 
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);

  try {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
   
    console.warn('Logout request failed/timeout:', e);
  } finally {
    clearTimeout(t);

   
    try {
      sessionStorage.setItem('justLoggedOut', 'true');
      ['email', 'apiToken', 'dashboardData', 'membershipno'].forEach(k => {
        try { localStorage.removeItem(k); } catch {}
      });
    } catch {}

    
    window.location.assign('/');
  }
}



  return (
    <header className="w-full border-b border-gray-200 bg-white ">
      <div className="mx-auto max-w-[1160px] px-6 md:px-8 py-2 md:py-3 lg:py-4 grid grid-cols-[auto_1fr_auto] items-center gap-6 md:h-[95px]">
        {/* Brand */}
        <Link href="https://dreamtripclub.com" className="flex items-center gap-3 shrink-0">
          <Image
            src="/dreamtripclubicon.png"
            alt="Dream Trip Club"
            width={200}
            height={44}
            priority
          />
        </Link>

        {/* Desktop Nav (lg and up) */}
        <nav className="hidden lg:flex items-end justify-center gap-2">
          {/* Reserve */}
          <Link
            href="//"
            className="group flex flex-col items-center gap-2 rounded-lg px-3 py-2 transition-colors"
          >
            <Image
              src="/Navreservation.png"
              alt="Reserve"
              width={24}
              height={24}
              className="transition-transform duration-200 group-hover:-translate-y-1"
            />
            <span className="text-[9px] font-bold tracking-[0.01em] uppercase text-[#211F45] group-hover:text-[#EB6923]">
              Reserve
            </span>
          </Link>

          {/* Rewards */}
          <Link
            href="/rewards"
            className="group flex flex-col items-center gap-2 rounded-lg px-3 py-2 transition-colors"
          >
            <Image
              src="/Navrewards.png"
              alt="Rewards"
              width={24}
              height={24}
              className="transition-transform duration-200 group-hover:-translate-y-1"
            />
            <span className="text-[9px] font-bold tracking-[0.01em] uppercase text-[#211F45] group-hover:text-[#EB6923]">
              Rewards
            </span>
          </Link>

          {/* Offers */}
          <Link
            href="/offers"
            className="group flex flex-col items-center gap-2 rounded-lg px-3 py-2 transition-colors"
          >
            <Image
              src="/Navoffer.png"
              alt="Offers"
              width={24}
              height={24}
              className="transition-transform duration-200 group-hover:-translate-y-1"
            />
            <span className="text-[9px] font-bold tracking-[0.01em] uppercase text-[#211F45] group-hover:text-[#EB6923]">
              Offers
            </span>
          </Link>

         {/* Account */}
            <Link
              href={accountHref}
              onClick={() => setOpen(false)}
              className="group flex flex-col items-center gap-2 rounded-lg px-3 py-2 transition-colors"
            >
              <Image
                src="/Navaccount.png"
                alt="Account"
                width={24}
                height={24}
                className="transition-transform duration-200 group-hover:-translate-y-1"
              />
              <span className="text-[9px] font-bold tracking-[0.01em] uppercase text-[#211F45] group-hover:text-[#EB6923]">
                Account
              </span>
            </Link>
        </nav>

        {/* Desktop CTAs (lg and up) */}
        <div className="hidden lg:flex items-center gap-5">
          <Link
            href="/help"
            className="text-[10px] font-bold inline-flex items-center gap-2 transition-colors duration-200 text-[#211F45] hover:text-[#EB6923]"
          >
            HELP
            <Image
              src="/navhelpsvg.svg"
              alt="Help"
              width={21}
              height={21}
              className="transition-transform duration-200 group-hover:-translate-y-1"
            />
          </Link>

          {checking ? (
            <div
              className="px-4 py-2.5 rounded-[12px] text-sm font-semibold border opacity-50"
              style={{ color: BRAND, borderColor: BRAND }}
            >
              …
            </div>
          ) : loggedIn ? (
            <button
              onClick={logout}
              className="px-4 py-2.5 rounded-[12px] text-sm font-semibold text-white shadow-sm transition-transform duration-200 hover:opacity-90 hover:-translate-y-1"
              style={{ backgroundColor: BRAND }}
            >
              LOG OUT
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-7 py-2.5 rounded-[12px] text-[10px] font-semibold text-white shadow-sm transition-transform duration-200 hover:opacity-90 hover:-translate-y-1"
                style={{ backgroundColor: BRAND }}
              >
                JOIN OR SIGN IN
              </button>
            </>
          )}
        </div>

        {/* Mobile / Tablet Actions (show below lg) */}
        <div className="lg:hidden justify-self-end flex items-center gap-2">
          {/* Hamburger / Close (left) */}
          <button
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen(v => !v)}
            className={`inline-flex items-center justify-center p-2 rounded-md border border-gray-300 transition-colors ${
              open ? 'bg-gray-100' : 'bg-white'
            }`}
          >
            {open ? (
              // X icon
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke={BRAND}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              // Hamburger
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 6h18M3 12h18M3 18h18"
                  stroke={BRAND}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>

          {/* Auth button (right of hamburger) */}
          {checking ? (
            <span
              className="px-3 py-1.5 rounded-[12px] text-xs font-semibold border opacity-50"
              style={{ color: BRAND, borderColor: BRAND }}
            >
              …
            </span>
          ) : loggedIn ? (
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-[12px] text-sm font-semibold text-white shadow-sm transition-colors hover:opacity-90"
              style={{ backgroundColor: BRAND }}
            >
              LOG OUT
            </button>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-3 py-1.5 rounded-[12px] text-[8.5px] font-semibold text-white shadow-sm transition-colors hover:opacity-90"
              style={{ backgroundColor: BRAND }}
            >
              Join / Sign in
            </button>
          )}
        </div>
      </div>

      {open && (
        <div
          id="mobile-nav"
          className="absolute top-[65px] left-0 w-full bg-white shadow-lg z-50 flex flex-col"
        >
          {/* Active item (Reserve) */}
          <Link
            href="https://dreamtripclub.com"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-3 px-6 py-4 w-full text-[#211F45] hover:bg-gray-700 hover:text-white transition-colors"
          >
            <Image src="/Navreservation.png" alt="Reserve" width={15} height={15} />
            <span className="font-semibold">Reserve</span>
          </Link>

          {/* Rewards */}
          <Link
            href="/rewards"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-3 px-6 py-4 w-full text-[#211F45] hover:bg-gray-700 hover:text-white transition-colors"
          >
            <Image src="/Navrewards.png" alt="Rewards" width={15} height={15} />
            <span className="font-semibold">Rewards</span>
          </Link>

          {/* Offers */}
          <Link
            href="/offer"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-3 px-6 py-4 w-full text-[#211F45] hover:bg-gray-700 hover:text-white transition-colors"
          >
            <Image src="/Navoffer.png" alt="Offers" width={15} height={15} />
            <span className="font-semibold">Offers</span>
          </Link>

          {/* Account */}
          <Link
            href={accountHref}
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-3 px-6 py-4 w-full text-[#211F45] hover:bg-gray-700 hover:text-white transition-colors"
          >
            <Image src="/Navaccount.png" alt="Account" width={15} height={15} />
            <span className="font-semibold">Account</span>
          </Link>

          {/* Help */}
          <Link
            href="/help"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-3 px-6 py-4 w-full text-[#211F45] hover:bg-gray-700 hover:text-white transition-colors"
          >
            <Image src="/navhelpsvg.svg" alt="Help" width={15} height={15} />
            <span className="font-semibold">Help</span>
          </Link>
        </div>
      )}

      {/* Login Modal (right-docked, no blank header) */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[9999] flex justify-end">
          {/* Backdrop (click to close) */}
          <button
            aria-label="Close login"
            onClick={() => setShowLoginModal(false)}
            className="absolute inset-0 w-full h-full bg-black/50"
          />

          {/* Right panel */}
          <div
            className="
        relative
        w-full max-w-[530px]
        h-[92vh] my-0 mr-0
        bg-white shadow-2xl rounded-l-2xl overflow-hidden
      "
          >
            {/* Close button */}
            <button
              onClick={() => {
                setShowLoginModal(false);
                setTimeout(() => window.location.reload(), 50);
              }}
              className="absolute top-4 right-3 text-2xl text-gray-500 hover:text-gray-700 z-10"
              aria-label="Close"
            >
              ×
            </button>

            {/* Iframe */}
            <iframe
              src="/login"
              className="w-full h-full border-0"
              loading="lazy"
              sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
            />
          </div>
        </div>
      )}
       <ChatbotWidget member={member} />

       
    </header>
  );
}
