import { motion } from 'framer-motion';

export default function StatCard({ label, value, icon: Icon, delay = 0, isCurrency = false }) {
  const formattedValue = typeof value === 'number'
    ? isCurrency
      ? `KES ${value.toLocaleString()}`
      : value.toLocaleString()
    : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="stats-card p-5 sm:p-6 rounded-2xl flex items-center justify-between cursor-pointer group"
    >
      <div className="min-w-0 flex-1 pr-3 sm:pr-4">
        <p className="text-2xl sm:text-3xl font-bold text-green-700 dark:text-emerald-400 tracking-tight truncate">
          {formattedValue ?? '0'}
        </p>
        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mt-1.5 sm:mt-2 truncate">
          {label}
        </p>
      </div>

      <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950/80 dark:to-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100/60 dark:border-emerald-800/40 transition-all duration-300 group-hover:from-emerald-600 group-hover:to-emerald-700 group-hover:text-white dark:group-hover:text-white group-hover:shadow-lg shrink-0">
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
      </div>
    </motion.div>
  );
}
