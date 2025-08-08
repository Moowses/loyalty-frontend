'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';

export default function SearchResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL query params
  const initialStartDate = searchParams.get('startDate') || '';
  const initialEndDate = searchParams.get('endDate') || '';
  const initialAdult = searchParams.get('adult') || '1';
  const initialChild = searchParams.get('child') || '0';

  // Local state for search bar
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [adult, setAdult] = useState(initialAdult);
  const [child, setChild] = useState(initialChild);

  // Fixed location for demo - update or make dynamic as needed
  const lng = '-63.7612867';
  const lat = '46.3097491';

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Calculate number of nights
  const numDays = startDate && endDate
    ? differenceInCalendarDays(parseISO(endDate), parseISO(startDate))
    : 0;

  // Fetch availability whenever search params change
  useEffect(() => {
    async function fetchAvailability() {
      if (!startDate || !endDate) {
        setError('Please select check-in and check-out dates.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError('');
        const params = new URLSearchParams({
          startDate,
          endDate,
          lng,
          lat,
          adult,
          child,
          infant: '0',
          pet: 'no',
        });
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/booking/availability?${params.toString()}`);
        const data = await res.json();

        if (data.success && data.data && data.data.data) {
          setRooms(data.data.data);
        } else {
          setRooms([]);
          setError('No availability found for the selected dates.');
        }
      } catch {
        setError('Failed to fetch availability.');
        setRooms([]);
      } finally {
        setLoading(false);
      }
    }

    fetchAvailability();
  }, [startDate, endDate, adult, child]);

  // When user clicks Search button - update URL params (this triggers useEffect)
  const handleSearch = () => {
    if (!startDate || !endDate) {
      alert('Please select check-in and check-out dates.');
      return;
    }
    const query = new URLSearchParams({
      startDate,
      endDate,
      adult,
      child,
    });
    router.push(`/search/results?${query.toString()}`);
  };

  // Redirect to booking page with room info
  const handleBookNow = (room) => {
    const query = new URLSearchParams({
      hotelId: room.hotelId,
      roomId: room.roomTypeId,
      startDate,
      endDate,
      adult,
      child,
    });
    router.push(`/booking/confirm?${query.toString()}`);
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Search bar */}
      <div className="flex flex-wrap gap-4 mb-8 bg-white p-4 rounded shadow">
        <div>
          <label className="block font-semibold mb-1">Check-in</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Check-out</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Adults</label>
          <select
            value={adult}
            onChange={(e) => setAdult(e.target.value)}
            className="border rounded px-3 py-2"
          >
            {[...Array(10).keys()].map((i) => (
              <option key={i + 1} value={i + 1}>{i + 1}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-semibold mb-1">Children</label>
          <select
            value={child}
            onChange={(e) => setChild(e.target.value)}
            className="border rounded px-3 py-2"
          >
            {[...Array(6).keys()].map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={handleSearch}
            className="bg-orange-600 text-white font-semibold px-6 py-3 rounded"
          >
            Update Search
          </button>
        </div>
      </div>

      {/* Results count */}
      {!loading && !error && (
        <p className="mb-4 text-gray-700">
          Showing {rooms.length} {rooms.length === 1 ? 'Result' : 'Results'}
        </p>
      )}

      {/* Loading state */}
      {loading && <p>Loading availability...</p>}

      {/* Error state */}
      {error && <p className="text-red-600">{error}</p>}

      {/* Rooms list */}
      <div className="space-y-6">
        {rooms.map((room) => (
          <div key={room.roomTypeId} className="flex border rounded p-4 shadow">
            <div className="w-48 h-32 bg-gray-200 flex items-center justify-center mr-6">
              {/* Placeholder for hotel image */}
              <span className="text-gray-500">No Image</span>
            </div>
            <div className="flex-grow">
              <h2 className="text-xl font-semibold mb-1">{room.hotelName}</h2>
              <p className="mb-1">Room Type: {room.RoomType}</p>
              <p className="mb-1">Capacity: {room.capacity} guests</p>
              <p className="mb-4 font-semibold">
                {numDays} {numDays === 1 ? 'night' : 'nights'} — Total Price: ${room.totalPrice}
              </p>
              <button
                onClick={() => handleBookNow(room)}
                className="bg-orange-600 text-white px-4 py-2 rounded"
              >
                Book Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
