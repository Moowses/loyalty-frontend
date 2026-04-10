'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PhoneInput,
  getCountry,
  guessCountryByPartialPhoneNumber,
} from 'react-international-phone';

type Gate = 'checking' | 'allowed' | 'denied';

type Profile = {
  email: string;
  membershipNo: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  mobilePhone: string;
  gender: string;
  addressLine1: string;
  stateProvince: string;
  postalCode: string;
  country: string;
};

type CountryOption = {
  code: string;
  name: string;
};

type LocationOptionsResponse = {
  countries: CountryOption[];
  provincesByCountryCode: Record<string, string[]>;
};

type SaveDialogState =
  | {
      open: false;
    }
  | {
      open: true;
      tone: 'saving' | 'success' | 'error';
      title: string;
      message: string;
    };

const HOME =
  (process.env.NEXT_PUBLIC_HOME_URL || '').replace(/\/+$/, '') || '/';

const apiBase = () =>
  (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/+$/, '');

const EMPTY_PROFILE: Profile = {
  email: '',
  membershipNo: '',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  mobilePhone: '',
  gender: '',
  addressLine1: '',
  stateProvince: '',
  postalCode: '',
  country: '',
};

const EMPTY_LOCATION_OPTIONS: LocationOptionsResponse = {
  countries: [],
  provincesByCountryCode: {},
};

const E164_REGEX = /^\+[1-9]\d{7,14}$/;

function getCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(
    new RegExp(
      '(?:^|; )' + name.replace(/[$()*+.?[\\\]^{|}]/g, '\\$&') + '=([^;]*)'
    )
  );
  return match ? decodeURIComponent(match[1]) : '';
}

function parseCountryCode(countryRaw: string | null | undefined): string {
  const value = (countryRaw || '').trim();
  const match = value.match(/\(([A-Z]{2})\)\s*$/i);
  return (match?.[1] || value).toUpperCase();
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function getFriendlyProfileError(message: string) {
  const value = String(message || '').trim();
  if (!value) return 'Unable to update profile. Please try again.';

  if (
    value.includes(
      'The date format for users under the age of 18 or above is incorrect and should be yyyy-MM-dd.'
    )
  ) {
    return 'Member must be at least 18 years old.';
  }

  return value;
}

function normalizeDateOfBirth(dateRaw: string | null | undefined) {
  const value = String(dateRaw || '').trim();
  if (!value) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, month, day, year] = slashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function inferCountryCode(countryRaw: string | null | undefined, phoneRaw: string) {
  const fromCountry = parseCountryCode(countryRaw);
  if (fromCountry) return fromCountry;

  const guessed = guessCountryByPartialPhoneNumber({
    phone: String(phoneRaw || '').trim(),
  });

  return guessed?.country?.iso2?.toUpperCase() || '';
}

function normalizeBackendPhone(countryCode: string, phoneRaw: string) {
  const raw = String(phoneRaw || '').trim();
  if (!raw) return '';

  const digitsOnly = raw.replace(/[^\d+]/g, '');
  if (digitsOnly.startsWith('+')) return digitsOnly;

  const upperCountryCode = String(countryCode || '').trim().toUpperCase();
  const country = upperCountryCode
    ? getCountry({
        value: upperCountryCode.toLowerCase(),
        field: 'iso2',
      })
    : undefined;

  if (!country?.dialCode) return digitsOnly;

  const localDigits = digitsOnly.replace(/\D/g, '').replace(/^0+/, '');
  if (!localDigits) return '';

  if (localDigits.startsWith(country.dialCode)) {
    return `+${localDigits}`;
  }

  return `+${country.dialCode}${localDigits}`;
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

function StaticField({
  value,
}: {
  value: string;
}) {
  return (
    <div className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-[15px] text-[#6B7280]">
      {value || '-'}
    </div>
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props;
  return (
    <select
      {...rest}
      className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[15px] text-[#1F2042] outline-none focus:border-[#211F45] focus:ring-2 focus:ring-[#211F45]/10 disabled:cursor-not-allowed disabled:bg-gray-100 ${className || ''}`}
    />
  );
}

function Hint({
  children,
}: {
  children: React.ReactNode;
}) {
  return <p className="mt-1 text-xs text-gray-500">{children}</p>;
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

function SaveStatusDialog({ state }: { state: SaveDialogState }) {
  if (!state.open) return null;

  const toneStyles =
    state.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : state.tone === 'error'
        ? 'border-red-200 bg-red-50 text-red-800'
        : 'border-slate-200 bg-white text-[#1F2042]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/35 px-4">
      <div className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl ${toneStyles}`}>
        <div className="text-lg font-semibold">{state.title}</div>
        <p className="mt-2 text-sm leading-6">{state.message}</p>
      </div>
    </div>
  );
}

export default function UserInformationPage() {
  const router = useRouter();
  const [gate, setGate] = useState<Gate>('checking');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [locationOptions, setLocationOptions] = useState<LocationOptionsResponse>(
    EMPTY_LOCATION_OPTIONS
  );
  const [formError, setFormError] = useState('');
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [saveDialog, setSaveDialog] = useState<SaveDialogState>({
    open: false,
  });

  const emailForCalls = useMemo(() => {
    return (
      getCookie('dtc_email') ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('email') || ''
        : '')
    );
  }, []);

  const provinceOptions = useMemo(
    () => locationOptions.provincesByCountryCode[profile.country] || [],
    [locationOptions.provincesByCountryCode, profile.country]
  );
  const phoneCountry = useMemo(() => {
    const next = String(profile.country || '').trim().toLowerCase();
    return /^[a-z]{2}$/.test(next) ? next : 'us';
  }, [profile.country]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadLocations = async () => {
      setLoadingLocations(true);
      try {
        const base = apiBase();
        const res = await fetch(`${base}/api/user/location-options`, {
          credentials: 'include',
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('Unable to load countries and provinces.');
        const data = (await res.json().catch(() => null)) as
          | LocationOptionsResponse
          | null;

        if (!cancelled && data) {
          setLocationOptions({
            countries: Array.isArray(data.countries) ? data.countries : [],
            provincesByCountryCode: data.provincesByCountryCode || {},
          });
        }
      } catch (error) {
        if (!cancelled) {
          setFormError(
            getErrorMessage(error, 'Unable to load countries and provinces.')
          );
        }
      } finally {
        if (!cancelled) setLoadingLocations(false);
      }
    };

    loadLocations();

    return () => {
      cancelled = true;
      controller.abort();
    };
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

        const profileRes = await fetch(`${base}/api/user/profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email }),
          signal: controller.signal,
        });

        if (!profileRes.ok) throw new Error('Unable to load profile.');

        const data = await profileRes.json().catch(() => ({}));
        const row = data?.profile?.data?.[0] || data?.data?.[0] || {};

        if (!cancelled) {
          const backendPhone = String(
            row.mobilenumber || row.phone || row.phonenumber || ''
          ).trim();
          const countryCode = inferCountryCode(row.country, backendPhone);
          const mobilePhone = normalizeBackendPhone(countryCode, backendPhone);
          setProfile({
            email:
              String(row.primaryemail || '').trim() ||
              email ||
              getCookie('dtc_email') ||
              '',
            membershipNo: String(row.membershipno || '').trim(),
            firstName: String(row.firstname || '').trim(),
            lastName: String(row.lastname || '').trim(),
            dateOfBirth: normalizeDateOfBirth(
              row.dateofbirth || row.DateofBirth || row.birthday
            ),
            mobilePhone,
            gender: String(row.gender || '').trim(),
            addressLine1: String(
              row.address1 || row.mailingaddress || ''
            ).trim(),
            stateProvince: String(row.state || '').trim(),
            postalCode: String(row.postalcode || row.zip || '').trim(),
            country: countryCode,
          });
        }
      } catch {
        deny();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [emailForCalls, router]);

  useEffect(() => {
    if (!profile.country) return;
    if (provinceOptions.length === 0) return;
    if (provinceOptions.includes(profile.stateProvince)) return;

    setProfile((prev) => ({
      ...prev,
      stateProvince: '',
    }));
  }, [profile.country, profile.stateProvince, provinceOptions]);

  const phoneValid = E164_REGEX.test(profile.mobilePhone.trim());
  const canSave =
    !loading &&
    !loadingLocations &&
    !!profile.firstName.trim() &&
    !!profile.lastName.trim() &&
    !!profile.mobilePhone.trim() &&
    !!profile.country.trim() &&
    !!profile.stateProvince.trim() &&
    phoneValid;

  const onCountryChange = (country: string) => {
    setFormError('');
    setProfile((prev) => ({
      ...prev,
      country,
      stateProvince: '',
    }));
  };

  const onSave = async () => {
    setFormError('');

    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      setFormError('First Name and Last Name are required.');
      return;
    }

    if (!phoneValid) {
      setFormError('Mobile phone must follow E.164 format, for example +639171234567.');
      return;
    }

    if (!profile.country.trim() || !profile.stateProvince.trim()) {
      setFormError('Country and Province/State are required.');
      return;
    }

    try {
      setSaving(true);
      setSaveDialog({
        open: true,
        tone: 'saving',
        title: 'Saving profile',
        message: 'Please wait while we update your information.',
      });

      const res = await fetch(`${apiBase()}/api/user/account-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: profile.email,
          FirstName: profile.firstName.trim(),
          LastName: profile.lastName.trim(),
          DateofBirth: profile.dateOfBirth.trim(),
          MobilePhone: profile.mobilePhone.trim(),
          Gender: profile.gender.trim(),
          AddressLine1: profile.addressLine1.trim(),
          PostalCode: profile.postalCode.trim(),
          Country: profile.country.trim().toUpperCase(),
          StateProvince: profile.stateProvince.trim(),
        }),
      });

      const isJSON = res.headers
        .get('content-type')
        ?.includes('application/json');
      const data = isJSON ? await res.json().catch(() => null) : null;

      if (!res.ok || data?.result === 'error' || data?.result !== 'success') {
        const message = getFriendlyProfileError(data?.message || '');
        setFormError(message);
        setSaveDialog({
          open: true,
          tone: 'error',
          title: 'Update failed',
          message,
        });
        window.setTimeout(() => {
          setSaveDialog({ open: false });
        }, 2200);
        return;
      }

      setSaveDialog({
        open: true,
        tone: 'success',
        title: 'Profile updated',
        message: 'Your changes were saved successfully.',
      });
      window.setTimeout(() => {
        setSaveDialog({ open: false });
      }, 1600);
    } catch (error) {
      const message = getFriendlyProfileError(
        getErrorMessage(error, 'Failed to update profile.')
      );
      setFormError(message);
      setSaveDialog({
        open: true,
        tone: 'error',
        title: 'Update failed',
        message,
      });
      window.setTimeout(() => {
        setSaveDialog({ open: false });
      }, 2200);
    } finally {
      setSaving(false);
    }
  };

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
      <SaveStatusDialog state={saveDialog} />
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold md:text-[28px]">
              User information
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Update the personal and address details used by your member
              profile.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-[#211F45] underline"
          >
            Return to Dashboard
          </Link>
        </div>

        <AccountTabs active="user-information" />

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
          {formError ? (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          ) : null}

          {loading ? (
            <div className="py-8 text-sm text-gray-500">Loading profile...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Membership Number</Label>
                  <StaticField value={profile.membershipNo} />
                </div>

                <div>
                  <Label>Email</Label>
                  <StaticField value={profile.email} />
                </div>

                <div>
                  <Label>
                    First Name<span className="text-red-500"> *</span>
                  </Label>
                  <Input
                    value={profile.firstName}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>
                    Last Name<span className="text-red-500"> *</span>
                  </Label>
                  <Input
                    value={profile.lastName}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={profile.dateOfBirth}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        dateOfBirth: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>
                    Mobile Phone<span className="text-red-500"> *</span>
                  </Label>
                  <PhoneInput
                    key={phoneCountry}
                    defaultCountry={phoneCountry}
                    value={profile.mobilePhone}
                    onChange={(phone) =>
                      setProfile((prev) => ({
                        ...prev,
                        mobilePhone: phone,
                      }))
                    }
                    className="!w-full !rounded-lg !border !border-gray-300 focus-within:!border-[#211F45]"
                    inputClassName="!w-full !border-0 !bg-transparent !text-[15px] !text-[#1F2042] !outline-none !shadow-none"
                  />
                  <Hint>Example: +1234567890</Hint>
                </div>

                <div>
                  <Label>Gender</Label>
                  <Select
                    value={profile.gender}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        gender: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Prefer not to say">
                      Prefer not to say
                    </option>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label>Address Line 1</Label>
                  <Input
                    value={profile.addressLine1}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        addressLine1: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>
                    Country<span className="text-red-500"> *</span>
                  </Label>
                  <Select
                    value={profile.country}
                    onChange={(e) => onCountryChange(e.target.value)}
                    disabled={loadingLocations}
                  >
                    <option value="">Select country</option>
                    {locationOptions.countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label>
                    Province / State<span className="text-red-500"> *</span>
                  </Label>
                  <Select
                    value={profile.stateProvince}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        stateProvince: e.target.value,
                      }))
                    }
                    disabled={!profile.country || provinceOptions.length === 0}
                  >
                    <option value="">
                      {profile.country
                        ? 'Select province/state'
                        : 'Select country first'}
                    </option>
                    {provinceOptions.map((province) => (
                      <option key={province} value={province}>
                        {province}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label>Postal Code</Label>
                  <Input
                    value={profile.postalCode}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        postalCode: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={onSave}
                  disabled={!canSave || saving}
                  className={`inline-flex items-center rounded-lg px-4 py-2 font-semibold text-white ${
                    !canSave || saving
                      ? 'cursor-not-allowed bg-gray-300'
                      : 'bg-[#211F45] hover:opacity-90'
                  }`}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
