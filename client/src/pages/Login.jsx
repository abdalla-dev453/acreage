import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Sprout } from 'lucide-react';
import SEO from '../components/common/SEO';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0b1120] text-[#0F172A] dark:text-[#f8fafc] px-4 py-8 transition-colors">
      <SEO title="Sign In | Acreage" description="Sign in to your Acreage account to manage your farm, orders, and sales." />
      <div className="flex items-center space-x-2.5 mb-6">
        <div className="p-2.5 bg-green-600 dark:bg-emerald-600 rounded-2xl text-white shadow-md shadow-green-600/20">
          <Sprout className="w-6 h-6 stroke-[2.5]" />
        </div>
        <span className="font-black text-xl tracking-wider text-slate-800 dark:text-white uppercase">ACREAGE</span>
      </div>

      <div className="max-w-md w-full bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xl">
        <h2 className="text-xl font-extrabold text-slate-800 dark:text-white text-center mb-1">Welcome Back</h2>
        <p className="text-xs text-slate-400 dark:text-slate-400 text-center mb-6">Sign in to manage your acreage ecosystem</p>
        
        {error && (
          <div className="mb-4 text-xs font-semibold text-red-600 dark:text-rose-400 bg-red-50 dark:bg-rose-950/50 border border-red-100 dark:border-rose-900 p-3 rounded-xl text-center animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="e.g. john@farm.com"
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all disabled:opacity-60" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••"
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all disabled:opacity-60" 
            />
          </div>

          <button
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-green-600 hover:bg-green-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition shadow-md shadow-green-600/15 inline-flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-green-600 dark:text-emerald-400 font-bold hover:underline transition-all">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
