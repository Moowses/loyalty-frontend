// components/FooterGate.tsx
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import SiteFooter from './SiteFooter';

// Show the footer on these routes
const SHOW_ON: RegExp[] = [
  /^\/$/,                   // home
  /^\/review-request/,
  /^\/dashboard/,
  /^\/rewards/,
  /^\/offer/,
  /^\/help/,
  /^\/terms/, 
  /^\/privacy/,
  /^\/appcenter/, 
  /^\/properties/,  
];

export default function FooterGate() {
  const [mounted, setMounted] = useState(false);
  const path = usePathname() || '/';

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const show = SHOW_ON.some(re => re.test(path));
  return show ? <SiteFooter /> : null;
}
