import { useState, useContext, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
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
    Home,
    Settings,
    ShieldCheck,
    TrendingUp,
    UsersRound,
    MessageSquareText,
    CalendarDays
  } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useContext(AuthContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsMobileOpen(false);
  };

  const navItems = [
    { name: t('nav.dashboard'), path: '/dashboard', icon: LayoutDashboard, roles: ['farmer', 'buyer'] },
    { name: t('nav.analytics'), path: '/analytics', icon: BarChart2, roles: ['farmer'] },
    { name: t('nav.farmLogs'), path: '/farm-logs', icon: ClipboardList, roles: ['farmer'] },
    { name: t('nav.orders'), path: '/orders', icon: ShoppingBag, roles: ['farmer', 'buyer'] },
    { name: t('nav.customers'), path: '/customers', icon: Users, roles: ['farmer'] },
    { name: t('nav.marketplace'), path: '/marketplace', icon: ShoppingBag, roles: ['farmer', 'buyer'] },
    { name: t('nav.reviews'), path: '/reviews', icon: Star, roles: ['farmer', 'buyer'] },
    { name: t('nav.chats'), path: '/chats', icon: MessageSquare, roles: ['farmer', 'buyer'] },
    { name: t('nav.wallet'), path: '/wallet', icon: Wallet, roles: ['farmer', 'buyer'] },
    { name: t('nav.profile'), path: '/profile', icon: User, roles: ['farmer', 'buyer'] },
    { name: t('nav.settings'), path: '/settings', icon: Settings, roles: ['farmer', 'buyer'] },
    { name: t('nav.trust'), path: '/trust', icon: ShieldCheck, roles: ['farmer', 'buyer', 'admin'] },
    { name: t('nav.marketPrices'), path: '/market-prices', icon: TrendingUp, roles: ['farmer', 'buyer', 'admin'] },
    { name: t('nav.groupOrders'), path: '/groups', icon: UsersRound, roles: ['farmer', 'buyer', 'admin'] },
    { name: t('nav.smsHub'), path: '/sms', icon: MessageSquareText, roles: ['farmer', 'buyer', 'admin'] },
    { name: t('nav.harvest'), path: '/harvest', icon: CalendarDays, roles: ['farmer', 'buyer', 'admin'] },
    { name: t('nav.home'), path: '/', icon: Home, roles: ['farmer', 'buyer'] }
  ];
  const luxurySpring = { type: "spring", stiffness: 220, damping: 28, mass: 0.8 };

  const isExpanded = isMobile ? isMobileOpen : isHovered;

  return (
    <>
      <div className="lg:hidden fixed top-0 inset-x-0 h-16 bg-gradient-to-r from-primary-900 to-primary-950 backdrop-blur-md border-b border-white/10 px-6 flex items-center justify-between z-40 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-gold-400 to-gold-600 rounded-lg text-black shadow-gold animate-pulse-slow">
            <Sprout className="w-4 h-4 stroke-[3]" />
          </div>
          <span className="font-black text-lg tracking-[0.3em] text-amber-400">ACREAGE</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 text-white/70 hover:text-white transition-colors"
          aria-label="Toggle Navigation"
        >
          {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
        animate={{
          width: isMobile ? 256 : (isHovered ? 260 : 80),
          x: isMobile ? (isMobileOpen ? 0 : -256) : 0
        }}
        transition={luxurySpring}
        className="sidebar-premium fixed top-0 bottom-0 left-0 h-screen flex flex-col justify-between p-4 z-50 overflow-x-hidden border-r border-white/10 dark:border-slate-700"
      >
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQdiWIug24cirN-tE2IcGYzyY2PUYjqFUSf2K1MzdvhsA&s=10')` }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary-900/95 to-primary-950/95 backdrop-blur-[2px]" />

        <div className={`relative w-full flex-1 flex flex-col min-h-0 ${isMobile ? 'pt-16' : ''}`}>
          <div className="flex items-center h-14 px-2 mb-6 border-b border-white/10 dark:border-slate-700 shrink-0">
            <div className="flex items-center min-w-[200px]">
              <div className="p-2.5 bg-gradient-to-tr from-gold-400 to-gold-600 rounded-lg text-black shadow-gold shrink-0 animate-pulse-slow">
                <Sprout className="w-4 h-4 stroke-[3]" />
              </div>
              <AnimatePresence>
                {isExpanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="font-black text-lg tracking-[0.3em] text-amber-400 ml-4 whitespace-nowrap"
                  >
                    ACREAGE
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          <nav className="space-y-1 overflow-y-auto overflow-x-hidden flex-1 pr-1 custom-scrollbar">
            {navItems.map((item) => {
              if (!user || !item.roles.includes(user.role)) return null;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className="flex items-center h-12 rounded-lg font-bold text-[11px] uppercase tracking-[0.2em] transition-all relative group w-full"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabBackground"
                      className="absolute inset-0 bg-gradient-to-r from-primary-600/20 to-primary-500/10 border border-primary-500/30 rounded-lg -z-10 shadow-glow"
                    />
                  )}
                  <div className="w-12 h-12 flex items-center justify-center shrink-0">
                    <item.icon className={`w-4 h-4 transition-all duration-300 ${
                      isActive ? 'text-gold-400 drop-shadow-[0_0_8px_rgba(249,179,31,0.5)]' : 'text-white/40 group-hover:text-white'
                    }`} />
                  </div>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className={`pl-2 whitespace-nowrap transition-colors duration-300 ${isActive ? 'text-white font-black' : 'text-white/70 group-hover:text-white'}`}
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="relative pt-4 border-t border-white/10 space-y-2 shrink-0">
          {user && (
            <div className="h-12 flex items-center overflow-hidden w-full px-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gold-400 to-gold-600 flex items-center justify-center text-[10px] font-bold text-black uppercase shrink-0 shadow-gold">
                {user.username.charAt(0)}
              </div>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="ml-3 overflow-hidden whitespace-nowrap"
                  >
                    <p className="text-[11px] font-black text-amber-400 uppercase truncate">{user.username}</p>
                    <p className="text-[9px] font-bold text-white/60 uppercase tracking-wider truncate">{user.role}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full h-12 flex items-center text-white/40 hover:text-red-400 transition-colors group rounded-lg"
          >
            <div className="w-12 h-12 flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </div>
            <AnimatePresence>
              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="text-[11px] font-black uppercase tracking-[0.2em] pl-2 whitespace-nowrap"
                >
                  {t('nav.logout')}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>
    </>
  );
}
