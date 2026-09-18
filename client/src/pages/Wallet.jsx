import { useEffect, useState, useContext } from 'react';
import {
  Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft,
  Clock, CheckCircle2, XCircle, Loader2, X, Smartphone
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import API from '../services/api';
import Navbar from '../components/common/Navbar';
import SEO from '../components/common/SEO';

export default function Wallet() {
  const { user } = useContext(AuthContext);
  const isFarmer = user?.role === 'farmer';

  // ── State ─────────────────────────────────────────────────────────────
  const [grossRevenue, setGrossRevenue] = useState(0.0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0.0);
  const [balance, setBalance] = useState(0.0);
  const [payouts, setPayouts] = useState([]);
  const [ordersSummary, setOrdersSummary] = useState({ total_revenue: 0.0, total_orders: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Withdrawal form
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [mpesaNumber, setMpesaNumber] = useState(user?.phone || user?.phone_number || '');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // ── Fetch wallet data ──────────────────────────────────────────────────
  const fetchWalletData = async () => {
    try {
      setIsLoading(true);

      // Analytics for total revenue
      const analyticsRes = await API.get('/analytics/dashboard');
      const revenue = analyticsRes.data?.metrics?.total_revenue ?? 0.0;
      const totalOrders = analyticsRes.data?.metrics?.total_orders ?? 0;
      setGrossRevenue(revenue);
      setOrdersSummary({ total_revenue: revenue, total_orders: totalOrders });

      // Payout history
      const historyRes = await API.get('/payouts/history');
      const payoutsList = Array.isArray(historyRes.data) ? historyRes.data : [];
      setPayouts(payoutsList);

      // Calculate net balance
      const withdrawn = payoutsList
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + Number(p.amount), 0);
      setTotalWithdrawn(withdrawn);
      setBalance(Math.max(0, revenue - withdrawn));

    } catch (err) {
      console.error('Wallet metrics fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchWalletData(); }, []);

  // ── Withdrawal handler ─────────────────────────────────────────────────
  const handleWithdrawalSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const parsedAmount = parseFloat(withdrawAmount);
    if (!parsedAmount || parsedAmount <= 0) {
      setFormError('Please enter a valid positive amount.');
      return;
    }
    if (parsedAmount > balance) {
      setFormError('Amount exceeds available balance.');
      return;
    }
    if (!mpesaNumber.trim()) {
      setFormError('M-Pesa phone number is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await API.post('/payouts/withdraw', {
        amount: parsedAmount,
        mpesa_number: mpesaNumber.trim()
      });
      setFormSuccess('Withdrawal processed successfully! Funds are on their way via M-Pesa.');
      setWithdrawAmount('');
      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess('');
        fetchWalletData();
      }, 2200);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Gateway timeout. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 w-full pb-16">
      <SEO title="Wallet & Payouts | Acreage" description="View your wallet balance, payout history, and process M-Pesa withdrawals." />
      <Navbar title="Digital Wallet &amp; Payouts" />

      {/* ── Balance Overview Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Card 1: Available Balance */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between h-auto min-h-[11rem] relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 text-slate-800/20 group-hover:scale-110 transition-transform duration-300 pointer-events-none">
            <WalletIcon className="w-36 h-36 stroke-[1.5]" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available Balance</p>
            {isLoading ? (
              <div className="h-10 flex items-center"><Loader2 className="w-5 h-5 animate-spin text-green-500" /></div>
            ) : (
              <h3 className="text-3xl font-black font-mono tracking-tight text-green-500">
                KES {balance.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </h3>
            )}
            {isFarmer && !isLoading && (
              <div className="text-[10px] text-slate-500 space-y-0.5 pt-1">
                <p>Gross Revenue: <span className="text-slate-300 font-semibold">KES {grossRevenue.toLocaleString()}</span></p>
                <p>Total Withdrawn: <span className="text-slate-300 font-semibold">KES {totalWithdrawn.toLocaleString()}</span></p>
              </div>
            )}
          </div>
          {isFarmer && (
            <button
              onClick={() => setIsModalOpen(true)}
              disabled={balance <= 0 || isLoading}
              className="mt-4 w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-md shadow-green-600/10 cursor-pointer active:scale-95"
            >
              <span>Withdraw to M-Pesa</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Card 2: Revenue / Expenditure */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[11rem]">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {isFarmer ? 'Gross Revenue Earnings' : 'Aggregate Expenditure'}
            </p>
            {isLoading ? (
              <div className="h-10 flex items-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
            ) : (
              <h3 className="text-3xl font-black font-mono tracking-tight text-slate-800">
                KES {ordersSummary.total_revenue.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </h3>
            )}
          </div>
          <div className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100/50 px-3 py-1.5 rounded-xl w-max flex items-center space-x-1.5 mt-4">
            <ArrowDownLeft className="w-4 h-4" />
            <span>Secured via Escrow Platform</span>
          </div>
        </div>

        {/* Card 3: Orders Count */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[11rem]">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Completed Orders</p>
            {isLoading ? (
              <div className="h-10 flex items-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
            ) : (
              <h3 className="text-3xl font-black font-mono tracking-tight text-slate-800">
                {ordersSummary.total_orders} <span className="text-xs font-bold text-slate-400">Invoices</span>
              </h3>
            )}
          </div>
          <p className="text-xs text-slate-400 font-medium mt-4">
            Active tracking pipeline across all regional fulfillment routes.
          </p>
        </div>
      </div>

      {/* ── Payout History Table ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Payout Settlement History</h3>
            <p className="text-xs text-slate-400 mt-0.5">Audit log for Safaricom M-Pesa B2C liquidations</p>
          </div>
          <button
            onClick={fetchWalletData}
            className="text-xs font-bold text-slate-500 hover:text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition"
          >
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
            <p className="text-xs text-slate-400 font-bold mt-2 tracking-wide uppercase">Reconciling statements...</p>
          </div>
        ) : payouts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-5">Transaction ID</th>
                  <th className="py-3 px-5">Recipient</th>
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Amount (KES)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-medium text-slate-600">
                {payouts.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-[11px] font-bold text-slate-700 uppercase">{row.reference}</td>
                    <td className="py-3.5 px-5 text-slate-500 font-semibold">{row.mpesa_number}</td>
                    <td className="py-3.5 px-5 text-slate-400 font-medium">{row.date}</td>
                    <td className="py-3.5 px-5">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider border ${
                        row.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : row.status === 'pending'
                          ? 'bg-amber-50 text-amber-700 border-amber-100'
                          : 'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                        {row.status === 'completed' && <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />}
                        {row.status === 'pending' && <Clock className="w-3 h-3 stroke-[2.5]" />}
                        {row.status === 'failed' && <XCircle className="w-3 h-3 stroke-[2.5]" />}
                        <span>{row.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right font-bold text-slate-700">
                      {Number(row.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <XCircle className="w-8 h-8 text-slate-300 stroke-[1.5]" />
            <p className="text-xs text-slate-400 font-bold mt-2 tracking-wide uppercase">No payout history found</p>
          </div>
        )}
      </div>

      {/* ═══ WITHDRAWAL MODAL ═══ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">

            {/* Modal Header */}
            <div className="bg-slate-900 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-600/20 rounded-xl">
                  <Smartphone className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wide">Withdraw via M-Pesa</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Funds dispatched to your M-Pesa account</p>
                </div>
              </div>
              <button onClick={() => { setIsModalOpen(false); setFormError(''); setFormSuccess(''); }}
                className="text-slate-400 hover:text-white transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Balance summary strip */}
            <div className="bg-slate-800 px-6 py-3 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Balance</span>
              <span className="text-sm font-black font-mono text-green-400">
                KES {balance.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleWithdrawalSubmit} className="p-6 space-y-4 text-xs">

              {formError && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl font-bold">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Withdrawal Amount (KES)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">KES</span>
                  <input
                    type="number"
                    min="1"
                    max={balance}
                    step="1"
                    required
                    placeholder="e.g. 5000"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 font-mono"
                  />
                </div>
                <p className="text-slate-400 mt-1">Max: KES {balance.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">M-Pesa Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 0712345678 or 254712345678"
                  value={mpesaNumber}
                  onChange={(e) => setMpesaNumber(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 font-mono"
                />
                <p className="text-slate-400 mt-1">Accepts 07XXXXXXXX, 01XXXXXXXX, or 2547XXXXXXXX format</p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setFormError(''); setFormSuccess(''); }}
                  className="flex-1 py-2.5 font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-green-600/20"
                >
                  {isSubmitting
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Processing...</span></>
                    : <><ArrowUpRight className="w-3.5 h-3.5" /><span>Withdraw Now</span></>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}