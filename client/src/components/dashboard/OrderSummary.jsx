export default function OrderSummary({ summary }) {
  // 1. Map custom color tokens tailored directly to each specific state layout
  const stats = [
    { 
      label: 'On Delivery', 
      pct: `${summary?.on_delivery_pct ?? 0}%`,
      borderClass: 'border-purple-500 border-t-purple-100 text-purple-700'
    },
    { 
      label: 'Delivered', 
      pct: `${summary?.delivered_pct ?? 0}%`,
      borderClass: 'border-emerald-500 border-t-emerald-100 text-emerald-700'
    },
    { 
      label: 'Cancelled', 
      pct: `${summary?.cancelled_pct ?? 0}%`,
      borderClass: 'border-red-500 border-t-red-100 text-red-600'
    },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-full min-w-[320px]">
      {/* Header Widget Sections */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <h3 className="font-bold text-slate-800 text-base">Order Summary</h3>
          <select className="text-xs text-slate-500 font-medium bg-slate-50 border border-slate-200/60 rounded-lg px-2 py-1 outline-none cursor-pointer hover:bg-slate-100/50 transition">
            <option>Today</option>
            <option>This Week</option>
            <option>This Month</option>
          </select>
        </div>
        <p className="text-xs text-slate-400 mb-6">Overview distribution of fulfillment metrics</p>
      </div>

      {/* Progress Circles Flow Area */}
      <div className="flex justify-around items-center pt-2 pb-4 gap-2">
        {stats.map((stat, i) => (
          <div key={i} className="text-center flex-1 group">
            {/* 2. Enhanced Dynamic Anchor: Specific colored progress rings */}
            <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center font-bold text-xs shadow-sm mx-auto mb-3 transition-transform duration-300 group-hover:scale-105 ${stat.borderClass}`}>
              {stat.pct}
            </div>
            <p className="text-xs font-bold text-slate-500 group-hover:text-slate-700 transition-colors">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
