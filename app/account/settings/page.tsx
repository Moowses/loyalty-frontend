'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Profile {
  avatarUrl?: string | null;
  firstname?: string;
  lastname?: string;
  phone?: string;
  mobilenumber?: string;
  city?: string;
  address1?: string;
  membershipno?: string;
  email?: string;
}

const BRAND = '#211F45';
const apiBase = () => (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/+$/, '');

const getCookie = (name: string): string => {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[$()*+.?[\\\\]^{|}]/g, '\\$&') + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : '';
};

function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return <label htmlFor={htmlFor} className="block text-sm font-medium text-[#374151] mb-1">{children}</label>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[15px] outline-none focus:ring-2 focus:ring-[${BRAND}]/20 focus:border-[${BRAND}] disabled:opacity-60 ${props.className || ''}`} />;
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[15px] outline-none focus:ring-2 focus:ring-[${BRAND}]/20 focus:border-[${BRAND}] disabled:opacity-60 ${props.className || ''}`} />;
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return <section className="relative rounded-2xl border border-gray-200 bg-white shadow-sm p-5 md:p-6 overflow-hidden">{children}</section>;
}

export default function AccountSettingsPage() {
  const [tab, setTab] = useState<'profile' | 'password'>('profile');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>({});

  useEffect(() => {
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
          if (!cancelled) setProfile({ email: getCookie('dtc_email') || '' });
        }
      } catch {
        if (!cancelled) setProfile({ email: getCookie('dtc_email') || '' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const onUploadAvatar = () => alert('Avatar upload coming soon.');
  const onDeleteAvatar = () => alert('Avatar delete coming soon.');

  return (
    <div className="min-h-screen w-full bg-[#F6F8FB] text-[#1F2042]">
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-[22px] md:text-[26px] font-bold">Account settings</h1>
          <Link href="/dashboard" className="text-sm text-[#211F45] underline">Back to Dashboard</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <aside className="md:col-span-2 lg:col-span-1">
            <nav className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <button onClick={() => setTab('profile')} className={`w-full text-left px-4 py-3 border-b border-gray-200 ${tab === 'profile' ? 'bg-white text-[#211F45] font-semibold' : 'hover:bg-gray-50'}`}>Profile Settings</button>
              <button onClick={() => setTab('password')} className={`w-full text-left px-4 py-3 ${tab === 'password' ? 'bg-white text-[#211F45] font-semibold' : 'hover:bg-gray-50'}`}>Password</button>
            </nav>
          </aside>

          <div className="md:col-span-3 lg:col-span-4 space-y-6">
            {loading ? (
              <SectionCard>Loading…</SectionCard>
            ) : tab === 'profile' ? (
              <div className="relative">
                <div className="absolute inset-0 backdrop-blur-sm bg-white/75 flex items-center justify-center z-10 rounded-2xl">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-[#1F2042] mb-2">This feature is coming soon.</p>
                    <p className="text-sm text-gray-600">If you need support, open the live chat below left.</p>
                  </div>
                </div>
                <div className="opacity-1 pointer-events-none">
                  <ProfileTab
                    profile={profile}
                    setProfile={setProfile}
                    onUploadAvatar={onUploadAvatar}
                    onDeleteAvatar={onDeleteAvatar}
                  />
                </div>
              </div>
            ) : (
              <PasswordTab email={profile.email || ''} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function ProfileTab({ profile, setProfile, onUploadAvatar, onDeleteAvatar }: { profile: Profile; setProfile: React.Dispatch<React.SetStateAction<Profile>>; onUploadAvatar: () => void; onDeleteAvatar: () => void; }) {
  return (
    <SectionCard>
      <div className="flex items-center gap-5 mb-6">
        <div className="relative h-24 w-24 rounded-full overflow-hidden border-4 border-white shadow-md">
          <Image src={profile.avatarUrl || '/avatar-placeholder.png'} alt="Avatar" fill className="object-cover" />
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-sm text-gray-500">Membership No.</div>
          <div className="text-lg font-semibold text-[#1F2042]">{profile.membershipno || '—'}</div>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={onUploadAvatar} className="px-4 py-2 rounded-lg bg-[#211F45] text-white font-semibold hover:opacity-90">Upload New</button>
            <button onClick={onDeleteAvatar} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200">Delete avatar</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>First Name<span className="text-red-500"> *</span></Label>
          <Input value={profile.firstname || ''} onChange={(e) => setProfile({ ...profile, firstname: e.target.value })} placeholder="First name" />
        </div>
        <div>
          <Label>Last Name<span className="text-red-500"> *</span></Label>
          <Input value={profile.lastname || ''} onChange={(e) => setProfile({ ...profile, lastname: e.target.value })} placeholder="Last name" />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={profile.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="e.g., 416 555 0123" />
        </div>
        <div>
          <Label>Mobile Number</Label>
          <Input value={profile.mobilenumber || ''} onChange={(e) => setProfile({ ...profile, mobilenumber: e.target.value })} placeholder="e.g., 416 555 0123" />
        </div>
        <div>
          <Label>City</Label>
          <Input value={profile.city || ''} onChange={(e) => setProfile({ ...profile, city: e.target.value })} placeholder="City" />
        </div>
        <div className="md:col-span-2">
          <Label>Residential Address</Label>
          <Textarea rows={3} value={profile.address1 || ''} onChange={(e) => setProfile({ ...profile, address1: e.target.value })} placeholder="Street / Unit / Province / Postal Code" />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button disabled className="inline-flex items-center gap-2 rounded-lg bg-gray-300 text-white px-4 py-2 font-semibold cursor-not-allowed" title="Disabled until backend is ready">Save Changes</button>
      </div>
    </SectionCard>
  );
}

function PasswordTab({ email }: { email: string }) {
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

    // try to read JSON if available
    const isJSON = res.headers.get('content-type')?.includes('application/json');
    const data = isJSON ? await res.json() : null;

    if (!res.ok) {
      // backend returns { stage: 'verify' } or { stage: 'update' } on specific failures
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

    // success
    setCurrentPw('');
    setPw1('');
    setPw2('');
    alert('Password changed successfully.');
  } catch (err: any) {
    alert(err?.message || 'Failed to change password. Please try again.');
  } finally {
    setSaving(false);
  }
};


  return (
    <SectionCard>
      <h3 className="text-lg font-semibold mb-1">Change Password</h3>
      <p className="text-sm text-gray-500 mb-4">Update your password for <span className="font-medium">{email || 'your account'}</span>.</p>

      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label>Email</Label>
          <Input value={email} readOnly className="bg-gray-100 cursor-not-allowed" />
        </div>
        <div className="md:col-span-2">
          <Label>Current Password</Label>
          <Input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="Enter current password" />
        </div>
        <div>
          <Label>New Password</Label>
          <Input type="password" minLength={8} value={pw1} onChange={(e) => setPw1(e.target.value)} placeholder="At least 8 characters" />
        </div>
        <div>
          <Label>Confirm New Password</Label>
          <Input type="password" minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </div>

        <div className="md:col-span-2 flex justify-end mt-2">
          <button type="submit" disabled={!canSave || saving} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold text-white ${(!canSave || saving) ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#211F45] hover:opacity-90'}`}>
            {saving ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </form>
    </SectionCard>
  );
}