import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Sprout } from 'lucide-react'; // Brand anchor visual match

export default function Register() {
  const [formData, setFormData] = useState({ 
    username: '', 
    email: '', 
    password: '', 
    role: 'farmer',
    location: '' // Added matching your backend user schema models
  });
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await register(
        formData.username.trim(),
        formData.email.trim().toLowerCase(),
        formData.password,
        formData.role,
        formData.location.trim()
      );
      
      // Navigate to login after account initialization success
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Registration failed. Try a different username or email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-8">
      {/* Visual Brand Identifier */}
      <div className="flex items-center space-x-2 mb-6">
        <div className="p-2 bg-orange-600 rounded-xl text-white shadow-sm">
          <Sprout className="w-6 h-6" />
        </div>
        <span className="font-extrabold text-xl tracking-wider text-slate-800 uppercase">ACREAGE</span>
      </div>

      <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 text-center mb-1">Create Account</h2>
        <p className="text-xs text-slate-400 text-center mb-6">Join the digital marketplace connecting farmers and buyers</p>
        
        {/* Error Notification Alert Banner */}
        {error && (
          <div className="mb-4 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Username</label>
            <input 
              type="text" 
              required 
              disabled={isSubmitting}
              value={formData.username} 
              placeholder="e.g. john_doe"
              onChange={(e) => setFormData({ ...formData, username: e.target.value })} 
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all disabled:opacity-60" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
            <input 
              type="email" 
              required 
              disabled={isSubmitting}
              value={formData.email} 
              placeholder="e.g. john@farm.com"
              onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all disabled:opacity-60" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Password</label>
            <input 
              type="password" 
              required 
              disabled={isSubmitting}
              value={formData.password} 
              placeholder="••••••••"
              onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all disabled:opacity-60" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Location (Town/City)</label>
            <input 
              type="text" 
              required 
              disabled={isSubmitting}
              value={formData.location} 
              placeholder="e.g. Nakuru, Nairobi"
              onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all disabled:opacity-60" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Account Role</label>
            <select 
              value={formData.role} 
              disabled={isSubmitting}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })} 
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer"
            >
              <option value="farmer">Farmer (Sell Products & Track Logs)</option>
              <option value="buyer">Buyer (Order Fresh Farm Goods)</option>
            </select>
          </div>

          {/* Action Submission Control Button */}
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition shadow-sm inline-flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Creating Account...
              </>
            ) : (
              'Register'
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="text-orange-600 font-bold hover:underline transition-all">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
