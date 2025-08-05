'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaBellConcierge, FaSuitcaseRolling, FaGift, FaReceipt } from 'react-icons/fa6';

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [reservations, setReservations] = useState({ upcoming: [], past: [] });
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const dashboard = localStorage.getItem('dashboardData');
    const storedReservations = localStorage.getItem('reservations');
    if (!dashboard) return router.push('/');
    const parsed = JSON.parse(dashboard);
    parsed.history = parsed.history && parsed.history.length > 0 ? [parsed.history[parsed.history.length - 1]] : [];
    parsed.fullHistory = JSON.parse(dashboard).history || [];
    setData(parsed);

    if (storedReservations) {
      setReservations(JSON.parse(storedReservations));
    }
  }, []);

  const featureAlert = () => alert('This feature is only available on the web version.');
  const handleLogout = () => {
    localStorage.removeItem('dashboardData');
    localStorage.removeItem('reservations');
    router.push('/');
  };

  if (!data) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-[#E6F0FA] text-[#0A1F1C]">
      {/* Blue Header Bar */}
      <div className="bg-[#003B73] text-white px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-2 shadow-md">
        <h1 className="text-2xl font-bold tracking-wide">Dream Trip Club</h1>
        <div className="flex flex-wrap gap-4 text-sm items-center">
          <a href="#" className="hover:underline">Home</a>
          <a href="#" className="hover:underline">Rewards</a>
          <a href="#" className="hover:underline">Support</a>
          <button
            onClick={handleLogout}
            className="bg-white text-[#003B73] px-4 py-1 rounded-full text-sm shadow hover:bg-gray-100 transition"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <h2 className="text-3xl font-semibold mb-2">
          Hi <span className="capitalize">{data.name}</span> 👋
        </h2>
        <p className="text-lg text-gray-700 mb-6">
          You're currently a <span className="font-semibold">{data.membershiptier ?? 'NULL'}</span> member. Let's see what’s waiting for you!
        </p>

        {/* Total Points Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-10 border border-gray-200">
          <h3 className="text-sm text-gray-500 mb-2">Total Points</h3>
          <p className="text-5xl font-extrabold text-[#003B73]">{data.totalPoints.toLocaleString()} pts</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
            <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: '40%' }}></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Tier progress to Pioneer</p>
        </div>

        {/* Feature Buttons - 2 cols tablet/mobile, aligned */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <button onClick={featureAlert} className="bg-[#003B73] text-white rounded-lg px-4 py-3 flex items-center justify-center gap-2 shadow hover:scale-105 transition-all">
            <FaBellConcierge className="text-lg" />
            <span className="text-sm font-medium">Redeem Points</span>
          </button>
          <button onClick={featureAlert} className="bg-[#005F73] text-white rounded-lg px-4 py-3 flex items-center justify-center gap-2 shadow hover:scale-105 transition-all">
            <FaSuitcaseRolling className="text-lg" />
            <span className="text-sm font-medium">Book a Trip</span>
          </button>
          <button onClick={featureAlert} className="bg-[#BB3E03] text-white rounded-lg px-4 py-3 flex items-center justify-center gap-2 shadow hover:scale-105 transition-all">
            <FaGift className="text-lg" />
            <span className="text-sm font-medium">Claim Gift</span>
          </button>
          <button onClick={() => setShowModal(true)} className="bg-[#2F3E46] text-white rounded-lg px-4 py-3 flex items-center justify-center gap-2 shadow hover:scale-105 transition-all">
            <FaReceipt className="text-lg" />
            <span className="text-sm font-medium">Transaction History</span>
          </button>
        </div>

        {/* Transaction History */}
        <div className="bg-white p-6 rounded-2xl shadow border border-gray-200 mb-10">
          <h2 className="text-xl font-bold mb-4 text-[#0A1F1C]">Latest Transaction</h2>
          <ul className="text-sm text-gray-800">
            {data.history.map((item, idx) => (
              <li key={idx} className="py-2 flex flex-col sm:flex-row sm:justify-between border-b last:border-none">
                <span>{item.CREATED_BY}</span>
                <span>{item.META_REDEMPTIONITEMNAME || '—'}</span>
                <span>{parseInt(item.META_POINTSAMOUNT).toLocaleString()} pts</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Upcoming Bookings Section */}
        <div className="bg-white p-6 rounded-2xl shadow border border-gray-200 mb-10">
          <h2 className="text-xl font-bold text-[#0A1F1C]">Upcoming Bookings</h2>
          {reservations.upcoming?.length > 0 ? (
            <ul className="list-disc pl-6 mt-2 text-sm text-gray-700">
              {reservations.upcoming.map((r, i) => (
                <li key={i}>{r.hotelName || 'Hotel'} - {r.checkIn || 'Check-in'} to {r.checkOut || 'Check-out'}</li>
              ))}
            </ul>
          ) : <p className="text-gray-500 mt-2">No upcoming bookings.</p>}
        </div>

        {/* Past Bookings Section */}
        <div className="bg-white p-6 rounded-2xl shadow border border-gray-200 mb-20">
          <h2 className="text-xl font-bold text-[#0A1F1C]">Past Bookings</h2>
          {reservations.past?.length > 0 ? (
            <ul className="list-disc pl-6 mt-2 text-sm text-gray-700">
              {reservations.past.map((r, i) => (
                <li key={i}>{r.hotelName || 'Hotel'} - {r.checkIn || 'Check-in'} to {r.checkOut || 'Check-out'}</li>
              ))}
            </ul>
          ) : <p className="text-gray-500 mt-2">No past bookings.</p>}
        </div>
      </div>

      {/* Modal for Full Transaction History */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-3xl shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-[#0A1F1C]">Full Transaction History</h3>
              <button onClick={() => setShowModal(false)} className="text-sm text-gray-600 hover:text-red-600">✖</button>
            </div>
            <ul className="divide-y text-sm text-gray-800 max-h-[400px] overflow-y-auto">
              {data.fullHistory.map((item, idx) => (
                <li key={idx} className="py-2 flex flex-col sm:flex-row sm:justify-between">
                  <span>{item.CREATED_BY}</span>
                  <span>{item.META_REDEMPTIONITEMNAME || '—'}</span>
                  <span>{parseInt(item.META_POINTSAMOUNT).toLocaleString()} pts</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
