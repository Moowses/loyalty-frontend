'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

type Props = {
  title?: string;
  joinHref?: string;
  signInHref?: string;
};

const benefits = [
  { label: 'Earn Points', icon: '/earnpointswhite.png' },
  { label: 'Concierge Service', icon: '/conciergeicon.png' },
  { label: 'Free Wi-Fi', icon: '/wifi.png' },
  { label: 'Late Checkout', icon: '/latecheckout.png' },
  { label: 'Outdoor Adventures', icon: '/outdooradventure.png' },
  { label: 'Fine Dining', icon: '/finedining.png' },
  { label: 'Earn More Get More', icon: '/earnmoregetmore.png' },
];

export default function MemberBenefitsSection({
  title = "It's better to be a member.",
  joinHref = 'https://dreamtripclub.com',
  signInHref = '/login',
}: Props) {
  const [showLoginModal, setShowLoginModal] = useState(false);


  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      if (!ev?.data?.type) return;

      if (ev.data.type === 'auth-success' || ev.data.type === 'auth-logout') {
        setShowLoginModal(false);
        try {
          localStorage.setItem('dtc_auth_changed', String(Date.now()));
        } catch {}
        // small delay so the modal visually closes before reload
        setTimeout(() => window.location.reload(), 50);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  return (
    <section className="w-full bg-[#211F45] py-12">
      <div className="mx-auto max-w-6xl px-4">
        {/* Title */}
        <h2
          className="text-center text-white mb-10"
          style={{
            fontFamily: 'Avenir, system-ui, sans-serif',
            fontWeight: 800,
            fontSize: '48px',
          }}
        >
          {title}
        </h2>

        {/* Main layout */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[1.3fr_0.9fr_1.3fr] items-center">
          {/* LEFT IMAGE */}
          <div className="rounded-2xl overflow-hidden shadow-xl">
            <div className="relative w-full h-[300px]">
              <Image
                src="/leftboat.png"
                alt="Member left"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>

          {/* CENTER ICONS */}
          <div className="flex flex-col items-center justify-center text-white">
            <ul className="space-y-4">
              {benefits.map((b) => (
                <li key={b.label} className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <Image src={b.icon} alt={b.label} width={22} height={22} />
                  </div>
                  <span
                    style={{
                      fontFamily: 'Avenir, system-ui, sans-serif',
                      fontWeight: 500,
                      fontSize: '18px',
                    }}
                  >
                    {b.label}
                  </span>
                </li>
              ))}
            </ul>

            {/* Buttons */}
            <div className="mt-8 flex gap-4">
              {/* JOIN now opens the right-docked login drawer (same as SiteHeader) */}
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="flex items-center justify-center"
                style={{
                  width: 112,
                  height: 33.78,
                  borderRadius: 10,
                  background: '#fff',
                  color: '#211F45',
                  fontFamily: 'Avenir, system-ui, sans-serif',
                  fontSize: 18,
                  fontWeight: 500,
                }}
              >
                JOIN
              </button>

              {/* Keep SIGN IN link as-is */}
              <a
                href={signInHref}
                className="flex items-center justify-center border"
                style={{
                  width: 112,
                  height: 33.78,
                  borderRadius: 10,
                  background: '#211F45',
                  color: '#fff',
                  borderColor: '#fff',
                  fontFamily: 'Avenir, system-ui, sans-serif',
                  fontSize: 18,
                  fontWeight: 500,
                }}
              >
                SIGN IN
              </a>

           
              <span className="hidden" data-join-href={joinHref} />
            </div>
          </div>

          {/* RIGHT IMAGES */}
          <div className="space-y-4">
            {/* Top */}
            <div className="rounded-2xl overflow-hidden shadow-xl">
              <div className="relative w-full h-[150px]">
                <Image
                  src="/group1top.png"
                  alt="Right top"
                  fill
                  className="object-cover"
                />
              </div>
            </div>

            {/* Bottom */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl overflow-hidden shadow-xl">
                <div className="relative w-full h-[150px]">
                  <Image
                    src="/group1leftside.png"
                    alt="Right bottom left"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden shadow-xl">
                <div className="relative w-full h-[150px]">
                  <Image
                    src="/group1rideside.png"
                    alt="Right bottom right"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Login Modal  */}
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
    </section>
  );
}
