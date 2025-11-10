'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

type FormState = {
  firstname: string;
  lastname: string;
  email: string;
  mobilenumber: string;
  password: string;
  country: string;
  postalcode: string;
};

type Agreements = { marketing: boolean; dataSharing: boolean; terms: boolean };

export default function LandingPage() {
  const router = useRouter();

  const [isSignup, setIsSignup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  // Same base used everywhere (incl. LoginClient)
  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL || '',
    []
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;

    if (type === 'checkbox') {
      setAgreements((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const redirectAfterAuth = (url?: string) => {
    const target = url || '/dashboard';
    router.push(target);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // same validation as LoginClient for signup
    if (
      isSignup &&
      (!agreements.marketing || !agreements.dataSharing || !agreements.terms)
    ) {
      setError(
        'Please agree to the marketing, data sharing, and terms & conditions.'
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const endpoint = isSignup ? 'signup' : 'login';
      const apiPath = '/api/auth';
      const apiUrl = `${apiBase}${apiPath}/${endpoint}`;

      // align payload with LoginClient
      const payload = isSignup
        ? {
            firstname: form.firstname,
            lastname: form.lastname,
            email: form.email,
            mobilenumber: form.mobilenumber,
            password: form.password,
            country: form.country,
            postalcode: form.postalcode,
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

      // === success detection (copied from LoginClient) ===
      const successFlag =
        json?.success === true ||
        json?.success === 'true' ||
        json?.result === 'success';

      const loginSuccess =
        !isSignup &&
        (Boolean(json?.loggedIn) ||
          Boolean(json?.token) ||
          successFlag);

      const signupSuccess =
        isSignup &&
        (successFlag ||
          Boolean(json?.created) ||
          json?.status === 'created');

      const isSuccess = res.ok && (isSignup ? signupSuccess : loginSuccess);

      if (!isSuccess) {
        const flag = json?.result?.flag ?? json?.flag ?? '';
        const apiMessage =
          json?.message ||
          json?.error ||
          json?.errors?.[0] ||
          (isSignup
            ? 'Signup failed. Please review your details.'
            : 'Invalid login. Please check your credentials.');

        setError(flag ? `${apiMessage}` : apiMessage);
        console.log('Landing login/signup failed:', json);
        return;
      }

      // === SUCCESS PATHS ===
      if (isSignup) {
        // Signup: same behavior you used before
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
      } else {
        // Login: mirror LoginClient storage so /dashboard AuthGuard works

        if (json.dashboard) {
          localStorage.setItem(
            'dashboardData',
            JSON.stringify(json.dashboard)
          );
        }

        const email = json?.email ?? form.email;
        const token = json?.token ?? json?.session?.token;

        if (email) {
          localStorage.setItem('email', email);
          document.cookie = `email=${encodeURIComponent(
            email
          )}; Path=/; Max-Age=2592000; SameSite=Lax`;
        }

        if (token) {
          localStorage.setItem('apiToken', token);
          document.cookie = `apiToken=${encodeURIComponent(
            token
          )}; Path=/; Max-Age=2592000; SameSite=Lax`;
        }

        redirectAfterAuth(json.redirectUrl);
      }
    } catch (err) {
      console.error('Landing submit error:', err);
      setIsSubmitting(false);
      setError('Failed to connect to the server. Please try again.');
    }
  };

  // (Optional) if you still use this page inside an iframe somewhere:
  useEffect(() => {
    const postSize = () => {
      const h = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
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
  }, [isSignup]);

  return (
    <div className="relative min-h-screen w-full">
      {/* Background */}
      <div className="absolute inset-0 bg-[url('/backgroundimg.jpg')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-black/30" />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* LEFT HERO */}
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

            {/* REWARDS label */}
            <div className="flex justify-center items-center gap-4 mb-5">
              <span className="font-[300] text-[20px] leading-[102.5%] tracking-[0.05em] text-black">
                REWARDS
              </span>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-300 text-red-800 p-3 rounded-[12px] text-sm mb-4">
                {error}
              </div>
            )}

            {/* FORM */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignup && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      First Name
                    </label>
                    <input
                      name="firstname"
                      value={form.firstname}
                      onChange={handleChange}
                      required
                      className="w-full p-3 bg-white border border-gray-300 text-black rounded-[12px] focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Last Name
                    </label>
                    <input
                      name="lastname"
                      value={form.lastname}
                      onChange={handleChange}
                      required
                      className="w-full p-3 bg-white border border-gray-300 text-black rounded-[12px] focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Mobile Number
                    </label>
                    <input
                      name="mobilenumber"
                      value={form.mobilenumber}
                      onChange={handleChange}
                      required
                      className="w-full p-3 bg-white border border-gray-300 text-black rounded-[12px] focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Country
                    </label>
                    <select
                      name="country"
                      value={form.country}
                      onChange={handleChange}
                      className="w-full p-3 bg-white border border-gray-300 text-black rounded-[12px] focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
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
                    <label className="block text-sm font-medium text-black mb-2">
                      Postal Code
                    </label>
                    <input
                      name="postalcode"
                      value={form.postalcode}
                      onChange={handleChange}
                      required
                      className="w-full p-3 bg-white border border-gray-300 text-black rounded-[12px] focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent placeholder-gray-400"
                    />
                  </div>
                  {/* Signup consent */}
                  <div className="space-y-1 text-xs text-neutral-700">
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        name="marketing"
                        checked={agreements.marketing}
                        onChange={handleChange}
                        className="mt-1"
                      />
                      <span>
                        I agree to receive marketing communications about Dream Trip Club promotions and offers.
                      </span>
                    </label>
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        name="dataSharing"
                        checked={agreements.dataSharing}
                        onChange={handleChange}
                        className="mt-1"
                      />
                      <span>
                        I agree that my information may be used to personalize my experience and rewards.
                      </span>
                    </label>
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        name="terms"
                        checked={agreements.terms}
                        onChange={handleChange}
                        className="mt-1"
                      />
                      <span>I have read and agree to the Terms &amp; Conditions.</span>
                    </label>
                  </div>
                </>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full p-3 bg-white border border-gray-300 text-black rounded-[12px] focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent placeholder-gray-400"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="w-full p-3 bg-white border border-gray-300 text-black rounded-[12px] focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent placeholder-gray-400"
                />
              </div>

              {/* Forgot password (login only) */}
              {!isSignup && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => router.push('/mobile/reset-password')}
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
                {isSubmitting
                  ? 'Processing…'
                  : isSignup
                  ? 'Join Now'
                  : 'SIGN IN'}
              </button>
            </form>

            {/* Toggle login/signup */}
            <div className="mt-4 mx-auto w-[356px] h-[26px] bg-white border border-gray-200 shadow-sm flex items-center justify-center px-3 text-center">
              <span className="text-[14px] leading-none text-black">
                {isSignup ? 'Already a member?' : 'New to Dream Trip Club?'}{' '}
                <button
                  onClick={() => setIsSignup(!isSignup)}
                  className="ml-1 text-[#EB6923] underline font-semibold hover:opacity-90"
                >
                  {isSignup ? 'Sign In' : 'Create Your Account'}
                </button>
              </span>
            </div>

            {/* Store links */}
            <div className="mt-6 flex justify-center gap-4">
              <a
                href="https://play.google.com/store"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
              >
                <Image
                  src="/ggstore.png"
                  alt="Google Play"
                  width={130}
                  height={40}
                />
              </a>
              <a
                href="https://apps.apple.com/us/app/dream-trip-club/id6753647319"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
              >
                <Image
                  src="/applestore.png"
                  alt="App Store"
                  width={120}
                  height={40}
                />
              </a>
            </div>
          </div>
          {/* /GLASS CARD */}
        </div>
      </div>
    </div>
  );
}
