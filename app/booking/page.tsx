// app/booking/page.tsx  (SERVER component)
import { Suspense } from 'react';
import BookingClient from './BookingClient';

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl p-6 text-sm text-gray-600">
          Loading booking details…
        </div>
      }
    >
      <BookingClient />
    </Suspense>
  );
}
