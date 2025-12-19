'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import Link from 'next/link';


// start the components
const ImageCarousel1 = dynamic(() => import('@/components/ImageCarousel1'), { ssr: false });
const MemberBenefitsSection = dynamic(() => import('@/components/MemberBenefitsSection'), { ssr: false });
const ChatbotWidget = dynamic(() => import('@/components/ChatbotWidget'), {ssr: false,loading: () => null,});
// end of components

export default function OffersPage() {
  return (
    <main className="w-full">
      {/* SECTION 1: HERO */}
      <section className="relative w-full overflow-hidden">
        <Image src="/offerbackground-min.png" alt="" fill priority className="object-cover" />
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative w-full md:min-h-[1100px]">
          {/* iframe search overlay */}
          <div className="absolute inset-x-0 top-6 z-20">
            <div className="mx-auto w-full max-w-6xl px-4">
              <div className="w-full md:min-h-[520px]">
                <iframe
                  src="/search"
                  className="w-full"
                  height={720}
                  style={{ border: 'none', background: 'transparent' }}
                  allow="geolocation"
                  scrolling="no"
                  title="Dream Trip Club Search"
                />
              </div>
            </div>
          </div>

          {/* hero text */}
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4">
            <div className="pt-[510px] md:pt-[560px] pb-16 md:pb-24">
              {/* keep consistent spacing behavior */}
              <div className="max-w-4xl mt-12 md:mt-[220px]">
                <h1
                  className="text-white font-[900] tracking-[-0.02em]"
                  style={{
                    fontFamily: 'Avenir, Avenir Black, system-ui, -apple-system, Segoe UI, Roboto, Arial',
                    fontSize: 'clamp(48px, 6vw, 100px)',
                    lineHeight: 'clamp(56px, 6.5vw, 110px)',
                  }}
                >
                  Adventure awaits and so do your rewards.
                </h1>

                <p
                  className="mt-4 max-w-3xl text-white/90 font-[400]"
                  style={{
                    fontFamily: 'Avenir, system-ui, -apple-system, Segoe UI, Roboto, Arial',
                    fontSize: '18px',
                    lineHeight: '28px',
                  }}
                >
                  Your journey doesn&apos;t end at check-in; earn points, rise through tiers, and enjoy members-only perks
                  year-round.
                </p>
                <Link
                  href="/member"
                  className="inline-flex mt-6 rounded-full bg-orange-500 px-7 py-2.5 text-sm font-semibold text-white shadow hover:bg-orange-600"
                >
                  JOIN THE CLUB
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: OFFERS CAROUSEL */}
      <section className="w-full bg-white py-12 md:py-16">
        <div className="mx-auto w-full max-w-6xl px-4">
          {/* start the components */}
          <ImageCarousel1 />
          {/* end of components */}
        </div>
      </section>

      {/* MEMBER BENEFITS  */}
      <section className="w-full bg-[#1E1C49] py-12 md:py-16">
        <div className="mx-auto w-full max-w-6xl px-4">
          <h2 className="text-center text-2xl font-extrabold text-white md:text-3xl">
            It&apos;s better to be a member.
          </h2>

          <div className="mt-8">
            {/* start the components */}
            <MemberBenefitsSection />
            <ChatbotWidget/>
            {/* end of components */}
          </div>
        </div>
      </section>
    </main>
  );
}
