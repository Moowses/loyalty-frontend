import type { Metadata } from "next";
import { Nunito_Sans, Manrope } from "next/font/google";
import localFont from "next/font/local";    
import "./globals.css";

const nunito = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-nunito",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-manrope",
  display: "swap",
});

const avenir = localFont({
  src: [
    { path: "/fonts/avenir/Avenir Light.ttf",   weight: "300", style: "normal" },
    { path: "/fonts/avenir/Avenir Book.ttf",    weight: "400", style: "normal" },
    { path: "/fonts/avenir/Avenir Regular.ttf", weight: "450", style: "normal" },
    { path: "/fonts/avenir/Avenir Heavy.ttf",   weight: "700", style: "normal" },
    { path: "/fonts/avenir/Avenir Black.ttf",   weight: "900", style: "normal" },
    { path: "/fonts/avenir/Avenir Black.ttf",   weight: "900", style: "normal" },
    
  ],
  variable: "--font-avenir",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Dream Trip Club Membership Access",
  description: "by Haybay Resort",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Put the font variables on <html>
    <html lang="en" className={`${avenir.variable} ${nunito.variable} ${manrope.variable}`}>
      {/* Use Tailwind's font-sans everywhere → it will resolve to Avenir */}
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}