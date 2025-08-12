'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Agreements = { marketing: boolean; dataSharing: boolean; terms: boolean };
type FormState = {
  firstname: string;
  lastname: string;
  email: string;
  mobilenumber: string;
  password: string;
  country: string;
  postalcode: string;
};

export default function LoginClient() {
  const router = useRouter();
  const search = useSearchParams();

  // optional support for ?redirect=/path ; defaults to /dashboard
  const redirectPath = search.get('redirect') || '/dashboard';

  const [isSignup, setIsSignup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState<FormState>({
    firstname: '',
    lastname: '',
    email: '',
    mobilenumber: '',
    password: '',
    country: 'Canada',
    postalcode: '',
  });

  const [agreements, setAgreements] = useState<Agreements>({
    marketing: false,
    dataSharing: false,
    terms: false,
  });

  useEffect(() => {
    const savedEmail = localStorage.getItem('login_email');
    if (savedEmail) setForm((p) => ({ ...p, email: savedEmail }));
  }, []);

  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL, []);

  const handleInput = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    if (type === 'checkbox') {
      if (name === 'rememberMe') setRememberMe(checked);
      else setAgreements((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // ===== Auto-resize iframe + remove top space =====
  useEffect(() => {
    // remove any default margins that can create top gap
    document.documentElement.style.margin = '0';
    document.body.style.margin = '0';
    document.documentElement.style.padding = '0';
    document.body.style.padding = '0';

    const postSize = () => {
      const h = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
      // If you want to lock to your WP domain, replace '*' with 'https://YOUR-WP-DOMAIN'
      window.parent?.postMessage({ type: 'frame-height', height: h }, '*');
    };

    // initial + observe changes
    postSize();
    const ro = new ResizeObserver(postSize);
    ro.observe(document.body);

    // fallback ticker in case something doesn't trigger ResizeObserver
    const t = setInterval(postSize, 800);

    return () => {
      ro.disconnect();
      clearInterval(t);
    };
  }, [isSignup]); // re-run when switching Sign In <-> Create Account

  // Always open dashboard in a NEW TAB (parent WP stays put)
  const redirectAfterAuth = (url?: string) => {
    const target = url || redirectPath || '/dashboard';
    window.open(target, '_blank', 'noopener,noreferrer');
    // also notify parent iframe (WordPress listener will also open it)
    window.parent?.postMessage({ type: 'auth-success', redirectUrl: target }, '*');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (isSignup && (!agreements.marketing || !agreements.dataSharing)) {
      setError('Please agree to the marketing and data sharing consents.');
      setIsSubmitting(false);
      return;
    }

    try {
      const endpoint = isSignup ? 'signup' : 'dashboard';
      const payload = isSignup
        ? {
            ...form,
            communicationspreference: '111111',
            contactpreference: 'email',
            dateofbirth: '08/08/1988',
            nationality: 'Canadian',
            mailingaddress: 'N/A',
            city: 'N/A',
            state: 'N/A',
            promotioncode: '',
            flag: '@',
            socialMediaType: '1',
          }
        : { email: form.email, password: form.password };

      const res = await fetch(`${apiBase}/api/user/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      setIsSubmitting(false);

      if (!json || json.success === false) {
        setError(
          json?.message ||
            (isSignup
              ? 'Signup failed. Email may already be registered.'
              : 'Invalid login. Please check your credentials.')
        );
        return;
      }

      if (rememberMe) localStorage.setItem('login_email', form.email);
      else localStorage.removeItem('login_email');

      if (!isSignup && json.dashboard) {
        localStorage.setItem('dashboardData', JSON.stringify(json.dashboard));
      }

      // open new tab
      redirectAfterAuth(json.redirectUrl);
    } catch (err) {
      setIsSubmitting(false);
      setError('Failed to connect to the server. Please try again.');
    }
  };

  return (
    <div className="w-full m-0 p-0"> {/* no outer spacing */}
      <div className="mx-auto w-full max-w-xl rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900">
            {isSignup ? 'Create Account' : 'Sign In'}
          </h1>
          {isSignup ? (
            <button
              onClick={() => setIsSignup(false)}
              className="text-sm text-neutral-700 underline underline-offset-2 hover:text-neutral-900"
            >
              Back to Sign In
            </button>
          ) : null}
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <>
              <div>
                <label className="mb-1 block text-sm text-neutral-700">First Name</label>
                <input
                  name="firstname"
                  value={form.firstname}
                  onChange={handleInput}
                  required
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-neutral-700">Last Name</label>
                <input
                  name="lastname"
                  value={form.lastname}
                  onChange={handleInput}
                  required
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-neutral-700">Mobile Number</label>
                <input
                  name="mobilenumber"
                  value={form.mobilenumber}
                  onChange={handleInput}
                  required
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-neutral-700">Country</label>
                <select
                  name="country"
                  value={form.country}
                  onChange={handleInput}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900"
                  required
                >
                  <option value="Canada">Canada</option>
                  <option value="United States">United States</option>
                  <option value="Philippines">Philippines</option>
                  <option value="Australia">Australia</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-neutral-700">Postal Code</label>
                <input
                  name="postalcode"
                  value={form.postalcode}
                  onChange={handleInput}
                  required
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900"
                />
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-sm text-neutral-700">Email or Member Number</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleInput}
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-700">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleInput}
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900"
            />
          </div>

          {!isSignup && (
            <div className="flex items-center gap-2 pt-1">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={handleInput}
                className="h-4 w-4"
              />
              <label htmlFor="rememberMe" className="text-sm text-neutral-700">Remember Me</label>
            </div>
          )}

          {isSignup && (
            <div className="space-y-3 pt-1 text-sm text-neutral-700">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  name="marketing"
                  checked={agreements.marketing}
                  onChange={handleInput}
                  className="mt-1 h-4 w-4"
                  required
                />
                <span>I agree to receive personalized offers and updates.</span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  name="dataSharing"
                  checked={agreements.dataSharing}
                  onChange={handleInput}
                  className="mt-1 h-4 w-4"
                  required
                />
                <span>I agree to data sharing with authorized partners.</span>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-[140px] rounded-full px-6 py-3 text-sm font-semibold text-white transition ${
              isSubmitting ? 'cursor-not-allowed bg-neutral-400' : 'bg-neutral-900 hover:bg-neutral-800'
            }`}
          >
            {isSubmitting ? 'Processing…' : isSignup ? 'Join Now' : 'Sign In'}
          </button>
        </form>

        {!isSignup && (
          <div className="mt-4 space-x-6 text-sm">
            <a href="#" onClick={(e) => e.preventDefault()} className="text-neutral-700 underline underline-offset-2 hover:text-neutral-900">
              Forgot Password
            </a>
            <a href="#" onClick={(e) => e.preventDefault()} className="text-neutral-700 underline underline-offset-2 hover:text-neutral-900">
              Activate Online Account
            </a>
          </div>
        )}

        <hr className="my-6 border-neutral-200" />

        {!isSignup ? (
          <section>
            <h2 className="text-[28px] font-semibold tracking-tight text-neutral-900">Join Now</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Get unrivaled experiences, mobile check-in, member rates, in-room Wi‑Fi, and more.
            </p>
            <button
              type="button"
              onClick={() => setIsSignup(true)}
              className="mt-4 inline-flex items-center rounded-full border border-neutral-900 px-5 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-900 hover:text-white"
            >
              Join For Free
            </button>
          </section>
        ) : (
          <p className="text-sm text-neutral-700">
            Already a member?{' '}
            <button onClick={() => setIsSignup(false)} className="underline underline-offset-2">
              Sign In
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
