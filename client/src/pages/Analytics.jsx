import { useEffect, useState, useMemo } from 'react';
import { BarChart3, TrendingUp, DollarSign, PieChart, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import API from '../services/api';
import Navbar from '../components/common/Navbar';
import AnalyticsChart from '../components/dashboard/AnalyticsChart';

export default function Analytics() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [timePeriod, setTimePeriod] = useState('This Week');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    API.get(`/analytics/dashboard?period=${timePeriod.toLowerCase().replace(' ', '_')}`)
      .then((res) => setAnalyticsData(res.data))
      .catch(() => {
        // High-utility regional fallback mock data matching your backend agriculture domain properties
        setAnalyticsData({
          overview: { top_ordered_pct: 68, growth_rate: '+18%' },
          metrics: {
            gross_revenue: 153200,
            average_order_value: 3400,
            total_sales_volume: 840, // Total kg/crates sold
            conversion_rate: '4.8%'
          },
          category_breakdown: [
            { category: 'Vegetables', share: '45%', amount: 68940, color: 'bg-orange-600' },
            { category: 'Grains & Tubers', share: '30%', amount: 45960, color: 'bg-indigo-500' },
            { category: 'Fruits', share: '25%', amount: 38300, color: 'bg-emerald-500' },
          ]
        });
      })
      .finally(() => setIsLoading(false));
  }, [timePeriod]);

  // Safely extract values with nullish coalescing configurations
  const overview = analyticsData?.overview ?? { top_ordered_pct: 68, growth_rate: '+18%' };
  const metrics = analyticsData?.metrics ?? { gross_revenue: 0, average_order_value: 0, total_sales_volume: 0, conversion_rate: '0%' };
  const breakdown = analyticsData?.category_breakdown ?? [];

  return (
    <div className="space-y-6 w-full animate-fade-in pb-12">
      {/* 1. Navbar Header and Time-Series Control Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Navbar title="Market Intelligence & Analytics" />
        <div className="flex items-center gap-2 bg-white border border-slate-100 p-1.5 rounded-xl shadow-sm shrink-0 self-end sm:self-auto">
          <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
          <select 
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value)}
            className="text-xs font-bold text-slate-600 bg-transparent pr-4 outline-none cursor-pointer border-none focus:ring-0"
          >
            <option>Today</option>
            <option>This Week</option>
            <option>This Month</option>
            <option>This Quarter</option>
          </select>
        </div>
      </div>

      {/* 2. Micro Summary Cards Row Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Gross Revenue', value: `KES ${metrics.gross_revenue.toLocaleString()}`, trend: '+14.2%', isPositive: true, icon: DollarSign },
          { label: 'Avg Order Value', value: `KES ${metrics.average_order_value.toLocaleString()}`, trend: '+4.8%', isPositive: true, icon: TrendingUp },
          { label: 'Volume Dispatched', value: `${metrics.total_sales_volume.toLocaleString()} units`, trend: '-1.5%', isPositive: false, icon: BarChart3 },
          { label: 'Market Conversion', value: metrics.conversion_rate, trend: '+0.6%', isPositive: true, icon: PieChart },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group transition-all hover:shadow-md">
              <div className="space-y-1 min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {card.label}
                </span>
                <p className="text-xl font-extrabold text-slate-900 tracking-tight truncate">
                  {card.value}
                </p>
                <span className={`text-[10px] font-bold inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${
                  card.isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                }`}>
                  {card.isPositive ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                  {card.trend} vs last period
                </span>
              </div>
              <div className="p-3 bg-orange-50 text-orange-600 rounded-xl transition-all duration-300 group-hover:bg-orange-600 group-hover:text-white shrink-0 shadow-sm">
                <Icon className="w-4 h-4 stroke-[2.2]" />
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Core Visual Analytics Charts Section Grid */}
      {isLoading ? (
        <div className="py-24 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-100 shadow-sm">
          <span className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></span>
          <p className="text-xs text-slate-400 font-semibold mt-2">Computing time-series dataset metrics...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Vector SVG Interactive Dial Chart (Reused from dashboard) */}
          <div className="h-full">
            <AnalyticsChart overview={overview} />
          </div>

          {/* Revenue Distribution Progress Metrics Panel */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-full">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Revenue Distribution</h3>
              <p className="text-xs text-slate-400 mt-0.5 mb-6">Financial performance weight across primary crop categories</p>
            </div>
            
            <div className="space-y-5 flex-1 flex flex-col justify-center">
              {breakdown.map((item, i) => (
                <div key={i} className="space-y-2 group">
                  <div className="flex justify-between items-end text-xs font-bold text-slate-700">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800 group-hover:text-orange-700 transition-colors">
                        {item.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium font-mono mt-0.5">
                        KES {item.amount.toLocaleString()} generated
                      </span>
                    </div>
                    <span className="text-sm font-extrabold text-slate-900 bg-slate-50 border border-slate-200/50 px-2 py-0.5 rounded-md">
                      {item.share}
                    </span>
                  </div>
                  {/* Progress visual track bar */}
                  <div className="w-full bg-slate-50 border border-slate-100/50 h-3 rounded-full overflow-hidden">
                    <div 
                      className={`${item.color} h-full rounded-full transition-all duration-700 ease-out`} 
                      style={{ width: item.share }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
