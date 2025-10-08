import { Suspense } from "react";
import BookingClient from "./BookingClient"; // NOTE: default import

export const dynamic = "force-dynamic"; // avoids prerender errors with search params

export default function BookingPage() {
  return (
    <Suspense fallback={<div />}>
      <BookingClient />
      
    </Suspense>
  );
}
