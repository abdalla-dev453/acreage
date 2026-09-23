import {
  CheckCircle2,
  Clock,
  Filter,
  Search,
  ShoppingBag,
  Truck,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/common/Navbar";
import OrderTable from "../components/orders/OrderTable";
import API from "../services/api";
import SEO from "../components/common/SEO";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, has_next: false, has_prev: false });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const userRole = localStorage.getItem("role") || "buyer";

  const fetchOrders = async (page = 1) => {
    setIsLoading(true);
    try {
       const res = await API.get(`/orders/?role=${userRole}&page=${page}&per_page=20`);
       const responseData = res.data;
       const data = Array.isArray(responseData) 
         ? responseData 
         : responseData.items || [];
       setOrders(data);
       setPagination({
         total: responseData.total || data.length,
         page: responseData.page || page,
         pages: responseData.pages || 1,
         has_next: responseData.has_next || false,
         has_prev: responseData.has_prev || false,
       });
    } catch (err) {
      console.error(
        "Failed to fetch live orders:",
        err.response?.data || err.message,
      );
      setOrders([]);
      setPagination({ total: 0, page: 1, pages: 1, has_next: false, has_prev: false });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [userRole]);

  // Math computation loops calculating quick metrics summary totals
  const counters = useMemo(() => {
    return {
      all: orders.length,
      pending: orders.filter(
        (o) => (o.status || "").trim().toLowerCase() === "pending",
      ).length,
      onDelivery: orders.filter((o) =>
        ["on delivery", "shipping"].includes(
          (o.status || "").trim().toLowerCase(),
        ),
      ).length,
      delivered: orders.filter(
        (o) => (o.status || "").trim().toLowerCase() === "delivered",
      ).length,
      cancelled: orders.filter(
        (o) => (o.status || "").trim().toLowerCase() === "cancelled",
      ).length,
    };
  }, [orders]);

  // Real-time dynamic compound filter matching text search + active status context tabs
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderStatus = (order.status || "").trim().toLowerCase();

      const matchTab =
        activeTab === "all" ||
        (activeTab === "on delivery"
          ? ["on delivery", "shipping"].includes(orderStatus)
          : orderStatus === activeTab);

      const searchStr = searchQuery.toLowerCase();
      const code = (order.order_code || "").toLowerCase();
      const client = (
        order.buyer?.username ||
        order.customer ||
        ""
      ).toLowerCase();
      const phone = (order.contact_phone || order.contact || "").toLowerCase();

      const matchSearch =
        code.includes(searchStr) ||
        client.includes(searchStr) ||
        phone.includes(searchStr);

      return matchTab && matchSearch;
    });
  }, [orders, activeTab, searchQuery]);

  return (
    <div className="space-y-6 w-full pb-16">
      <SEO title="Orders | Acreage" description="View, manage, and track all your crop orders on the Acreage marketplace." />

      <Navbar
        title={
          userRole === "farmer"
            ? "Incoming Sales Orders"
            : "Order Invoices Ledger"
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        {[
          {
            key: "all",
            label: "All Orders",
            count: counters.all,
            icon: ShoppingBag,
          },
          {
            key: "pending",
            label: "Pending",
            count: counters.pending,
            icon: Clock,
          },
          {
            key: "on delivery",
            label: "In Transit",
            count: counters.onDelivery,
            icon: Truck,
          },
          {
            key: "delivered",
            label: "Delivered",
            count: counters.delivered,
            icon: CheckCircle2,
          },
          {
            key: "cancelled",
            label: "Cancelled",
            count: counters.cancelled,
            icon: XCircle,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all duration-300 transform cursor-pointer active:scale-95 shadow-sm min-h-[90px] sm:min-h-[96px] ${
                isSelected
                  ? "bg-emerald-600 dark:bg-emerald-600 text-white border-emerald-600 dark:border-emerald-500 shadow-md ring-4 ring-emerald-500/15"
                  : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border-slate-200/80 dark:border-slate-700"
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span
                  className={`text-xs font-bold uppercase tracking-wider truncate ${isSelected ? "text-emerald-100" : "text-slate-400 dark:text-slate-400"}`}
                >
                  {tab.label}
                </span>
                <Icon
                  className={`w-4 h-4 shrink-0 ${isSelected ? "text-white" : tab.key === "all" ? "text-emerald-500" : "text-slate-400"}`}
                />
              </div>
              <p
                className={`text-2xl font-black tracking-tight mt-2 ${isSelected ? "text-white" : "text-slate-900 dark:text-white"}`}
              >
                {tab.count}
              </p>
            </button>
          );
        })}
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
            Distribution Roster
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">
            Showing {filteredOrders.length} of {orders.length} orders
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search code, user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <button
            onClick={() => fetchOrders(pagination.page)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer select-none shrink-0"
          >
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-12 flex flex-col items-center justify-center shadow-sm">
          <span className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
          <p className="text-xs text-slate-400 font-medium mt-2">
            Loading live transactions...
          </p>
        </div>
      ) : (
        <>
          <OrderTable
            orders={filteredOrders}
            onRefresh={() => fetchOrders(pagination.page)}
            userRole={userRole}
          />

          {pagination.pages > 1 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
                Showing {Math.min((pagination.page - 1) * 20 + 1, pagination.total)}–{Math.min(pagination.page * 20, pagination.total)} of {pagination.total} orders
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchOrders(pagination.page - 1)}
                  disabled={!pagination.has_prev}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 px-2">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => fetchOrders(pagination.page + 1)}
                  disabled={!pagination.has_next}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
