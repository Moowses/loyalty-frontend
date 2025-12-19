import Image from 'next/image';

export default function AppCenterPage() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      {/* Background */}
      <Image
        src="/appcenter-bg.png"
        alt=""
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/40" />
    

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
          {/* iOS */}
          <a
            href="https://apps.apple.com/us/app/dream-trip-club/id6753647319"
            className="transition-transform hover:scale-[1.02] active:scale-[0.99]"
            aria-label="Download on the App Store"
          >
            <Image
              src="/applestoreblack-min.png"
              alt="Download on the App Store"
              width={260}
              height={80}
              className="h-auto w-[220px] sm:w-[260px]"
              priority
            />
          </a>

          {/* Android */}
          <a
            href="https://play.google.com/store/apps/details?id=ai.guestapp.dreamtripclub&hl=en"
            className="transition-transform hover:scale-[1.02] active:scale-[0.99]"
            aria-label="Get it on Google Play"
          >
            <Image
              src="/googleplay-black-min.png"
              alt="Get it on Google Play"
              width={260}
              height={80}
              className="h-auto w-[220px] sm:w-[260px]"
              priority
            />
          </a>
        </div>
      </div>
    </main>
  );
}
