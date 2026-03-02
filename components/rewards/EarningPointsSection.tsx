'use client';

import Image from 'next/image';

const earningRows = [
  ['Room stays', '7 points per $1 spent'],
  ['Dining at our restaurants', '1 points per $1 spent'],
  ['Spa services', '1 points per $1 spent'],
  ['Cottage rentals', '5 points per $1 spent'],
  ['General store purchases', '1 points per $1 spent'],
  ['Canadian Hot Tubs', '2.5 points per $1 spent'],
  ['Activities and excursions', '7 points per $1 spent'],
  ['Referral bonus', '1,000 points per referral'],
] as const;

export default function EarningPointsSection() {
  return (
    <section className="w-full bg-white py-16">
      <div className="mx-auto w-full max-w-7xl px-4">
        <div className="mx-auto mt-8 w-full rounded-[18px] bg-[#93AFB9] shadow-[4px_4px_8px_rgba(0,0,0,0.25)]">
          <div className="px-5 py-8 text-center sm:px-12 md:py-10 lg:px-10">
            <h2 className="text-4xl font-extrabold leading-tight text-white md:text-5xl">Earning Points</h2>
            <p className="mt-3 text-lg font-semibold text-white/90 md:text-2xl">
              Our point system is simple and rewarding:
            </p>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#D4D4D4] bg-[#F2F6F7]">
                  <th
                    scope="col"
                    className="px-2 py-3 text-center sm:px-4 md:px-6"
                    style={{
                      fontFamily: 'Avenir, Avenir Black, system-ui, -apple-system, Segoe UI, Roboto, Arial',
                      fontSize: 'clamp(14px, 3.8vw, 24px)',
                      fontStyle: 'normal',
                      fontWeight: 800,
                      lineHeight: '102.5%',
                      letterSpacing: '-0.72px',
                      color: '#93AFB9',
                    }}
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      <Image src="/Activity.svg" alt="" width={24} height={24} />
                      <span>Activity</span>
                    </span>
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-center sm:px-4 md:px-6"
                    style={{
                      fontFamily: 'Avenir, Avenir Black, system-ui, -apple-system, Segoe UI, Roboto, Arial',
                      fontSize: 'clamp(14px, 3.8vw, 24px)',
                      fontStyle: 'normal',
                      fontWeight: 800,
                      lineHeight: '102.5%',
                      letterSpacing: '-0.72px',
                      color: '#93AFB9',
                    }}
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      <Image src="/earnpointsss.svg" alt="" width={24} height={24} />
                      <span>Points Earned</span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {earningRows.map(([activity, points]) => (
                  <tr key={activity} className="border-b border-[#D4D4D4] last:border-b-0">
                    <td
                      className="px-2 py-3 text-center sm:px-4 md:px-6"
                      style={{
                        fontFamily: 'Avenir, system-ui, -apple-system, Segoe UI, Roboto, Arial',
                        fontSize: 'clamp(12px, 3.2vw, 22px)',
                        fontStyle: 'normal',
                        fontWeight: 500,
                        lineHeight: '22px',
                        letterSpacing: '-0.66px',
                        color: '#FFF',
                      }}
                    >
                      {activity}
                    </td>
                    <td
                      className="px-2 py-3 text-center sm:px-4 md:px-6"
                      style={{
                        fontFamily: 'Avenir, system-ui, -apple-system, Segoe UI, Roboto, Arial',
                        fontSize: 'clamp(12px, 3.2vw, 22px)',
                        fontStyle: 'normal',
                        fontWeight: 500,
                        lineHeight: '22px',
                        letterSpacing: '-0.66px',
                        color: '#FFF',
                      }}
                    >
                      {points}
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
