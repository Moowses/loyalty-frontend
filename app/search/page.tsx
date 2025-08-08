'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SearchTab() {
  const router = useRouter();

  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState('1');
  const [children, setChildren] = useState('0');

  const handleSearch = () => {
    if (!checkIn || !checkOut) {
      alert('Please select check-in and check-out dates.');
      return;
    }
    // Redirect to results page with query params
    const query = new URLSearchParams({
      startDate: checkIn,
      endDate: checkOut,
      adult: adults,
      child: children,
    });
    router.push(`/search/results?${query.toString()}`);
  };

  // Format date for display
  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return 'Select date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-1 bg-gray-100">
       
      </div>
      
      <div className="flex flex-col md:flex-row items-center p-4">
        <div className="flex-1 w-full md:w-auto mb-4 md:mb-0 md:mr-4">
          <div className="flex items-center border-b-2 border-gray-200 pb-2">
            <div className="mr-4">
              <p className="text-xs font-semibold text-gray-500">CHECK-IN</p>
              <div className="relative">
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  required
                />
                <p className="text-lg font-medium cursor-pointer">
                  {formatDisplayDate(checkIn)}
                </p>
              </div>
            </div>
            
            <div className="text-gray-400 mx-2">—</div>
            
            <div>
              <p className="text-xs font-semibold text-gray-500">CHECK-OUT</p>
              <div className="relative">
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  required
                />
                <p className="text-lg font-medium cursor-pointer">
                  {formatDisplayDate(checkOut)}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 w-full md:w-auto mb-4 md:mb-0 md:mr-4">
          <div className="flex items-center space-x-4">
            <div>
              <p className="text-xs font-semibold text-gray-500">ADULTS</p>
              <select
                value={adults}
                onChange={(e) => setAdults(e.target.value)}
                className="border-none text-lg font-medium focus:ring-0 focus:outline-none text-black"
              >
                {[...Array(10).keys()].map((i) => (
                  <option key={i + 1} value={i + 1} className="text-black">{i + 1}</option>
                ))}
              </select>
            </div>
            
            <div>
              <p className="text-xs font-semibold text-gray-500">CHILDREN</p>
              <select
                value={children}
                onChange={(e) => setChildren(e.target.value)}
                className="border-none text-lg font-medium focus:ring-0 focus:outline-none text-black"
              >
                {[...Array(6).keys()].map((i) => (
                  <option key={i} value={i} className="text-black">{i}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <button
          onClick={handleSearch}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200"
        >
          Search
        </button>
      </div>
    </div>
  );
}