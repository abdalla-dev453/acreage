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
      className="stats-card p-6 rounded-2xl flex items-center justify-between cursor-pointer group"
    >
      <div className="min-w-0 flex-1 pr-4">
        <p className="text-3xl font-bold text-gradient-premium tracking-tight truncate">
          {formattedValue ?? '0'}
        </p>
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-2 truncate">
          {label}
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 text-primary-600 transition-all duration-300 group-hover:from-primary-600 group-hover:to-primary-700 group-hover:text-white group-hover:shadow-lg shrink-0">
        <Icon className="w-6 h-6 stroke-[2.2]" />
      </div>
    </motion.div>
  );
}
