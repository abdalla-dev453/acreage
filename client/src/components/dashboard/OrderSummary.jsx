export default function OrderSummary({ summary }) {
  const stats = [
    { 
      label: 'On Delivery', 
      pct: `${summary?.on_delivery_pct ?? 0}%`,
      borderClass: 'border-purple-500 border-t-purple-100 dark:border-t-purple-900 text-purple-700 dark:text-purple-400'
    },
    { 
      label: 'Delivered', 
      pct: `${summary?.delivered_pct ?? 0}%`,
      borderClass: 'border-emerald-500 border-t-emerald-100 dark:border-t-emerald-900 text-emerald-700 dark:text-emerald-400'
    },
    { 
      label: 'Cancelled', 
      pct: `${summary?.cancelled_pct ?? 0}%`,
      borderClass: 'border-red-500 border-t-red-100 dark:border-t-red-900 text-red-600 dark:text-red-400'
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between h-full w-full min-w-0">
      {/* Header Widget Sections */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">Order Summary</h3>
          <select className="text-xs text-slate-500 dark:text-slate-300 font-medium bg-slate-50 dark:bg-slate-700/60 border border-slate-200/60 dark:border-slate-600 rounded-lg px-2 py-1 outline-none cursor-pointer hover:bg-slate-100/50 transition">
            <option>Today</option>
            <option>This Week</option>
            <option>This Month</option>
          </select>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-400 mb-6">Overview distribution of fulfillment metrics</p>
      </div>

      {/* Progress Circles Flow Area */}
      <div className="flex justify-around items-center pt-2 pb-4 gap-2">
        {stats.map((stat, i) => (
          <div key={i} className="text-center flex-1 group">
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 flex items-center justify-center font-bold text-xs shadow-sm mx-auto mb-2.5 sm:mb-3 transition-transform duration-300 group-hover:scale-105 ${stat.borderClass}`}>
              {stat.pct}
            </div>
            <p className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors truncate">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
