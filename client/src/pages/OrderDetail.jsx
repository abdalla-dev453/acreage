import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapPin, Package, Truck, CheckCircle2, Clock, XCircle,
  Phone, Calendar, DollarSign, User, Weight, Copy, Share2,
  QrCode,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import API from "../services/api";
import Navbar from "../components/common/Navbar";
import SEO from "../components/common/SEO";

const STATUS_STEPS = [
  { key: "pending", label: "Pending", icon: Clock, color: "bg-slate-400" },
  { key: "on delivery", label: "On Delivery", icon: Truck, color: "bg-purple-500" },
  { key: "delivered", label: "Delivered", icon: CheckCircle2, color: "bg-emerald-500" },
  { key: "cancelled", label: "Cancelled", icon: XCircle, color: "bg-rose-500" },
];

const DEFAULT_LAT = -1.2921;
const DEFAULT_LNG = 36.8219;

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get(`/orders/${id}`);
      setOrder(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
        <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 font-medium mt-3">Loading order details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <p className="text-sm text-rose-600 mb-4">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold text-xs"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!order) return null;

  const currentStatusIndex = STATUS_STEPS.findIndex((s) => s.key === (order.status || "").trim());
  const statusStep = currentStatusIndex >= 0 ? STATUS_STEPS[currentStatusIndex] : STATUS_STEPS[0];

  const lat = order.delivery_lat || DEFAULT_LAT;
  const lng = order.delivery_lng || DEFAULT_LNG;

  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=14&size=600x300&markers=color:red%7C${lat},${lng}&key=${encodeURIComponent(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || "")}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(order.order_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Order ${order.order_code}`,
        text: `Tracking order ${order.order_code}`,
        url: window.location.href,
      });
    }
  };

  return (
    <div className="space-y-6 w-full pb-12">
      <SEO
        title={`Order ${order.order_code} | Acreage`}
        description={`Track your order ${order.order_code} on the Acreage marketplace.`}
      />

      <Navbar title={`Order ${order.order_code}`} />

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h2 className="text-slate-800 text-xl font-black">Order Tracking</h2>
        <div className="flex gap-2">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition"
          >
            {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied!" : "Copy Code"}
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition"
          >
            <Share2 className="w-3 h-3" /> Share
          </button>
        </div>
      </div>

      {/* ── Delivery Map ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-green-600" />
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide">Delivery Location</h3>
        </div>

        <div className="relative w-full h-56 bg-slate-100">
          <svg
            className="w-full h-full"
            viewBox="0 0 600 300"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="landGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>
            </defs>
            <rect width="600" height="300" fill="url(#landGradient)" rx="8" />
            <path
              d="M300 40 Q 380 100 360 160 T 300 200 T 240 220 T 180 200 Q 220 140 300 40 Z"
              fill="#dcfce7"
              stroke="#166534"
              strokeWidth="2"
              opacity="0.4"
            />
            <circle cx="300" cy="150" r="8" fill="#ef4444" stroke="#fff" strokeWidth="2" />
            <circle cx="300" cy="150" r="18" fill="none" stroke="#ef4444" strokeWidth="1" opacity="0.5" />
            <circle cx="300" cy="150" r="32" fill="none" stroke="#ef4444" strokeWidth="1" opacity="0.3" />
          </svg>

          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">DELIVERY PIN</p>
            <p className="text-lg font-black text-slate-900 font-mono">{order.order_code}</p>
          </div>

          <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">STATUS</p>
            <p className="text-xs font-black text-slate-900 flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${statusStep.color.replace("bg-", "bg-")} inline-block`} />
              {statusStep.label}
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/30">
          <p className="text-xs text-slate-500">
            <strong>Address:</strong> {order.delivery_address}
          </p>
          {order.contact_phone && (
            <p className="text-xs text-slate-500 mt-0.5">
              <strong>Contact:</strong> {order.contact_phone}
            </p>
          )}
          <p className="text-[10px] text-slate-400 mt-1 font-mono">
            GPS: {lat.toFixed(6)}, {lng.toFixed(6)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Order Timeline ── */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-wide mb-4">Fulfillment Progress</h3>
            <div className="space-y-4">
              {STATUS_STEPS.map((step, idx) => {
                const isActive = idx <= currentStatusIndex;
                const isPast = idx < currentStatusIndex;
                const isCurrent = idx === currentStatusIndex;

                return (
                  <motion.div
                    key={step.key}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isActive
                          ? `${step.color} text-white shadow-md`
                          : "bg-slate-100 text-slate-400 border border-slate-200"
                      }`}
                    >
                      <step.icon className="w-4 h-4 stroke-[2]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-black ${
                          isActive ? "text-slate-900" : "text-slate-400"
                        }`}
                      >
                        {step.label}
                      </p>
                      {isCurrent && isPast === false && (
                        <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Current</p>
                      )}
                    </div>
                    {idx < STATUS_STEPS.length - 1 && (
                      <div
                        className={`absolute w-px h-8 ml-[28px] mt-8 ${
                          isPast ? "bg-green-500" : "bg-slate-200"
                        }`}
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* ── Quick Actions ── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3">
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-wide mb-3">Actions</h3>

            {order.payment_status !== "paid" && (
              <button
                onClick={() => API.post(`/orders/${order.id}/pay`).then(() => fetchOrder())}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-green-600/20"
              >
                <DollarSign className="w-4 h-4" />
                Pay via M-Pesa
              </button>
            )}

            <button
              onClick={() => navigate(-1)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-100 transition"
            >
              <Package className="w-4 h-4" />
              Back to Orders
            </button>

            <button
              onClick={() => {
                const link = `tel:${order.contact_phone?.replace(/[^\d]/g, "")}`;
                if (order.contact_phone) window.location.href = link;
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold rounded-xl hover:bg-emerald-100 transition"
            >
              <Phone className="w-4 h-4" />
              Call Customer
            </button>
          </div>
        </div>

        {/* ── Order Details ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Info Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-wide flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              Order Information
              </h3>
              <motion.span
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className={`px-3 py-1 rounded-full text-xs font-black border ${statusStep.color.replace("bg-", "bg-")} text-white`}
              >
                {order.status || "pending"}
              </motion.span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Order Code</p>
                <p className="text-sm font-bold text-slate-900 font-mono">{order.order_code}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Date</p>
                <p className="text-sm font-bold text-slate-900 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {order.created_at ? new Date(order.created_at).toLocaleDateString("en-KE") : "-"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Payment</p>
                <p className="text-sm font-bold text-slate-900 capitalize">{order.payment_status || "unpaid"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Total</p>
                <p className="text-xl font-black text-green-600 font-mono">
                  KES {Number(order.total_amount || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-wide mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              Customer Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Name</p>
                <p className="font-bold text-slate-900">{order.buyer?.username || "-"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Email</p>
                <p className="font-bold text-slate-900">{order.buyer?.email || "-"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Phone</p>
                <p className="font-bold text-slate-900">{order.contact_phone || "-"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Farmer</p>
                <p className="font-bold text-slate-900">{order.farmer?.username || "-"}</p>
              </div>
              <div className="space-y-1 md:col-span-2">
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Delivery Address</p>
                <p className="font-bold text-slate-900">{order.delivery_address || "-"}</p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-wide mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-500" />
              Order Items
            </h3>
            <div className="space-y-3">
              {(order.items || []).map((item) => {
                const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
                return (
                  <motion.div
                    key={item.id || item.product_id}
                    className="flex items-center gap-4 p-3 bg-slate-50/50 rounded-xl border border-slate-100/50"
                  >
                    <div className="w-12 h-12 bg-slate-200 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                      {item.product?.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {item.product?.title || item.product_name || `Product #${item.product_id}`}
                      </p>
                      <p className="text-xs text-slate-400">
                        {item.quantity} × {item.unit} @ KES {Number(item.unit_price).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-slate-900 font-mono">
                        KES {Number(lineTotal).toLocaleString()}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
              <div className="text-right space-y-1">
                <p className="text-xs text-slate-500">Subtotal</p>
                <p className="text-xs text-slate-500">Processing Fee</p>
                <div className="border-t border-slate-200 pt-1 mt-1">
                  <p className="text-xs font-black text-slate-400">Total</p>
                  <p className="text-xl font-black text-green-600 font-mono">
                    KES {Number(order.total_amount || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
