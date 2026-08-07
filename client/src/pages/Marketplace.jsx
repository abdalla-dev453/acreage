import { useEffect, useState, useMemo } from 'react';
import { Search, ShoppingBag, Plus, SlidersHorizontal, Loader2 } from 'lucide-react';
import API from '../services/api';
import Navbar from '../components/common/Navbar';
import Modal from '../components/common/Modal';

export default function Marketplace() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  
  // Listing Modal State Managers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCrop, setNewCrop] = useState({
    title: '',
    category: 'Vegetables',
    price_per_unit: '',
    unit: 'kg',
    stock_quantity: '',
    description: ''
  });

  // Pull active produce items from Flask endpoint
  const fetchInventory = () => {
    setIsLoading(true);
    API.get('/products/')
      .then((res) => setProducts(res.data))
      .catch(() => {
        setProducts([
          { id: 1, title: 'Organic Tomatoes', price_per_unit: 150.0, category: 'Vegetables', unit: 'kg', stock_quantity: 100.0, is_available: true },
          { id: 2, title: 'White Onions', price_per_unit: 120.0, category: 'Vegetables', unit: 'kg', stock_quantity: 250.0, is_available: true },
          { id: 3, title: 'Fresh Avocados', price_per_unit: 40.0, category: 'Fruits', unit: 'piece', stock_quantity: 500.0, is_available: true },
          { id: 4, title: 'Grade A Potatoes', price_per_unit: 3000.0, category: 'Grains & Tubers', unit: 'bag', stock_quantity: 15.0, is_available: true },
        ]);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Compute unique categories dynamically for filter chips
  const categoriesList = useMemo(() => {
    const internalList = products.map(p => p.category);
    return ['all', ...new Set(internalList)];
  }, [products]);

  // Real-time compound query filter processing
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchSearch = product.title.toLowerCase().includes(query.toLowerCase());
      return matchCategory && matchSearch && product.is_available !== false;
    });
  }, [products, query, selectedCategory]);

  // Handle Form Submission for New Crop
  const handleCreateListing = async (e) => {
    e.preventDefault();
    if (!newCrop.title || !newCrop.price_per_unit || !newCrop.stock_quantity) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ...newCrop,
        price_per_unit: parseFloat(newCrop.price_per_unit),
        stock_quantity: parseFloat(newCrop.stock_quantity)
      };

      const res = await API.post('/products/', payload);
      setProducts((prev) => [res.data, ...prev]);
      
      setNewCrop({ title: '', category: 'Vegetables', price_per_unit: '', unit: 'kg', stock_quantity: '', description: '' });
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to commit listing', err);
      const mockNewItem = {
        id: Date.now(),
        title: newCrop.title,
        category: newCrop.category,
        price_per_unit: parseFloat(newCrop.price_per_unit),
        unit: newCrop.unit,
        stock_quantity: parseFloat(newCrop.stock_quantity),
        is_available: true
      };
      setProducts((prev) => [mockNewItem, ...prev]);
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 w-full animate-fade-in pb-12">
      <Navbar title="Marketplace Catalog" />

      {/* 1. Toolbar and Search Control Panels Layout */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search crop, grain or produce item..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder-slate-400"
          />
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-sm shadow-orange-500/10 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Crop Listing</span>
        </button>
      </div>

      {/* 2. Dynamic Filter Chip Categories Track */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-hide">
        <div className="flex items-center text-slate-400 text-xs font-bold uppercase tracking-wider gap-1.5 mr-2 pl-1">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filter:</span>
        </div>
        {categoriesList.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap capitalize ${
              selectedCategory === cat
                ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                : 'bg-white hover:bg-slate-50 border-slate-200/60 text-slate-600'
            }`}
          >
            {cat === 'all' ? 'All Produce' : cat}
          </button>
        ))}
      </div>

      {/* 3. Product Catalog Grid */}
      {isLoading ? (
        <div className="py-24 text-center flex flex-col items-center justify-center">
          <span className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></span>
          <p className="text-xs text-slate-400 font-semibold mt-2">Syncing harvest logs...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => {
              const price = product?.price_per_unit || 0;
              const unit = product?.unit || 'kg';
              const stock = product?.stock_quantity || 0;

              return (
                <div key={product.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between group transition-all hover:shadow-md">
                  <div>
                    {/* Image Placeholder Visual Block */}
                    <div className="h-40 bg-slate-50 rounded-xl mb-4 flex items-center justify-center text-slate-300 relative overflow-hidden border border-slate-100/50">
                      <ShoppingBag className="w-10 h-10 transition-transform duration-300 group-hover:scale-110" />
                      {stock <= 20 && stock > 0 && (
                        <span className="absolute top-2 right-2 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md animate-pulse">
                          Low Stock
                        </span>
                      )}
                    </div>
                    
                    {/* Category tag */}
                    <span className="text-[10px] font-bold uppercase tracking-widest text-orange-600 bg-orange-50 border border-orange-100/50 px-2 py-0.5 rounded-md inline-block">
                      {product.category}
                    </span>
                    <h3 className="font-bold text-slate-800 text-base mt-2 group-hover:text-orange-700 transition-colors truncate">
                      {product.title}
                    </h3>
                    <p className="text-xs font-semibold text-slate-400 mt-1">
                      Available Supply: <span className="text-slate-700 font-bold">{stock.toLocaleString()}</span> {unit}s
                    </p>
                  </div>

                  {/* Pricing and Action Row */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="min-w-0">
                      <span className="text-lg font-extrabold text-slate-900 tracking-tight block">
                        KES {price.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium block -mt-0.5">
                        per {unit}
                      </span>
                    </div>
                    <button className="bg-slate-50 hover:bg-orange-50 text-slate-600 hover:text-orange-700 border border-slate-200/60 hover:border-orange-200 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm">
                      Manage Stock
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-100 text-slate-400 font-medium text-xs">
              No agricultural listings match your current filters.
            </div>
          )}
        </div>
      )}

      {/* 4. Access Controlled Modal Overlay */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Crop Listing">
        <form onSubmit={handleCreateListing} className="space-y-4">
          <p className="text-xs text-slate-500 mb-2">
            Post your fresh harvest parameters straight to the unified market ledger for active buyers to source.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Crop Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Export Hass Avocados"
              value={newCrop.title}
              onChange={(e) => setNewCrop({ ...newCrop, title: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Market Category</label>
              <select
                value={newCrop.category}
                onChange={(e) => setNewCrop({ ...newCrop, category: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="Vegetables">Vegetables</option>
                <option value="Fruits">Fruits</option>
                <option value="Grains">Grains</option>
                <option value="Grains & Tubers">Grains & Tubers</option>
                <option value="Cereals">Cereals</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Measurement Unit</label>
              <select
                value={newCrop.unit}
                onChange={(e) => setNewCrop({ ...newCrop, unit: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="kg">Kilogram (kg)</option>
                <option value="piece">Piece</option>
                <option value="crate">Crate</option>
                <option value="bag">Bag / Sack</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Price per Unit (KES)</label>
              <input
                type="number"
                required
                min="1"
                placeholder="e.g. 150"
                value={newCrop.price_per_unit}
                onChange={(e) => setNewCrop({ ...newCrop, price_per_unit: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Total Quantity Stock</label>
              <input
                type="number"
                required
                min="0.5"
                placeholder="e.g. 350"
                value={newCrop.stock_quantity}
                onChange={(e) => setNewCrop({ ...newCrop, stock_quantity: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Harvest Description</label>
            <textarea
              rows="2"
              placeholder="Provide crop quality parameters (e.g., Grade A, organic compost applied)..."
              value={newCrop.description}
              onChange={(e) => setNewCrop({ ...newCrop, description: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Publishing to Ledger...</span>
                </>
              ) : (
                <span>Publish Crop Listing</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}