'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    firstname: '',
    lastname: '',
    email: '',
    mobilenumber: '',
    password: '',
    country: 'Canada',
    postalcode: '',
  });

  const [agreements, setAgreements] = useState({
    marketing: false,
    dataSharing: false,
    terms: false,
  });

  // ---- iframe autosize for WordPress embed ----
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    if (type === 'checkbox') {
      if (name in agreements) {
        setAgreements((prev) => ({ ...prev, [name]: checked }));
      }
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const redirectAfterAuth = (url?: string) => {
    const target = url || '/dashboard';
    // open new tab and notify parent (WP listener also opens)
    window.open(target, '_blank', 'noopener,noreferrer');
    window.parent?.postMessage({ type: 'auth-success', redirectUrl: target }, '*');
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setIsSubmitting(true);

  console.log('Submitting form with email:', form.email);
  console.log('Is signup:', isSignup);

  const endpoint = isSignup ? 'signup' : 'login';
  const apiBase = isSignup ? '/api/user/' : '/api/auth/';
  const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}${apiBase}${endpoint}`;

  console.log('API URL:', apiUrl);

  // FIXED: Send only the fields that backend expects
  const payload = isSignup
    ? {
        firstname: form.firstname,
        lastname: form.lastname,
        email: form.email,
        mobilenumber: form.mobilenumber,
        password: form.password,
        country: form.country,
        postalcode: form.postalcode,
        dateofbirth: '08/08/1988',
        nationality: 'Canadian'
      }
    : { 
        email: form.email,
        password: form.password 
      };

  console.log('Payload being sent:', payload);

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });

    // Check if response is OK before parsing JSON
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const json = await res.json();
    console.log('API response:', json);
    setIsSubmitting(false);

    // ----- robust success detection -----
    const successFlag = json?.flag === '0' || json?.result === 'success' || json?.success === true;

    const loginSuccess = !isSignup && (Boolean(json?.loggedIn) || Boolean(json?.token) || successFlag);
    const signupSuccess = isSignup && (successFlag || Boolean(json?.created) || json?.status === 'created');

    const isSuccess = res.ok && (isSignup ? signupSuccess : loginSuccess);

    if (!isSuccess) {
      const flag = json?.result?.flag ?? json?.flag ?? '';
      const apiMessage =
        json?.message ||
        json?.error ||
        json?.errors?.[0] ||
        (isSignup
          ? 'Signup failed. Please review your details.'
          : 'Invalid login. Please check your email and password.');

      setError(flag ? `${apiMessage} (code ${flag})` : apiMessage);
      return;
    }

    // success path - handle signup vs login differently
    if (isSignup) {
      // For signup success, show message and switch to login
      setError(''); // Clear any errors
      alert('Signup successful! Please sign in with your new account.');
      setIsSignup(false); // Switch to login form
      
      // Clear form after successful signup
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
      // For login success
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

      redirectAfterAuth(json.redirectUrl);
    }
  } catch (err) {
    setIsSubmitting(false);
    setError('Failed to connect to the server.');
    console.error('Submission error:', err);
  }
};

  return (
    <div className="relative min-h-screen w-full">
      {/* Background image */}
      <div className="absolute inset-0 bg-[url('/backgroundimg.jpg')] bg-cover bg-center" />
      {/* Darken overlay for legibility */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-6 sm:py-10">
        {/* Grid: 1 col on mobile, 2 cols on lg. Everything vertically centered */}
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* HERO TEXT (left on desktop, on top on mobile) */}
          <div className="text-white text-center lg:text-left max-w-2xl mx-auto lg:mx-0">
            <h1 className="font-[900] text-[34px] sm:text-[48px] md:text-[64px] leading-[102.5%] tracking-[-0.02em] mb-3 [text-shadow:0_2px_6px_rgba(0,0,0,0.35)]">
              Unforgettable <br className="block sm:hidden" /> Vacations
            </h1>
            <p className="font-[700] text-[16px] sm:text-[20px] mb-3 text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]">
              • Extraordinary Adventures • Exclusive Rewards
            </p>
            <p className="mt-7 text-[14px] sm:text-[16px] leading-relaxed sm:leading-[1.65] text-white/90 max-w-[52ch] mx-auto lg:mx-0">
            Discover iconic destinations with member-only benefits and once-in-a-lifetime experiences.
          </p>
          </div>

          {/* GLASS CARD (form) */}
          <div className="w-full max-w-md mx-auto lg:mx-0 bg-white/85 backdrop-blur-sm border border-gray-300 rounded-[24px] p-6 sm:p-8 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
            {/* Logo */}
            <div className="flex justify-center mb-4 sm:mb-6">
              <Image
                src="/dreamtripclubicon.png"
                alt="Dream Trip Club Logo"
                width={340}
                height={80}
                className="object-contain"
                priority={false}
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
                    <label className="block text-sm font-medium text-black mb-2">First Name</label>
                    <input
                      name="firstname"
                      value={form.firstname}
                      onChange={handleChange}
                      required
                      className="w-full p-3 bg-white border border-gray-300 text-black rounded-[12px] focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent placeholder-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black mb-2">Last Name</label>
                    <input
                      name="lastname"
                      value={form.lastname}
                      onChange={handleChange}
                      required
                      className="w-full p-3 bg-white border border-gray-300 text-black rounded-[12px] focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent placeholder-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black mb-2">Mobile Number</label>
                    <input
                      name="mobilenumber"
                      value={form.mobilenumber}
                      onChange={handleChange}
                      required
                      className="w-full p-3 bg-white border border-gray-300 text-black rounded-[12px] focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent placeholder-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black mb-2">Country</label>
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
                    <label className="block text-sm font-medium text-black mb-2">Postal Code</label>
                    <input
                      name="postalcode"
                      value={form.postalcode}
                      onChange={handleChange}
                      required
                      className="w-full p-3 bg-white border border-gray-300 text-black rounded-[12px] focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent placeholder-gray-400"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-black mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full p-3 bg-white border border-gray-300 text-black rounded-[12px] focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">Password</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="w-full p-3 bg-white border border-gray-300 text-black rounded-[12px] focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent placeholder-gray-400"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 rounded-[12px] font-bold transition-all duration-300 ${
                  isSubmitting
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-[#1898C4] text-white hover:bg-[#211F45] hover:shadow-lg'
                }`}
              >
                {isSubmitting ? 'Processing…' : isSignup ? 'Join Now' : 'SIGN IN'}
              </button>
            </form>

            {/* CTA banner – 356 x 26 pill */}
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

            {/* Store badges */}
            <div className="mt-6">
              <div className="flex justify-center gap-4">
                <a
                  href="https://play.google.com/store"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity"
                >
                  <Image src="/ggstore.png" alt="Google Play" width={130} height={40} />
                </a>
                <a
                  href="https://www.apple.com/app-store/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity"
                >
                  <Image src="/applestore.png" alt="App Store" width={120} height={40} />
                </a>
              </div>
            </div>
          </div>
          {/* /GLASS CARD */}
        </div>
      </div>
    </div>
  );
}