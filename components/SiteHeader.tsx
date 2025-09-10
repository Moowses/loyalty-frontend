'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

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


const checkAuth = useCallback(async () => {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
    if (!res.ok) return setLoggedIn(false);
    const data = await res.json();
    setLoggedIn(Boolean(data?.loggedIn));
  } catch {
    setLoggedIn(false);
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
      try { localStorage.setItem('dtc_auth_changed', String(Date.now())); } catch {}
      checkAuth();
      // small delay so the modal visually closes before reload
      setTimeout(() => window.location.reload(), 50);
    }
  };
  window.addEventListener('message', onMsg);
  return () => window.removeEventListener('message', onMsg);
}, [checkAuth]);



async function logout() {
  try {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear ALL client-side storage
    localStorage.removeItem('email');
    localStorage.removeItem('apiToken');
    localStorage.removeItem('dashboardData');
    localStorage.removeItem('dtc_auth_changed');
    localStorage.removeItem('membershipno');
    
    // Clear all cookies
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.split('=');
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });

    // Force a complete page reload to clear any cached state
    window.location.href = '/';
    window.location.reload(); // Force reload to clear everything
  }
}

  return (
    <header className="w-full border-b border-gray-200 bg-white ">
      <div className="mx-auto max-w-[1690px] px-6 md:px-8 py-2 md:py-3 lg:py-4 grid grid-cols-[auto_1fr_auto] items-center gap-4 md:h-[90px]">
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

       {/* Desktop Nav */}
<nav className="hidden lg:flex items-center items-end justify-center gap-10 ">
  {/* Reserve */}
  <Link href="https://dreamtripclub.com" className="flex flex-col items-center gap-2 group transition-transform duration-200">
    <Image
      src="/Navreservation.png"
      alt="Reserve"
      width={24}
      height={24}
      className="transition-transform duration-200 group-hover:-translate-y-1"
    />
    <span
      className="text-[9px] font-bold tracking-[0.01em] uppercase transition-colors duration-200 text-[#211F45] group-hover:text-[#EB6923]"
      >
      Reserve
    </span>
  </Link>

  {/* Rewards */}
  <Link href="https://dreamtripclub.com/rewards/" className="flex flex-col items-center gap-2 group transition-transform duration-200">
    <Image
      src="/Navrewards.png"
      alt="Rewards"
      width={24}
      height={24}
      className="transition-transform duration-200 group-hover:-translate-y-1"
    />
    <span
      className="text-[9px] font-bold tracking-[0.01em] uppercase transition-colors duration-200 text-[#211F45] group-hover:text-[#EB6923]"
      >
      Rewards
    </span>
  </Link>

  {/* Offers */}
  <Link href="https://dreamtripclub.com/offer/" className="flex flex-col items-center gap-2 group transition-transform duration-200">
    <Image
      src="/Navoffer.png"
      alt="Offers"
      width={24}
      height={24}
      className="transition-transform duration-200 group-hover:-translate-y-1"
    />
  <span
      className="text-[9px] font-bold tracking-[0.01em] uppercase transition-colors duration-200 text-[#211F45] group-hover:text-[#EB6923]"
      >
      Offers
    </span>
  </Link>

  {/* Account */}
  <Link
    href={loggedIn ? "https://member.dreamtripclub.com/dashboard" : "/#login"}
    className="flex flex-col items-center gap-2 group transition-transform duration-200"
  >
    <Image
      src="/Navaccount.png"
      alt="Account"
      width={24}
      height={24}
      className="transition-transform duration-200 group-hover:-translate-y-1"
    />
    <span
      className="text-[9px] font-bold tracking-[0.01em] uppercase transition-colors duration-200 text-[#211F45] group-hover:text-[#EB6923]"
      >
      Account
    </span>
  </Link>
</nav>


        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="https://dreamtripclub.com/help/"
            className="text-[10px] font-bold inline-flex items-center gap-2"
            style={{ color: BRAND }}
          >
            HELP
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border"
              style={{ borderColor: BRAND, color: BRAND }}
            >
              ?
            </span>
          </Link>

          {checking ? (
            <div
              className="px-4 py-2 rounded-[12px] text-sm font-semibold border opacity-50"
              style={{ color: BRAND, borderColor: BRAND }}
            >
              …
            </div>
          ) : loggedIn ? (
            <button
              onClick={logout}
              className="px-4 py-2 rounded-[12px] text-sm font-semibold text-white shadow-sm hover:opacity-90"
              style={{ backgroundColor: BRAND }}
            >
              LOG OUT
            </button>
          ) : (
            <>
            
               <button
              onClick={() => setShowLoginModal(true)}
              className="px-4 py-2 rounded-[12px] text-sm font-semibold text-white shadow-sm hover:opacity-90"
              style={{ backgroundColor: BRAND }}
            >
              JOIN OR SIGN IN
            </button>
            </>
          )}
        </div>

        {/* Mobile Actions */}
        <div className="md:hidden justify-self-end flex items-center gap-2">
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
              className="px-3 py-1.5 rounded-[12px] text-xs font-semibold border"
              style={{ color: BRAND, borderColor: BRAND }}
            >
              Log out
            </button>
          ) : (
        
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-3 py-1.5 rounded-[12px] text-sm font-semibold text-white shadow-sm hover:opacity-90"
              style={{ backgroundColor: BRAND }}
            >
               Join / Sign in
           
            </button>
          )}

          <button
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center justify-center p-2 rounded-md border border-gray-300"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M3 12h18M3 18h18" stroke={BRAND} strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

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
        src="https://member.dreamtripclub.com/login"
        className="w-full h-full border-0"
        loading="lazy"
        sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
      />
    </div>
  </div>
)}
    </header>

    
    
  );
}