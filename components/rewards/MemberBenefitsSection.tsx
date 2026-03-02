'use client';

const benefits = [
  'Earn points for every dollar spent at any one of our resorts or cottages',
  'Enjoy member-exclusive rates on all bookings',
  'Advance through tiers to unlock additional benefits',
  'Redeem points for free nights, room upgrades, and resort experiences',
];

export default function MemberBenefitsSection() {
  return (
    <section className="w-full bg-white py-16">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <h2 className="text-center text-4xl font-extrabold leading-tight text-[#211F45] md:text-5xl">
          Member Benefits
        </h2>

        <p className="mx-auto mt-4 max-w-4xl text-center text-xl font-semibold text-[#211F45] md:text-2xl">
          Join the Dream Trip Club and unlock exclusive offers and bonus rewards.
        </p>

        <p className="mx-auto mt-4 max-w-3xl text-center text-sm leading-6 text-[#211F45]/90 md:text-base">
          Dream Trip Club Rewards is designed to enhance your experience at our resorts and thank you for your continued
          loyalty. As you stay with us, you&apos;ll earn points, unlock special privileges, and enjoy exclusive benefits
          that make each visit even more memorable.
        </p>

        <ul className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-x-12 gap-y-6 md:grid-cols-2">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-3 text-[#211F45]">
              <span aria-hidden="true" className="mt-[2px] text-base leading-6">
                &#10003;
              </span>
              <span className="text-base leading-6">{benefit}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
