"use client";

import React, { Suspense } from "react";
import ResetPassword from "./ResetPassword";

// disable static rendering — needed because we use useSearchParams
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <ResetPassword />
    </Suspense>
  );
}