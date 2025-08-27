// app/confirm/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import ConfirmClient from './ConfirmClient';

export default function Page() {
  const searchParams = useSearchParams();
  
  return <ConfirmClient />;
}

// Remove the layout.tsx suspense if you have it, or keep it simple