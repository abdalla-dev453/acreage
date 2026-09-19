import { useState, useContext } from 'react';
import { Smartphone, Loader2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

export default function OrderTable({ orders = [], onRefresh, userRole }) {
  const navigate = useNavigate();
  const resolvedRole = userRole || user?.role || localStorage.getItem('role') || 'buyer';

  const [updatingId, setUpdatingId] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [payMsg, setPayMsg] = useState({}); // { [orderId]: { type: 'success'|'error', text } }

  const getStatusBadge = (status = '') => {
    const cleanStatus = status.trim().toLowerCase();
    switch (cleanStatus) {
      case 'delivered':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'on delivery':
      case 'shipping':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'cancelled':
        return 'bg-red-100 text-red-600 border-red-200';
      case 'pending':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getPaymentBadge = (status = '') => {
    const cleanStatus = status.trim().toLowerCase();
    switch (cleanStatus) {
      case 'paid':
        return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'failed':
        return 'bg-red-50 text-red-600 border-red-200';
      default:
        return 'bg-amber-50 text-amber-600 border-amber-200';
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      await API.patch(`/orders/${orderId}/status`, { status: newStatus });
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePayViaMpesa = async (order) => {
    setPayingId(order.id);
    setPayMsg(prev => ({ ...prev, [order.id]: null }));
    try {
      const res = await API.post(`/orders/${order.id}/pay`);
      setPayMsg(prev => ({
        ...prev,
        [order.id]: { type: 'success', text: res.data?.message || 'M-Pesa prompt sent! Check your phone.' }
      }));
      // Refresh after 4 s to reflect any callback-updated payment status
      setTimeout(() => {
        if (onRefresh) onRefresh();
      }, 4000);
    } catch (err) {
      setPayMsg(prev => ({
        ...prev,
        [order.id]: { type: 'error', text: err.response?.data?.message || 'M-Pesa request failed. Try again.' }
      }));
    } finally {
      setPayingId(null);
    }
  };

  const colSpan = resolvedRole === 'farmer' ? 8 : 8;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden w-full">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-xs tracking-wider">
            <tr>
              <th className="px-4 md:px-6 py-4">Order Code</th>
              <th className="px-4 md:px-6 py-4">Customer</th>
              <th className="px-4 md:px-6 py-4">Items</th>
              <th className="px-4 md:px-6 py-4">Total Amount</th>
              <th className="px-4 md:px-6 py-4">Payment</th>
              <th className="px-4 md:px-6 py-4">Fulfillment</th>
              <th className="px-4 md:px-6 py-4">Address &amp; Contact</th>
              <th className="px-4 md:px-6 py-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.length > 0 ? (
              orders.map((order) => {
                const displayCode = order?.order_code || `ACR-#${order?.id || '0000'}`;
                const buyerName = order?.customer || order?.buyer?.username || 'Anonymous Buyer';
                const totalAmt = order?.total_amount ? `KES ${Number(order.total_amount).toLocaleString()}` : 'KES 0';
                const isLocked = order?.status === 'delivered' || order?.status === 'cancelled';
                const isPaid = (order?.payment_status || '').toLowerCase() === 'paid';
                const isCancelled = (order?.status || '').toLowerCase() === 'cancelled';
                const msg = payMsg[order?.id];

                return (
                  <tr key={order?.id || Math.random()} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-4 md:px-6 py-4 font-bold text-slate-900">{displayCode}</td>

                    <td className="px-4 md:px-6 py-4 font-medium text-slate-800">{buyerName}</td>

                    <td className="px-4 md:px-6 py-4">
                      {order?.items && order.items.length > 0 ? (
                        <div className="space-y-1">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="text-xs text-slate-700">
                              <span className="font-semibold text-slate-900">
                                {item.product_name || item.product?.title || `Product #${item.product_id}`}
                              </span>{' '}
                              <span className="text-slate-500">
                                x {item.quantity} (@ KES {item.unit_price})
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">No items detail</span>
                      )}
                    </td>

                    <td className="px-4 md:px-6 py-4 font-bold text-emerald-600">{totalAmt}</td>

                    <td className="px-4 md:px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${getPaymentBadge(order?.payment_status)}`}>
                        {order?.payment_status || 'unpaid'}
                      </span>
                    </td>

                    <td className="px-4 md:px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1 capitalize ${getStatusBadge(order?.status)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {order?.status || 'pending'}
                      </span>
                    </td>

                    <td className="px-4 md:px-6 py-4 text-xs">
                      <div className="text-slate-800 max-w-[180px] truncate font-medium">
                        {order?.delivery_address || 'N/A'}
                      </div>
                      <div className="text-slate-400 font-mono mt-0.5">
                        {order?.contact_phone || 'N/A'}
                      </div>
                    </td>

                     {/* Action column — role-aware */}
                     <td className="px-4 md:px-6 py-4">
                       <div className="flex items-center gap-2 min-w-[140px]">
                         {resolvedRole === 'buyer' ? (
                           <>
                           {!isPaid && !isCancelled ? (
                             <button
                               disabled={payingId === order?.id}
                               onClick={() => handlePayViaMpesa(order)}
                               className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm shadow-green-600/10"
                             >
                               {payingId === order?.id ? (
                                 <><Loader2 className="w-3 h-3 animate-spin" /><span>Sending...</span></>
                               ) : (
                                 <><Smartphone className="w-3 h-3" /><span>Pay</span></>
                               )}
                             </button>
                           ) : isPaid ? (
                             <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                               ✓ Paid
                             </span>
                           ) : (
                             <span className="text-xs text-slate-400 italic">Cancelled</span>
                           )}
                           <button
                             onClick={() => navigate(`/orders/${order.id}`)}
                             className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition group"
                             title="Track Order"
                           >
                             <Eye className="w-4 h-4" />
                           </button>
                           </>
                         ) : isLocked ? (
                           <>
                           <span className="text-xs text-slate-400 italic">Completed</span>
                           <button
                             onClick={() => navigate(`/orders/${order.id}`)}
                             className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                             title="View Details"
                           >
                             <Eye className="w-4 h-4" />
                           </button>
                           </>
                         ) : (
                           <>
                           <select
                             disabled={updatingId === order?.id}
                             value={order?.status || 'pending'}
                             onChange={(e) => handleStatusChange(order.id, e.target.value)}
                             className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer disabled:opacity-50"
                           >
                             <option value="pending">Pending</option>
                             <option value="on delivery">On Delivery</option>
                             <option value="delivered">Delivered</option>
                             <option value="cancelled">Cancel Order</option>
                           </select>
                           <button
                             onClick={() => navigate(`/orders/${order.id}`)}
                             className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                             title="View Details"
                           >
                             <Eye className="w-4 h-4" />
                           </button>
                           </>
                         )
                       }
                       </div>
                     </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={colSpan} className="px-6 py-12 text-center text-slate-400 font-medium">
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