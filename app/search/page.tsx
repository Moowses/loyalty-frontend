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

  return (
    <div className="flex space-x-4 max-w-4xl mx-auto p-4 bg-white rounded shadow">
      <input
        type="date"
        value={checkIn}
        onChange={(e) => setCheckIn(e.target.value)}
        className="border rounded px-3 py-2 flex-grow"
        placeholder="Check-in Date"
        required
      />
      <input
        type="date"
        value={checkOut}
        onChange={(e) => setCheckOut(e.target.value)}
        className="border rounded px-3 py-2 flex-grow"
        placeholder="Check-out Date"
        required
      />
      <select
        value={adults}
        onChange={(e) => setAdults(e.target.value)}
        className="border rounded px-3 py-2"
      >
        {[...Array(10).keys()].map((i) => (
          <option key={i + 1} value={i + 1}>{i + 1} Adults</option>
        ))}
      </select>
      <select
        value={children}
        onChange={(e) => setChildren(e.target.value)}
        className="border rounded px-3 py-2"
      >
        {[...Array(6).keys()].map((i) => (
          <option key={i} value={i}>{i} Children</option>
        ))}
      </select>
      <button
        onClick={handleSearch}
        className="bg-orange-600 text-white px-6 py-2 rounded"
      >
        Search
      </button>
    </div>
  );
}
