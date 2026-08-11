import { useContext } from 'react';
import { Search, Bell, Settings } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

export default function Navbar({ title = 'Dashboard' }) {
  const { user } = useContext(AuthContext);

  // 1. Fixed: Enhanced initials extractor to handle single-word usernames safely
  const getInitials = (name = '') => {
    const cleanName = name.trim();
    if (!cleanName) return 'US'; // User fallback state anchor

    if (cleanName.includes(' ')) {
      return cleanName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    
    // If it's a single word username (e.g., @mary_wambui), extract the first two letters
    return cleanName.slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex justify-between items-center mb-6 w-full bg-white/40 backdrop-blur-md py-3 px-1 rounded-2xl border-b border-transparent">
      {/* Dynamic Route Title Node Header */}
      <div className="flex items-center space-x-3">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center space-x-2">
          <span className="text-green-600 font-mono font-medium opacity-70">#</span>
          <span>{title}</span>
        </h1>
        {user?.role && (
          <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md border border-slate-200/50">
            {user.role}
          </span>
        )}
      </div>

      {/* Control Actions & Utility Toolbar Context */}
      <div className="flex items-center space-x-3">
        <button className="p-2.5 bg-white border border-slate-100 shadow-sm rounded-xl hover:bg-slate-50 text-slate-500 transition-all active:scale-95">
          <Search className="w-4.5 h-4.5" />
        </button>
        <button className="p-2.5 bg-white border border-slate-100 shadow-sm rounded-xl hover:bg-slate-50 text-slate-500 transition-all active:scale-95 relative">
          <Bell className="w-4.5 h-4.5" />
          {/* Notification Alert Dot Anchor */}
          <span className="w-1.5 h-1.5 bg-green-600 rounded-full absolute top-2.5 right-2.5 animate-pulse" />
        </button>
        <button className="p-2.5 bg-white border border-slate-100 shadow-sm rounded-xl hover:bg-slate-50 text-slate-500 transition-all active:scale-95">
          <Settings className="w-4.5 h-4.5" />
        </button>

        {/* Separator Node Divider */}
        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

        {/* 2. Enhanced Profile Avatar Cluster Indicator */}
        <div className="flex items-center space-x-2.5 pl-1 group cursor-pointer">
          <div className="w-9 h-9 rounded-xl bg-green-600 text-white flex items-center justify-center font-bold text-sm shadow-sm transition-transform group-hover:scale-105 select-none uppercase tracking-wide">
            {getInitials(user?.username)}
          </div>
          <div className="hidden md:flex flex-col text-left max-w-[100px]">
            <span className="text-xs font-bold text-slate-800 truncate leading-tight">
              {user?.username || 'Guest Profile'}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold truncate leading-none mt-0.5">
              {user?.email || 'offline'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
