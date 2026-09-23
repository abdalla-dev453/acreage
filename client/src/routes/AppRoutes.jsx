import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { lazy, Suspense } from "react";

import Sidebar from "../components/common/Sidebar";
import Home from "../pages/Home"; // Keep Home as regular import for landing page
import ErrorBoundary from "../components/common/ErrorBoundary";

// Lazy load components for better performance
const Analytics = lazy(() => import("../pages/Analytics"));
const Chats = lazy(() => import("../pages/Chats"));
const CustomerReview = lazy(() => import("../pages/CustomerReview"));
const Customers = lazy(() => import("../pages/Customers"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const FarmingLog = lazy(() => import("../pages/FarmingLog"));
const Login = lazy(() => import("../pages/Login"));
const Marketplace = lazy(() => import("../pages/Marketplace"));
const Orders = lazy(() => import("../pages/Orders"));
const OrderDetail = lazy(() => import("../pages/OrderDetail"));
const Profile = lazy(() => import("../pages/Profile"));
const Register = lazy(() => import("../pages/Register"));
const Wallet = lazy(() => import("../pages/Wallet"));
const NotFound = lazy(() => import("../pages/NotFound"));
const ThankYou = lazy(() => import("../pages/ThankYou"));
const Privacy = lazy(() => import("../pages/Privacy"));
const Settings = lazy(() => import("../pages/Settings"));
const Search = lazy(() => import("../pages/Search"));
const Terms = lazy(() => import("../pages/Terms"));
const MarketPrices = lazy(() => import("../pages/MarketPrices"));
const GroupCommerce = lazy(() => import("../pages/GroupCommerce"));
import SmsHub from "../pages/SmsHub";
const HarvestPlanner = lazy(() => import("../pages/HarvestPlanner"));

// Loading component for lazy loading
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600 font-medium">Loading...</p>
      </div>
    </div>
  );
}

function AppLayout() {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC] dark:bg-slate-900 text-[#0F172A] dark:text-slate-100 antialiased font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden max-h-screen ml-0 lg:ml-20">
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pt-20 lg:pt-6">
          <div className="w-full max-w-7xl mx-auto">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
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
      <Route path="/login" element={
        <Suspense fallback={<PageLoader />}>
          <Login />
        </Suspense>
      } />
      <Route path="/register" element={
        <Suspense fallback={<PageLoader />}>
          <Register />
        </Suspense>
      } />
      <Route path="/thank-you" element={
        <Suspense fallback={<PageLoader />}>
          <ThankYou />
        </Suspense>
      } />
      <Route path="/privacy" element={
        <Suspense fallback={<PageLoader />}>
          <Privacy />
        </Suspense>
      } />
      <Route path="/terms" element={
        <Suspense fallback={<PageLoader />}>
          <Terms />
        </Suspense>
      } />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="dashboard" element={
            <Suspense fallback={<PageLoader />}>
              <Dashboard />
            </Suspense>
          } />
          <Route path="orders" element={
            <Suspense fallback={<PageLoader />}>
              <Orders />
            </Suspense>
          } />
          <Route path="orders/:id" element={
            <Suspense fallback={<PageLoader />}>
              <OrderDetail />
            </Suspense>
          } />
          <Route path="chats" element={
            <Suspense fallback={<PageLoader />}>
              <Chats />
            </Suspense>
          } />
          <Route path="wallet" element={
            <Suspense fallback={<PageLoader />}>
              <Wallet />
            </Suspense>
          } />
           <Route path="reviews" element={
            <Suspense fallback={<PageLoader />}>
              <CustomerReview />
            </Suspense>
          } />
          <Route path="settings" element={
            <Suspense fallback={<PageLoader />}>
              <Settings />
            </Suspense>
          } />
          <Route path="profile" element={
            <Suspense fallback={<PageLoader />}>
              <Profile />
            </Suspense>
          } />
          <Route path="customers" element={
            <Suspense fallback={<PageLoader />}>
              <Customers />
            </Suspense>
          } />
          <Route path="analytics" element={
            <Suspense fallback={<PageLoader />}>
              <Analytics />
            </Suspense>
          } />
           <Route path="marketplace" element={
            <Suspense fallback={<PageLoader />}>
              <Marketplace />
            </Suspense>
          } />
           <Route path="search" element={
            <Suspense fallback={<PageLoader />}>
              <Search />
            </Suspense>
          } />
          <Route path="market-prices" element={
            <Suspense fallback={<PageLoader />}>
              <MarketPrices />
            </Suspense>
          } />
          <Route path="groups" element={
            <Suspense fallback={<PageLoader />}>
              <GroupCommerce />
            </Suspense>
          } />
          <Route path="sms" element={
            <Suspense fallback={<PageLoader />}>
              <SmsHub />
            </Suspense>
          } />
          <Route path="harvest" element={
            <Suspense fallback={<PageLoader />}>
              <HarvestPlanner />
            </Suspense>
          } />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["farmer"]} />}>
        <Route element={<AppLayout />}>
          <Route path="farm-logs" element={
            <Suspense fallback={<PageLoader />}>
              <FarmingLog />
            </Suspense>
          } />
        </Route>
      </Route>

      <Route path="*" element={
        <Suspense fallback={<PageLoader />}>
          <NotFound />
        </Suspense>
      } />
    </Routes>
  );
}
