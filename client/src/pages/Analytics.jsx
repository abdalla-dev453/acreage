import { useEffect, useState, useMemo } from 'react';
import { BarChart3, TrendingUp, DollarSign, PieChart, Calendar, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import API from '../services/api';
import Navbar from '../components/common/Navbar';
import AnalyticsChart from '../components/dashboard/AnalyticsChart';
import SEO from '../components/common/SEO';

export default function Analytics() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [timePeriod, setTimePeriod] = useState('This Week');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    API.get(`/analytics/dashboard?period=${timePeriod.toLowerCase().replace(' ', '_')}`)
      .then((res) => {
        if (isMounted) setAnalyticsData(res.data);
      })
      .catch(() => {
        if (isMounted) {
          setAnalyticsData({
            overview: { top_ordered_pct: 68, growth_rate: '+18%' },
            metrics: {
              gross_revenue: 153200,
              average_order_value: 3400,
              total_sales_volume: 840,
              conversion_rate: '4.8%'
            },
            category_breakdown: [
              { category: 'Vegetables', value: 68940 },
              { category: 'Grains & Tubers', value: 45960 },
              { category: 'Fruits', value: 38300 },
            ]
          });
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [timePeriod]);

  const overview = analyticsData?.overview ?? { top_ordered_pct: 58, growth_rate: '+14%' };

  const metrics = useMemo(() => ({
    gross_revenue: analyticsData?.metrics?.gross_revenue ?? analyticsData?.metrics?.total_revenue ?? 0,
    average_order_value: analyticsData?.metrics?.average_order_value ?? 0,
    total_sales_volume: analyticsData?.metrics?.total_sales_volume ?? analyticsData?.metrics?.total_orders ?? 0,
    conversion_rate: analyticsData?.metrics?.conversion_rate ?? '3.4%'
  }), [analyticsData]);

  const normalizedBreakdown = useMemo(() => {
    const rawBreakdown = analyticsData?.category_breakdown ?? [];
    const totalRevenue = rawBreakdown.reduce((sum, item) => sum + (item.value ?? item.amount ?? 0), 0);

    const colorPalette = ['bg-green-600', 'bg-indigo-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500'];

    return rawBreakdown.map((item, index) => {
      const numericAmount = item.value ?? item.amount ?? 0;
      const computedSharePct = totalRevenue > 0 ? (numericAmount / totalRevenue) * 100 : 0;

      return {
        category: item.category || 'Other Produce',
        amount: numericAmount,
        share: `${computedSharePct.toFixed(0)}%`,
        color: colorPalette[index % colorPalette.length]
      };
    });
  }, [analyticsData]);

  return (
    <div className="space-y-6 w-full animate-fade-in pb-12">
      <SEO title="Analytics | Acreage" description="Farm analytics, revenue tracking, and market intelligence for your agricultural business." />
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Gross Revenue', value: `KES ${Number(metrics.gross_revenue).toLocaleString()}`, trend: '+14.2%', isPositive: true, icon: DollarSign },
          { label: 'Avg Basket', value: `KES ${Number(metrics.average_order_value).toLocaleString()}`, trend: '+4.8%', isPositive: true, icon: TrendingUp },
          { label: 'Volume Shipped', value: `${Number(metrics.total_sales_volume).toLocaleString()} Units`, trend: '-1.5%', isPositive: false, icon: BarChart3 },
          { label: 'Conversion Rate', value: metrics.conversion_rate, trend: '+0.6%', isPositive: true, icon: PieChart },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group transition-all hover:shadow-md">
              <div className="space-y-1 min-w-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  {card.label}
                </span>
                <p className="text-xl font-black text-slate-900 tracking-tight truncate">
                  {card.value}
                </p>
                <span className={`text-[10px] font-bold inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${
                  card.isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                }`}>
                  {card.isPositive ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                  {card.trend}
                </span>
              </div>
              <div className="p-3 bg-green-50 text-green-600 rounded-xl transition-all duration-300 group-hover:bg-green-600 group-hover:text-white shrink-0 shadow-sm">
                <Icon className="w-4 h-4 stroke-[2.2]" />
              </div>
            </div>
          );
        })}
      </div>

      {isLoading ? (
        <div className="py-24 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-100 shadow-sm">
          <Loader2 className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-bold mt-2">Loading analytics...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <div className="h-full">
            <AnalyticsChart overview={overview} />
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-full">
            <div>
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide">Revenue by Category</h3>
              <p className="text-xs text-slate-400 mt-0.5 mb-6">Share of total revenue</p>
            </div>
            <div className="space-y-5 flex-1 flex flex-col justify-center">
              {normalizedBreakdown.length > 0 ? (
                normalizedBreakdown.map((item, i) => (
                  <div key={i} className="space-y-1.5 group">
                    <div className="flex justify-between items-end text-xs font-bold text-slate-700">
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black text-slate-800 group-hover:text-green-600 transition-colors truncate">
                          {item.category}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold font-mono mt-0.5">
                          KES {Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <span className="text-xs font-black text-slate-900 bg-slate-50 border border-slate-200/50 px-2 py-0.5 rounded-md shrink-0">
                        {item.share}
                      </span>
                    </div>
                    <div className="w-full bg-slate-50 border border-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`${item.color} h-full rounded-full transition-all duration-1000 ease-out`}
                        style={{ width: item.share }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400 font-medium text-xs">
                  No sales data available for this period.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
