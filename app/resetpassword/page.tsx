
import { Suspense } from 'react';
import ResetPassword from "./ResetPassword";

// Prevent static prerender so useSearchParams works safely
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 text-center">
          <div className="animate-pulse text-gray-600">Loading...</div>
        </div>
      </div>
    }>
      <ResetPassword />
    </Suspense>
  );
}