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
  X
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
    { name: 'Reviews', path: '/reviews', icon: Star, roles: ['farmer', 'buyer'] },
    { name: 'Chats', path: '/chats', icon: MessageSquare, roles: ['farmer', 'buyer'] },
    { name: 'Wallet', path: '/wallet', icon: Wallet, roles: ['farmer', 'buyer'] },
    { name: 'Profile Settings', path: '/profile', icon: User, roles: ['farmer', 'buyer'] }, // Added Profile
  ];

  const visibleNavItems = navItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  return (
    <>
      {/* 1. Mobile Floating Navbar Header Trigger Panel */}
      <div className="lg:hidden fixed top-0 inset-x-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 flex items-center justify-between z-30 shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-orange-600 rounded-lg text-white">
            <Sprout className="w-5 h-5" />
          </div>
          <span className="font-black text-base tracking-wider text-slate-800 uppercase">ACREAGE</span>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle Navigation Menu"
          className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors cursor-pointer active:scale-95"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* 2. Mobile Blackout Overlay Overlay Backdrop */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 3. Universal Navigation Container (Responsive Drawer Panel) */}
      <aside className={`fixed lg:sticky top-0 bottom-0 left-0 w-64 bg-slate-50 border-r border-slate-200/80 p-5 flex flex-col justify-between h-screen transition-transform duration-300 ease-out z-50 lg:z-20 lg:translate-x-0 ${
        isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      }`}>
        <div>
          {/* Sidebar Top Branding Header Row */}
          <div className="flex items-center justify-between px-2 py-3 mb-6 border-b border-slate-200/40 pb-5">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 bg-orange-600 rounded-xl text-white shadow-md shadow-orange-600/10">
                <Sprout className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="font-extrabold text-xl tracking-widest text-slate-900 uppercase">ACREAGE</span>
            </div>
            {/* Close trigger on mobile view sizes */}
            <button className="lg:hidden p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer" onClick={() => setIsOpen(false)}>
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
                  `flex items-center space-x-3 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 group border border-transparent ${
                    isActive
                      ? 'bg-orange-600 text-white shadow-md shadow-orange-600/10 scale-[1.01]'
                      : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={`w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-105 ${
                      isActive ? 'text-white stroke-[2.5]' : 'text-slate-400 group-hover:text-slate-600'
                    }`} />
                    <span>{item.name}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom Profile Status & Session Action Footers Area */}
        <div className="pt-4 border-t border-slate-200/60">
          {user && (
            <div className="px-3 py-2.5 mb-3 bg-white/60 border border-slate-200/40 rounded-xl flex items-center space-x-3 shadow-sm/5 group hover:border-orange-200 transition-all cursor-pointer" onClick={() => { navigate('/profile'); setIsOpen(false); }}>
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 font-extrabold text-xs flex items-center justify-center uppercase shrink-0">
                {user.username.charAt(0)}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-extrabold text-slate-800 truncate leading-tight">@{user.username}</p>
                <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest leading-none mt-0.5">{user.role}</p>
              </div>
            </div>
          )}
          
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-500 hover:bg-rose-50 hover:text-rose-600 border border-transparent hover:border-rose-100 transition-all w-full text-left cursor-pointer group active:scale-[0.98]"
          >
            <LogOut className="w-4.5 h-4.5 text-slate-400 group-hover:text-rose-500 transition-colors" />
            <span>Logout Session</span>
          </button>
        </div>
      </aside>
    </>
  );
}
