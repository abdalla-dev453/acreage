import { useEffect, useState, useContext } from 'react';
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, XCircle, ArrowRight, Loader2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import API from '../services/api';
import Navbar from '../components/common/Navbar';

export default function Wallet() {
  const { user } = useContext(AuthContext);
  const isFarmer = user?.role === 'farmer';

  // State Management
  const [balance, setBalance] = useState(0.0);
  const [payouts, setPayouts] = useState([]);
  const [ordersSummary, setOrdersSummary] = useState({ total_revenue: 0.0, total_orders: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [mpesaNumber, setMpesaNumber] = useState(user?.mpesa_number || '+254700000000');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Fetch initial analytical matrix data balances and payout histories concurrently
  const fetchWalletData = async () => {
    try {
      setIsLoading(true);
      
      // 1. Fetch dashboard financials for balance metrics
      const analyticsRes = await API.get('/analytics/dashboard');
      const revenue = analyticsRes.data?.metrics?.total_revenue ?? 0.0;
      setOrdersSummary({
        total_revenue: revenue,
        total_orders: analyticsRes.data?.metrics?.total_orders ?? 0
      });

      // 2. Fetch processed payouts history
      const historyRes = await API.get('/payouts/history');
      setPayouts(historyRes.data);

      // # Calculate net remaining balance (Gross Revenue minus completed withdrawals)
      const totalWithdrawn = historyRes.data
        .filter(p => p.status === 'completed')
        .reduce((sum, current) => sum + current.amount, 0);

      setBalance(Math.max(0, revenue - totalWithdrawn));
    } catch (err) {
      console.error('Wallet metrics fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  // Handle M-Pesa B2C Withdrawal Form Submission
  const handleWithdrawalSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    
    const parsedAmount = parseFloat(withdrawAmount);
    if (!parsedAmount || parsedAmount <= 0) {
      setFormError('Please input a valid positive amount.');
      return;
    }

    if (parsedAmount > balance) {
      setFormError('Insufficient wallet balance clearance threshold.');
      return;
    }

    if (!mpesaNumber.trim()) {
      setFormError('Recipient M-Pesa mobile number sequence required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await API.post('/payouts/withdraw', {
        amount: parsedAmount,
        mpesa_number: mpesaNumber.trim() || mpesaNumber
      });

      setFormSuccess('Disbursement processed successfully to M-Pesa Express network!');
      setWithdrawAmount('');
      
      // Refresh balance ledger state structures safely
      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess('');
        fetchWalletData();
      }, 2000);

    } catch (err) {
      setFormError(err.response?.data?.message || 'B2C Gateway timeout error. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 w-full animate-fade-in pb-16">
      <Navbar title="Digital Wallet & Payouts" />

      {/* Financial Overview Matrix Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card 1: Live Withdrawable Balance */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between h-44 relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 text-slate-800/20 group-hover:scale-110 transition-transform duration-300 pointer-events-none">
            <WalletIcon className="w-36 h-36 stroke-[1.5]" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available Balance</p>
            <h3 className="text-3xl font-black font-mono tracking-tight text-orange-500">
              KES {balance.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          {isFarmer && (
            <button
              onClick={() => setIsModalOpen(true)}
              disabled={balance <= 0}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-md shadow-orange-600/10 cursor-pointer active:scale-95"
            >
              <span>Initiate Withdrawal</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Card 2: Cumulative Platform Marketplace Revenues */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-44">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {isFarmer ? 'Gross Revenue Earnings' : 'Aggregate Expenditure Spends'}
            </p>
            <h3 className="text-3xl font-black font-mono tracking-tight text-slate-800">
              KES {ordersSummary.total_revenue.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100/50 px-3 py-1.5 rounded-xl w-max flex items-center space-x-1.5">
            <ArrowDownLeft className="w-4 h-4" />
            <span>Secured via Escrow Platform</span>
          </div>
        </div>

        {/* Card 3: Total Transactions Volumes Counter */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-44">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Completed Orders</p>
            <h3 className="text-3xl font-black font-mono tracking-tight text-slate-800">
              {ordersSummary.total_orders} <span className="text-xs font-bold text-slate-400">Invoices</span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Active tracking pipeline across all regional fulfillment routes.
          </p>
        </div>

      </div>

      {/* Bottom Segment: Recent Payout Ledger History Section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Payout Settlement History</h3>
            <p className="text-xs text-slate-400 mt-0.5">Audit log parameters for Safaricom M-Pesa B2C liquidations</p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin text-orange-600" />
            <p className="text-xs text-slate-400 font-bold mt-2 tracking-wide uppercase">Reconciling statements...</p>
          </div>
        ) : payouts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-5">Transaction ID</th>
                  <th className="py-3 px-5">Recipient Target</th>
                  <th className="py-3 px-5">Settlement Timestamp</th>
                  <th className="py-3 px-5">Status Badge</th>
                  <th className="py-3 px-5 text-right">Net Value</th>
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
                    <td className="py-3.5 px-5 text-right font-semibold">{row.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>  
        ) : (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <XCircle className="w-6 h-6 stroke-[2.5]" />
            <p className="text-xs text-slate-400 font-bold mt-2 tracking-wide uppercase">No payouts found</p>
          </div>
        )}

      </div>

    </div>
  )
}