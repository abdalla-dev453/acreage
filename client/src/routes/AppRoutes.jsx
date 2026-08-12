import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

// Common Shell Components Layout
import Sidebar from '../components/common/Sidebar';

// Consolidated Feature Pages
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import Orders from '../pages/Orders';
import Chats from '../pages/Chats';
import Wallet from '../pages/Wallet';
import FarmingLog from '../pages/FarmingLog';
import CustomerReview from '../pages/CustomerReview';
import Analytics from '../pages/Analytics';
import Profile from '../pages/Profile';
import Customers from '../pages/Customers';
import Marketplace from '../pages/Marketplace';


// 1. Fixed: Structural application parent shell container using native Outlet
function AppLayout() {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-[#0F172A] antialiased font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden max-h-screen">
        {/* Main scroll container block workspace */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="w-full max-w-7xl mx-auto">
            <Outlet /> {/* FIXED: Standard layout anchor required by react-router v6 */}
          </div>
        </main>
      </div>
    </div>
  );
}

// 2. Fixed: Single unified routing system tree layout eliminating duplicate route clusters
export default function AppRoutes() {
  return (
    <Routes>
      {/* Absolute Landing Showcase Page */}
      <Route path="/" element={<Home />} />

      {/* Anonymous Public Authentication Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* SECURED WORKSPACE DOMAIN PATHS */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Shared Common Sub-Views accessible by all authenticated roles */}
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="chats" element={<Chats />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="reviews" element={<CustomerReview />} />
          <Route path="profile" element={<Profile />} />
          <Route path="customers" element={<Customers />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="marketplace" element={<Marketplace />} />
        </Route>
      </Route>

      {/* RESTRICTED AGRONOMY CHANNELS: Locked down using role authorization parameters */}
      <Route element={<ProtectedRoute allowedRoles={['farmer']} />}>
        <Route element={<AppLayout />}>
          <Route path="farm-logs" element={<FarmingLog />} />
          <Route path="marketplace" element={<Marketplace />} />
        </Route>
      </Route>

      {/* Catch-all global unmatched redirect parameter anchor */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
