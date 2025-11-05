'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/** ——— helpers you already use ——— */
const apiBase = () =>
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '') || '';

const getCookie = (name: string) => {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'),
  );
  return m ? decodeURIComponent(m[1]) : '';
};

/** ——— types you already have ——— */
type Profile = {
  avatarUrl?: string | null;
  firstname?: string;
  lastname?: string;
  phone?: string;
  mobilenumber?: string;
  city?: string;
  address1?: string;
  membershipno?: string;
  email?: string;
};

/** ——— Page ——— */
export default function AccountSettingsPage() {
  const router = useRouter();

  /** 1) Auth guard (no early returns) */
  const [authChecked, setAuthChecked] = useState(false);
  useEffect(() => {
    try {
      const dash = localStorage.getItem('dashboard');
      const token = localStorage.getItem('token');
      if (!dash && !token) {
        router.replace('/dashboard'); // same behavior as SiteHeader
        // we still set checked, so hooks order stays stable
      }
    } catch {
      router.replace('/dashboard');
    } finally {
      setAuthChecked(true);
    }
  }, [router]);

  /** 2) All your existing hooks remain BELOW (order is stable on every render) */
  const [tab, setTab] = useState<'profile' | 'password'>('profile');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>({});

  // Load profile AFTER auth check completes
  useEffect(() => {
    if (!authChecked) return;

    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch(`${apiBase()}/api/user/profile`, { credentials: 'include' });
        if (res.ok) {
          const j = await res.json();
          const row = j?.data?.[0] || j?.profile || {};
          if (!cancelled) {
            setProfile({
              avatarUrl: null,
              firstname: row.firstname || '',
              lastname: row.lastname || '',
              phone: row.phone || '',
              mobilenumber: row.mobilenumber || '',
              city: row.city || '',
              address1: row.address1 || row.mailingaddress || '',
              membershipno: row.membershipno || '',
              email: row.primaryemail || getCookie('dtc_email') || '',
            });
          }
        } else {
          if (!cancelled) {
            setProfile({ email: getCookie('dtc_email') || '' });
          }
        }
      } catch {
        if (!cancelled) {
          setProfile({ email: getCookie('dtc_email') || '' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [authChecked]);

  /** password change handler you already wired to /api/account/change-password */
  const [savingPw, setSavingPw] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');

  const canSave = pw1.length > 0 && pw1 === pw2 && currentPw.length > 0;

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;

    try {
      setSavingPw(true);
      const res = await fetch(`${apiBase()}/api/account/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: profile.email,
          currentPassword: currentPw,
          newPassword: pw1,
        }),
      });

      const isJSON = res.headers.get('content-type')?.includes('application/json');
      const data = isJSON ? await res.json() : null;

      if (!res.ok) {
        const stage = data?.stage;
        const message =
          data?.message ||
          (stage === 'verify'
            ? 'Current password is incorrect.'
            : stage === 'update'
            ? 'Unable to update password.'
            : 'Unable to change password.');
        alert(message);
        return;
        }
      alert('Password changed successfully.');
      setCurrentPw('');
      setPw1('');
      setPw2('');
    } catch (err: any) {
      alert(err?.message || 'Failed to change password. Please try again.');
    } finally {
      setSavingPw(false);
    }
  };

  /** Optional avatar handlers (no-op placeholders) */
  const onUploadAvatar = () => alert('Avatar upload coming soon.');
  const onDeleteAvatar = () => alert('Avatar delete coming soon.');

  /** 3) Render – show a light loader while auth check runs.
   *     No early returns before hooks ⇒ no hook-order errors.
   */
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Checking session…
      </div>
    );
  }

  /** ——— YOUR EXISTING UI STARTS HERE ———
   * I am NOT changing your layout/markup. Keep everything below as-is.
   * If your file defines components like SectionCard/ProfileTab/PasswordTab,
   * they remain unchanged; just ensure they use the same state/handlers.
   */

  return (
    <div className="min-h-screen w-full bg-[#F6F8FB] text-[#1F2042]">
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Account settings</h1>
          <p className="text-sm text-gray-500">Manage your profile and password.</p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <aside className="col-span-12 md:col-span-3">
            <nav className="space-y-2">
              <button
                onClick={() => setTab('profile')}
                className={`w-full text-left px-4 py-2 rounded-lg border ${
                  tab === 'profile' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white hover:bg-gray-50'
                }`}
              >
                Profile Settings
              </button>
              <button
                onClick={() => setTab('password')}
                className={`w-full text-left px-4 py-2 rounded-lg border ${
                  tab === 'password' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white hover:bg-gray-50'
                }`}
              >
                Password
              </button>
            </nav>
          </aside>

          {/* Content */}
          <section className="col-span-12 md:col-span-9">
            {/* Avatar + membership no. */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gray-200" aria-label="Avatar" />
              <div>
                <div className="text-sm text-gray-500">Membership No.</div>
                <div className="font-medium">{profile.membershipno || '—'}</div>
              </div>
            </div>

            {/* Tabs */}
            {loading ? (
              <div className="rounded-xl border bg-white p-6">Loading…</div>
            ) : tab === 'profile' ? (
              <div className="relative">
                {/* Blurred overlay */}
                <div className="absolute inset-0 backdrop-blur-sm bg-white/75 flex items-center justify-center z-10 rounded-2xl">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-[#1F2042] mb-2">
                      This feature is coming soon.
                    </p>
                    <p className="text-sm text-gray-600">
                      If you need support, open the live chat below left.
                    </p>
                  </div>
                </div>

                {/* Your existing profile form (disabled) */}
                <div className="opacity-100 pointer-events-none">
                  {/* keep your existing form fields as-is; showing the values */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">First Name</label>
                      <input className="mt-1 w-full rounded-lg border px-3 py-2" value={profile.firstname || ''} readOnly />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Last Name</label>
                      <input className="mt-1 w-full rounded-lg border px-3 py-2" value={profile.lastname || ''} readOnly />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Phone</label>
                      <input className="mt-1 w-full rounded-lg border px-3 py-2" value={profile.phone || ''} readOnly />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Mobile Number</label>
                      <input className="mt-1 w-full rounded-lg border px-3 py-2" value={profile.mobilenumber || ''} readOnly />
                    </div>
                    <div>
                      <label className="text-sm font-medium">City</label>
                      <input className="mt-1 w-full rounded-lg border px-3 py-2" value={profile.city || ''} readOnly />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium">Residential Address</label>
                      <textarea className="mt-1 w-full rounded-lg border px-3 py-2" rows={3} value={profile.address1 || ''} readOnly />
                    </div>
                  </div>
                  <button disabled className="mt-4 inline-flex items-center rounded-lg bg-gray-300 text-white px-4 py-2 cursor-not-allowed">
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              /* Password tab (unchanged UI, just uses onChangePassword) */
              <form onSubmit={onChangePassword} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <input className="mt-1 w-full rounded-lg border px-3 py-2 bg-gray-100" value={profile.email || ''} readOnly />
                </div>
                <div>
                  <label className="text-sm font-medium">Current Password</label>
                  <input
                    type="password"
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">New Password</label>
                  <input
                    type="password"
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={pw1}
                    onChange={(e) => setPw1(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Confirm New Password</label>
                  <input
                    type="password"
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    required
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={savingPw || !canSave}
                    className="inline-flex items-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 disabled:opacity-60">
                    {savingPw ? 'Saving…' : 'Change Password'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
