'use client';

import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// start the components
const MemberBenefitsSection = dynamic(() => import('@/components/MemberBenefitsSection'), { ssr: false });
const ChatbotWidget = dynamic(() => import('@/components/ChatbotWidget'), {ssr: false,loading: () => null,});
// end of components

export default function RewardsPage() {
  return (
    <main className="w-full">
      {/*SECTION 1: HERO */}
      <section className="relative w-full overflow-hidden">
        <Image src="/rewardsmainbackground.png" alt="" fill priority className="object-cover" />
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
            <div className="pt-[400px] md:pt-[560px] pb-16 md:pb-24">
              {/* push down text block (desktop) */}
              <div className="max-w-3xl mt-[220px]">
                <h1
                  className="text-white font-[900] tracking-[-0.02em]"
                  style={{
                    fontFamily: 'Avenir, Avenir Black, system-ui, -apple-system, Segoe UI, Roboto, Arial',
                    fontSize: 'clamp(44px, 5vw, 72px)',
                    lineHeight: 'clamp(54px, 6vw, 92px)',
                  }}
                >
                  Escape, earn, repeat.
                </h1>

                <p
                  className="mt-3 text-white/90 font-[400]"
                  style={{
                    fontFamily: 'Avenir, system-ui, -apple-system, Segoe UI, Roboto, Arial',
                    fontSize: '18px',
                  }}
                >
                  Every stay brings you closer to the extraordinary.
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

      {/*SECTION 2: MEMBER BENEFITS (light) */}
      <section className="w-full bg-white py-12 md:py-16">
        <div className="mx-auto w-full max-w-6xl px-4">
          <h2
            className="text-center font-[900]"
            style={{
              fontFamily: 'Avenir, Avenir Black, system-ui, -apple-system, Segoe UI, Roboto, Arial',
              fontSize: '51px',
              lineHeight: '56px',
              color: '#211F45',
            }}
          >
            Member Benefits
          </h2>

          <p
            className="mx-auto mt-4 max-w-4xl text-center"
            style={{
              fontFamily: 'Avenir, system-ui, -apple-system, Segoe UI, Roboto, Arial',
              color: '#211F45',
              fontWeight: 400,
              fontSize: '16px',
            }}
          >
            Join the Dream Trip Club and unlock exclusive offers and bonus rewards.
            Dream Trip Club Rewards is designed to enhance your experience at our resorts and thank you for your continued
            loyalty. As you stay with us, you&apos;ll earn points, unlock special privileges, and enjoy exclusive benefits that
            make each visit even more memorable
          </p>

          {/* checklist (2 columns) */}
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
            {[
              'Earn points for every dollar spent at our resorts or cottages',
              'Enjoy member-exclusive rates on all bookings',
              'Advance through tiers to unlock additional benefits',
              'Redeem points for free nights, room upgrades, and resort experiences',
            ].map((t) => (
              <div key={t} className="flex items-start gap-3">
                {/* plain check like Figma */}
                <span className="mt-[2px] text-black text-lg leading-none">✓</span>
                <p
                  style={{
                    fontFamily: 'Avenir, system-ui, -apple-system, Segoe UI, Roboto, Arial',
                    color: '#211F45',
                    fontWeight: 400,
                    fontSize: '15px',
                    lineHeight: '22px',
                  }}
                >
                  {t}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: EARNING POINTS
           */}
      <section className="w-full py-12 md:py-16" style={{ backgroundColor: '#93AFB9' }}>
        <div className="mx-auto w-full max-w-6xl px-4">
          <h2
            className="text-center font-[900] text-white"
            style={{
              fontFamily: 'Avenir, Avenir Black, system-ui, -apple-system, Segoe UI, Roboto, Arial',
              fontSize: '52px',
              lineHeight: '58px',
            }}
          >
            Earning Points
          </h2>

          <p
            className="mt-3 text-center text-white"
            style={{
              fontFamily: 'Avenir, Avenir Black, system-ui, -apple-system, Segoe UI, Roboto, Arial',
              fontWeight: 900,
              fontSize: '22px',
              lineHeight: '28px',
            }}
          >
            Our point system is simple and rewarding:
          </p>

          <div className="mt-8 overflow-hidden rounded-2xl bg-white/20 p-4 ring-1 ring-white/30 backdrop-blur">
            <Image
              src="/memberpointchart.png"
              alt="Member point chart"
              width={1600}
              height={700}
              className="h-auto w-full object-contain"
            />
          </div>
        </div>
      </section>

      {/* SECTION 3: SPECIAL MEMBER EXPERIENCES*/}
      <section className="w-full bg-white py-12 md:py-16">
        <div className="mx-auto w-full max-w-6xl px-4">
          <h2
            className="text-center font-[900]"
            style={{
              fontFamily: 'Avenir, Avenir Black, system-ui, -apple-system, Segoe UI, Roboto, Arial',
              fontSize: '52px',
              lineHeight: '58px',
              color: '#93AFB9',
            }}
          >
            Special <span style={{ color: '#F37021' }}>Member</span> Experiences
          </h2>

          <p
            className="mt-3 text-center"
            style={{
              fontFamily: 'Avenir, Avenir Black, system-ui, -apple-system, Segoe UI, Roboto, Arial',
              fontWeight: 900,
              fontSize: '22px',
              lineHeight: '28px',
              color: '#000000',
            }}
          >
            Beyond traditional benefits, members gain access to additional exclusive rewards.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-6">
            <ExperienceCard
              iconSrc="/membersonlylogo.png"
              title="Member-Only Events"
              body="Seasonal tastings, sunset cruises, musical events and local tours available exclusively to members"
              imageSrc="/microphone.png"
              imageSide="right"
            />
            <ExperienceCard
              iconSrc="/earlybookingwindowlogo.png"
              title="Early Booking Windows"
              body="First access to book prime weekends and holiday periods before the open to the general public"
              imageSrc="/earlybookingwindow.png"
              imageSide="left"
            />
            <ExperienceCard
              iconSrc="/anniversarylogob.png"
              title="Anniversary Bonus"
              body="Receive 5000 bonus points each year on your membership anniversary and a delightful surprise on your birthday"
              imageSrc="/anniversarybunos.png"
              imageSide="right"
            />
          </div>
        </div>
      </section>

      {/* SECTION 4: */}
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

function ExperienceCard({
  title,
  body,
  imageSrc,
  iconSrc,
  imageSide,
}: {
  title: string;
  body: string;
  imageSrc: string;
  iconSrc: string;
  imageSide: 'left' | 'right';
}) {
  const isLeft = imageSide === 'left';

  return (
    <div className="overflow-hidden rounded-2xl" style={{ backgroundColor: '#F2F6F7' }}>
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Image */}
        <div className={`${isLeft ? 'order-1' : 'order-2'} relative min-h-[220px] md:min-h-[240px]`}>
          <Image src={imageSrc} alt={title} fill className="object-cover" />
        </div>

        {/* Text */}
        <div className={`${isLeft ? 'order-2' : 'order-1'} p-7 md:p-10`}>
          {/* icon + title row */}
          <div className="flex items-center gap-4">
            <div className="relative h-10 w-10 shrink-0">
              <Image src={iconSrc} alt="" fill className="object-contain" />
            </div>

            <h3
              style={{
                fontFamily: 'Avenir, Avenir Black, system-ui, -apple-system, Segoe UI, Roboto, Arial',
                fontWeight: 900,
                fontSize: '33px',
                lineHeight: '38px',
                color: '#93AFB9',
              }}
            >
              {title}
            </h3>
          </div>

          <p
            className="mt-4"
            style={{
              fontFamily: 'Avenir, system-ui, -apple-system, Segoe UI, Roboto, Arial',
              fontWeight: 400,
              fontSize: '17px',
              lineHeight: '24px',
              color: '#000000',
            }}
          >
            {body}
          </p>
        </div>
      </div>
    </div>
  );
}
