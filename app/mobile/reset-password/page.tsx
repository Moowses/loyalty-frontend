'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Avoid SSR issues on Vercel
const ReCAPTCHA = dynamic(() => import('react-google-recaptcha'), { ssr: false });

const FIVE_MIN = 5 * 60; // seconds
const LOCK_KEY = 'reset_lock_until';

export default function MobileResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);

  const recaptchaRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Match your existing convention
  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL || '', []);
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY; // v2 checkbox (public)

  // Restore lock timer (persist across refreshes)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCK_KEY);
      if (raw) {
        const until = parseInt(raw, 10);
        const now = Date.now();
        if (until > now) setRemaining(Math.ceil((until - now) / 1000));
      }
    } catch {}
  }, []);

  // Countdown ticker
  useEffect(() => {
    if (remaining <= 0) return;
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRemaining(s => {
        if (s <= 1) {
          timerRef.current && clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => timerRef.current && clearInterval(timerRef.current);
  }, [remaining]);

  const onCaptcha = useCallback((v: string | null) => setToken(v), []);

  const lockForFiveMinutes = () => {
    const until = Date.now() + FIVE_MIN * 1000;
    try { localStorage.setItem(LOCK_KEY, String(until)); } catch {}
    setRemaining(FIVE_MIN);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (!email) return setErr('Please enter your email.');
    if (!token) return setErr('Please complete the reCAPTCHA.');

    try {
      setBusy(true);
      const res = await fetch(`${apiBase}/api/auth/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Match your LoginClient shape (email only + captcha token)
        body: JSON.stringify({ email: email.trim().toLowerCase(), recaptchaToken: token }),
        credentials: 'include',
      });

      const json = await res.json().catch(() => ({} as any));

      // success detection logic
      const success =
        (json?.success === true || json?.success === 'true' || json?.result === 'success') &&
        res.ok;

      if (!success) {
        throw new Error(json?.message || json?.error || 'Request failed. Please try again.');
      }

      setMsg(`If that email exists, a reset link has been sent.`);
      lockForFiveMinutes();
      recaptchaRef.current?.reset?.();
      setToken(null);
    } catch (e: any) {
      setErr(e?.message || 'Network error. Please try again.');
      recaptchaRef.current?.reset?.();
      setToken(null);
    } finally {
      setBusy(false);
    }
  };

  const disabled = busy || remaining > 0;
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-2xl font-semibold text-gray-800">Reset your password</h1>
          <p className="mt-2 text-sm text-gray-500">
            Enter your account email and we’ll send you a reset link.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="you@example.com"
                required
              />
            </label>

            {/* Google reCAPTCHA v2 (checkbox) */}
            <div className="flex justify-center">
              {/* @ts-ignore dynamic component */}
              <ReCAPTCHA ref={recaptchaRef} sitekey={siteKey} onChange={onCaptcha} />
            </div>

            <button
              type="submit"
              disabled={disabled}
              className={`w-full rounded-full px-5 py-3 text-white font-semibold transition
                ${disabled ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-900 hover:opacity-90'}`}
            >
              {remaining > 0 ? `Resend in ${mm}:${ss}` : busy ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>

          {msg && <p className="mt-4 text-sm text-green-700">{msg}</p>}
          {err && <p className="mt-4 text-sm text-red-600">{err}</p>}
        </div>
      </div>
    </main>
  );
}