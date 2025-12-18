'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import MemberBenefitsSection from '@/components/MemberBenefitsSection';

// start the components
const ImageCarousel1 = dynamic(() => import('@/components/ImageCarousel1'), { ssr: false });
const ChatbotWidget = dynamic(() => import('@/components/ChatbotWidget'), {ssr: false,loading: () => null,});

// end of components

export default function HomePage() {
  return (
    <main className="w-full">
      
      {/* HERO */}
      <section className="relative w-full overflow-hidden">
        {/* Background */}
        <Image src="/background1.jpeg" alt="" fill priority className="object-cover" />

        {/* overlay tint */}
        <div className="absolute inset-0 bg-black/20" />

        {/* seach bar*/}
        <div className="relative w-full md:min-h-[1700px]">
          {/* SEARCH IFRAME (overlay top) */}
        
          <div className="absolute inset-x-0 top-6 z-20 pointer-events-none">
            <div className="mx-auto w-full max-w-6xl px-4">
              <div className="w-full md:min-h-[1000px]">
                <iframe
                  src="/search"
                  className="w-full pointer-events-auto"
                  height={720}
                  style={{ border: 'none', background: 'transparent' }}
                  allow="geolocation"
                  scrolling="no"
                  title="Dream Trip Club Search"
                />
              </div>
            </div>
          </div>

          {/* HEADLINE AREA */}
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4">
            {/* push down below iframe bar */}
            <div className="pt-[300px] md:pt-[700px]">
              <div className="max-w-3xl">
                <h1
                  className="text-white font-[900] tracking-[-0.02em]"
                  style={{
                    fontFamily:
                      'Avenir, Avenir Black, system-ui, -apple-system, Segoe UI, Roboto, Arial',
                    fontSize: 'clamp(44px, 4.5vw, 72px)',
                    lineHeight: 'clamp(54px, 6vw, 96px)',
                  }}
                >
                  What will your next
                  <br />
                  adventure be?
                </h1>

                <p
                  className="mt-4 max-w-xl text-white/90 font-[400]"
                  style={{
                    fontFamily: 'Avenir, system-ui, -apple-system, Segoe UI, Roboto, Arial',
                    fontSize: '16px',
                  }}
                >
                  From tranquil lakeside retreats to spa-inspired getaways, every booking brings you closer to your next
                  reward.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    href="/rewards"
                    className="inline-flex rounded-full bg-orange-500 px-7 py-2.5 text-sm font-semibold text-white shadow hover:bg-orange-600"
                  >
                    Learn More
                  </Link>

                  <Link
                    href="/properties"
                    className="inline-flex rounded-full bg-[#1E1C49] px-7 py-2.5 text-sm font-semibold text-white shadow hover:opacity-90"
                  >
                    View all Properties
                  </Link>
                </div>

                {/*  MOBILE */}
                <div className="h-14 md:hidden" />
              </div>

              {/* CAROUSEL (MOBILE) */}
              <div className="mt-0 md:hidden">
                <div className="rounded-2xl bg-white/70 backdrop-blur-md shadow-2xl ring-1 ring-black/10">
                  <div className="px-5 pb-8 pt-8">
                    <h2
                      className="text-center text-[#1E1C49] font-[900]"
                      style={{
                        fontFamily:
                          'Avenir, Avenir Black, system-ui, -apple-system, Segoe UI, Roboto, Arial',
                        fontSize: '32px',
                        lineHeight: '38px',
                      }}
                    >
                      Your next trip starts here
                    </h2>

                    {/* Image Carousel*/}
                    <div className="mt-4">
                      {/* start the components */}
                      <ImageCarousel1 />
                       <ChatbotWidget />
                      
                      {/* end of components */}
                    </div>
                  </div>
                </div>
              </div>

              {/* Spacer on mobile */}
              <div className="h-10 md:hidden" />
            </div>
          </div>

          {/* Desktop overlay carousel */}
          <div className="absolute inset-x-0 bottom-14 z-10 hidden md:block">
            <div className="mx-auto w-full max-w-6xl px-4">
              <div className="rounded-2xl bg-white/70 backdrop-blur-md shadow-2xl ring-1 ring-black/10">
                <div className="px-10 pb-12 pt-10">
                  <h2
                    className="text-center text-[#1E1C49] font-[900]"
                    style={{
                      fontFamily:
                        'Avenir, Avenir Black, system-ui, -apple-system, Segoe UI, Roboto, Arial',
                      fontSize: '50px',
                      lineHeight: '56px',
                    }}
                  >
                    Your next trip starts here
                  </h2>

                  {/* Image Carousel */}
                  <div className="mt-6">
                    {/* start the components */}
                    <ImageCarousel1 />
                    {/* end the components */}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* breathing room under desktop overlay */}
          <div className="hidden md:block h-40" />
        </div>
      </section>

      {/* Rewards image section */}
      <section className="mx-auto w-full max-w-6xl px-4 py-10 md:py-14">
        <a
          href="/rewards"
          className="block rounded-2xl bg-white shadow-xl ring-1 ring-black/5"
          aria-label="Go to Rewards"
        >
          {/* Container controls height, image is NOT cropped */}
          <div className="relative w-full overflow-hidden rounded-2xl bg-[#f6f6f6]">
            <Image
              src="/rewardyourself.png"
              alt="Reward Yourself, Over and Over and Over"
              width={1600}
              height={420}
              className="w-full h-auto object-contain"
              priority={false}
            />
          </div>
        </a>
      </section>

      {/* Member benefits section */}
      <section className="w-full bg-[#1E1C49] py-12 md:py-16">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="mt-8">
            {/* start the components */}
            <MemberBenefitsSection />
            {/* end of components */}
          </div>
        </div>
      </section>

      {/* Footer stays in layout */}
    </main>
  );
}
