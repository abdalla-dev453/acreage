import { useState, useContext } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  const location = useLocation();
  
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsMobileOpen(false);
  };

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
    { name: 'Profile Settings', path: '/profile', icon: User, roles: ['farmer', 'buyer'] }, 
    { name: 'Home', path: '/', icon: Home, roles: ['farmer', 'buyer'] }
  ];

  const visibleNavItems = navItems.filter(item => user && item.roles.includes(user.role));
  const luxurySpring = { type: "spring", stiffness: 220, damping: 28, mass: 0.8 };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 inset-x-0 h-16 bg-black/60 backdrop-blur-lg border-b border-white/10 px-6 flex items-center justify-between z-30">
        <span className="font-black text-xs tracking-[0.3em] text-white">ACREAGE</span>
        <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="p-2 text-white/70">
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {isMobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        animate={{ width: isHovered ? 260 : 80 }}
        transition={luxurySpring}
        className={`fixed lg:sticky top-0 bottom-0 left-0 h-screen flex flex-col justify-between p-4 z-50 lg:z-20 overflow-hidden border-r border-white/10 bg-black shadow-2xl lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:w-20'
        }`}
      >
        {/* Background Layer: Using your provided image with a heavy black mask for a premium feel */}
        <div 
            className="absolute inset-0 -z-20 bg-cover bg-center" 
            style={{ backgroundImage: `url('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQdiWIug24cirN-tE2IcGYzyY2PUYjqFUSf2K1MzdvhsA&s=10')` }} 
        />
        <div className="absolute inset-0 -z-10 bg-black/80 backdrop-blur-[2px]" />

        <div className="relative w-full">
          <div className="flex items-center justify-between h-14 px-2 mb-8 border-b border-white/10 pb-4">
            <div className="flex items-center min-w-[200px]">
              <div className="p-2.5 bg-gradient-to-tr from-green-500 to-green-800 rounded-lg text-black shadow-lg shadow-green-500/20">
                <Sprout className="w-4 h-4 stroke-[3]" />
              </div>
              <AnimatePresence>
                {(isHovered || window.innerWidth < 1024) && (
                  <motion.span className="font-black text-[15px] tracking-[0.3em] text-white/90 ml-4">ACREAGE</motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          <nav className="space-y-1">
            {visibleNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className="flex items-center h-12 rounded-lg font-medium text-[10px] uppercase tracking-[0.2em] transition-all relative group w-full"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabBackground"
                      className="absolute inset-0 bg-white/5 border border-white/10 rounded-lg -z-10"
                    />
                  )}
                  <div className="w-12 h-12 flex items-center justify-center shrink-0">
                    <item.icon className={`w-4 h-4 transition-all duration-300 ${
                      isActive ? 'text-green-600' : 'text-white/40 group-hover:text-white'
                    }`} />
                  </div>
                  <AnimatePresence>
                    {(isHovered || window.innerWidth < 1024) && (
                      <motion.span className={`pl-2 transition-colors duration-300 ${isActive ? 'text-white' : 'text-white/50 group-hover:text-white'}`}>
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="relative pt-4 border-t border-white/10 space-y-2">
          {user && (
            <div className="h-12 flex items-center overflow-hidden w-full px-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-green-500 to-green-800 flex items-center justify-center text-[10px] font-bold text-black uppercase">
                {user.username.charAt(0)}
              </div>
              <AnimatePresence>
                {(isHovered || window.innerWidth < 1024) && (
                  <motion.div className="ml-3 overflow-hidden">
                    <p className="text-[10px] font-bold text-white uppercase">{user.username}</p>
                    <p className="text-[8px] text-white/40 uppercase tracking-widest">{user.role}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <button onClick={handleLogout} className="w-full h-12 flex items-center text-white/40 hover:text-red-600 transition-colors group">
            <div className="w-12 h-12 flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4" />
            </div>
            {(isHovered || window.innerWidth < 1024) && (
              <span className="text-[10px] uppercase tracking-[0.2em] pl-2">Logout</span>
            )}
          </button>
        </div>
      </motion.aside>
    </>
  );
}