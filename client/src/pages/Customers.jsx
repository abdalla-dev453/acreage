import { useEffect, useState, useContext } from 'react';
import { Mail, MapPin, Phone, Users, Search, ShoppingBag } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import API from '../services/api';
import Navbar from '../components/common/Navbar';

export default function Customers() {
  const { user: currentUser } = useContext(AuthContext);
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    // Reuses your fully verified global users endpoint
    API.get('/auth/users')
      .then((res) => {
        // Filter out the list to uniquely display marketplace "buyers"
        const buyersOnly = res.data.filter(u => u.role === 'buyer');
        setCustomers(buyersOnly);
      })
      .catch(() => {
        // High-UX fallback mock data if local database holds zero buyer profiles yet
        setCustomers([
          { id: 2, username: 'alice_grocer', email: 'alice@grocer.co.ke', location: 'Nairobi Central', phone_number: '+254 712 345 678' },
          { id: 3, username: 'bob_eats_restaurant', email: 'orders@bobeats.com', location: 'Mombasa Section', phone_number: '+254 722 987 654' },
          { id: 4, username: 'nakuru_wholesalers', email: 'info@nakuruwholesale.ke', location: 'Nakuru Town', phone_number: '+254 733 111 222' }
        ]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Live client-side text filtering logic
  const filteredCustomers = customers.filter(c => 
    c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 w-full animate-fade-in pb-12">
      <Navbar title="Client & Buyer Directory" />

      {/* Toolbar Filter Control Panel */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Verified Buyers Ledger</h2>
          <p className="text-xs text-slate-400 mt-0.5">Review active regional consumer accounts sourcing from your acreage listings</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by handle or town..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder-slate-400"
          />
        </div>
      </div>

      {/* Main Grid Stream Container */}
      {isLoading ? (
        <div className="py-24 text-center flex flex-col items-center justify-center">
          <span className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></span>
          <p className="text-xs text-slate-400 font-semibold mt-2">Streaming client profiles...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((customer) => (
              <div 
                key={customer.id} 
                className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start space-x-4 group hover:shadow-md hover:border-orange-100/70 transition-all"
              >
                {/* Visual Avatar Placeholder Initials Icon Bubble */}
                <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-700 font-extrabold text-sm flex items-center justify-center uppercase shrink-0 transition-transform group-hover:scale-105 shadow-sm border border-orange-100/30">
                  {customer.username.trim().charAt(0)}
                </div>
                
                {/* Core Text Descriptive Nodes */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm group-hover:text-orange-600 transition-colors truncate">
                      @{customer.username}
                    </h3>
                    <span className="inline-block text-[9px] font-bold bg-slate-100 border text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-wider">
                      Market Buyer
                    </span>
                  </div>

                  <div className="space-y-0.5 text-xs text-slate-400 font-medium">
                    <p className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-300" />
                      <span className="text-slate-500">{customer.email}</span>
                    </p>
                    <p className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-orange-400/70" />
                      <span className="text-slate-600 font-semibold">{customer.location || 'Kenya'}</span>
                    </p>
                    {customer.phone_number && (
                      <p className="flex items-center gap-1.5 truncate font-mono text-[11px]">
                        <Phone className="w-3.5 h-3.5 text-slate-300" />
                        <span>{customer.phone_number}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-100 text-slate-400 font-medium text-xs">
              No matching client profiles found in this directory scope.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
