// app/confirm/page.tsx  (SERVER component)
import { Suspense } from 'react';
import ConfirmClient from './ConfirmClient';

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl p-6 text-sm text-gray-600">
          Loading confirmation…
        </div>
      }
    >
      <ConfirmClient />
    </Suspense>
  );
}
