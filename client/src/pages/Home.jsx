import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { Sprout, ArrowRight } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

export default function Home() {
  const { user } = useContext(AuthContext);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-8 animate-fade-in relative overflow-hidden">
      
      {/* Platform Header Navigation Control Bar */}
      <header className="flex justify-between items-center max-w-6xl w-full mx-auto bg-white/60 backdrop-blur-md py-4 px-6 rounded-2xl border border-slate-200/50 shadow-sm z-10">
        <div className="flex items-center space-x-2 select-none">
          <div className="p-2 bg-purple-600 rounded-xl text-white shadow-sm shadow-purple-500/10">
            <Sprout className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="font-extrabold text-xl tracking-wider text-slate-800 uppercase">ACREAGE</span>
        </div>
        
        {/* Dynamic Header Action Group */}
        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block text-xs font-bold text-slate-400">Logged in as @{user.username}</span>
              <Link to="/dashboard" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm">Go to Workspace</Link>
            </div>
          ) : (
            <>
              <Link to="/login" className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">Sign In</Link>
              <Link to="/register" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm">Get Started</Link>
            </>
          )}
        </div>
      </header>

      {/* Main Feature Hero Spotlight Area */}
      <main className="max-w-3xl mx-auto text-center my-auto space-y-6 px-4 z-10 py-12">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 border border-purple-100/50 rounded-full text-purple-700 text-[10px] font-bold uppercase tracking-widest mx-auto select-none">
          <span className="w-1 h-1 rounded-full bg-purple-600 animate-ping" />
          <span>Empowering Local Farm Ecosystems</span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 leading-tight tracking-tight max-w-2xl mx-auto">
          Direct Agricultural Trade & Farm Analytics
        </h1>
        
        <p className="text-slate-500 text-base sm:text-lg max-w-xl mx-auto leading-relaxed font-medium">
          Connecting local producers directly with buyers while managing crop activities, orders, and sales inside a unified, secure dashboard.
        </p>
        
        <div className="flex justify-center pt-4">
          <Link 
            to={user ? "/dashboard" : "/register"} 
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 transition-all shadow-md shadow-purple-500/10 active:scale-95 cursor-pointer text-sm"
          >
            <span>{user ? 'Open Your Dashboard' : 'Create Merchant Account'}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.2]" />
          </Link>
        </div>
      </main>

      {/* 1. Enhanced Visual Anchor: Interactive Hover-Reactive Footer Block */}
      <footer className="relative w-full max-w-6xl mx-auto pt-24 pb-6 group select-none z-10">
        
        {/* 2. Large Background Word Banner that lights up upon footer hover */}
        <div className="absolute inset-x-0 bottom-8 flex justify-center items-center pointer-events-none z-0 overflow-hidden">
          <span className="text-[12vw] font-black tracking-[0.2em] text-slate-200/40 uppercase transition-all duration-700 ease-out transform translate-y-4 opacity-50 scale-95 group-hover:text-purple-600/15 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 tracking-widest select-none">
            ACREAGE
          </span>
        </div>

        {/* Footer Typography Text Metrics */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between border-t border-slate-200/60 pt-6 gap-3">
          <p className="text-xs text-slate-400 font-semibold tracking-wide">
            © 2026 ACREAGE Platform. All rights reserved.
          </p>
          <div className="flex space-x-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <a href="#privacy" className="hover:text-purple-600 transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-purple-600 transition-colors">Terms of Service</a>
            <a href="#support" className="hover:text-purple-600 transition-colors">Support Ledger</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
