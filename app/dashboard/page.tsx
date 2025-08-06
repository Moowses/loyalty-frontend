'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaBellConcierge, FaSuitcaseRolling, FaGift, FaReceipt, FaCrown, FaGem } from 'react-icons/fa6';
import Image from 'next/image';

interface DashboardData {
   name: string;
    membershipNo: string;
    membershiptier: string;
    tier: string;
    totalPoints: number;
  history: Array<{
    CREATED_BY: string;
    META_REDEMPTIONITEMNAME?: string;
    META_POINTSAMOUNT: string;
  }>;
  fullHistory?: Array<{
    CREATED_BY: string;
    META_REDEMPTIONITEMNAME?: string;
    META_POINTSAMOUNT: string;
  }>;
}

interface Reservation {
  hotelName?: string;
  checkIn?: string;
  checkOut?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [reservations, setReservations] = useState<{
    upcoming: Reservation[];
    past: Reservation[];
  }>({ upcoming: [], past: [] });
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const dashboard = localStorage.getItem('dashboardData');
    const storedReservations = localStorage.getItem('reservations');
    
    if (!dashboard) {
      router.push('/');
      return;
    }

    const parsed: DashboardData = JSON.parse(dashboard);
    
    parsed.membershiptier = parsed.membershiptier || 'Unknown';
    parsed.history = parsed.history?.length > 0 ? [parsed.history[parsed.history.length - 1]] : [];
    parsed.fullHistory = parsed.history || [];
    setData(parsed);

    if (storedReservations) {
      setReservations(JSON.parse(storedReservations));
    }
  }, [router]);

  const featureAlert = () => {
    alert('Our concierge team will contact you shortly to arrange this service.');
  };

  const handleLogout = () => {
    localStorage.removeItem('dashboardData');
    localStorage.removeItem('reservations');
    router.push('/');
  };

  if (!data) return (
    <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
      <div className="animate-pulse text-2xl text-[#D4AF37]">Loading your luxury experience...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5]">
      {/* Luxury Header */}
      <header className="bg-gradient-to-r from-[#1A1A1A] to-[#0D0D0D] border-b border-[#333] px-8 py-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center gap-3 mb-4 sm:mb-0">
             <Image 
              src="/dreamtripclubicon.png" 
              alt="Dream Trip Club Logo"
              width={200}  // Adjust size as needed
              height={32}  // Adjust size as needed
              className="object-contain"
      />
          </div>
          
          <nav className="flex items-center gap-6">
            <button className="text-sm hover:text-[#D4AF37] transition-colors">Concierge</button>
            <button className="text-sm hover:text-[#D4AF37] transition-colors">VIP Services</button>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 text-sm border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#0A0A0A] transition-colors"
            >
              Sign Out
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Welcome Section */}
        <section className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-3xl font-serif font-light">
              Welcome back, <span className="font-medium capitalize">{data.name}</span>
            </h2>
            <FaGem className="text-[#D4AF37]" />
          </div>
          
          <div className="flex flex-col md:flex-row gap-6">
            <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] border border-[#333] rounded-xl p-6 flex-1">
              <h3 className="text-sm text-[#999] mb-2">Membership Tier</h3>
              <p className="text-2xl font-serif text-[#D4AF37]">
                 {data.membershiptier} Member
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] border border-[#333] rounded-xl p-6 flex-1">
              <h3 className="text-sm text-[#999] mb-2">Reward Points</h3>
              <p className="text-3xl font-bold text-[#D4AF37]">
                {data.totalPoints.toLocaleString()} pts
              </p>
              <div className="w-full bg-[#333] rounded-full h-2 mt-4">
                <div 
                  className="bg-gradient-to-r from-[#D4AF37] to-[#F5E6B2] h-2 rounded-full" 
                  style={{ width: '40%' }}
                ></div>
              </div>
              <p className="text-xs text-[#999] mt-2">Progress to Pioneer Tier</p>
            </div>
          </div>
        </section>

        {/* Luxury Services */}
        <section className="mb-12">
          <h2 className="text-xl font-serif mb-6 text-[#D4AF37]">Exclusive Services</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <FaBellConcierge className="text-2xl" />, label: "Private Concierge" },
              { icon: <FaSuitcaseRolling className="text-2xl" />, label: "Luxury Booking" },
              { icon: <FaGift className="text-2xl" />, label: "VIP Gifting" },
              { icon: <FaReceipt className="text-2xl" />, label: "Transaction History" }
            ].map((service, index) => (
              <button
                key={index}
                onClick={index === 3 ? () => setShowModal(true) : featureAlert}
                className="bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] border border-[#333] rounded-xl p-6 flex flex-col items-center gap-3 hover:border-[#D4AF37] transition-all hover:scale-[1.02]"
              >
                <div className="text-[#D4AF37]">{service.icon}</div>
                <span className="text-sm font-medium">{service.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Transactions and Bookings */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Transaction */}
          <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] border border-[#333] rounded-xl p-6">
            <h2 className="text-xl font-serif mb-4 text-[#D4AF37]">Recent Transaction</h2>
            <ul className="divide-y divide-[#333]">
              {data.history.map((item, idx) => (
                <li key={idx} className="py-3 flex justify-between">
                  <div>
                    <p className="font-medium">{item.CREATED_BY}</p>
                    <p className="text-sm text-[#999]">{item.META_REDEMPTIONITEMNAME || 'Service'}</p>
                  </div>
                  <p className="text-[#D4AF37]">{parseInt(item.META_POINTSAMOUNT).toLocaleString()} pts</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Bookings Section */}
          <div className="space-y-6">
            {/* Upcoming Bookings */}
            <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] border border-[#333] rounded-xl p-6">
              <h2 className="text-xl font-serif mb-4 text-[#D4AF37]">Upcoming Stays</h2>
              {reservations.upcoming?.length > 0 ? (
                <ul className="space-y-3">
                  {reservations.upcoming.map((r, i) => (
                    <li key={i} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{r.hotelName || 'Luxury Resort'}</p>
                        <p className="text-sm text-[#999]">
                          {r.checkIn || 'Check-in'} → {r.checkOut || 'Check-out'}
                        </p>
                      </div>
                      <button className="text-xs border border-[#333] px-2 py-1 rounded hover:border-[#D4AF37]">
                        Details
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[#999]">No upcoming reservations</p>
              )}
            </div>

            {/* Past Bookings */}
            <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] border border-[#333] rounded-xl p-6">
              <h2 className="text-xl font-serif mb-4 text-[#D4AF37]">Travel History</h2>
              {reservations.past?.length > 0 ? (
                <ul className="space-y-3">
                  {reservations.past.slice(0, 3).map((r, i) => (
                    <li key={i} className="flex justify-between">
                      <div>
                        <p className="font-medium">{r.hotelName || 'Luxury Resort'}</p>
                        <p className="text-sm text-[#999]">
                          {r.checkIn || 'Check-in'} → {r.checkOut || 'Check-out'}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[#999]">No past reservations</p>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Transaction History Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] border border-[#333] rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-[#333] flex justify-between items-center">
              <h3 className="text-xl font-serif text-[#D4AF37]">Complete Transaction History</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-[#999] hover:text-[#D4AF37]"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto max-h-[70vh]">
              <table className="w-full">
                <thead className="sticky top-0 bg-[#1A1A1A] border-b border-[#333]">
                  <tr>
                    <th className="p-4 text-left text-sm text-[#999]">Service</th>
                    <th className="p-4 text-left text-sm text-[#999]">Description</th>
                    <th className="p-4 text-right text-sm text-[#999]">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#333]">
                  {data.fullHistory?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#222]">
                      <td className="p-4 text-sm">{item.CREATED_BY}</td>
                      <td className="p-4 text-sm text-[#999]">{item.META_REDEMPTIONITEMNAME || '—'}</td>
                      <td className="p-4 text-right text-[#D4AF37]">
                        {parseInt(item.META_POINTSAMOUNT).toLocaleString()} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}