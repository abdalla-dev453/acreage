import { motion } from 'framer-motion';

export default function StatCard({ label, value, icon: Icon, delay = 0, isCurrency = false }) {
  // 1. Format value dynamically based on whether it represents a currency amount
  const formattedValue = typeof value === 'number'
    ? isCurrency
      ? `KES ${value.toLocaleString()}`
      : value.toLocaleString()
    : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      whileHover={{ y: -2 }} // 2. Enhanced Visual Anchor: Subtle float hover interaction
      className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-shadow hover:shadow-md/50 cursor-pointer group"
    >
      <div className="min-w-0 flex-1 pr-3">
        {/* Dynamic Main Numerical Value Block */}
        <p className="text-2xl font-extrabold text-slate-900 tracking-tight truncate">
          {formattedValue ?? '0'}
        </p>
        {/* Description Label Node */}
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1 truncate">
          {label}
        </p>
      </div>

      {/* Decorative Icon Graphic Anchor */}
      <div className="p-3.5 rounded-xl bg-purple-50 text-purple-600 transition-all duration-300 group-hover:bg-purple-600 group-hover:text-white shrink-0 shadow-sm">
        <Icon className="w-5 h-5 stroke-[2.2]" />
      </div>
    </motion.div>
  );
}
