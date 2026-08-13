import { useEffect, useState } from 'react';
import { ShoppingBag, Users, DollarSign, Package, UserCheck, ArrowRight } from 'lucide-react';
import API from '../services/api';
import Navbar from '../components/common/Navbar';
import StatCard from '../components/common/StatCard';
import OrderSummary from '../components/dashboard/OrderSummary';
import TopSelling from '../components/dashboard/TopSelling';
import AnalyticsChart from '../components/dashboard/AnalyticsChart';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    API.get('/analytics/dashboard')
      .then((res) => setData(res.data))
      .catch(() => {
        // Fallback mock data matching your backend model domain properties
        setData({
          metrics: { 
            total_orders: 450, 
            total_customers: 955, 
            total_revenue: 153000, // Adjusted to realistic KES values
            total_menu: 250, 
            total_workers: 30,
            growth_rate: '+14%'
          },
          order_summary: { on_delivery_pct: 25, delivered_pct: 68, cancelled_pct: 7 },
          top_selling_items: [
            { title: 'Organic Tomatoes', quantity: 180, category: 'Vegetables', unit: 'kg' },
            { title: 'Fresh Maize Crate', quantity: 150, category: 'Grains', unit: 'crate' },
            { title: 'Avocado Box', quantity: 80, category: 'Fruits', unit: 'box' }
          ],
          top_ordered_pct: 52
        });
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <span className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-semibold mt-3 tracking-wide">Assembling dashboard panels...</p>
      </div>
    );
  }

  // Formatting helper for compact revenue representation (e.g., KES 153K)
  const formatCompactRevenue = (value) => {
    if (value >= 1000) {
      return `KES ${(value / 1000).toFixed(0)}K`;
    }
    return `KES ${value}`;
  };

  return (
    <div className="space-y-6 w-full animate-fade-in pb-12">
      {/* Dynamic Header Block */}
      <Navbar title="Dashboard Overview" />

      {/* 1. Statistics Cards Metric Row Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard 
          label="Total Orders" 
          value={data.metrics.total_orders} 
          icon={ShoppingBag} 
          delay={0.02} 
        />
        <StatCard 
          label="Total Customers" 
          value={data.metrics.total_customers} 
          icon={Users} 
          delay={0.04} 
        />
        <StatCard 
          label="Total Revenue" 
          value={formatCompactRevenue(data.metrics.total_revenue)} 
          icon={DollarSign} 
          delay={0.06} 
        />
        <StatCard 
          label="Total Products" 
          value={data.metrics.total_menu} 
          icon={Package} 
          delay={0.08} 
        />
        <StatCard 
          label="Active Farmers" 
          value={data.metrics.total_workers} 
          icon={UserCheck} 
          delay={0.1} 
        />
      </div>

      {/* 2. Visual Graphs and Progress Distribution Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Order Lifecycle Allocation Rings */}
        <div className="h-full">
          <OrderSummary summary={data.order_summary} />
        </div>

        {/* Vector SVG Interactive Dial Chart */}
        <div className="h-full">
          <AnalyticsChart 
            overview={{ 
              top_ordered_pct: data.top_ordered_pct, 
              growth_rate: data.metrics.growth_rate || '+12%' 
            }} 
          />
        </div>

        {/* Dynamic Horizontal Progress Lists */}
        <div className="h-full">
          <TopSelling items={data.top_selling_items} />
        </div>
      </div>

      {/* 3. Action Navigation Footer Link Banner */}
      <div className="bg-gradient-to-r from-green-800 to-green-900 rounded-2xl p-6 text-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:shadow-md">
        <div className="text-center sm:text-left">
          <h4 className="font-bold text-lg">Marketplace Inventory Control</h4>
          <p className="text-xs text-green-100 mt-1">Review active produce listings, configure price thresholds, or fulfill outstanding orders.</p>
        </div>
        <button className="bg-white text-green-700 hover:bg-green-50 transition-all font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 active:scale-95 shrink-0 shadow-sm">
          <span link to="/orders">Manage Orders</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
