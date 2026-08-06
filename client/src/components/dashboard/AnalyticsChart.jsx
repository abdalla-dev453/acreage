import { motion } from 'framer-motion';

export default function AnalyticsChart({ overview = { top_ordered_pct: 52, growth_rate: '+12%' } }) {
  const percentage = overview?.top_ordered_pct ?? 52;
  
  // 1. Math formulas for SVG ring dimensions
  const radius = 50;
  const circumference = 2 * Math.PI * radius; // ~314.16
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-full min-w-[280px]">
      <div>
        <div className="flex justify-between items-center mb-1">
          <h3 className="font-bold text-slate-800 text-base">Overview</h3>
          <button className="text-xs text-purple-600 font-semibold transition-colors bg-purple-50 px-2.5 py-1 rounded-lg hover:bg-purple-100/70">
            View Details
          </button>
        </div>
        <p className="text-xs text-slate-400">Total volume of top-ordered category this week</p>
      </div>

      {/* 2. Enhanced Dynamic Anchor: Animated SVG Ring Graph */}
      <div className="flex items-center justify-center my-6 relative">
        <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 120 120">
          {/* Background Ring Track Line */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            className="text-slate-100"
            strokeWidth="10"
            stroke="currentColor"
            fill="transparent"
          />
          {/* Animated Filled Value Layer */}
          <motion.circle
            cx="60"
            cy="60"
            r={radius}
            className="text-purple-600"
            strokeWidth="10"
            stroke="currentColor"
            fill="transparent"
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: strokeDashoffset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ strokeDasharray: circumference }}
          />
        </svg>

        {/* Text Metadata Overlay Node Box inside circle absolute space */}
        <div className="absolute text-center">
          <span className="font-extrabold text-slate-800 text-2xl block tracking-tight">
            {percentage}%
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mt-0.5">
            Share
          </span>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
        <span className="text-slate-500 font-medium">Weekly Demand Growth</span>
        <span className="text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg flex items-center gap-1">
          {overview?.growth_rate || '+12%'}
        </span>
      </div>
    </div>
  );
}
