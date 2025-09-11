'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MiniDashboard from './MiniDashboard';


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
  const redirectPath = search.get('redirect') || '/dashboard';
  const [showSignupSuccess1, setShowSignupSuccess1] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // slide mode: login | signup | reset
    const [isReset, setIsReset] = useState(false);
    const [rpEmail, setRpEmail] = useState('');
    const [rpBusy, setRpBusy] = useState(false);
    const [rpMsg, setRpMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);


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
    const email = localStorage.getItem('email');
    const token = localStorage.getItem('apiToken');
    setIsLoggedIn(!!email && !!token);
  }, []);
  const EMAIL_KEY = 'login_email';
  const PASSWORD_KEY = 'login_password';  // unify key name
  const REMEMBER_KEY = 'remember_me';
  // Prefill Remember Me + saved email
 useEffect(() => {
  try {
    const savedPref = localStorage.getItem(REMEMBER_KEY); // "1" or "0"
    const savedEmail = localStorage.getItem(EMAIL_KEY) || '';
    const savedPassword = localStorage.getItem(PASSWORD_KEY) || '';
    if (savedPref !== null) setRememberMe(savedPref === '1');
    if (savedEmail) setForm(prev => ({ ...prev, email: savedEmail }));
    if (savedPref === '1' && savedPassword) {
      setForm(prev => ({ ...prev, password: savedPassword }));
    }
  } catch {}
}, []);


  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL, []);

const handleInput = (
  e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
) => {
  const { name, value, type, checked } = e.target as HTMLInputElement;

  if (type === 'checkbox') {
    if (name === 'rememberMe') {
      setRememberMe(checked);
      try {
        localStorage.setItem(REMEMBER_KEY, checked ? '1' : '0');
        if (!checked) {
          localStorage.removeItem(EMAIL_KEY);
          localStorage.removeItem(PASSWORD_KEY);
        } else {
          if (form.email) localStorage.setItem(EMAIL_KEY, form.email);
          if (form.password) localStorage.setItem(PASSWORD_KEY, form.password);
        }
      } catch {}
    } else {
      setAgreements(prev => ({ ...prev, [name]: checked }));
    }
    return;
  }

  // text/select updates
  setForm(prev => {
    const next = { ...prev, [name]: value };
    try {
      if (rememberMe) {
        if (name === 'email') localStorage.setItem(EMAIL_KEY, value);
        if (name === 'password') localStorage.setItem(PASSWORD_KEY, value);
      }
    } catch {}
    return next;
  });
};



  // ===== Auto-resize iframe + remove top space =====
  useEffect(() => {
    document.documentElement.style.margin = '0';
    document.body.style.margin = '0';
    document.documentElement.style.padding = '0';
    document.body.style.padding = '0';

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
  }, [isSignup,isReset]);

  const redirectAfterAuth = (url?: string) => {
    const target = url || redirectPath || '/minidashboard';
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
      // FIXED: Use correct endpoints
      const endpoint = isSignup ? 'signup' : 'login';
      const apiPath = '/api/auth';
      
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

      const res = await fetch(`${apiBase}${apiPath}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const json = await res.json();
      setIsSubmitting(false);

      // Robust success detection (matches your main page)
      
      const successFlag = json?.success === true || json?.success === 'true' || json?.result === 'success';
      const loginSuccess = !isSignup && (Boolean(json?.loggedIn) || Boolean(json?.token) || successFlag);
      const signupSuccess = isSignup && (successFlag || Boolean(json?.created) || json?.status === 'created');
      const isSuccess = res.ok && (isSignup ? signupSuccess : loginSuccess);

      if (!isSuccess) {
        const flag = json?.result?.flag ?? json?.flag ?? '';
        const apiMessage = json?.message || json?.error || json?.errors?.[0] || 
          (isSignup ? 'Signup failed. Please review your details.' : 'Invalid login. Please check your credentials.');
        
        setError(flag ? `${apiMessage}` : apiMessage);
        return;
      }

      // Store email and remember me preference
      if (rememberMe) {
        localStorage.setItem('login_email', form.email);
      } else {
        localStorage.removeItem('login_email');
      }

      // Store authentication data (matches main page behavior)
     if (!isSignup) {
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

          if (json.dashboard) {
            localStorage.setItem('dashboardData', JSON.stringify(json.dashboard));
          }

          // Show mini dashboard instead of redirecting
          setIsLoggedIn(true);
          setForm(prev => ({
  ...prev,
  email: rememberMe ? prev.email : '',
  password: '' // always clear the input field
}));

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
} catch {}
          
        } else {
          // For signups, you might still want to redirect
        setShowSignupSuccess1(true);
  
          // Auto-return to login after 3 seconds
          setTimeout(() => {
            setIsSignup(false);
            setShowSignupSuccess1(false);
            
            // Pre-fill the email field for convenience
            setForm(prev => ({ ...prev, email: form.email }));
          }, 3000);
        }
    } catch (err) {
      setIsSubmitting(false);
      setError('Failed to connect to the server. Please try again.');
    }
  };

return (
  <div className="w-full m-0 p-0 bg-transparent">
    <div className="mx-auto w-full max-w-md rounded-xl p-6">
      {isLoggedIn ? (
        <MiniDashboard />
      ) : (
        <>
         {/* RESET PASSWORD SLIDE - Email-only request */}
{isReset ? (
  <>
    <div className="mb-4">
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

    <form
      onSubmit={async (e) => {
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
            setRpMsg({ type: 'err', text: json?.message || 'Request failed. Please try again.' });
          } else {
            setRpMsg({
              type: 'ok',
              text: json?.message || `Reset link sent to ${rpEmail}.`,
            });
            // Optionally return to sign-in after a short pause
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
      }}
      className="space-y-4"
    >
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
            setIsReset(false);   // back to login
            setRpMsg(null);
          }}
          className="rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          Back to Sign In
        </button>
      </div>
    </form>

    {/* Divider */}
    <hr className="my-6 border-neutral-200" />
  </>
) : (
  /* LOGIN/SIGNUP FORMS - Only show when not in reset mode */

            /* LOGIN/SIGNUP FORMS - Only show when not in reset mode */
            <>
              {/* Your existing login form JSX */}
              <div className="mb-4">
                <h1 className="text-[40px] font-extrabold leading-[104.5%] tracking-[-0.0em] text-[#93AFB9]">
                  {isSignup ? 'Create Your Account' : 'Welcome to Dream Trip Club Rewards'}
                </h1>
                {!isSignup && (
                  <p className="mt-2 text-[15px] font-semibold text-neutral-900">
                    Let's get you signed in!
                  </p>
                )}
              </div>

              {error && (
                <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {error}
                </div>
              )}
              
              {showSignupSuccess1 && (
                <div className="mb-4 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
                  Success! Your account has been created. Returning to login...
                </div>
              )}

              {/* FORM */}
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
                        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-[#1b4a68]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-neutral-700">Last Name</label>
                      <input
                        name="lastname"
                        value={form.lastname}
                        onChange={handleInput}
                        required
                        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-[#1b4a68]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-neutral-700">Mobile Number</label>
                      <input
                        name="mobilenumber"
                        value={form.mobilenumber}
                        onChange={handleInput}
                        required
                        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-[#1b4a68]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-sm text-neutral-700">Country</label>
                        <select
                          name="country"
                          value={form.country}
                          onChange={handleInput}
                          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-[#1b4a68]"
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
                          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-[#1b4a68]"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="mb-1 block text-sm text-neutral-700">
                    Email or Member Number
                  </label>
                  <input
                    type="email"
                    name="email"
                    autoComplete="username"
                    value={form.email}
                    onChange={handleInput}
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
                    onChange={handleInput}
                    required
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-[#1b4a68]"
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
                    <label htmlFor="rememberMe" className="text-sm text-neutral-700">
                      Remember Me
                    </label>
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
                  className={`w-[120px] rounded-full px-5 py-2.5 text-sm font-bold text-white transition ${
                    isSubmitting
                      ? 'cursor-not-allowed bg-neutral-400'
                      : 'bg-[#211F45] hover:opacity-90'
                  }`}
                >
                  {isSubmitting ? 'Processing…' : isSignup ? 'Join Now' : 'Sign In'}
                </button>
              </form>

              {/* Under-button links (only in Sign In mode) */}
              {!isSignup && (
                <div className="mt-3 flex gap-6 text-sm">
                 <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setRpMsg(null);
                    setRpEmail(form.email || localStorage.getItem('login_email') || '');
                    setIsReset(true);     // slide to reset screen
                    setIsSignup(false);   // ensure signup slide is off
                  }}
                  className="text-[#c85e1f] underline underline-offset-2 hover:opacity-80"
                >
                  Forgot password?
                </a>

                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="text-[#c85e1f] underline underline-offset-2 hover:opacity-80"
                  >
                   
                  </a>
                </div>
              )}
              

              {/* Divider */}
              <hr className="my-6 border-neutral-200" />

              {/* "Not a Member?" + Icons (HIDE when joining) */}
              {!isSignup && (
                <section>
                  <h2 className="text-[22px] font-extrabold text-neutral-900">
                    Not a Member?
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-700">
                    Members enjoy exclusive perks across all Cottage Dream Vacations
                    properties. Membership is free and starts rewarding you from your very first stay.
                  </p>

                  {/* Benefits row */}
                  <div className="mt-4 grid grid-cols-4 gap-0 sm:grid-cols-4">
                    <div className="flex flex-col text-[#211F45] items-center text-center">
                      <Image src="/earnpoints.png" alt="Earn Points" width={30} height={30} />
                      <span className="mt-1 text-[11px] font-semibold leading-tight">
                        EARN<br />POINTS
                      </span>
                    </div>
                    <div className="flex flex-col text-[#211F45] items-center text-center">
                      <Image src="/concierge.png" alt="Concierge Service" width={30} height={30} />
                      <span className="mt-1 text-[11px] font-semibold leading-tight">
                        CONCIERGE<br />SERVICE
                      </span>
                    </div>
                    <div className="flex flex-col text-[#211F45] items-center text-center">
                      <Image src="/wifi.png" alt="Free Wi‑Fi" width={30} height={30} />
                      <span className="mt-1 text-[11px] font-semibold leading-tight">
                        FREE<br />WI‑FI
                      </span>
                    </div>
                    <div className="flex flex-col text-[#211F45] items-center text-center">
                      <Image src="/memberoffer.png" alt="Member Offers" width={30} height={30} />
                      <span className="mt-1 text-[11px] font-semibold leading-tight">
                        MEMBER<br />OFFERS
                      </span>
                    </div>
                  </div>

                  {/* Join button */}
                  <button
                    type="button"
                    onClick={() => setIsSignup(true)}
                    className="mt-6 inline-flex items-center rounded-full border border-[#211F45] px-5 py-2 text-sm font-bold text-[#211F45] hover:bg-[#211F45] hover:text-white"
                  >
                    JOIN FREE NOW!
                  </button>
                </section>
              )}
              

              {/* Swap link beneath signup form */}
              {isSignup && (
                <p className="mt-4 text-sm text-neutral-700">
                  Already a member?{' '}
                  <button onClick={() => setIsSignup(false)} className="underline underline-offset-2">
                    Sign In
                  </button>
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  </div>
);
}