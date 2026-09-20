import { useEffect, useState, useContext } from 'react';
import { Search as SearchIcon, ShoppingBag, User, Package, Calendar } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import API from '../services/api';
import Navbar from '../components/common/Navbar';
import SEO from '../components/common/SEO';

export default function Search() {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ products: [], users: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const searchParams = new URLSearchParams(location.search);
  const initialQuery = searchParams.get('q') || '';

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const performSearch = async (term) => {
    if (!term.trim()) return;
    setIsLoading(true);
    try {
      const [productsRes, usersRes] = await Promise.allSettled([
        API.get(`/products/?search=${encodeURIComponent(term)}&per_page=10`),
        API.get(`/auth/users?search=${encodeURIComponent(term)}&per_page=10`),
      ]);

      const products = productsRes.status === 'fulfilled'
        ? (productsRes.value.data.items || productsRes.value.data || [])
        : [];
      const users = usersRes.status === 'fulfilled'
        ? (usersRes.value.data.items || usersRes.value.data || [])
        : [];

      setResults({ products, users });
    } catch (err) {
      console.error('Search failed:', err);
      setResults({ products: [], users: [] });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    performSearch(query);
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const filteredProducts = activeTab === 'all' || activeTab === 'products' ? results.products : [];
  const filteredUsers = activeTab === 'all' || activeTab === 'users' ? results.users : [];
  const hasResults = filteredProducts.length > 0 || filteredUsers.length > 0;

  return (
    <div className="space-y-6 w-full pb-12">
      <SEO title={`Search | Acreage`} description="Search across products, users, and marketplace content." />
      <Navbar title="Marketplace Search" />

      <div className="mb-6">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, users, or content..."
            className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
          />
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-700 transition"
          >
            Search
          </button>
        </form>
      </div>

      <div className="flex gap-2 mb-4">
        {['all', 'products', 'users'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab
                ? 'bg-green-600 text-white'
                : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">
          <SearchIcon className="w-6 h-6 mx-auto mb-2" />
          <p className="text-xs font-semibold">Searching...</p>
        </div>
      ) : !hasResults && query ? (
        <div className="text-center py-12 text-slate-400">
          <SearchIcon className="w-6 h-6 mx-auto mb-2" />
          <p className="text-xs font-semibold">No results found for "{query}"</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredProducts.length > 0 && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Products</h3>
              <div className="space-y-2">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition">
                    <Package className="w-5 h-5 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">{product.title}</p>
                      <p className="text-xs text-slate-500">{product.category || 'Uncategorized'} · KES {product.price_per_unit}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredUsers.length > 0 && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Users</h3>
              <div className="space-y-2">
                {filteredUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition">
                    <User className="w-5 h-5 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">@{u.username}</p>
                      <p className="text-xs text-slate-500">{u.email || u.location || ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
