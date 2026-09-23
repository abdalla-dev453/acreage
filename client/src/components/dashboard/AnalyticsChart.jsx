import { motion } from 'framer-motion';

export default function AnalyticsChart({ overview = { top_ordered_pct: 52, growth_rate: '+12%' } }) {
  const percentage = overview?.top_ordered_pct ?? 52;
  
  const radius = 50;
  const circumference = 2 * Math.PI * radius; // ~314.16
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between h-full w-full min-w-0">
      <div>
        <div className="flex justify-between items-center mb-1">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">Overview</h3>
          <button className="text-xs text-green-600 dark:text-emerald-400 font-semibold transition-colors bg-green-50 dark:bg-emerald-950/60 border border-green-100/50 dark:border-emerald-800/40 px-2.5 py-1 rounded-lg hover:bg-green-100/70">
            View Details
          </button>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-400">Total volume of top-ordered category this week</p>
      </div>

      <div className="flex items-center justify-center my-6 relative">
        <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 120 120">
          {/* Background Ring Track Line */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            className="text-slate-100 dark:text-slate-700"
            strokeWidth="10"
            stroke="currentColor"
            fill="transparent"
          />
          {/* Animated Filled Value Layer */}
          <motion.circle
            cx="60"
            cy="60"
            r={radius}
            className="text-green-600 dark:text-emerald-400"
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

        {/* Text Metadata Overlay inside circle */}
        <div className="absolute text-center">
          <span className="font-extrabold text-slate-800 dark:text-slate-100 text-2xl block tracking-tight">
            {percentage}%
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mt-0.5">
            Share
          </span>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs">
        <span className="text-slate-500 dark:text-slate-400 font-medium">Weekly Demand Growth</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100/50 dark:border-emerald-800/40 px-2.5 py-1 rounded-lg flex items-center gap-1">
          {overview?.growth_rate || '+12%'}
        </span>
      </div>
    </div>
  );
}
