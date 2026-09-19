import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

import Sidebar from "../components/common/Sidebar";
import Analytics from "../pages/Analytics";
import Chats from "../pages/Chats";
import CustomerReview from "../pages/CustomerReview";
import Customers from "../pages/Customers";
import Dashboard from "../pages/Dashboard";
import FarmingLog from "../pages/FarmingLog";
import Home from "../pages/Home";
import Login from "../pages/Login";
import Marketplace from "../pages/Marketplace";
import Orders from "../pages/Orders";
import OrderDetail from "../pages/OrderDetail";
import Profile from "../pages/Profile";
import Register from "../pages/Register";
import Wallet from "../pages/Wallet";
import NotFound from "../pages/NotFound";
import ThankYou from "../pages/ThankYou";
import Privacy from "../pages/Privacy";
import Terms from "../pages/Terms";

function AppLayout() {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-[#0F172A] antialiased font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden max-h-screen ml-0 lg:ml-20">
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pt-20 lg:pt-6">
          <div className="w-full max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/thank-you" element={<ThankYou />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="chats" element={<Chats />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="reviews" element={<CustomerReview />} />
          <Route path="profile" element={<Profile />} />
          <Route path="customers" element={<Customers />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="marketplace" element={<Marketplace />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["farmer"]} />}>
        <Route element={<AppLayout />}>
          <Route path="farm-logs" element={<FarmingLog />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
