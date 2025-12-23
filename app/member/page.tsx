'use client';

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// Option A phone input (CSS already in globals.css)
import { PhoneInput } from 'react-international-phone';

type FormState = {
  firstname: string;
  lastname: string;
  email: string;
  mobilenumber: string; // now controlled by PhoneInput
  password: string;
  country: string;
  postalcode: string;
};

type Agreements = {
  marketing: boolean;
  dataSharing: boolean;
};

type ResetMessage = { type: 'ok' | 'err'; text: string };

const KNOWN_COUNTRIES = [
  { country: 'Canada', iso2: 'ca' },
  { country: 'United States', iso2: 'us' },
  { country: 'Philippines', iso2: 'ph' },
  { country: 'United Kingdom', iso2: 'gb' },
  { country: 'Australia', iso2: 'au' },
] as const;

const countryToIso2 = (country: string) =>
  KNOWN_COUNTRIES.find((c) => c.country === country)?.iso2 || 'ca';

export default function LandingPage() {
  const router = useRouter();

  const [isSignup, setIsSignup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset-password slide
  const [isReset, setIsReset] = useState(false);
  const [rpEmail, setRpEmail] = useState('');
  const [rpBusy, setRpBusy] = useState(false);
  const [rpMsg, setRpMsg] = useState<ResetMessage | null>(null);

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
  });

  // Remember Me (same keys as LoginClient)
  const [rememberMe, setRememberMe] = useState(true);
  const EMAIL_KEY = 'login_email';
  const PASSWORD_KEY = 'login_password';
  const REMEMBER_KEY = 'remember_me';

  // Prefill Remember Me + saved email/password
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedPref = localStorage.getItem(REMEMBER_KEY); // "1" or "0"
      const savedEmail = localStorage.getItem(EMAIL_KEY) || '';
      const savedPassword = localStorage.getItem(PASSWORD_KEY) || '';
      if (savedPref !== null) setRememberMe(savedPref === '1');
      if (savedEmail) {
        setForm((prev) => ({ ...prev, email: savedEmail }));
      }
      if (savedPref === '1' && savedPassword) {
        setForm((prev) => ({ ...prev, password: savedPassword }));
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Same base used everywhere (incl. LoginClient)
  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL || '',
    []
  );

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;

    if (type === 'checkbox') {
      if (name === 'rememberMe') {
        const next = checked;
        setRememberMe(next);
        try {
          localStorage.setItem(REMEMBER_KEY, next ? '1' : '0');
          if (!next) {
            localStorage.removeItem(EMAIL_KEY);
            localStorage.removeItem(PASSWORD_KEY);
          } else {
            if (form.email) localStorage.setItem(EMAIL_KEY, form.email);
            if (form.password) localStorage.setItem(PASSWORD_KEY, form.password);
          }
        } catch {
          // ignore
        }
      } else {
        // marketing / dataSharing
        setAgreements((prev) => ({ ...prev, [name]: checked }));
      }
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const redirectAfterAuth = (url?: string) => {
    const target = url || '/dashboard';
    router.push(target);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Signup requires both checkboxes
    if (isSignup && (!agreements.marketing || !agreements.dataSharing)) {
      setError('Please agree to receive offers and data sharing before joining.');
      setIsSubmitting(false);
      return;
    }

    // Validate phone on signup (react-international-phone returns +E.164)
    if (isSignup) {
      const mobile = (form.mobilenumber || '').trim();
      if (!mobile || !mobile.startsWith('+') || mobile.length < 8) {
        setError('Please enter a valid phone number.');
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const endpoint = isSignup ? 'signup' : 'login';
      const apiPath = '/api/auth';
      const apiUrl = `${apiBase}${apiPath}/${endpoint}`;

      // Payload (aligned with updated backend)
      const payload = isSignup
        ? {
            firstname: form.firstname,
            lastname: form.lastname,
            email: form.email,
            mobilenumber: form.mobilenumber, // +639...
            password: form.password,
            country: form.country,
            postalcode: form.postalcode,
            communicationspreference: '111111',
            contactpreference: 'email',
            dateofbirth: '08/08/1988',
            mailingaddress: 'N/A',
            city: 'N/A',
            state: 'N/A',
            promotioncode: '',
            socialMediaType: '1',

            // IMPORTANT: removed risky overrides:
            // nationality: 'Canadian',
            // flag: '@',
          }
        : {
            email: form.email,
            password: form.password,
          };

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const json = await res.json().catch(() => ({}));
      setIsSubmitting(false);

      // === success detection ===
      const successFlag =
        json?.success === true ||
        json?.success === 'true' ||
        json?.result === 'success';

      const loginSuccess =
        !isSignup &&
        (Boolean(json?.loggedIn) || Boolean(json?.token) || successFlag);

      const signupSuccess =
        isSignup && (successFlag || Boolean(json?.created) || json?.status === 'created');

      const isSuccess = res.ok && (isSignup ? signupSuccess : loginSuccess);

      if (!isSuccess) {
        const apiMessage =
          json?.message ||
          json?.error ||
          json?.errors?.[0] ||
          (isSignup
            ? 'Signup failed. Please review your details.'
            : 'Invalid login. Please check your credentials.');

        setError(apiMessage);
        console.log('Landing login/signup failed:', json);
        return;
      }

      // === SUCCESS PATHS ===
      if (isSignup) {
        setError('');
        alert('Signup successful! Please sign in with your new account.');
        setIsSignup(false);
        setForm({
          firstname: '',
          lastname: '',
          email: '',
          mobilenumber: '',
          password: '',
          country: 'Canada',
          postalcode: '',
        });
        setAgreements({ marketing: false, dataSharing: false });
      } else {
        if (json.dashboard) {
          localStorage.setItem('dashboardData', JSON.stringify(json.dashboard));
        }

        const email = json?.email ?? form.email;
        const token = json?.token ?? json?.session?.token;

        if (email) {
          localStorage.setItem('email', email);
          document.cookie = `email=${encodeURIComponent(email)}; Path=/; Max-Age=2592000; SameSite=Lax`;
        }

        if (token) {
          localStorage.setItem('apiToken', token);
          document.cookie = `apiToken=${encodeURIComponent(token)}; Path=/; Max-Age=2592000; SameSite=Lax`;
        }

        // Remember-me storage
        try {
          if (!rememberMe) {
            localStorage.removeItem(EMAIL_KEY);
            localStorage.removeItem(PASSWORD_KEY);
            localStorage.setItem(REMEMBER_KEY, '0');
          } else {
            localStorage.setItem(REMEMBER_KEY, '1');
            if (form.email) localStorage.setItem(EMAIL_KEY, form.email);
            if (form.password) localStorage.setItem(PASSWORD_KEY, form.password);
          }
        } catch {
          // ignore
        }

        redirectAfterAuth(json.redirectUrl);
      }
    } catch (err) {
      console.error('Landing submit error:', err);
      setIsSubmitting(false);
      setError('Failed to connect to the server. Please try again.');
    }
  };

  // Reset password submit (email only)
  const handleResetSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRpMsg(null);
    if (!rpEmail) {
      setRpMsg({ type: 'err', text: 'Please enter your email.' });
      return;
    }

    try {
      setRpBusy(true);
      const res = await fetch(`${apiBase}/api/auth/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: rpEmail.trim().toLowerCase() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success !== true) {
        setRpMsg({
          type: 'err',
          text: json?.message || 'Request failed. Please try again.',
        });
      } else {
        setRpMsg({
          type: 'ok',
          text: json?.message || `Reset link sent to ${rpEmail}.`,
        });
        setTimeout(() => {
          setIsReset(false);
          setRpMsg(null);
        }, 2000);
      }
    } catch {
      setRpMsg({ type: 'err', text: 'Network error. Please try again.' });
    } finally {
      setRpBusy(false);
    }
  };

  // If you still use this page in iframe:
  useEffect(() => {
    const postSize = () => {
      const h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      window.parent?.postMessage({ type: 'frame-height', height: h }, '*');
    };
    postSize();
    const ro = new ResizeObserver(postSize);
    ro.observe(document.body);
    const t = setInterval(postSize, 800);
    return () => {
      ro.disconnect();
      clearInterval(t);
    };
  }, [isSignup, isReset]);

  const iso2 = countryToIso2(form.country);

  return (
    <div className="relative min-h-screen w-full">
      {/* Background */}
      <div className="absolute inset-0 bg-[url('/backgroundimg.jpg')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-black/30" />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* LEFT HERO (unchanged) */}
          <div className="text-white text-center lg:text-left max-w-2xl mx-auto lg:mx-0">
            <h1 className="font-[900] text-[34px] sm:text-[48px] md:text-[64px] leading-[102.5%] tracking-[-0.02em] mb-3 drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]">
              Unforgettable <br className="block sm:hidden" /> Vacations
            </h1>
            <p className="font-[700] text-[16px] sm:text-[20px] mb-3 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.35)]">
              • Extraordinary Adventures • Exclusive Rewards
            </p>
            <p className="mt-7 text-[14px] sm:text-[16px] leading-relaxed sm:leading-[1.65] text-white/90 max-w-[52ch] mx-auto lg:mx-0">
              Discover iconic destinations with member-only benefits and once-in-a-lifetime experiences.
            </p>
          </div>

          {/* RIGHT GLASS CARD */}
          <div className="w-full max-w-md mx-auto lg:mx-0 bg-white/85 backdrop-blur-sm border border-gray-300 rounded-[24px] p-6 sm:p-8 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
            {/* Logo */}
            <div className="flex justify-center mb-4 sm:mb-6">
              <Image
                src="/dreamtripclubicon.png"
                alt="Dream Trip Club Logo"
                width={340}
                height={80}
                className="object-contain"
              />
            </div>

            <div className="flex justify-center items-center gap-4 mb-3">
              <span className="font-[300] text-[20px] leading-[102.5%] tracking-[0.05em] text-black">
                REWARDS
              </span>
            </div>

            {/* RESET PASSWORD */}
            {isReset ? (
              <>
                <div className="mb-4 text-center">
                  <h1 className="text-[32px] font-extrabold leading-tight text-[#93AFB9]">
                    Reset your password
                  </h1>
                  <p className="mt-2 text-[14px] font-semibold text-neutral-900">
                    Enter your account email, and we’ll send you a reset link.
                  </p>
                </div>

                {rpMsg && (
                  <div
                    className={`mb-4 rounded-md border px-3 py-2 text-sm ${
                      rpMsg.type === 'ok'
                        ? 'border-green-300 bg-green-50 text-green-800'
                        : 'border-red-300 bg-red-50 text-red-800'
                    }`}
                  >
                    {rpMsg.text}
                  </div>
                )}

                <form onSubmit={handleResetSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm text-neutral-700">Email</label>
                    <input
                      type="email"
                      value={rpEmail}
                      onChange={(e) => setRpEmail(e.target.value)}
                      required
                      className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-[#1b4a68]"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={rpBusy}
                      className={`w-[160px] rounded-full px-5 py-2.5 text-sm font-bold text-white ${
                        rpBusy ? 'bg-neutral-400' : 'bg-[#211F45] hover:opacity-90'
                      }`}
                    >
                      {rpBusy ? 'Sending…' : 'Send Reset Link'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsReset(false);
                        setRpMsg(null);
                      }}
                      className="rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                {/* Heading */}
                <div className="mb-4 text-center">
                  <h1 className="text-[32px] font-extrabold leading-tight text-[#93AFB9]">
                    {isSignup ? 'Create Your Account' : 'Welcome to Dream Trip Club Rewards'}
                  </h1>
                  {!isSignup && (
                    <p className="mt-2 text-[14px] font-semibold text-neutral-900">
                      Let&apos;s get you signed in!
                    </p>
                  )}
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-300 text-red-800 p-3 rounded-[12px] text-sm mb-4">
                    {error}
                  </div>
                )}

                {/* LOGIN / SIGNUP FORM */}
                <form onSubmit={handleSubmit} className="space-y-3">
                  {isSignup && (
                    <>
                      <div>
                        <label className="mb-1 block text-sm text-neutral-700">First Name</label>
                        <input
                          name="firstname"
                          value={form.firstname}
                          onChange={handleChange}
                          required
                          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-[#1b4a68]"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm text-neutral-700">Last Name</label>
                        <input
                          name="lastname"
                          value={form.lastname}
                          onChange={handleChange}
                          required
                          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-[#1b4a68]"
                        />
                      </div>

                      {/* Phone Number (flag + full countries) */}
                      <div>
                        <label className="mb-1 block text-sm text-neutral-700">Phone Number</label>
                        <div className="w-full">
                          <PhoneInput
                            key={iso2}
                            defaultCountry={iso2}
                            value={form.mobilenumber}
                            onChange={(phone) => setForm((prev) => ({ ...prev, mobilenumber: phone }))}
                            className="!w-full !rounded-md !border !border-neutral-300 focus-within:!border-[#1b4a68]"
                            inputClassName="!w-full !border-0 !outline-none !shadow-none !bg-transparent !text-neutral-900"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-sm text-neutral-700">Country</label>
                          <select
                            name="country"
                            value={form.country}
                            onChange={handleChange}
                            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-[#1b4a68]"
                            required
                          >
                            {KNOWN_COUNTRIES.map((c) => (
                              <option key={c.country} value={c.country}>
                                {c.country}
                              </option>
                            ))}
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-sm text-neutral-700">Postal Code</label>
                          <input
                            name="postalcode"
                            value={form.postalcode}
                            onChange={handleChange}
                            required
                            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-[#1b4a68]"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="mb-1 block text-sm text-neutral-700">Email or Member Number</label>
                    <input
                      type="email"
                      name="email"
                      autoComplete="username"
                      value={form.email}
                      onChange={handleChange}
                      required
                      className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-[#1b4a68]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm text-neutral-700">Password</label>
                    <input
                      type="password"
                      name="password"
                      autoComplete="current-password"
                      value={form.password}
                      onChange={handleChange}
                      required
                      className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-[#1b4a68]"
                    />
                  </div>

                  {isSignup && (
                    <div className="space-y-1 text-xs text-neutral-700">
                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          name="marketing"
                          checked={agreements.marketing}
                          onChange={handleChange}
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
                          onChange={handleChange}
                          className="mt-1 h-4 w-4"
                          required
                        />
                        <span>I agree to data sharing with authorized partners.</span>
                      </label>
                    </div>
                  )}

                  {!isSignup && (
                    <div className="flex items-center justify-between text-sm pt-1">
                      <label className="inline-flex items-center gap-2 text-neutral-700">
                        <input
                          type="checkbox"
                          name="rememberMe"
                          checked={rememberMe}
                          onChange={handleChange}
                          className="h-4 w-4"
                        />
                        <span>Remember Me</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setRpMsg(null);
                          try {
                            const savedEmail = form.email || localStorage.getItem(EMAIL_KEY) || '';
                            setRpEmail(savedEmail);
                          } catch {
                            setRpEmail(form.email);
                          }
                          setIsReset(true);
                          setIsSignup(false);
                        }}
                        className="text-xs text-[#1898C4] hover:text-[#211F45] underline"
                      >
                        Forgot your password?
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-3 rounded-[12px] font-bold transition-all duration-300 ${
                      isSubmitting
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-[#1898C4] text-white hover:bg-[#211F45] hover:shadow-lg'
                    }`}
                  >
                    {isSubmitting ? 'Processing…' : isSignup ? 'Join Now' : 'Sign In'}
                  </button>
                </form>

                {isSignup ? (
                  <p className="mt-4 text-sm text-neutral-700 text-center">
                    Already a member?{' '}
                    <button
                      onClick={() => setIsSignup(false)}
                      className="underline underline-offset-2 text-[#EB6923]"
                    >
                      Sign In
                    </button>
                  </p>
                ) : (
                  <p className="mt-4 text-sm text-neutral-700 text-center">
                    New to Dream Trip Club?{' '}
                    <button
                      onClick={() => setIsSignup(true)}
                      className="underline underline-offset-2 text-[#EB6923]"
                    >
                      Create Your Account
                    </button>
                  </p>
                )}

                <div className="mt-6 flex justify-center gap-4">
                  <a
                    href="https://play.google.com/store/apps/details?id=ai.guestapp.dreamtripclub"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:opacity-80 transition-opacity"
                  >
                    <Image src="/ggstore.png" alt="Google Play" width={130} height={40} />
                  </a>
                  <a
                    href="https://apps.apple.com/us/app/dream-trip-club/id6753647319"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:opacity-80 transition-opacity"
                  >
                    <Image src="/applestore.png" alt="App Store" width={120} height={40} />
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
