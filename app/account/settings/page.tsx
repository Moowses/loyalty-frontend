'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Gate = 'checking' | 'allowed' | 'denied';

const BRAND = '#211F45';

const apiBase = () =>
  (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/+$/, '');

const HOME =
  (process.env.NEXT_PUBLIC_HOME_URL || '').replace(/\/+$/, '') || '/';

function getCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(
    new RegExp(
      '(?:^|; )' + name.replace(/[$()*+.?[\\\]^{|}]/g, '\\$&') + '=([^;]*)'
    )
  );
  return match ? decodeURIComponent(match[1]) : '';
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function SectionCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

function Label({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1 block text-sm font-medium text-[#374151]"
    >
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      {...rest}
      className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[15px] text-[#1F2042] outline-none focus:border-[#211F45] focus:ring-2 focus:ring-[#211F45]/10 disabled:cursor-not-allowed disabled:bg-gray-100 ${className || ''}`}
    />
  );
}

function AccountTabs({ active }: { active: 'settings' | 'user-information' }) {
  return (
    <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
      <Link
        href="/account/user-information"
        className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold transition ${
          active === 'user-information'
            ? 'bg-[#211F45] text-white'
            : 'text-[#211F45] hover:bg-[#F3F4F6]'
        }`}
      >
        User Information
      </Link>
      <Link
        href="/account/settings"
        className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold transition ${
          active === 'settings'
            ? 'bg-[#211F45] text-white'
            : 'text-[#211F45] hover:bg-[#F3F4F6]'
        }`}
      >
        Account Settings
      </Link>
    </div>
  );
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const [gate, setGate] = useState<Gate>('checking');
  const [email, setEmail] = useState('');

  const emailForCalls = useMemo(() => {
    return (
      getCookie('dtc_email') ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('email') || ''
        : '')
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const deny = () => {
      if (cancelled) return;
      setGate('denied');
      router.replace(HOME);
    };

    const allow = () => {
      if (cancelled) return;
      setGate('allowed');
    };

    const run = async () => {
      try {
        const base = apiBase();
        if (!base) return deny();

        const meRes = await fetch(`${base}/api/auth/me`, {
          credentials: 'include',
          signal: controller.signal,
        });

        const me = meRes.ok ? await meRes.json().catch(() => ({})) : {};
        if (!me?.loggedIn) return deny();
        allow();

        const email =
          String(me?.member?.email || '').trim() ||
          emailForCalls ||
          getCookie('dtc_email') ||
          '';

        if (!cancelled) {
          setEmail(email);
        }

        if (!email) return;

        const profileRes = await fetch(`${base}/api/user/profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email }),
          signal: controller.signal,
        });

        if (!profileRes.ok) return;

        const data = await profileRes.json().catch(() => ({}));
        const row = data?.profile?.data?.[0] || data?.data?.[0] || {};

        if (!cancelled) {
          setEmail((prev) => prev || String(row.primaryemail || '').trim());
        }
      } catch {
        deny();
      }
    };

    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [emailForCalls, router]);

  if (gate === 'checking') {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F6F8FB] text-[#1F2042]">
        Loading...
      </div>
    );
  }

  if (gate === 'denied') return null;

  return (
    <div className="min-h-screen bg-[#F6F8FB] text-[#1F2042]">
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold md:text-[28px]">
              Account settings
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage your profile details, password, and account access.
            </p>
          </div>
          <Link href="/dashboard" className="text-sm text-[#211F45] underline">
            Back to Dashboard
          </Link>
        </div>

        <AccountTabs active="settings" />

        <div className="space-y-6">
          <PasswordCard email={email} />
        </div>
      </main>
    </div>
  );
}

function PasswordCard({ email }: { email: string }) {
  const [currentPw, setCurrentPw] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = currentPw.length >= 6 && pw1.length >= 8 && pw1 === pw2;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;

    try {
      setSaving(true);

      const res = await fetch(`${apiBase()}/api/account/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          currentPassword: currentPw,
          newPassword: pw1,
        }),
      });

      const isJSON = res.headers
        .get('content-type')
        ?.includes('application/json');
      const data = isJSON ? await res.json().catch(() => null) : null;

      if (!res.ok) {
        const stage = data?.stage;
        const message =
          data?.message ||
          (stage === 'verify'
            ? 'Current password is incorrect.'
            : stage === 'update'
              ? 'Unable to update password.'
              : 'Unable to change password.');
        throw new Error(message);
      }

      setCurrentPw('');
      setPw1('');
      setPw2('');
      alert('Password changed successfully.');
    } catch (error) {
      alert(getErrorMessage(error, 'Failed to change password.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard>
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
        Security
      </div>
      <h2 className="mt-2 text-xl font-semibold text-[#1F2042]">
        Change password
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        Update the password used for <span className="font-medium">{email || 'your account'}</span>.
      </p>

      <form onSubmit={onSubmit} className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label>Email</Label>
          <Input value={email} readOnly />
        </div>

        <div className="md:col-span-2">
          <Label>Current Password</Label>
          <Input
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            placeholder="Enter current password"
          />
        </div>

        <div>
          <Label>New Password</Label>
          <Input
            type="password"
            minLength={8}
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <Label>Confirm New Password</Label>
          <Input
            type="password"
            minLength={8}
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
          />
        </div>

        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={!canSave || saving}
            className={`inline-flex items-center rounded-lg px-4 py-2 font-semibold text-white ${
              !canSave || saving
                ? 'cursor-not-allowed bg-gray-300'
                : 'bg-[#211F45] hover:opacity-90'
            }`}
            style={{ backgroundColor: !canSave || saving ? undefined : BRAND }}
          >
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </SectionCard>
  );
}
