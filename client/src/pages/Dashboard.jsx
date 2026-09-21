import { useEffect, useState } from 'react';
import { ShoppingBag, Users, DollarSign, Package, TrendingUp, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import API from '../services/api';
import Navbar from '../components/common/Navbar';
import StatCard from '../components/common/StatCard';
import OrderSummary from '../components/dashboard/OrderSummary';
import TopSelling from '../components/dashboard/TopSelling';
import AnalyticsChart from '../components/dashboard/AnalyticsChart';
import SEO from '../components/common/SEO';

export default function Dashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    API.get('/analytics/dashboard')
      .then((res) => setData(res.data))
       .catch(() => {
         setData({
           metrics: {
             total_orders: 0,
             total_customers: 0,
             total_revenue: 0,
             total_menu: 0,
           },
           overview: { top_ordered_pct: 0, growth_rate: '+0%' }
         });
       })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-gold-500 rounded-full animate-spin opacity-50" style={{ animationDelay: '0.3s' }}></div>
        </div>
        <p className="text-sm text-slate-500 font-semibold mt-4 tracking-wide animate-pulse">{t('common.loading')}</p>
      </div>
    );
  }

  const formatCompactRevenue = (value) => {
    if (value >= 1000) {
      return `KES ${(value / 1000).toFixed(0)}K`;
    }
    return `KES ${value}`;
  };

  return (
    <div className="space-y-8 w-full pb-12">
      <SEO title="Dashboard | Acreage" description="View your farm dashboard with order summaries, revenue metrics, and top-selling products." />
      <Navbar title={t('dashboard.title')} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard label={t('dashboard.totalOrders')} value={data.metrics.total_orders} icon={ShoppingBag} delay={0.02} />
        <StatCard label={t('dashboard.totalCustomers')} value={data.metrics.total_customers} icon={Users} delay={0.04} />
        <StatCard label={t('dashboard.totalRevenue')} value={formatCompactRevenue(data.metrics.total_revenue)} icon={DollarSign} delay={0.06} />
        <StatCard label={t('dashboard.totalProducts')} value={data.metrics.total_menu} icon={Package} delay={0.08} />
        <StatCard label={t('dashboard.growthRate')} value={data.overview?.growth_rate || '+0%'} icon={TrendingUp} delay={0.1} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        <div className="h-full animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <OrderSummary summary={data.order_summary} />
        </div>
        <div className="h-full animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <AnalyticsChart
            overview={{
              top_ordered_pct: data.overview?.top_ordered_pct ?? 0,
              growth_rate: data.overview?.growth_rate || '+0%'
            }}
          />
        </div>
        <div className="h-full animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <TopSelling items={data.top_selling_items} />
        </div>
      </div>

      <div className="bg-premium-gradient rounded-3xl p-8 text-white shadow-premium-xl flex flex-col sm:flex-row items-center justify-between gap-6 animate-slide-up" style={{ animationDelay: '0.4s' }}>
        <div className="text-center sm:text-left space-y-2">
          <h4 className="font-bold text-xl font-display">{t('dashboard.inventoryControl')}</h4>
          <p className="text-sm text-white/90 leading-relaxed">{t('dashboard.inventoryDescription')}</p>
        </div>
        <Link
          to="/orders"
          className="bg-white text-primary-700 hover:bg-primary-50 transition-all font-bold text-sm px-6 py-3 rounded-2xl flex items-center gap-2 active:scale-95 shadow-lg hover:shadow-xl group"
        >
          <span>{t('dashboard.manageOrders')}</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
