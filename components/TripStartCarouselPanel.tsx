"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

type TripStartCarouselPanelProps = {
  variant: "mobile" | "desktop";
};

export default function TripStartCarouselPanel({ variant }: TripStartCarouselPanelProps) {
  const isMobile = variant === "mobile";
  const navPrevClass = isMobile ? "trip-panel-prev-mobile" : "trip-panel-prev-desktop";
  const navNextClass = isMobile ? "trip-panel-next-mobile" : "trip-panel-next-desktop";
  const outerRef = useRef<HTMLDivElement | null>(null);
  const carouselRowRef = useRef<HTMLDivElement | null>(null);
  const [arrowTop, setArrowTop] = useState<number | null>(null);

  useEffect(() => {
    const outerEl = outerRef.current;
    const rowEl = carouselRowRef.current;
    if (!outerEl || !rowEl) return;

    const updateArrowPosition = () => {
      const outerRect = outerEl.getBoundingClientRect();
      const rowRect = rowEl.getBoundingClientRect();
      setArrowTop(rowRect.top - outerRect.top + rowRect.height / 2);
    };

    updateArrowPosition();

    const observer = new ResizeObserver(updateArrowPosition);
    observer.observe(outerEl);
    observer.observe(rowEl);
    window.addEventListener("resize", updateArrowPosition);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateArrowPosition);
    };
  }, [variant]);

  const slides = [
    {
      src: "/Tiny-Home-Experience-2.png",
      href: "https://dreamtripclub.com/hotel/302995?hotelId=302995&hotelNo=SITHE&roomTypeId=302995&&name=Tiny+Home+Experience",
    },
    {
      src: "/Nordic-Spa-Getaway-2.png",
      href: "https://dreamtripclub.com/hotel/276302?hotelId=276302&hotelNo=GSL&roomTypeId=276302&&name=Getaway+on+Stoney+Lake",
    },
    {
      src: "/Your-Dream-Getaway-2.png",
      href: "https://dreamtripclub.com/hotel/276301?hotelId=276301&hotelNo=YDG&roomTypeId=425356&&name=Your+dream+getaway",
    },
    {
      src: "/Escape-From-Life-2.png",
      href: "https://dreamtripclub.com/hotel/276303?hotelId=276303&hotelNo=EFL&roomTypeId=276303&&name=escape+from+life",
    },
  ];

  return (
    <div ref={outerRef} className="relative overflow-visible">
      <div className="rounded-[25px] bg-white/75">
        <div className={isMobile ? "px-5 pb-6 pt-6" : "px-10 pb-8 pt-8"}>
          <h2
            className="text-center font-[900] text-[#1E1C49]"
            style={{
              fontFamily:
                "Avenir, Avenir Black, system-ui, -apple-system, Segoe UI, Roboto, Arial",
              fontSize: isMobile ? "32px" : "50px",
              lineHeight: isMobile ? "38px" : "56px",
            }}
          >
            Your next trip starts here
          </h2>

          <div className={isMobile ? "mt-1" : "mt-2"}>
            <div ref={carouselRowRef} className="relative">
              <Swiper
                modules={[Autoplay, Navigation]}
                navigation={{
                  nextEl: `.${navNextClass}`,
                  prevEl: `.${navPrevClass}`,
                }}
                autoplay={{
                  delay: 3500,
                  disableOnInteraction: false,
                }}
                loop={true}
                watchOverflow={false}
                centeredSlides={false}
                grabCursor={true}
                spaceBetween={24}
                slidesPerView={1.1}
                speed={500}
                breakpoints={{
                  640: { slidesPerView: 1.3, spaceBetween: 24 },
                  768: { slidesPerView: 2.2, spaceBetween: 24 },
                  1024: { slidesPerView: 3.2, spaceBetween: 20 },
                  1280: { slidesPerView: 3.5, spaceBetween: 24 },
                }}
                className="rounded-2xl"
              >
                {slides.map((s, i) => (
                  <SwiperSlide key={i}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-2xl bg-transparent"
                    >
                      <div className="relative h-[160px] w-full sm:h-[175px] md:h-[185px] lg:h-[200px]">
                        <Image
                          src={s.src}
                          alt=""
                          fill
                          className="object-contain"
                          sizes="(max-width:768px) 100vw, 33vw"
                          priority={i === 0}
                        />
                      </div>
                    </a>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </div>
      </div>
      </div>

      <button
        className={`${navPrevClass} custom-prev absolute top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#92AEB8] text-[#FFFFFF] shadow-lg transition-all duration-300 hover:scale-110 hover:bg-[#7f9ea8] left-1 md:left-0 md:h-12 md:w-12`}
        style={{ top: arrowTop ?? undefined }}
        aria-label="Previous slide"
      >
        <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        className={`${navNextClass} custom-next absolute top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#92AEB8] text-[#FFFFFF] shadow-lg transition-all duration-300 hover:scale-110 hover:bg-[#7f9ea8] right-1 md:right-0 md:h-12 md:w-12`}
        style={{ top: arrowTop ?? undefined }}
        aria-label="Next slide"
      >
        <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
