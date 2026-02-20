"use client";

import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

export default function ImageCarousel({ compact = false }: { compact?: boolean }) {
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

  const heightClass = compact
    ? "h-[96px] sm:h-[120px] md:h-[140px] lg:h-[160px]"
    : "h-[240px] sm:h-[300px] md:h-[340px] lg:h-[400px]";

  return (
    <section className="mt-8">
      <div className="relative">
        <Swiper
          modules={[Autoplay, Navigation]}
          navigation={{
            nextEl: ".custom-next",
            prevEl: ".custom-prev",
          }}
          autoplay={{ 
            delay: 2200,
            disableOnInteraction: false,
            pauseOnMouseEnter: false,
            waitForTransition: false,
          }}
          loop={true}
          loopedSlides={slides.length}
          watchOverflow={false}
          centeredSlides={false}
          spaceBetween={10}
          slidesPerView={2}
          speed={700}
          breakpoints={{
            0: { slidesPerView: 2, spaceBetween: 10 },
            480: { slidesPerView: 3, spaceBetween: 12 },
            640: { slidesPerView: 3, spaceBetween: 16 },
            768: { slidesPerView: 2.2, spaceBetween: 24 },
            1024: { slidesPerView: 2.8, spaceBetween: 30 },
            1280: { slidesPerView: 3.2, spaceBetween: 30 },
          }}
          className="rounded-2xl"
        >
          {slides.map((s, i) => (
            <SwiperSlide key={i}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-2xl overflow-hidden bg-transparent"
              >
                <div className={`relative w-full ${heightClass}`}>
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

        {/* Custom Navigation Buttons */}
        <button className="custom-prev absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white/80 hover:bg-white text-gray-800 rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110">
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button className="custom-next absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white/80 hover:bg-white text-gray-800 rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110">
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </section>
  );
}
