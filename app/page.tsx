'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    firstname: '',
    lastname: '',
    email: '',
    mobilenumber: '',
    password: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const endpoint = isSignup ? 'signup' : 'dashboard';
    const payload = isSignup ? form : { email: form.email, password: form.password };

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      setIsSubmitting(false);
      if (json.success) {
        if (!isSignup) {
          localStorage.setItem('dashboardData', JSON.stringify(json.dashboard));
          router.push('/dashboard');
        } else {
          alert(`Signup successful. Membership No: ${json.result?.data?.[0]?.membershipno}`);
          setIsSignup(false);
          router.push('/');
        }
      } else {
        setError(json.message || 'Something went wrong.');
      }
    } catch (err) {
      setIsSubmitting(false);
      setError('Failed to connect to the server.');
    }
  };

  return (
    <div className="relative min-h-screen w-full "
        style={{
          backgroundImage: "url('/backgroundimg.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}>
      {/* Overlay */}
     <div className="absolute inset-0 flex items-center justify-center px-4 py-12">

        <div className="w-full max-w-4xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Hero Text */}
          <div className="text-white text-center lg:text-left max-w-lg">
            <h1 className="text-4xl md:text-5xl font-bold tracking-wide mb-4">Unforgettable Vacations</h1>
            <p className="text-xl md:text-2xl font-light mb-6">Unbelievable Prices • Exclusive Rewards</p>
            <p className="text-lg hidden lg:block">
              Discover dream destinations with exclusive member benefits and once-in-a-lifetime experiences.
            </p>
          </div>

          {/* Form Container */}
          <div className="bg-white rounded-xl p-8 w-full max-w-sm text-gray-800 shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-center">{isSignup ? 'Sign Up' : 'Log In'}</h2>
            {error && <p className="text-red-600 text-sm mb-2 text-center">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignup && (
                <>
                  <input name="firstname" placeholder="First Name" value={form.firstname} onChange={handleChange} required className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  <input name="lastname" placeholder="Last Name" value={form.lastname} onChange={handleChange} required className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  <input name="mobilenumber" placeholder="Mobile Number" value={form.mobilenumber} onChange={handleChange} required className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </>
              )}
              <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} required className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} required className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              <button type="submit" disabled={isSubmitting} className={`w-full py-3 text-white rounded-lg font-medium transition-colors ${isSubmitting ? 'bg-gray-500' : 'bg-[#003B73] hover:bg-[#005F73]'}`}>
                {isSubmitting ? 'Processing...' : isSignup ? 'Sign Up' : 'Log In'}
              </button>
            </form>
            <p className="text-center text-sm mt-4">
              {isSignup ? 'Already have an account?' : 'Don’t have an account?'}{' '}
              <button onClick={() => setIsSignup(!isSignup)} className="text-[#003B73] hover:text-[#005F73] underline font-medium">
                {isSignup ? 'Log In' : 'Sign Up'}
              </button>
              {/* App download prompt */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 mb-2">Download our app to access all features</p>
                <div className="flex justify-center gap-3">
                  <a href="https://play.google.com/store" target="_blank" rel="noopener noreferrer">
                    <img src="/ggstore.png" alt="Get it on Google Play" className="h-10" />
                  </a>
                  <a href="https://www.apple.com/app-store/" target="_blank" rel="noopener noreferrer">
                    <img src="/applestore.png" alt="Download on the App Store" className="h-10" />
                  </a>
                </div>
              </div>

            </p>
          </div>
        </div>
      </div>
    </div>
  );
}