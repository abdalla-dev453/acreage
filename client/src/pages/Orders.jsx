import { useEffect, useState, useMemo } from 'react';
import { Search, Filter, ShoppingBag, Clock, Truck, CheckCircle2, XCircle } from 'lucide-react';
import API from '../services/api';
import Navbar from '../components/common/Navbar';
import OrderTable from '../components/orders/OrderTable';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Detect active user role from localStorage or fallback to buyer
  const userRole = localStorage.getItem('role') || 'buyer';

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      // Send explicit role param so Flask endpoint filters buyer_id vs farmer_id correctly
      const res = await API.get(`/orders/?role=${userRole}`);
      const data = Array.isArray(res.data) ? res.data : (res.data.orders || []);
      setOrders(data);
    } catch (err) {
      console.error('Failed to fetch live orders:', err.response?.data || err.message);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [userRole]);

  // Math computation loops calculating quick metrics summary totals
  const counters = useMemo(() => {
    return {
      all: orders.length,
      pending: orders.filter(o => (o.status || '').trim().toLowerCase() === 'pending').length,
      onDelivery: orders.filter(o => ['on delivery', 'shipping'].includes((o.status || '').trim().toLowerCase())).length,
      delivered: orders.filter(o => (o.status || '').trim().toLowerCase() === 'delivered').length,
      cancelled: orders.filter(o => (o.status || '').trim().toLowerCase() === 'cancelled').length,
    };
  }, [orders]);

  // Real-time dynamic compound filter matching text search + active status context tabs
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderStatus = (order.status || '').trim().toLowerCase();
      
      const matchTab =
        activeTab === 'all' ||
        (activeTab === 'on delivery' ? ['on delivery', 'shipping'].includes(orderStatus) : orderStatus === activeTab);

      const searchStr = searchQuery.toLowerCase();
      const code = (order.order_code || '').toLowerCase();
      const client = (order.buyer?.username || order.customer || '').toLowerCase();
      const phone = (order.contact_phone || order.contact || '').toLowerCase();
      
      const matchSearch = code.includes(searchStr) || client.includes(searchStr) || phone.includes(searchStr);

      return matchTab && matchSearch;
    });
  }, [orders, activeTab, searchQuery]);

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Navbar Header */}
      <Navbar title={userRole === 'farmer' ? "Incoming Sales Orders" : "Order Invoices Ledger"} />

      {/* Summary Cards Row Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { key: 'all', label: 'All Orders', count: counters.all, icon: ShoppingBag },
          { key: 'pending', label: 'Pending', count: counters.pending, icon: Clock },
          { key: 'on delivery', label: 'In Transit', count: counters.onDelivery, icon: Truck },
          { key: 'delivered', label: 'Delivered', count: counters.delivered, icon: CheckCircle2 },
          { key: 'cancelled', label: 'Cancelled', count: counters.cancelled, icon: XCircle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all duration-300 transform cursor-pointer active:scale-95 shadow-sm min-h-[96px] ${
                isSelected
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-4 ring-emerald-500/10'
                  : 'bg-white hover:bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span className={`text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {tab.label}
                </span>
                <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : tab.key === 'all' ? 'text-emerald-500' : 'text-slate-400'}`} />
              </div>
              <p className={`text-2xl font-extrabold tracking-tight mt-2 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                {tab.count}
              </p>
            </button>
          );
        })}
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Distribution Roster</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Showing {filteredOrders.length} of {orders.length} orders
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search Field Input */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search code, user or contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <button
            onClick={fetchOrders}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition select-none"
          >
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Table Ledger */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center">
          <span className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
          <p className="text-xs text-slate-400 font-medium mt-2">Loading live transactions...</p>
        </div>
      ) : (
        <OrderTable orders={filteredOrders} onRefresh={fetchOrders} />
      )}
    </div>
  );
}