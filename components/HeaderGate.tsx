// components/HeaderGate.tsx
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import SiteHeader from './SiteHeader';

// Show the header on these routes
const SHOW_ON: RegExp[] = [
  /^\/$/,                     // home
  /^\/results/,               // results
  /^\/booking(?!\/confirm)/,  // booking but NOT /booking/confirm
  ///^\/confirm/,               // confirmation page
  /^\/dashboard/,               // confirmation page
  // (optional) hide header on auth pages by NOT listing `/signin` or `/join`
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
