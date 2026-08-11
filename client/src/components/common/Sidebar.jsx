import { useState, useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BarChart2, 
  ShoppingBag, 
  Users, 
  Star, 
  MessageSquare, 
  Wallet, 
  LogOut,
  Sprout,
  User,
  ClipboardList,
  Menu,
  X,
  Home
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false); // Mobile toggle state

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsOpen(false);
  };

  // Completed Nav Items menu mapping all current application pages
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['farmer', 'buyer'] },
    { name: 'Analytics', path: '/analytics', icon: BarChart2, roles: ['farmer'] },
    { name: 'Farm Logs', path: '/farm-logs', icon: ClipboardList, roles: ['farmer'] },
    { name: 'Orders', path: '/orders', icon: ShoppingBag, roles: ['farmer', 'buyer'] },
    { name: 'Customers', path: '/customers', icon: Users, roles: ['farmer'] },
    { name: 'Marketplace', path: '/marketplace', icon: ShoppingBag, roles: ['farmer', 'buyer'] },
    { name: 'Reviews', path: '/reviews', icon: Star, roles: ['farmer', 'buyer'] },
    { name: 'Chats', path: '/chats', icon: MessageSquare, roles: ['farmer', 'buyer'] },
    { name: 'Wallet', path: '/wallet', icon: Wallet, roles: ['farmer', 'buyer'] },
    { name: 'Profile Settings', path: '/profile', icon: User, roles: ['farmer', 'buyer'] }, // Added Profile
    { name: 'Home', path: '/', icon: Home, roles: ['farmer', 'buyer'], onClick: handleLogout }
  ];

  const visibleNavItems = navItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  return (
    <>
      {/* 1. Mobile Floating Navbar Header Trigger Panel — glass strip */}
      <div className="lg:hidden fixed top-0 inset-x-0 h-16 bg-emerald-950/60 backdrop-blur-xl border-b border-white/10 px-4 flex items-center justify-between z-30 shadow-lg shadow-black/20">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-gradient-to-br from-green-500 to-green-600 rounded-lg text-white shadow-md shadow-green-600/30">
            <Sprout className="w-5 h-5" />
          </div>
          <span className="font-black text-base tracking-wider text-white uppercase">ACREAGE</span>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle Navigation Menu"
          className="p-2 hover:bg-white/10 rounded-xl text-white/80 transition-colors cursor-pointer active:scale-95"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* 2. Mobile Blackout Overlay Overlay Backdrop */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 transition-opacity animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 3. Universal Navigation Container (Responsive Drawer Panel) */}
      <aside className={`fixed lg:sticky top-0 bottom-0 left-0 w-64 h-screen flex flex-col justify-between p-5 transition-transform duration-300 ease-out z-50 lg:z-20 lg:translate-x-0 overflow-hidden ${
        isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      }`}>

        {/* Background image layer — blurred agribusiness photograph */}
        <div 
          className="absolute inset-0 -z-20 bg-cover bg-center scale-110 blur-[2px]"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80')"
          }}
        />

        {/* Tint + gradient wash for legibility, tuned to agric/harvest palette */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-950/90 via-emerald-950/85 to-slate-950/95" />

        {/* Glass panel surface */}
        <div className="absolute inset-0 -z-10 bg-white/5 backdrop-blur-xl border-r border-white/10" />

        <div className="relative">
          {/* Sidebar Top Branding Header Row */}
          <div className="flex items-center justify-between px-2 py-3 mb-6 border-b border-white/10 pb-5">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white shadow-lg shadow-green-600/30 ring-1 ring-white/20">
                <Sprout className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="font-extrabold text-xl tracking-widest text-white uppercase drop-shadow-sm">ACREAGE</span>
            </div>
            {/* Close trigger on mobile view sizes */}
            <button className="lg:hidden p-1.5 hover:bg-white/10 text-white/50 hover:text-white rounded-lg cursor-pointer" onClick={() => setIsOpen(false)}>
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Core Interactive Path Links Mapping Feed */}
          <nav className="space-y-1 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1 scrollbar-thin">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setIsOpen(false)} // Snap-closes drawer on selection click
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 group border ${
                    isActive
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-600/30 border-white/20 scale-[1.01]'
                      : 'text-white/60 border-transparent hover:bg-white/10 hover:text-white hover:border-white/10 backdrop-blur-sm'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={`w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-105 ${
                      isActive ? 'text-white stroke-[2.5]' : 'text-white/40 group-hover:text-green-300'
                    }`} />
                    <span>{item.name}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom Profile Status & Session Action Footers Area */}
        <div className="relative pt-4 border-t border-white/10">
          {user && (
            <div className="px-3 py-2.5 mb-3 bg-white/10 border border-white/15 rounded-xl flex items-center space-x-3 shadow-lg shadow-black/10 backdrop-blur-md group hover:border-green-400/40 hover:bg-white/15 transition-all cursor-pointer" onClick={() => { navigate('/profile'); setIsOpen(false); }}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-green-600 text-white font-extrabold text-xs flex items-center justify-center uppercase shrink-0 shadow-md shadow-green-600/30">
                {user.username.charAt(0)}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-extrabold text-white truncate leading-tight">@{user.username}</p>
                <p className="text-[10px] font-bold text-green-300 uppercase tracking-widest leading-none mt-0.5">{user.role}</p>
              </div>
            </div>
          )}
          
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white/60 hover:bg-rose-500/10 hover:text-rose-300 border border-transparent hover:border-rose-400/20 backdrop-blur-sm transition-all w-full text-left cursor-pointer group active:scale-[0.98]"
          >
            <LogOut className="w-4.5 h-4.5 text-white/40 group-hover:text-rose-400 transition-colors" />
            <span>Logout Session</span>
          </button>
        </div>
      </aside>
    </>
  );
}