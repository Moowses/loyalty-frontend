// components/SiteFooter.tsx
import Image from "next/image";
import Link from "next/link";

function FooterLogoTile({
  src,
  alt,
  variant = "default",
}: {
  src: string;
  alt: string;
  variant?: "default" | "wide";
}) {
  return (
    <div className="flex h-[104px] w-[136px] items-center justify-center md:h-[132px] md:w-[168px]">
      <div
        className={`relative h-[86px] w-full md:h-[108px] ${
          variant === "wide"
            ? "max-w-[132px] md:max-w-[162px]"
            : "max-w-[126px] md:max-w-[152px]"
        }`}
      >
        <Image src={src} alt={alt} fill className="object-contain" />
      </div>
    </div>
  );
}

// start components
export default function SiteFooter() {
  return (
    <footer className="w-full bg-white">
      {/* Wider outer container, content stays centered */}
      <div className="mx-auto w-full max-w-6xl px-4 pb-6 pt-6">
        {/* Footer Card */}
        <div className="w-full rounded-2xl border border-black/10 bg-white shadow-[0_22px_50px_-24px_rgba(0,0,0,0.18)]">
          <div className="px-5 py-10 md:px-10 md:py-11">
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
            <div className="mx-auto mt-10 flex w-full max-w-[1080px] flex-wrap items-center justify-center gap-0 md:mt-10 md:flex-nowrap md:justify-center md:gap-0">
              <Link href="https://dreamtripclub.com/" target="_blank" rel="noopener noreferrer">
                <div className="cursor-pointer">
                  <FooterLogoTile src="/dtclogobig.png" alt="logo 1" variant="wide" />
                </div>
              </Link>

              <Link href="https://www.haybayresort.com/" target="_blank" rel="noopener noreferrer">
                <div className="cursor-pointer">
                  <FooterLogoTile src="/logo1.png" alt="logo 2" />
                </div>
              </Link>

              <Link href="#" target="_blank" rel="noopener noreferrer">
                <div className="cursor-pointer">
                  <FooterLogoTile src="/logo2.png" alt="logo 3" />
                </div>
              </Link>

              <Link href="#" target="_blank" rel="noopener noreferrer">
                <div className="cursor-pointer">
                  <FooterLogoTile src="/logo3.png" alt="logo 4" />
                </div>
              </Link>

              <Link href="#" target="_blank" rel="noopener noreferrer">
                <div className="cursor-pointer">
                  <FooterLogoTile src="/logo4.png" alt="logo 5" />
                </div>
              </Link>

              <Link
                href="https://cottagedreamvacations.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="cursor-pointer">
                  <FooterLogoTile src="/logo5.png" alt="logo 6" />
                </div>
              </Link>
            </div>

            {/* Store badges + QR */}
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3 md:mt-8 md:gap-4">
              <div className="relative h-[48px] w-[160px] md:h-[52px] md:w-[180px]">
                <a href="https://apps.apple.com/us/app/dream-trip-club/id6753647319" target="_blank">
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

              <div className="relative h-[62px] w-[62px] md:h-[72px] md:w-[72px]">
                <Image src="/qrcode.png" alt="QR code" fill className="object-contain" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom row OUTSIDE the white card */}
        <div className="mt-6 flex flex-col items-center justify-between gap-3 px-1 text-sm text-black/80 md:flex-row">
          {/* Left */}
          <div className="w-full text-center md:w-1/3 md:text-left">
            &copy; 2026 Cottage Dream Vacations. All rights reserved.
          </div>

          {/* Center */}
          <div className="flex w-full items-center justify-center gap-3 md:w-1/3">
            <Link
              href="https://www.facebook.com/CDVdreamtripclub/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="text-black/80 transition hover:text-black"
            >
              <Image src="/fb.png" alt="Facebook" width={20} height={20} className="h-5 w-5 object-contain" />
            </Link>
            <Link
              href="https://www.instagram.com/dreamtripclubrewards/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-black/80 transition hover:text-black"
            >
              <Image
                src="/instagram.png"
                alt="Instagram"
                width={20}
                height={20}
                className="h-5 w-5 object-contain"
              />
            </Link>
          </div>

          {/* Right */}
          <div className="flex w-full items-center justify-center gap-2 md:w-1/3 md:justify-end md:whitespace-nowrap">
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
