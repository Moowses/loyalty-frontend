import { Suspense } from "react";
import BookingClient from "./BookingClient"; 

export const dynamic = "force-dynamic"; 

export default function BookingPage() {
  return (
    <Suspense fallback={<div />}>
      <BookingClient />
      
    </Suspense>
  );
}
