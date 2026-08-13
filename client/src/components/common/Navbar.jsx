import { useContext } from 'react';
import { Search, Bell, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { AuthContext } from '../../context/AuthContext';

export default function Navbar({ title = 'Dashboard' }) {
  const { user } = useContext(AuthContext);

  const getInitials = (name = '') => {
    const cleanName = name.trim();
    if (!cleanName) return 'US';
    if (cleanName.includes(' ')) {
      return cleanName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return cleanName.slice(0, 2).toUpperCase();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex justify-between items-center mb-8 w-full bg-white/40 backdrop-blur-xl py-3.5 px-4 rounded-2xl border border-white/60 shadow-sm"
    >
      {/* 1. Brand Route Label Architecture */}
      <div className="flex items-center space-x-3.5">
        <div className="flex items-center space-x-1.5">
          <span className="text-green-600 font-mono text-xl font-black select-none opacity-40">#</span>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            {title}
          </h1>
        </div>
        
        {user?.role && (
          <motion.span 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="hidden sm:inline-block text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 bg-slate-900/5 text-slate-600 rounded-lg border border-slate-900/[0.03]"
          >
            {user.role}
          </motion.span>
        )}
      </div>

      {/* 2. Precision Utility Command Controls Strip */}
      <div className="flex items-center space-x-2.5">
        <div className="flex items-center space-x-2">
          {[
            { icon: Search, label: 'Search Content' },
            { icon: Bell, label: 'Alert Notifications', badge: true },
            { icon: Settings, label: 'System Configuration' }
          ].map((btn, idx) => (
            <motion.button
              key={idx}
              whileHover={{ y: -1.5, backgroundColor: '#ffffff' }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              aria-label={btn.label}
              className="p-2.5 bg-white/80 border border-slate-200/60 shadow-sm rounded-xl text-slate-500 hover:text-slate-800 transition-colors relative cursor-pointer group"
            >
              <btn.icon className="w-4 h-4 stroke-[2.2] group-hover:scale-105 transition-transform duration-200" />
              
              {btn.badge && (
                <span className="absolute top-2.5 right-2.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-600" />
                </span>
              )}
            </motion.button>
          ))}
        </div>

        {/* High-End Micro Separator Line */}
        <div className="h-5 w-px bg-slate-200/80 mx-1 hidden sm:block" />

        {/* 3. Luxury Identity User Cluster */}
        <motion.div 
          whileHover={{ x: 1 }}
          className="flex items-center space-x-3 pl-1 group cursor-pointer select-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-600 to-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-green-700/10 transition-transform group-hover:scale-[1.03] duration-200 uppercase tracking-wider border border-white/20">
            {getInitials(user?.username)}
          </div>
          
          <div className="hidden md:flex flex-col text-left max-w-[120px]">
            <span className="text-xs font-bold text-slate-900 truncate leading-tight group-hover:text-green-700 transition-colors duration-200">
              {user?.username || 'Guest Profile'}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold truncate leading-none mt-1 tracking-wide">
              {user?.email || 'offline'}
            </span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
