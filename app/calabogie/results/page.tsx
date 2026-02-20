import { Suspense } from "react";
import CalabogieResultClient from "@/app/calabogieresult/CalabogieResultClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Loading results...</div>}>
      <CalabogieResultClient />
    </Suspense>
  );
}
