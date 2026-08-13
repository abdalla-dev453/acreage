import { useState } from 'react';
import API from '../../services/api';

export default function OrderTable({ orders = [], onRefresh }) {
  const [updatingId, setUpdatingId] = useState(null);
  const userRole = localStorage.getItem('role') || 'buyer';

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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden w-full">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-xs tracking-wider">
            <tr>
              <th className="px-6 py-4">Order Code</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Items</th>
              <th className="px-6 py-4">Total Amount</th>
              <th className="px-6 py-4">Payment</th>
              <th className="px-6 py-4">Fulfillment</th>
              <th className="px-6 py-4">Address & Contact</th>
              {userRole === 'farmer' && <th className="px-6 py-4">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.length > 0 ? (
              orders.map((order) => {
                const displayCode = order?.order_code || `ACR-#${order?.id || '0000'}`;
                const buyerName = order?.customer || order?.buyer?.username || 'Anonymous Buyer';
                const totalAmt = order?.total_amount ? `KES ${Number(order.total_amount).toLocaleString()}` : 'KES 0';
                const isLocked = order?.status === 'delivered' || order?.status === 'cancelled';

                return (
                  <tr key={order?.id || Math.random()} className="hover:bg-slate-50/50 transition-all">
                    {/* Order Code */}
                    <td className="px-6 py-4 font-bold text-slate-900">{displayCode}</td>

                    {/* Customer */}
                    <td className="px-6 py-4 font-medium text-slate-800">{buyerName}</td>

                    {/* Order Items Breakdown */}
                    <td className="px-6 py-4">
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

                    {/* Total Amount */}
                    <td className="px-6 py-4 font-bold text-emerald-600">{totalAmt}</td>

                    {/* Payment Status */}
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${getPaymentBadge(order?.payment_status)}`}>
                        {order?.payment_status || 'unpaid'}
                      </span>
                    </td>

                    {/* Fulfillment Status Badge */}
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1 capitalize ${getStatusBadge(order?.status)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {order?.status || 'pending'}
                      </span>
                    </td>

                    {/* Location & Contact Phone */}
                    <td className="px-6 py-4 text-xs">
                      <div className="text-slate-800 max-w-xs truncate font-medium">
                        {order?.delivery_address || 'N/A'}
                      </div>
                      <div className="text-slate-400 font-mono mt-0.5">
                        {order?.contact_phone || 'N/A'}
                      </div>
                    </td>

                    {/* Farmer Action Status Control */}
                    {userRole === 'farmer' && (
                      <td className="px-6 py-4">
                        {isLocked ? (
                          <span className="text-xs text-slate-400 italic">Completed</span>
                        ) : (
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
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={userRole === 'farmer' ? 8 : 7} className="px-6 py-12 text-center text-slate-400 font-medium">
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