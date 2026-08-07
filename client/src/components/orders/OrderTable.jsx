export default function OrderTable({ orders = [] }) {
  // 1. Fixed: Normalized input casing to prevent style color rendering failures
  const getStatusBadge = (status = '') => {
    const cleanStatus = status.trim().toLowerCase();
    switch (cleanStatus) {
      case 'delivered':
        return 'bg-emerald-100 text-emerald-700';
      case 'on delivery':
      case 'shipping':
        return 'bg-purple-100 text-purple-700';
      case 'cancelled':
        return 'bg-red-100 text-red-600';
      case 'pending':
        return 'bg-amber-100 text-amber-700'; // Added styling for database seed default
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden w-full">
      <div className="overflow-x-auto"> {/* Added scroller container to prevent breaking mobile layouts */}
        <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
          <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-700 font-bold uppercase text-xs tracking-wider">
            <tr>
              <th className="px-6 py-4">Order ID</th>
              <th className="px-6 py-4">Customer Name</th>
              <th className="px-6 py-4">Total Amount</th> {/* Added to track totals from your model schema */}
              <th className="px-6 py-4">Payment</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Contact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.length > 0 ? (
              orders.map((order) => {
                const displayCode = order?.order_code || `ACR-#${order?.id || '0000'}`;
                const buyerName = order?.buyer?.username || order?.customer || 'Anonymous Buyer';
                const totalAmt = order?.total_amount ? `KES ${order.total_amount.toLocaleString()}` : 'KES 0';
                
                return (
                  <tr key={order?.id || Math.random()} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-6 py-4 font-bold text-slate-900">{displayCode}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{buyerName}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{totalAmt}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        (order?.payment_status || order?.payment) === 'unpaid' ? 'text-red-500 bg-red-50' : 'text-slate-600'
                      }`}>
                        {order?.payment_status || order?.payment || 'Unspecified'}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate">{order?.delivery_address || order?.location || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${getStatusBadge(order?.status)}`}>
                        <span className="w-1 h-1 rounded-full bg-current"></span>
                        {order?.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-500">{order?.contact_phone || order?.contact || 'N/A'}</td>
                  </tr>
                );
              })
            ) : (
              /* Missing state empty row view anchor fallback */
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-slate-400 font-medium">
                  No orders listed in this ledger table
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
