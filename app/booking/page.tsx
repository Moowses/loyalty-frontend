import { Suspense } from "react";
import BookingClient from "./BookingClient"; // NOTE: default import

export const dynamic = "force-dynamic"; // avoids prerender errors with search params

export default function BookingPage() {
  return (
    <Suspense fallback={<div />}>
      <BookingClient />
      <script id="chatbotkit-widget" src="https://static.chatbotkit.com/integrations/widget/v2.js" data-widget="cmfofmmqn84umyredb9q4j46d"></script>
    </Suspense>
  );
}
