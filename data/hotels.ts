// data/hotels.ts
export type HotelPoint = { label: string; lat: number; lng: number; slug?: string };

export const HOTEL_POINTS: HotelPoint[] = [
  // EXAMPLES — replace with your exact 7–8 hotels
  { label: "Your Dream Getaway, Albany PE", lat: 46.2570, lng: -63.4470, slug: "your-dream-getaway" },
  { label: "Nordic Spa Getaway on Stoney Lake", lat: 44.6087, lng: -78.1620, slug: "nordic-spa-stoney-lake" },
  { label: "Escape From Life, Albany PE", lat: 46.2650, lng: -63.4520, slug: "escape-from-life" },
  { label: "The Perfect Getaway, Albany PE", lat: 46.2625, lng: -63.4495, slug: "the-perfect-getaway" },
  { label: "Tiny Home Experience, Harcourt ON", lat: 45.2511, lng: -78.1942, slug: "tiny-home-experience" },
  // ...
];
