src/
 ├─ app/
 │   ├─ api/                → (Backend proxy handlers if needed)
 │   ├─ booking/            → Booking / reservations view
 │   ├─ confirm/            → Post-booking confirmation screen
 │   ├─ dashboard/          → Loyalty dashboard (points, tier, profile)
 │   ├─ fonts/              → Custom webfonts (Poppins, Inter, etc.)
 │   ├─ hotel/              → Hotel listings / details page (future expansion)
 │   ├─ login/              → Auth form (login/signup toggle)
 │   ├─ resetpassword/      → Password recovery
 │   ├─ results/            → Search results / redirection (temp pages)
 │   ├─ search/             → Search UI for hotels or redemptions
 │   ├─ testpay/            → NMI/Stripe test payment page
 │   ├─ layout.tsx          → Global layout wrapper (nav, footer)
 │   ├─ globals.css         → Tailwind + base styles
 │   ├─ page.tsx            → Landing page (hero background + login form)
 │   ├─ favicon.ico         → Site icon
 │   └─ page-Copy.tsx       → Earlier iteration of landing hero
 │
 ├─ components/             → Shared React UI parts (Cards, Buttons, Tables)
 ├─ data/                   → Static JSON (mock data or constants)
 ├─ fonts/                  → Local font imports
 ├─ hooks/                  → Custom hooks (auth, fetch, useSession)
 ├─ public/                 → Static assets (hero.png, icons)
 ├─ .env.local              → Contains NEXT_PUBLIC_API_BASE_URL etc.
 ├─ tailwind.config.ts      → Tailwind design tokens
 ├─ next.config.js          → API rewrites + env exposure
 ├─ tsconfig.json           → TypeScript config
 └─ package.json            → Dependencies + scripts
