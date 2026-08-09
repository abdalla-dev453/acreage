import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { Sprout, ArrowRight } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

import home_banner from '../assets/agriculture.jpeg';

export default function Home() {
  const { user } = useContext(AuthContext);

  return (
    <div className="min-h-screen flex flex-col justify-between p-8 animate-fade-in relative overflow-hidden bg-slate-900">
      
      {/* 1. BACKGROUND IMAGE WRAPPER LAYER */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-100"
        style={{ backgroundImage: `url(${home_banner})` }}
      />
      
      {/* 2. GLASSMORPHIC DARK OVERLAY MASK */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/70 to-slate-950/90 backdrop-blur-[2px]" />

      {/* Platform Header Navigation Control Bar */}
      <header className="flex justify-between items-center max-w-6xl w-full mx-auto bg-white/10 backdrop-blur-xl py-4 px-6 rounded-2xl border border-white/10 shadow-xl z-10">
        <div className="flex items-center space-x-2 select-none">
          <div className="p-2 bg-orange-600 rounded-xl text-white shadow-md shadow-orange-600/20">
            <Sprout className="w-5 h-5 stroke-[2.2]" />
          </div>
          
          {/* DYNAMIC COLOR-SHIFTING BRANDING TEXT */}
          <span 
            className="font-black text-xl tracking-wider uppercase transition-all duration-1000"
            style={{
              animation: 'brandGlow 3s ease-in-out infinite',
            }}
          >
            ACREAGE
          </span>
        </div>
        
        {/* Dynamic Header Action Group */}
        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block text-xs font-bold text-slate-200">Logged in as @{user.username}</span>
              <Link to="/dashboard" className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-lg shadow-orange-600/20">Go to Workspace</Link>
            </div>
          ) : (
            <>
              <Link to="/login" className="text-xs font-bold text-slate-300 hover:text-white transition-colors">Sign In</Link>
              <Link to="/register" className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-lg shadow-orange-600/20">Get Started</Link>
            </>
          )}
        </div>
      </header>

      {/* Main Feature Hero Spotlight Area */}
      <main className="max-w-3xl mx-auto text-center my-auto space-y-6 px-4 z-10 py-12">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 border border-orange-500/30 backdrop-blur-md rounded-full text-orange-400 text-[10px] font-black uppercase tracking-widest mx-auto select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
          <span>Empowering Local Farm Ecosystems</span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight tracking-tight max-w-2xl mx-auto drop-shadow-md">
          Direct Agricultural Trade & <span className="text-orange-500">Farm Analytics</span>
        </h1>
        
        <p className="text-slate-200 text-base sm:text-lg max-w-xl mx-auto leading-relaxed font-semibold drop-shadow-sm">
          Connecting local producers directly with buyers while managing crop activities, orders, and sales inside a unified, secure dashboard.
        </p>
        
        <div className="flex justify-center pt-4">
          <Link 
            to={user ? "/dashboard" : "/register"} 
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-black flex items-center space-x-2 transition-all shadow-xl shadow-orange-600/30 active:scale-95 cursor-pointer text-sm uppercase tracking-wider"
          >
            <span>{user ? 'Open Your Dashboard' : 'Create Merchant Account'}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </Link>
        </div>
      </main>

      {/* Enhanced Visual Anchor: Interactive Automatic-Pulse Footer Block */}
      <footer className="relative w-full max-w-6xl mx-auto pt-24 pb-6 select-none z-10">
        
        {/*FIXED: Background Word Banner now brightens and dim pulses AUTOMATICALLY */}
        <div className="absolute inset-x-0 bottom-8 flex justify-center items-center pointer-events-none z-0 overflow-hidden">
          <span 
            className="text-[9vw] font-black tracking-[0.2em] uppercase select-none transition-all duration-1000"
            style={{
              animation: 'footerWordGlow 5s ease-in-out infinite',
            }}
          >
            ACREAGE
          </span>
        </div>

        {/* Footer Typography Text Metrics */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between border-t border-white/10 pt-6 gap-3">
          <p className="text-xs text-slate-400 font-bold tracking-wide">
            © 2026 ACREAGE Platform. All rights reserved.
          </p>
          <div className="flex space-x-6 text-[11px] font-black text-slate-400 uppercase tracking-wider">
            <a href="#privacy" className="hover:text-orange-500 transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-orange-500 transition-colors">Terms of Service</a>
            <a href="#support" className="hover:text-orange-500 transition-colors">Support Ledger</a>
          </div>
        </div>
      </footer>

      {/*SHARED CSS KEYFRAME INJECTIONS */}
      <style>{`
        @keyframes brandGlow {
          0%, 100% {
            color: rgb(148, 163, 184); /* Dim slate grey */
            text-shadow: 0 0 0px rgba(234, 88, 12, 0);
          }
          50% {
            color: rgb(249, 115, 22); /* Bright vibrant orange */
            text-shadow: 0 0 12px rgba(249, 115, 22, 0.5); /* Vivid branding glow */
          }
        }

        @keyframes footerWordGlow {
          0%, 100% {
            color: rgba(255, 255, 255, 0.03); /* Extremely dim watermark */
            transform: scale(1);
          }
          50% {
            color: rgba(249, 115, 22, 0.12); /* Automatically brightens to a vibrant orange aura */
            transform: scale(1.03); /* Subtle breathing zoom effect */
          }
        }
      `}</style>

    </div>
  );
}
