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
        <p className="text-2xl sm:text-3xl font-bold text-brand-charcoal tracking-tight truncate">
          {formattedValue ?? '0'}
        </p>
        <p className="text-[11px] sm:text-xs text-brand-muted font-semibold uppercase tracking-wider mt-1.5 sm:mt-2 truncate">
          {label}
        </p>
      </div>

      <div className="p-3 sm:p-4 rounded-2xl bg-brand-stone text-brand-forest border border-brand-sand transition-all duration-300 group-hover:bg-brand-forest group-hover:text-white shrink-0">
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
      </div>
    </motion.div>
  );
}
