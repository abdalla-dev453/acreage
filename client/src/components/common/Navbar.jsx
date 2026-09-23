import { useContext, useState, useRef, useEffect } from 'react';
import { Search, Bell, Settings, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { SettingsContext } from '../../context/SettingsContext';
import LanguageSelector from './LanguageSelector';

export default function Navbar({ title = 'Dashboard' }) {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { settings, updateSetting } = useContext(SettingsContext);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const searchRef = useRef(null);
  const notificationsRef = useRef(null);

  const getInitials = (name = '') => {
    const cleanName = name.trim();
    if (!cleanName) return 'US';
    if (cleanName.includes(' ')) {
      return cleanName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return cleanName.slice(0, 2).toUpperCase();
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex justify-between items-center mb-6 md:mb-8 w-full nav-premium py-3.5 md:py-4 px-4 sm:px-6 rounded-2xl"
    >
      <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0">
        <div className="flex items-center space-x-1.5 min-w-0">
          <span className="text-primary-600 dark:text-emerald-400 font-mono text-lg md:text-xl font-black select-none opacity-50 shrink-0">#</span>
          <h1 className="text-base sm:text-xl font-black text-green-700 dark:text-emerald-400 tracking-tight truncate">
            {title}
          </h1>
        </div>

        {user?.role && (
          <motion.span
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="hidden sm:inline-block text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 bg-gradient-to-r from-emerald-50 to-green-100 dark:from-emerald-950/60 dark:to-emerald-900/40 text-emerald-800 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800/60 shadow-xs shrink-0"
          >
            {user.role}
          </motion.span>
        )}
      </div>

      <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {/* Search */}
          <div className="relative z-[100]" ref={searchRef}>
            <AnimatePresence mode="wait">
              {isSearchOpen ? (
                <motion.div
                  key="search-input"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 160, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="inline-flex items-center"
                >
                  <input
                    type="text"
                    placeholder="Search..."
                    autoFocus
                    className="w-32 sm:w-36 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        navigate(`/search?q=${encodeURIComponent(e.target.value.trim())}`);
                        setIsSearchOpen(false);
                      }
                    }}
                  />
                  <button
                    onClick={() => setIsSearchOpen(false)}
                    className="ml-1 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="search-btn"
                  whileTap={{ scale: 0.95 }}
                  aria-label="Search"
                  onClick={() => setIsSearchOpen(true)}
                  className="p-2 sm:p-2.5 bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 shadow-premium rounded-xl text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-colors relative cursor-pointer group"
                >
                  <Search className="w-4 h-4 stroke-[2.2] group-hover:scale-105 transition-transform duration-200" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Notifications */}
          <div className="relative z-[100]" ref={notificationsRef}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              aria-label="Notifications"
              onClick={() => setIsNotificationsOpen((v) => !v)}
              className="p-2 sm:p-2.5 bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 shadow-premium rounded-xl text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-colors relative cursor-pointer group"
            >
              <Bell className={`w-4 h-4 stroke-[2.2] group-hover:scale-105 transition-transform duration-200 ${settings?.notifications ? '' : 'opacity-40'}`} />
              {settings?.notifications && (
                <span className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
            </motion.button>

            <AnimatePresence>
              {isNotificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl py-2 z-[100]"
                >
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400">Notifications</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        updateSetting('notifications', !settings?.notifications);
                        setIsNotificationsOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                    >
                      <span>{settings?.notifications ? 'Turn off notifications' : 'Turn on notifications'}</span>
                    </button>
                    <button
                      onClick={() => {
                        updateSetting('sound', !settings?.sound);
                        setIsNotificationsOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                    >
                      <span>{settings?.sound ? 'Mute notification sounds' : 'Enable notification sounds'}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Settings */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            aria-label="Settings"
            onClick={() => navigate('/settings')}
            className="p-2 sm:p-2.5 bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 shadow-premium rounded-xl text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-colors relative cursor-pointer group"
          >
            <Settings className="w-4 h-4 stroke-[2.2] group-hover:scale-105 transition-transform duration-200" />
          </motion.button>

          {/* Language Selector */}
          <LanguageSelector />
        </div>

        <div className="h-5 w-px bg-slate-200/80 dark:bg-slate-700 mx-1 hidden sm:block" />

        <motion.div
          whileHover={{ x: 1 }}
          onClick={() => navigate('/profile')}
          className="flex items-center space-x-2 sm:space-x-3 pl-1 group cursor-pointer select-none"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-green-600 to-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-green-700/10 transition-transform group-hover:scale-[1.03] duration-200 uppercase tracking-wider border border-white/20">
            {getInitials(user?.username)}
          </div>

          <div className="hidden md:flex flex-col text-left max-w-[120px]">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate leading-tight group-hover:text-green-600 dark:group-hover:text-emerald-400 transition-colors duration-200">
              {user?.username || 'Guest Profile'}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold truncate leading-none mt-1">
              {user?.email || 'offline'}
            </span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
