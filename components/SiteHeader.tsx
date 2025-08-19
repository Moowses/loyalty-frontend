// components/SiteHeader.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(true);
  const brand = '#211F45';

  // Check login state (cookie on .dreamtripclub.com)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('http://localhost:5000/api/auth/me', { credentials: 'include' });
        const j = await res.json().catch(() => ({}));
        if (alive) setLoggedIn(Boolean(j?.loggedIn));
      } catch {
        if (alive) setLoggedIn(false);
      } finally {
        if (alive) setChecking(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  async function handleLogout() {
    try {
      await fetch('http://localhost:5000/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {}
    // Ensure UI reflects new state across the app
    window.location.href = '/';
  }

  return (
    <header className="w-full border-b border-gray-200 bg-white">
      {/* Desktop layout: 3 columns (logo | centered nav | actions) */}
      <div className="mx-auto max-w-[1280px] px-4 md:px-6 py-3 grid grid-cols-[auto_1fr_auto] items-center gap-4">
        {/* Logo / Brand */}
        <Link href="https://dreamtripclub.com" className="flex items-center gap-3 shrink-0">
          <Image src="/dreamtripclubicon.png" alt="Dream Trip Club" width={200} height={44} priority />
        </Link>

        {/* Centered icon nav (desktop only) */}
        <nav className="hidden lg:flex items-end justify-center gap-8">
          <Link href="https://dreamtripclub.com" className="flex flex-col items-center gap-1 group">
            <Image src="/Navreservation.png" alt="Home" width={28} height={28} />
            <span className="text-[10px] font-semibold tracking-[0.08em] uppercase group-hover:underline" style={{ color: brand }}>
              RESERVE
            </span>
          </Link>
          <Link href="https://dreamtripclub.com/rewards/" className="flex flex-col items-center gap-1 group">
            <Image src="/Navrewards.png" alt="Reserve" width={28} height={28} />
            <span className="text-[10px] font-semibold tracking-[0.08em] uppercase group-hover:underline" style={{ color: brand }}>
             REWARDS
            </span>
          </Link>
          <Link href="https://dreamtripclub.com/offer/" className="flex flex-col items-center gap-1 group">
            <Image src="/Navoffer.png" alt="Rewards" width={28} height={28} />
            <span className="text-[10px] font-semibold tracking-[0.08em] uppercase group-hover:underline" style={{ color: brand }}>
              OFFERS
            </span>
          </Link>
          <Link href="https://member.dreamtripclub.com/dashboard" className="flex flex-col items-center gap-1 group">
            <Image src="/Navaccount.png" alt="Offers" width={28} height={28} />
            <span className="text-[10px] font-semibold tracking-[0.08em] uppercase group-hover:underline" style={{ color: brand }}>
              ACCOUNT
            </span>
          </Link>
          <Link
            href={loggedIn ? 'https://member.dreamtripclub.com/dashboard' : '/signin'}
            className="flex flex-col items-center gap-1 group"
          >
            <Image src="/navhelp.png" alt="Account" width={28} height={28} />
            <span className="text-[10px] font-semibold tracking-[0.08em] uppercase group-hover:underline" style={{ color: brand }}>
              HELP
            </span>
          </Link>
        </nav>

        {/* Right actions (desktop) */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/help" className="text-[12px] font-semibold inline-flex items-center gap-2" style={{ color: brand }}>
            HELP
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border" style={{ borderColor: brand, color: brand }}>
              ?
            </span>
          </Link>

          {/* While checking, avoid button flicker */}
          {checking ? (
            <div className="px-4 py-2 rounded-[12px] text-sm font-semibold border opacity-50" style={{ color: brand, borderColor: brand }}>
              …
            </div>
          ) : loggedIn ? (
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-[12px] text-sm font-semibold text-white shadow-sm hover:opacity-90"
              style={{ backgroundColor: brand }}
            >
              LOG OUT
            </button>
          ) : (
            <>
              <Link
                href="/join"
                className="px-4 py-2 rounded-[12px] text-sm font-semibold border hover:bg-[#211F45]/5"
                style={{ color: brand, borderColor: brand }}
              >
                JOIN
              </Link>
              <Link
                href="/signin"
                className="px-4 py-2 rounded-[12px] text-sm font-semibold text-white shadow-sm hover:opacity-90"
                style={{ backgroundColor: brand }}
              >
                SIGN IN
              </Link>
            </>
          )}
        </div>

        {/* Mobile quick actions */}
        <div className="md:hidden justify-self-end flex items-center gap-2">
          {checking ? (
            <span className="px-3 py-1.5 rounded-[12px] text-xs font-semibold border opacity-50" style={{ color: brand, borderColor: brand }}>
              …
            </span>
          ) : loggedIn ? (
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-[12px] text-xs font-semibold border"
              style={{ color: brand, borderColor: brand }}
            >
              Log out
            </button>
          ) : (
            <Link
              href="/signin"
              className="px-3 py-1.5 rounded-[12px] text-xs font-semibold text-white"
              style={{ backgroundColor: brand }}
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
              <path d="M3 6h18M3 12h18M3 18h18" stroke={brand} strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown panel */}
      <div id="mobile-nav" className={`${open ? 'block' : 'hidden'} md:hidden border-t border-gray-200 bg-white`}>
        <div className="px-4 py-4 space-y-5">
          {/* Icon grid */}
          <div className="grid grid-cols-5 gap-3 text-center" style={{ color: brand }}>
            <Link href="https://dreamtripclub.com" className="flex flex-col items-center gap-1">
              <Image src="/Navhome.png" alt="Home" width={24} height={24} />
              <span className="text-[10px] font-semibold tracking-[0.08em] uppercase">Home</span>
            </Link>
            <Link href="https://dreamtripclub.com" className="flex flex-col items-center gap-1">
              <Image src="/Navreservation.png" alt="Reserve" width={24} height={24} />
              <span className="text-[10px] font-semibold tracking-[0.08em] uppercase">Reserve</span>
            </Link>
            <Link href="https://member.dreamtripclub.com/search/results" className="flex flex-col items-center gap-1">
              <Image src="/Navrewards.png" alt="Rewards" width={24} height={24} />
              <span className="text-[10px] font-semibold tracking-[0.08em] uppercase">Rewards</span>
            </Link>
            <Link href="https://dreamtripclub.com/help" className="flex flex-col items-center gap-1">
              <Image src="/Navoffer.png" alt="Offers" width={24} height={24} />
              <span className="text-[10px] font-semibold tracking-[0.08em] uppercase">Offers</span>
            </Link>
            <Link href={loggedIn ? 'https://member.dreamtripclub.com/dashboard' : '/signin'} className="flex flex-col items-center gap-1">
              <Image src="/Navaccount.png" alt="Account" width={24} height={24} />
              <span className="text-[10px] font-semibold tracking-[0.08em] uppercase">Account</span>
            </Link>
          </div>

          {/* Help + Auth buttons */}
          <div className="flex items-center justify-between">
            <Link href="/help" className="text-[12px] font-semibold inline-flex items-center gap-2" style={{ color: brand }}>
              HELP
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border" style={{ borderColor: brand, color: brand }}>
                ?
              </span>
            </Link>
            <div className="flex items-center gap-2">
              {checking ? (
                <span className="px-4 py-2 rounded-[12px] text-sm font-semibold border opacity-50" style={{ color: brand, borderColor: brand }}>
                  …
                </span>
              ) : loggedIn ? (
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-[12px] text-sm font-semibold border"
                  style={{ color: brand, borderColor: brand }}
                >
                  LOG OUT
                </button>
              ) : (
                <>
                  <Link href="/join" className="px-4 py-2 rounded-[12px] text-sm font-semibold border" style={{ color: brand, borderColor: brand }}>
                    JOIN
                  </Link>
                  <Link href="/signin" className="px-4 py-2 rounded-[12px] text-sm font-semibold text-white" style={{ backgroundColor: brand }}>
                    SIGN IN
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
