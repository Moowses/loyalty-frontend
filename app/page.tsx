'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaCrown } from 'react-icons/fa6';
import Image from 'next/image';

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
    <div className="relative min-h-screen w-full bg-[#0A0A0A]">
      {/* Luxury Background Image */}
      <div 
        className="absolute inset-0 bg-[url('/backgroundimg.jpg')] bg-cover bg-center opacity-70"
       
      ></div>
      
      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12">
          {/* Hero Text */}
          <div className="text-white text-center lg:text-left max-w-xl">
            <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-wide mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#D4AF37] to-[#F5F5F5]">
                Unforgettable Vacations
              </span>
            </h1>
            <p className="text-xl md:text-2xl font-light mb-6 text-[#D4AF37]">
              Unbelievable Prices • Exclusive Rewards
            </p>
            <p className="text-lg text-gray-300 hidden lg:block">
              Discover dream destinations with exclusive member benefits and once-in-a-lifetime experiences.
            </p>
          </div>

          {/* Form Container */}
          <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] border border-[#333] rounded-xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-center mb-6">
             
            </div>
            <h2 className="text-2xl font-serif font-light text-center text-white mb-6">
              {isSignup ? 'Create Your Account' : 'Member Login'}
            </h2>
            
            
            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-100 p-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignup && (
                <>
                  <input 
                    name="firstname" 
                    placeholder="First Name" 
                    value={form.firstname} 
                    onChange={handleChange} 
                    required 
                    className="w-full p-3 bg-[#1A1A1A] border border-[#333] text-white rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent placeholder-gray-500" 
                  />
                  <input 
                    name="lastname" 
                    placeholder="Last Name" 
                    value={form.lastname} 
                    onChange={handleChange} 
                    required 
                    className="w-full p-3 bg-[#1A1A1A] border border-[#333] text-white rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent placeholder-gray-500" 
                  />
                  <input 
                    name="mobilenumber" 
                    placeholder="Mobile Number" 
                    value={form.mobilenumber} 
                    onChange={handleChange} 
                    required 
                    className="w-full p-3 bg-[#1A1A1A] border border-[#333] text-white rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent placeholder-gray-500" 
                  />
                </>
              )}
              <input 
                type="email" 
                name="email" 
                placeholder="Email" 
                value={form.email} 
                onChange={handleChange} 
                required 
                className="w-full p-3 bg-[#1A1A1A] border border-[#333] text-white rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent placeholder-gray-500" 
              />
              <input 
                type="password" 
                name="password" 
                placeholder="Password" 
                value={form.password} 
                onChange={handleChange} 
                required 
                className="w-full p-3 bg-[#1A1A1A] border border-[#333] text-white rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent placeholder-gray-500" 
              />
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className={`w-full py-3 rounded-lg font-medium transition-all duration-300 ${
                  isSubmitting 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-[#D4AF37] to-[#F5E6B2] text-[#0A0A0A] hover:from-[#F5E6B2] hover:to-[#D4AF37] hover:shadow-lg'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : isSignup ? 'Join Now' : 'Access Your Account'}
              </button>
            </form>

            <div className="text-center text-sm mt-6 text-gray-400">
              {isSignup ? 'Already a member?' : 'New to Dream Trip Club?'}{' '}
              <button 
                onClick={() => setIsSignup(!isSignup)} 
                className="text-[#D4AF37] hover:text-[#F5E6B2] underline font-medium"
              >
                {isSignup ? 'Sign In' : 'Create Account'}
              </button>
            </div>

            {/* App download prompt */}
            <div className="mt-8 pt-6 border-t border-[#333]">
              <p className="text-sm text-center text-gray-500 mb-4">Download our luxury travel companion</p>
              <div className="flex justify-center gap-4">
                <a href="https://play.google.com/store" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                  <Image 
                      src="/ggstore.png" 
                      alt="Google Play" 
                      width={120} 
                      height={40}
                      priority={false}
                    />
                </a>
                <a href="https://www.apple.com/app-store/" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                  <Image 
                      src="/applestore.png" 
                      alt="App Store" 
                      width={120} 
                      height={40}
                      priority={false}
                    />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}