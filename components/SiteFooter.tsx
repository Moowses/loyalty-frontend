// components/SiteFooter.tsx
import Image from "next/image";
import Link from "next/link";

// start components
export default function SiteFooter() {
  return (
    <footer className="w-full bg-[#F5F5F7]">
      {/* Wider outer container, content stays centered */}
      <div className="mx-auto max-w-[1400px] px-4 pb-6 pt-6">
        {/* Footer Card */}
        <div className="w-full rounded-2xl border border-black/10 bg-white shadow-[0_10px_25px_-10px_rgba(0,0,0,0.25)]">
          {/* ⬇️ taller section so logos can be bigger */}
          <div className="px-6 py-12 md:px-12 md:py-14">
            {/* Heading */}
            <h2
              className="text-center text-[32px] font-black leading-[1.1] md:text-[48px]"
              style={{
                fontFamily:
                  "Avenir, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
                color: "#211F45",
              }}
            >
              Take us with you where ever you go.
            </h2>

            {/* Subtext */}
            <p
              className="mx-auto mt-5 max-w-5xl text-center text-[18px] leading-snug md:mt-6 md:text-[30px]"
              style={{
                fontFamily:
                  "Avenir, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
                fontWeight: 500,
                color: "#000000",
              }}
            >
              With Dream Trip Club Rewards, every journey brings you closer to exclusive
              experiences, unforgettable adventures, and rewards that make traveling even more
              extraordinary.
            </p>

            {/* Logos row */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-8 md:mt-10 md:gap-x-12 md:gap-y-10">
              {/* Property logos (6 items) */}
              <div className="relative h-[96px] w-[128px] md:h-[110px] md:w-[150px]">
                <Image
                  src="/dtclogobig.png"
                  alt="logo 1"
                  fill
                  className="object-contain opacity-90"
                />
              </div>

              <div className="relative h-[96px] w-[128px] md:h-[110px] md:w-[150px]">
                <Image src="/logo1.png" alt="logo 2" fill className="object-contain opacity-90" />
              </div>

              <div className="relative h-[96px] w-[128px] md:h-[110px] md:w-[150px]">
                <Image src="/logo2.png" alt="logo 3" fill className="object-contain opacity-90" />
              </div>

              <div className="relative h-[96px] w-[128px] md:h-[110px] md:w-[150px]">
                <Image src="/logo3.png" alt="logo 4" fill className="object-contain opacity-90" />
              </div>

              <div className="relative h-[96px] w-[128px] md:h-[110px] md:w-[150px]">
                <Image src="/logo4.png" alt="logo 5" fill className="object-contain opacity-90" />
              </div>

              <div className="relative h-[96px] w-[128px] md:h-[110px] md:w-[150px]">
                <Image src="/logo5.png" alt="logo 6" fill className="object-contain opacity-90" />
              </div>
            </div>

            {/* Store badges + QR */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-5 md:mt-10">
              <div className="relative h-[48px] w-[160px] md:h-[52px] md:w-[180px]">
                <a 
                  href="https://apps.apple.com/us/app/dream-trip-club/id6753647319"
                  target="_blank"                 
                >       
                <Image 
                  src="/appstorefooter.png"
                  alt="Download on the App Store"
                  fill
                  className="object-contain"
                />
                </a>
              </div>

              <div className="relative h-[48px] w-[160px] md:h-[52px] md:w-[180px]">
                 <a 
                  href="https://play.google.com/store/apps/details?id=ai.guestapp.dreamtripclub&hl=en"
                  target="_blank"                 
                > 
                <Image
                  src="/googleplayfooter.png"
                  alt="Get it on Google Play"
                  fill
                  className="object-contain"
                />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom row OUTSIDE the white card */}
        <div className="mt-4 flex flex-col items-center justify-between gap-3 px-1 text-sm text-black/80 md:flex-row">
          {/* Left */}
          <div className="w-full text-center md:w-1/3 md:text-left">
            © 2025 Cottage Dream Vacations. All rights reserved.
          </div>

          {/* Center 
          <div className="flex w-full items-center justify-center gap-3 md:w-1/3">
            <Link href="/" aria-label="Facebook" className="text-black/80 hover:text-black">
              <span className="inline-block h-5 w-5 rounded-full border border-black/25" />
            </Link>
            <Link href="/" aria-label="Instagram" className="text-black/80 hover:text-black">
              <span className="inline-block h-5 w-5 rounded-full border border-black/25" />
            </Link>
            <Link href="/" aria-label="YouTube" className="text-black/80 hover:text-black">
              <span className="inline-block h-5 w-5 rounded-full border border-black/25" />
            </Link>
            <Link href="/" aria-label="X" className="text-black/80 hover:text-black">
              <span className="inline-block h-5 w-5 rounded-full border border-black/25" />
            </Link>
            <Link href="/" aria-label="Pinterest" className="text-black/80 hover:text-black">
              <span className="inline-block h-5 w-5 rounded-full border border-black/25" />
            </Link>
          </div>
          */}

          {/* Right */}
          <div className="flex w-full items-center justify-center gap-2 md:w-1/3 md:justify-end">
            <Link href="/terms" className="underline underline-offset-4 hover:text-black">
              Terms and Conditions
            </Link>
            <span className="text-black/40">|</span>
            <Link href="/privacy" className="underline underline-offset-4 hover:text-black">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
// end of components
