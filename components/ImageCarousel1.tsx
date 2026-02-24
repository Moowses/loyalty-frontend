"use client";

import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

export default function ImageCarousel1() {
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
    <section className="mt-1">
      <div className="relative">
       <Swiper
               modules={[Autoplay, Navigation]}
               navigation={{
                 nextEl: ".custom-next",
                 prevEl: ".custom-prev",
               }}
               autoplay={{ 
                 delay: 3500, 
                 disableOnInteraction: false 
               }}
               loop={true}
               centeredSlides={false}
               spaceBetween={24}
               slidesPerView={1.1}
               speed={500}
               breakpoints={{
                 640: { slidesPerView: 1.3, spaceBetween: 24 },
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
                     <div className="relative w-full h-[190px] sm:h-[240px] md:h-[270px] lg:h-[320px]">
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

        {/* Arrows */}
        <button
          className="custom-prev absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#92AEB8] text-white shadow-lg transition-all duration-300 hover:scale-110 hover:bg-[#7f9ea8] md:left-3 md:h-12 md:w-12"
          aria-label="Previous slide"
        >
          <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          className="custom-next absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#92AEB8] text-white shadow-lg transition-all duration-300 hover:scale-110 hover:bg-[#7f9ea8] md:right-3 md:h-12 md:w-12"
          aria-label="Next slide"
        >
          <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </section>
  );
}
