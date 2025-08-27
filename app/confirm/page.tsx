import { Suspense } from "react";
import ConfirmClient from "./ConfirmClient";

export const dynamic = "force-dynamic"; // or: export const revalidate = 0;

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div />}>
      <ConfirmClient />
    </Suspense>
  );
}
