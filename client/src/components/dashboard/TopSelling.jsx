export default function TopSelling({ items = [] }) {
  // 1. Identify the maximum quantity to calculate percentage baselines for the layout bars
  const maxQuantity = items.length > 0 ? Math.max(...items.map(i => i.quantity || 1)) : 1;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full min-w-[320px]">
      {/* Header Container Layout */}
      <div className="flex justify-between items-center mb-1">
        <h3 className="font-bold text-slate-800 text-base">Top Selling Products</h3>
        <button className="text-xs text-purple-600 hover:text-purple-700 font-semibold transition-colors bg-purple-50 px-2.5 py-1 rounded-lg">
          View All
        </button>
      </div>
      <p className="text-xs text-slate-400 mb-5">Most popular inventory assets ordered this week</p>
      
      {/* List Mapping Wrapper Area */}
      <div className="space-y-4 flex-1 overflow-y-auto pr-1">
        {items.length > 0 ? (
          items.map((item, idx) => {
            const qty = item?.quantity || 0;
            const unitType = item?.unit || 'kg';
            const itemTitle = item?.title || 'Unknown Asset';
            const category = item?.category || 'General';
            
            // Calculate relative layout width for the progress tracking visualization
            const barWidthPercent = maxQuantity > 0 ? (qty / maxQuantity) * 100 : 0;

            return (
              <div key={item.id || idx} className="space-y-1.5 group">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-slate-800 group-hover:text-purple-700 transition-colors truncate">
                      {itemTitle}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                      {category}
                    </span>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <span className="text-sm font-bold text-slate-900 block">
                      {qty.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 block lowercase">
                      {unitType} sold
                    </span>
                  </div>
                </div>

                {/* 2. Enhanced Visual Anchor: Progress visual indicator track bar */}
                <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                  <div 
                    className="h-full bg-purple-600 rounded-full transition-all duration-500 ease-out group-hover:bg-purple-500"
                    style={{ width: `${barWidthPercent}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          /* Empty baseline fallback content view */
          <div className="flex items-center justify-center h-32 text-center text-xs text-slate-400 font-medium">
            No product transactional metrics recorded yet
          </div>
        )}
      </div>
    </div>
  );
}
