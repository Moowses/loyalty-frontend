'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';

// start the components
const MemberBenefitsSection = dynamic(() => import('@/components/MemberBenefitsSection'), { ssr: false });
// end of components

export default function HelpPage() {
  return (
    <main className="w-full">
      {/* SECTION 1: HERO + SUPPORT CARD */}
      <section className="relative w-full overflow-hidden">
        <Image src="/helppagebg-min.png" alt="" fill priority className="object-cover" />
        <div className="absolute inset-0 bg-black/25" />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-14 md:py-20">
          {/* Headline */}
          <h1
            className="text-white font-[900] tracking-[-0.02em]"
            style={{
              fontFamily: 'Avenir, Avenir Black, system-ui, -apple-system, Segoe UI, Roboto, Arial',
              fontSize: 'clamp(44px, 6vw, 86px)',
              lineHeight: 'clamp(52px, 6.5vw, 92px)',
            }}
          >
            Need Assistance?
            <br />
            We&apos;re here for you.
          </h1>

          {/* Support Card */}
          <div className="mt-10 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/10">
            <div className="grid grid-cols-1 gap-10 p-8 md:grid-cols-2 md:p-12">
              {/* Left */}
              <div>
                <h2
                  className="font-[900]"
                  style={{
                    fontFamily: 'Avenir, Avenir Black, system-ui, -apple-system, Segoe UI, Roboto, Arial',
                    fontSize: '26px',
                    lineHeight: '32px',
                    color: '#211F45',
                  }}
                >
                  Account &amp; Technical Support
                </h2>

                <ul className="mt-5 space-y-3 text-sm leading-6 text-[#211F45]">
                  <li className="flex gap-3">
                    <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#211F45]" />
                    <span>
                      Trouble logging in or checking your points balance? Reset your password here.
                    </span>
                  </li>

                  <li className="flex gap-3">
                    <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#211F45]" />
                    <span>
                      Missing points from a purchase? Email us with your receipt and membership ID.
                    </span>
                  </li>

                  <li className="flex gap-3">
                    <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#211F45]" />
                    <span>
                      Trouble redeeming a reward? Contact Support and include the reward code or screenshot.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Right */}
              <div>
                <h2
                  className="font-[900]"
                  style={{
                    fontFamily: 'Avenir, Avenir Black, system-ui, -apple-system, Segoe UI, Roboto, Arial',
                    fontSize: '26px',
                    lineHeight: '32px',
                    color: '#211F45',
                  }}
                >
                  Contact Us
                </h2>

                <ul className="mt-5 space-y-3 text-sm leading-6 text-[#211F45]">
                  <li className="flex gap-3">
                    <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#211F45]" />
                    <span>Email: contact@dreamtripclub.com</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#211F45]" />
                    <span>Phone: 1-905-444-8880 (Mon–Fri, 9AM–5PM EST)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#211F45]" />
                    <span>Live Chat: Click the chat icon at the bottom right</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/*  SECTION 2: Member Benefits Component*/}
      <section className="w-full bg-[#1E1C49] py-12 md:py-16">
        <div className="mx-auto w-full max-w-6xl px-4">

          <div className="mt-8">
            {/* start the components */}
            <MemberBenefitsSection />
            {/* end of components */}
          </div>
        </div>
      </section>
    </main>
  );
}
