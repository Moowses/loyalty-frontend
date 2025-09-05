'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const BRAND = '#211F45';

// Define API base - adjust as needed
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

interface AuthResponse {
  loggedIn: boolean;
  user?: {
    id: string;
    email: string;
    // ... other properties
  };
}

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

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

    // Re-check when tab becomes visible
    const onVis = () => {
      if (document.visibilityState === 'visible') checkAuth();
    };
    document.addEventListener('visibilitychange', onVis);

    // Cross-tab auth change broadcast
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
    <header className="w-full border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-[1280px] px-4 md:px-6 py-3 grid grid-cols-[auto_1fr_auto] items-center gap-4">
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
        <nav className="hidden lg:flex items-end justify-center gap-8">
          <Link href="https://dreamtripclub.com" className="flex flex-col items-center gap-1 group">
            <Image src="/Navhome.png" alt="Home" width={28} height={28} />
            <span
              className="text-[10px] font-semibold tracking-[0.08em] uppercase group-hover:underline"
              style={{ color: BRAND }}
            >
              Home
            </span>
          </Link>

          <Link href="https://dreamtripclub.com" className="flex flex-col items-center gap-1 group">
            <Image src="/Navreservation.png" alt="Reserve" width={28} height={28} />
            <span
              className="text-[10px] font-semibold tracking-[0.08em] uppercase group-hover:underline"
              style={{ color: BRAND }}
            >
              Reserve
            </span>
          </Link>

          <Link
            href="https://member.dreamtripclub.com/search/results"
            className="flex flex-col items-center gap-1 group"
          >
            <Image src="/Navrewards.png" alt="Rewards" width={28} height={28} />
            <span
              className="text-[10px] font-semibold tracking-[0.08em] uppercase group-hover:underline"
              style={{ color: BRAND }}
            >
              Rewards
            </span>
          </Link>

          <Link href="https://dreamtripclub.com/help" className="flex flex-col items-center gap-1 group">
            <Image src="/Navoffer.png" alt="Offers" width={28} height={28} />
            <span
              className="text-[10px] font-semibold tracking-[0.08em] uppercase group-hover:underline"
              style={{ color: BRAND }}
            >
              Offers
            </span>
          </Link>

          <Link
            href={loggedIn ? 'https://member.dreamtripclub.com/dashboard' : '/#login'}
            className="flex flex-col items-center gap-1 group"
          >
            <Image src="/Navaccount.png" alt="Account" width={28} height={28} />
            <span
              className="text-[10px] font-semibold tracking-[0.08em] uppercase group-hover:underline"
              style={{ color: BRAND }}
            >
              Account
            </span>
          </Link>
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/help"
            className="text-[12px] font-semibold inline-flex items-center gap-2"
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
              <Link
                href="/#login"
                className="px-4 py-2 rounded-[12px] text-sm font-semibold border hover:bg-[#211F45]/5"
                style={{ color: BRAND, borderColor: BRAND }}
              >
                JOIN
              </Link>
              <Link
                href="/#login"
                className="px-4 py-2 rounded-[12px] text-sm font-semibold text-white shadow-sm hover:opacity-90"
                style={{ backgroundColor: BRAND }}
              >
                SIGN IN
              </Link>
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
            <Link
              href="/signin"
              className="px-3 py-1.5 rounded-[12px] text-xs font-semibold text-white"
              style={{ backgroundColor: BRAND }}
            >
              Join / Sign in
            </Link>
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

      {/* Mobile menu container (keep for future expansion) */}
      <div
        id="mobile-nav"
        className={`${open ? 'block' : 'hidden'} md:hidden border-t border-gray-200 bg-white`}
      />
    </header>
  );
}