import { Suspense } from 'react';
import LoginClient from './LoginClient';

// Prevent static prerender so useSearchParams works safely
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  );
}
