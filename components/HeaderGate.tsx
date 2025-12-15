// components/HeaderGate.tsx
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import SiteHeader from './SiteHeader';

// Show the header on these routes
const SHOW_ON: RegExp[] = [
  /^\/$/,                     // home
  /^\/results/,   
  /^\/hotel/,              // results
  /^\/booking(?!\/confirm)/,  // booking but NOT /booking/confirm
  ///^\/confirm/,               // confirmation page
  /^\/dashboard/,
  /^\/account/,                // confirmation page
  /^\/rewards/,               // rewards page
  /^\/offer/,              
];

export default function HeaderGate() {
  const [mounted, setMounted] = useState(false);
  const path = usePathname() || '/';

  useEffect(() => setMounted(true), []);

  // Avoid any server/client mismatch by only rendering after mount
  if (!mounted) return null;

  const show = SHOW_ON.some(re => re.test(path));
  return show ? <SiteHeader /> : null;
}
