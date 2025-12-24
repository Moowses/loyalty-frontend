'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const ChatbotWidget = dynamic(() => import('@/components/ChatbotWidget'), {
  ssr: false,
  loading: () => null,
});

type Gate = 'checking' | 'allowed' | 'denied';

interface Profile {
  avatarUrl?: string | null;

  // display/non-meta
  membershipno?: string;
  email?: string;
  city?: string;
  address1?: string;
  mobilenumber?: string;

  // UI names (we keep these to avoid breaking design)
  firstname?: string;
  lastname?: string;
  phone?: string;

  // Meta-aligned fields
  profileId?: string; // ProfileId (Mfpe...)
  Title?: string; // Mr/Ms
  DateofBirth?: string; // YYYY-MM-DD
  Gender?: string; // Male/Female
  Nationality?: string; // CA
  Company?: string; // DreamTripClub
  DocumentType?: string; // ID
  Region?: string; // Ontario
  Country?: string; // CA
  StateProvince?: string; // Ontario
  Destinations?: string; // Canada
}

const BRAND = '#211F45';
const apiBase = () =>
  (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/+$/, '');
const HOME =
  (process.env.NEXT_PUBLIC_HOME_URL || '').replace(/\/+$/, '') || '/';

const getCookie = (name: string): string => {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(
    new RegExp(
      '(?:^|; )' + name.replace(/[$()*+.?[\\\]^{|}]/g, '\\$&') + '=([^;]*)'
    )
  );
  return m ? decodeURIComponent(m[1]) : '';
};

function parseCountryCode(countryRaw: string | null | undefined): string {
  // "Canada(CA)" -> "CA"
  const s = (countryRaw || '').trim();
  const m = s.match(/\(([A-Z]{2})\)\s*$/i);
  return (m?.[1] || '').toUpperCase();
}

function mmddyyyyToISO(dateRaw: string | null | undefined): string {
  // "01/13/1997" -> "1997-01-13"
  const s = (dateRaw || '').trim();
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return '';
  const mm = m[1];
  const dd = m[2];
  const yyyy = m[3];
  return `${yyyy}-${mm}-${dd}`;
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
      className="block text-sm font-medium text-[#374151] mb-1"
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
      className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[15px] outline-none focus:ring-2 focus:ring-[${BRAND}]/20 focus:border-[${BRAND}] disabled:opacity-60 ${
        className || ''
      }`}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return (
    <textarea
      {...rest}
      className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[15px] outline-none focus:ring-2 focus:ring-[${BRAND}]/20 focus:border-[${BRAND}] disabled:opacity-60 ${
        className || ''
      }`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props;
  return (
    <select
      {...rest}
      className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[15px] outline-none focus:ring-2 focus:ring-[${BRAND}]/20 focus:border-[${BRAND}] disabled:opacity-60 ${
        className || ''
      }`}
    />
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative rounded-2xl border border-gray-200 bg-white shadow-sm p-5 md:p-6 overflow-hidden">
      {children}
    </section>
  );
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'profile' | 'password'>('profile');

  const [gate, setGate] = useState<Gate>('checking');
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<Profile>({
    Title: 'Mr',
    Country: 'CA',
    StateProvince: 'Ontario',
    Nationality: 'CA',
    Region: 'Ontario',
    Destinations: 'Canada',
    DocumentType: 'ID',
    Gender: 'Male',
    Company: 'DreamTripClub',
  });

  const [savingProfile, setSavingProfile] = useState(false);

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

        // 1) auth check
        const meRes = await fetch(`${base}/api/auth/me`, {
          credentials: 'include',
          signal: controller.signal,
        });

        const me = meRes.ok ? await meRes.json().catch(() => ({})) : {};
        if (!me?.loggedIn) return deny();
        allow();

        // 2) fetch profile
        const email = emailForCalls || getCookie('dtc_email') || '';
        const res = await fetch(`${base}/api/user/profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email }),
          signal: controller.signal,
        });

        if (res.ok) {
          const j = await res.json().catch(() => ({}));

          const row = j?.profile?.data?.[0] || j?.data?.[0] || {};

          const countryCode = parseCountryCode(row.country) || 'CA';
          const province = (row.state || 'Ontario').trim();

          const title = String(row.title || '').trim() || 'Mr';
          const dobISO = mmddyyyyToISO(row.birthday) || '';

          const nationality =
            (row.nationality || '').trim() || countryCode || 'CA';
          const company =
            (row.companyname || '').trim() || 'DreamTripClub';
          const destinations =
            (row.destinations || '').trim() || 'Canada';

          const phoneBest =
            (row.phone || '').trim() ||
            (row.mobilenumber || '').trim() ||
            '';

          if (!cancelled) {
            setProfile((p) => ({
              ...p,

              // display
              email:
                row.primaryemail ||
                email ||
                getCookie('dtc_email') ||
                p.email ||
                '',
              membershipno: row.membershipno || p.membershipno || '',
              city: row.city || p.city || '',
              address1:
                row.address1 ||
                row.mailingaddress ||
                p.address1 ||
                '',
              mobilenumber: row.mobilenumber || p.mobilenumber || '',
              avatarUrl: null,

              // UI basic
              firstname: row.firstname || p.firstname || '',
              lastname: row.lastname || p.lastname || '',
              phone: phoneBest || p.phone || '',

              // Meta aligned
              profileId: row.meta_pfprofile_id || p.profileId || '',
              Title: title,
              DateofBirth: dobISO || p.DateofBirth || '',
              Gender: (row.gender || p.Gender || 'Male').trim(),
              Nationality: nationality,
              Company: company,
              DocumentType: p.DocumentType || 'ID',
              Country: countryCode,
              StateProvince: province,
              Region: province,
              Destinations: destinations,
            }));
          }
        } else {
          if (!cancelled) {
            setProfile((p) => ({
              ...p,
              email: getCookie('dtc_email') || p.email || '',
            }));
          }
        }

        // 3) optional: dashboard fallback (kept)
        try {
          const email = emailForCalls;
          if (email) {
            const dres = await fetch(`${base}/api/user/dashboard`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ email }),
              signal: controller.signal,
            });

            const dj = dres.ok ? await dres.json().catch(() => null) : null;
            const rec = dj?.dashboard ?? dj ?? {};
            const pid =
              rec.profileId ??
              rec.meta_pfprofile_id ??
              rec.metaPfProfileId ??
              '';

            // ensure we don't overwrite once already set
            if (!cancelled && pid) {
              setProfile((p) => ({ ...p, profileId: p.profileId || pid }));
            }
          }
        } catch {
          // ignore
        }
      } catch {
        return deny();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  
  }, [router, emailForCalls]);

  if (gate === 'checking') {
    return (
      <div className="min-h-screen grid place-items-center bg-[#F6F8FB] text-[#1F2042]">
        Loading…
      </div>
    );
  }
  if (gate === 'denied') return null;

  const onUploadAvatar = () => alert('Avatar upload coming soon.');
  const onDeleteAvatar = () => alert('Avatar delete coming soon.');

  const canSaveProfile =
    !!profile.profileId &&
    !!profile.firstname?.trim() &&
    !!profile.lastname?.trim() &&
    !!profile.Country?.trim() &&
    !!profile.StateProvince?.trim();

  const submitProfile = async () => {
    const base = apiBase();
    if (!base) {
      alert('API base URL is missing.');
      return;
    }

    if (!canSaveProfile) {
      alert(
        'Please complete required fields (ProfileId, First/Last name, Country, Province).'
      );
      return;
    }

    try {
      setSavingProfile(true);

      // Backend expects Meta payload keys
      const payload = {
        ProfileId: profile.profileId,
        Title: (profile.Title || '').trim(),
        DateofBirth: (profile.DateofBirth || '').trim(),
        FirstName: (profile.firstname || '').trim(),
        LastName: (profile.lastname || '').trim(),
        Gender: (profile.Gender || '').trim(),
        Nationality: (profile.Nationality || '').trim(),
        Company: (profile.Company || '').trim(),
        DocumentType: (profile.DocumentType || '').trim(),
        Region: (profile.Region || profile.StateProvince || '').trim(),
        Country: (profile.Country || '').trim(),
        StateProvince: (profile.StateProvince || '').trim(),
        Destinations: (profile.Destinations || '').trim(),
        Phone: (profile.phone || profile.mobilenumber || '').trim(),
      };

      const res = await fetch(`${base}/api/user/account-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const isJSON = res.headers
        .get('content-type')
        ?.includes('application/json');
      const data = isJSON ? await res.json().catch(() => null) : null;

      if (!res.ok || data?.result !== 'success') {
        throw new Error(
          data?.message || 'Unable to update profile. Please try again.'
        );
      }

      alert('Profile updated successfully.');
    } catch (err: any) {
      alert(err?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F6F8FB] text-[#1F2042]">
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-[22px] md:text-[26px] font-bold">
            Account settings
          </h1>
          <Link href="/dashboard" className="text-sm text-[#211F45] underline">
            Back to Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <aside className="md:col-span-2 lg:col-span-1">
            <nav className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <button
                onClick={() => setTab('profile')}
                className={`w-full text-left px-4 py-3 border-b border-gray-200 ${
                  tab === 'profile'
                    ? 'bg-white text-[#211F45] font-semibold'
                    : 'hover:bg-gray-50'
                }`}
              >
                Profile Settings
              </button>
              <button
                onClick={() => setTab('password')}
                className={`w-full text-left px-4 py-3 ${
                  tab === 'password'
                    ? 'bg-white text-[#211F45] font-semibold'
                    : 'hover:bg-gray-50'
                }`}
              >
                Password
              </button>
            </nav>
          </aside>

          <div className="md:col-span-3 lg:col-span-4 space-y-6">
            {loading ? (
              <SectionCard>Loading…</SectionCard>
            ) : tab === 'profile' ? (
              <ProfileTab
                profile={profile}
                setProfile={setProfile}
                onUploadAvatar={onUploadAvatar}
                onDeleteAvatar={onDeleteAvatar}
                onSave={submitProfile}
                canSave={canSaveProfile}
                saving={savingProfile}
              />
            ) : (
              <PasswordTab email={profile.email || ''} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function ProfileTab({
  profile,
  setProfile,
  onUploadAvatar,
  onDeleteAvatar,
  onSave,
  canSave,
  saving,
}: {
  profile: Profile;
  setProfile: React.Dispatch<React.SetStateAction<Profile>>;
  onUploadAvatar: () => void;
  onDeleteAvatar: () => void;
  onSave: () => void;
  canSave: boolean;
  saving: boolean;
}) {
  return (
    <SectionCard>
      <div className="flex items-center gap-5 mb-6">
        <div className="relative h-24 w-24 rounded-full overflow-hidden border-4 border-white shadow-md">
          <Image
            src={profile.avatarUrl || '/avatar-placeholder.png'}
            alt="Avatar"
            fill
            className="object-cover"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="text-sm text-gray-500">Membership No.</div>
          <div className="text-lg font-semibold text-[#1F2042]">
            {profile.membershipno || '—'}
          </div>

          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={onUploadAvatar}
              className="px-4 py-2 rounded-lg bg-[#211F45] text-white font-semibold hover:opacity-90"
            >
              Upload New
            </button>
            <button
              onClick={onDeleteAvatar}
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200"
            >
              Delete avatar
            </button>
          </div>
        </div>
      </div>

      {/* auto-populated*/}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>
            First Name<span className="text-red-500"> *</span>
          </Label>
          <Input
            value={profile.firstname || ''}
            onChange={(e) =>
              setProfile((p) => ({ ...p, firstname: e.target.value }))
            }
          />
        </div>

        <div>
          <Label>
            Last Name<span className="text-red-500"> *</span>
          </Label>
          <Input
            value={profile.lastname || ''}
            onChange={(e) =>
              setProfile((p) => ({ ...p, lastname: e.target.value }))
            }
          />
        </div>

        <div>
          <Label>Phone (Meta)</Label>
          <Input
            value={profile.phone || ''}
            onChange={(e) =>
              setProfile((p) => ({ ...p, phone: e.target.value }))
            }
            placeholder="e.g. +14165550123"
          />
        </div>

        <div>
          <Label>Mobile Number</Label>
          <Input
            value={profile.mobilenumber || ''}
            onChange={(e) =>
              setProfile((p) => ({ ...p, mobilenumber: e.target.value }))
            }
          />
        </div>

        <div>
          <Label>Title</Label>
          <Select
            value={(profile.Title || 'Mr').trim()}
            onChange={(e) =>
              setProfile((p) => ({ ...p, Title: e.target.value }))
            }
          >
            <option value="Mr">Mr</option>
            <option value="Ms">Ms</option>
            <option value="Mrs">Mrs</option>
            <option value="Mx">Mx</option>
          </Select>
        </div>

        <div>
          <Label>Date of Birth</Label>
          <Input
            type="date"
            value={profile.DateofBirth || ''}
            onChange={(e) =>
              setProfile((p) => ({ ...p, DateofBirth: e.target.value }))
            }
          />
        </div>

        <div>
          <Label>Gender</Label>
          <Select
            value={profile.Gender || ''}
            onChange={(e) =>
              setProfile((p) => ({ ...p, Gender: e.target.value }))
            }
          >
            <option value="">—</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </Select>
        </div>

        <div>
          <Label>Nationality</Label>
          <Input
            value={profile.Nationality || ''}
            onChange={(e) =>
              setProfile((p) => ({
                ...p,
                Nationality: e.target.value.toUpperCase(),
              }))
            }
            placeholder="CA"
          />
        </div>

        <div>
          <Label>Company</Label>
          <Input
            value={profile.Company || ''}
            onChange={(e) =>
              setProfile((p) => ({ ...p, Company: e.target.value }))
            }
          />
        </div>

        <div>
          <Label>Document Type</Label>
          <Input
            value={profile.DocumentType || ''}
            onChange={(e) =>
              setProfile((p) => ({ ...p, DocumentType: e.target.value }))
            }
            placeholder="ID"
          />
        </div>

        <div>
          <Label>
            Country Code<span className="text-red-500"> *</span>
          </Label>
          <Input
            value={profile.Country || ''}
            onChange={(e) =>
              setProfile((p) => ({
                ...p,
                Country: e.target.value.toUpperCase(),
              }))
            }
            placeholder="CA"
          />
        </div>

        <div>
          <Label>
            Province / State<span className="text-red-500"> *</span>
          </Label>
          <Input
            value={profile.StateProvince || ''}
            onChange={(e) =>
              setProfile((p) => ({
                ...p,
                StateProvince: e.target.value,
                Region: e.target.value,
              }))
            }
            placeholder="Ontario"
          />
        </div>

        <div>
          <Label>Destinations</Label>
          <Input
            value={profile.Destinations || ''}
            onChange={(e) =>
              setProfile((p) => ({ ...p, Destinations: e.target.value }))
            }
            placeholder="Canada"
          />
        </div>

        <div>
          <Label>City</Label>
          <Input
            value={profile.city || ''}
            onChange={(e) =>
              setProfile((p) => ({ ...p, city: e.target.value }))
            }
          />
        </div>

        <div className="md:col-span-2">
          <Label>Residential Address</Label>
          <Textarea
            rows={3}
            value={profile.address1 || ''}
            onChange={(e) =>
              setProfile((p) => ({ ...p, address1: e.target.value }))
            }
          />
        </div>

        <div className="md:col-span-2">
          <Label>
            ProfileId (Meta)<span className="text-red-500"> *</span>
          </Label>
          <Input
            value={profile.profileId || ''}
            onChange={(e) =>
              setProfile((p) => ({ ...p, profileId: e.target.value }))
            }
            placeholder="Mfpe..."
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave || saving}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold text-white ${
            !canSave || saving
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-[#211F45] hover:opacity-90'
          }`}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
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

      const isJSON = res.headers
        .get('content-type')
        ?.includes('application/json');
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
        throw new Error(message);
      }

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
      <p className="text-sm text-gray-500 mb-4">
        Update your password for{' '}
        <span className="font-medium">{email || 'your account'}</span>.
      </p>

      <form
        onSubmit={onSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div className="md:col-span-2">
          <Label>Email</Label>
          <Input
            value={email}
            readOnly
            className="bg-gray-100 cursor-not-allowed"
          />
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

        <div className="md:col-span-2 flex justify-end mt-2">
          <button
            type="submit"
            disabled={!canSave || saving}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold text-white ${
              !canSave || saving
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-[#211F45] hover:opacity-90'
            }`}
          >
            {saving ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </form>


    </SectionCard>
  );
}
