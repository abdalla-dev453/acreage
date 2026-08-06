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
  Sprout
} from 'lucide-react';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['farmer', 'buyer'] },
    { name: 'Analytics', path: '/analytics', icon: BarChart2, roles: ['farmer'] },
    { name: 'Orders', path: '/orders', icon: ShoppingBag, roles: ['farmer', 'buyer'] },
    { name: 'Customers', path: '/customers', icon: Users, roles: ['farmer'] },
    { name: 'Reviews', path: '/reviews', icon: Star, roles: ['farmer', 'buyer'] },
    { name: 'Chats', path: '/chats', icon: MessageSquare, roles: ['farmer', 'buyer'] },
    { name: 'Wallet', path: '/wallet', icon: Wallet, roles: ['farmer', 'buyer'] },
  ];

  const visibleNavItems = navItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  return (
    <aside className="w-64 bg-slate-100/70 border-r border-slate-200 min-h-screen p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center space-x-2 px-3 py-4 mb-4">
          <div className="p-2 bg-purple-600 rounded-xl text-white">
            <Sprout className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-xl tracking-wide text-slate-800 uppercase">CRAVEAT</span>
        </div>

        <nav className="space-y-1">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                  isActive
                    ? 'bg-purple-100 text-purple-700 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div>
        {user && (
          <div className="px-4 py-2 mb-3 border-b border-slate-200/60 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-600">{user.role}</p>
            <p className="text-sm font-medium text-slate-700 truncate">@{user.username}</p>
          </div>
        )}
        
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all w-full text-left"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
