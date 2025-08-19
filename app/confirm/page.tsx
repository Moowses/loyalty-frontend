// app/confirm/page.tsx
import { Suspense } from 'react';
import ConfirmClient from './ConfirmClient';

// optional, avoids static optimization surprises
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Loading confirmation…</div>}>
      <ConfirmClient />
    </Suspense>
  );
}
