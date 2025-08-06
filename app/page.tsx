'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
    country: 'Canada', // Default value
    postalcode: '', // Default value
  });
  const [agreements, setAgreements] = useState({
    marketing: false,
    dataSharing: false,
    terms: false,
  });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setAgreements(prev => ({ ...prev, [name]: checked }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (isSignup && (!agreements.marketing || !agreements.dataSharing )) {
      setError('Please agree to all terms and conditions');
      setIsSubmitting(false);
      return;
    }

    const endpoint = isSignup ? 'signup' : 'dashboard';
    const payload = isSignup ? {
      ...form,
      communicationspreference: '111111', // As per your backend
      contactpreference: 'email',
      dateofbirth: '08/08/1988', // Default as per your backend
      nationality: 'Canadian', // Default as per your backend
      mailingaddress: 'N/A', // Default as per your backend
      city: 'N/A', // Default as per your backend
      state: 'N/A', // Default as per your backend
      promotioncode: '',
      flag: '@',
      socialMediaType: '1',
    } : { email: form.email, password: form.password };

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
        setError('Username is already registered with a profile');
      }
    } catch (err) {
      setIsSubmitting(false);
      setError('Failed to connect to the server.');
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0A0A0A]">
      {/* Background Image */}
      <div className="absolute inset-0 bg-[url('/backgroundimg.jpg')] bg-cover bg-center opacity-70"></div>
      
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
              <Image 
                src="/dreamtripclubicon.png" 
                alt="Dream Trip Club Logo"
                width={200}
                height={80}
                className="object-contain"
              />
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
                  <select
                    name="country"
                    value={form.country}
                    onChange={(e) => setForm({...form, country: e.target.value})}
                    className="w-full p-3 bg-[#1A1A1A] border border-[#333] text-white rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                    required
                  >
                    
                      <option value="Canada">Canada</option>
                      <option value="United States">United States</option>
                      <option value="Mexico">Mexico</option>
                      <option value="Brazil">Brazil</option>
                      <option value="Argentina">Argentina</option>
                      <option value="Colombia">Colombia</option>
                      <option value="Chile">Chile</option>
                      <option value="Peru">Peru</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Germany">Germany</option>
                      <option value="France">France</option>
                      <option value="Italy">Italy</option>
                      <option value="Spain">Spain</option>
                      <option value="Netherlands">Netherlands</option>
                      <option value="Sweden">Sweden</option>
                      <option value="Norway">Norway</option>
                      <option value="Switzerland">Switzerland</option>
                      <option value="Ireland">Ireland</option>
                      <option value="Poland">Poland</option>
                      <option value="Philippines">Philippines</option>
                      <option value="India">India</option>
                      <option value="China">China</option>
                      <option value="Japan">Japan</option>
                      <option value="South Korea">South Korea</option>
                      <option value="Singapore">Singapore</option>
                      <option value="Malaysia">Malaysia</option>
                      <option value="Indonesia">Indonesia</option>
                      <option value="Vietnam">Vietnam</option>
                      <option value="Thailand">Thailand</option>
                      <option value="Pakistan">Pakistan</option>
                      <option value="Bangladesh">Bangladesh</option>
                      <option value="Hong Kong">Hong Kong</option>
                      <option value="Taiwan">Taiwan</option>
                      <option value="Australia">Australia</option>
                      <option value="New Zealand">New Zealand</option>
                      <option value="Fiji">Fiji</option>
                      <option value="United Arab Emirates">United Arab Emirates</option>
                      <option value="Saudi Arabia">Saudi Arabia</option>
                      <option value="Qatar">Qatar</option>
                      <option value="Kuwait">Kuwait</option>
                      <option value="Israel">Israel</option>
                      <option value="Turkey">Turkey</option>
                      <option value="South Africa">South Africa</option>
                      <option value="Nigeria">Nigeria</option>
                      <option value="Egypt">Egypt</option>
                      <option value="Kenya">Kenya</option>
                      <option value="Ghana">Ghana</option>
                      <option value="Morocco">Morocco</option>
                      <option value="Other">Other</option>
                  </select>

                  <input 
                    name="postalcode" 
                    placeholder="Postal Code/Zip Code" 
                    value={form.postalcode} 
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

              {isSignup && (
                <div className="space-y-3 text-sm text-gray-400">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      name="marketing"
                      checked={agreements.marketing}
                      onChange={handleChange}
                      className="mt-1"
                      required
                    />
                    <label>
                      I agree to receive personalized offers and travel updates from Cottage Dream Vacation Group via email, text, and app notifications, as per the privacy policy.
                    </label>
                  </div>
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      name="dataSharing"
                      checked={agreements.dataSharing}
                      onChange={handleChange}
                      className="mt-1"
                      required
                    />
                    <label>
                      I agree to let Cottage Dream Vacation Group share my data with authorized partners to receive personalized offers and marketing via email, text, and app notifications, as per the privacy policy.
                    </label>
                  </div>
                  <div className="flex items-start gap-2">
                   
                    <label>
                      By signing up, I agree to Cottage Dream Vacation's Terms of Use & Data Privacy Center.
                    </label>
                  </div>
                </div>
              )}

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