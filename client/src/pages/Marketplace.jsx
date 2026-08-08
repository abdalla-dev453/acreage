import { useState, useEffect, useContext } from 'react';
import { Plus, ShoppingCart, Loader2, Image, CheckCircle } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import API from '../services/api';
import Navbar from '../components/common/Navbar';

export default function Marketplace() {
  const { user } = useContext(AuthContext);
  
  // High-UX Role Condition Checkers
  const isFarmer = user?.role === 'farmer';
  const isBuyer = user?.role === 'buyer';

  // State Management
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionStatus, setActionStatus] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State for listing new products
  const [formData, setFormData] = useState({
    title: '',
    category: 'Vegetables',
    description: '',
    price_per_unit: '',
    unit: 'kg',
    stock_quantity: '',
    image_url: ''
  });

  // Buyer Quick Order Quantity State Mapping
  const [orderQuantities, setOrderQuantities] = useState({});

  const categories = ['Vegetables', 'Cereals', 'Fruits', 'Grains & Tubers'];

  // Fetch product catalog from database endpoints
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const url = activeCategory ? `/products/?category=${activeCategory}` : '/products/';
      const res = await API.get(url);
      setProducts(res.data);
    } catch (err) {
      console.error('Failed to fetch marketplace catalog:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [activeCategory]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Farmer Action: Post New Product Listing
  const handleCreateListing = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionStatus({ type: '', text: '' });

    try {
      await API.post('/products/', formData);
      setActionStatus({ type: 'success', text: 'Agricultural produce listed successfully!' });
      setFormData({ title: '', category: 'Vegetables', description: '', price_per_unit: '', unit: 'kg', stock_quantity: '', image_url: '' });
      
      setTimeout(() => {
        setIsModalOpen(false);
        setActionStatus({ type: '', text: '' });
        fetchProducts();
      }, 1500);
    } catch (err) {
      setActionStatus({ type: 'error', text: err.response?.data?.message || 'Failed to list product.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Buyer Action: Place Checkout Request Order Instantly
  const handlePlaceOrder = async (productId, farmerId, maxStock) => {
    const qty = parseFloat(orderQuantities[productId] || 1);
    
    if (qty <= 0 || qty > maxStock) {
      alert(`Invalid quantity. Available supply threshold is ${maxStock} units.`);
      return;
    }

    try {
      setActionStatus({ type: 'success', text: 'Processing order request...' });
      
      await API.post('/orders/', {
        items: [{ product_id: productId, quantity: qty }],
        payment_status: 'unpaid',
        delivery_address: 'Fulfillment Warehouse, Nairobi',
        contact_phone: user?.phone || '+254 700 000 000'
      });

      alert('Order placed successfully! Reconciling marketplace balances.');
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Checkout connection error.');
    } finally {
      setActionStatus({ type: '', text: '' });
    }
  };

  const handleQtyChange = (productId, val) => {
    setOrderQuantities({ ...orderQuantities, [productId]: val });
  };

  return (
    <div className="space-y-6 w-full animate-fade-in pb-16">
      {/* Upper Management Action Banner Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <Navbar title="Acreage Produce Marketplace" />
        
        {/* Dynamic Authority UI Block rendering exclusively for Farmers */}
        {isFarmer && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-md shadow-orange-600/10 flex items-center space-x-2 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>List New Produce</span>
          </button>
        )}
      </div>

      {/* Category Pills Filtering Control Rail */}
      <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wider">
        <button
          onClick={() => setActiveCategory('')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${!activeCategory ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200/60 hover:bg-slate-50'}`}
        >
          All Produce
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${activeCategory === cat ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200/60 hover:bg-slate-50'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Catalog Grid Stream View */}
      {isLoading ? (
        <div className="py-24 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-100">
          <Loader2 className="w-6 h-6 text-orange-600 animate-spin" />
          <p className="text-xs text-slate-400 font-bold mt-2 uppercase tracking-widest">Querying active regional inventory grids...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {products.length > 0 ? (
            products.map((prod) => (
              <div key={prod.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between group hover:shadow-md hover:border-orange-100 transition-all">
                
                {/* Product Media Box */}
                <div className="h-44 w-full bg-slate-50 relative overflow-hidden flex items-center justify-center border-b border-slate-50">
                  {prod.image_url ? (
                    <img 
                      src={prod.image_url} 
                      alt={prod.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500'; }}
                    />
                  ) : (
                    <div className="flex flex-col items-center text-slate-300 font-bold text-[10px] uppercase">
                      <Image className="w-8 h-8 stroke-[1.5] text-slate-200 mb-1" />
                      <span>No Photo Attached</span>
                    </div>
                  )}
                  <span className="absolute left-3 top-3 bg-slate-900/80 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">
                    {prod.category}
                  </span>
                </div>

                {/* Core Descriptor Text Blocks */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-slate-800 text-sm tracking-tight truncate">{prod.title}</h3>
                    <p className="text-xs text-slate-400 font-medium line-clamp-2 min-h-[2rem] leading-relaxed">{prod.description || 'Premium harvested regional agriculture lot available for immediate dispatch routing channels.'}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Price Per Unit</span>
                      <p className="text-sm font-black text-slate-800 font-mono">KES {prod.price_per_unit} <span className="text-xs font-bold text-slate-400">/{prod.unit}</span></p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Available Supply</span>
                      <p className="text-xs font-extrabold text-orange-600 font-mono">{prod.stock_quantity} {prod.unit}s</p>
                    </div>
                  </div>

                  {/* Dynamic Action Trigger Blocks dependent on user role */}
                  {isBuyer && (
                    <div className="pt-2 flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max={prod.stock_quantity}
                        value={orderQuantities[prod.id] || 1}
                        onChange={(e) => handleQtyChange(prod.id, e.target.value)}
                        className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-center focus:outline-none"
                      />
                      <button
                        onClick={() => handlePlaceOrder(prod.id, prod.farmer_id, prod.stock_quantity)}
                        className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider py-1.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-1 shadow-sm shadow-orange-600/5"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Place Order</span>
                      </button>
                    </div>
                  )}

                  {isFarmer && (
                    <div className="pt-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 py-2 rounded-xl border border-slate-100">
                      {prod.farmer_id === user?.id ? 'Your Active Listing Asset' : 'External Partner Lot'}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-100 text-slate-400 font-medium text-xs">
              No agricultural listings available under this specific filter track layout context.
            </div>
          )}
        </div>
      )}

      {/* FARMER MANAGEMENT MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-xl space-y-4 border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-800 text-sm tracking-tight uppercase">Configure New Market Commodity</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer">
                ✕
              </button>
            </div>

            {actionStatus.text && (
              <div className={`p-3 rounded-xl text-xs font-bold border flex items-center gap-2 ${actionStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                {actionStatus.type === 'success' && <CheckCircle className="w-4 h-4" />}
                <span>{actionStatus.text}</span>
              </div>
            )}

            <form onSubmit={handleCreateListing} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Produce Title Name</label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="e.g. Export Hass Avocados"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Market Category Channel</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Measurement Unit Scale</label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 bg-white"
                  >
                    <option value="kg">Kilograms (kg)</option>
                    <option value="crate">Crates</option>
                    <option value="bag">Bags (90kg)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Price Per Unit (KES)</label>
                  <input
                    type="number"
                    name="price_per_unit"
                    required
                    min="1"
                    placeholder="150"
                    value={formData.price_per_unit}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Total Available Stock</label>
                  <input
                    type="number"
                    name="stock_quantity"
                    required
                    min="1"
                    placeholder="500"
                    value={formData.stock_quantity}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Produce Showcase Image URL</label>
                <input
                  type="url"
                  name="image_url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={formData.image_url}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Operational Lot Description</label>
                <textarea
                  name="description"
                  rows="2"
                  placeholder="Grade A organic produce ready for dispatch..."
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-5 py-2 rounded-xl transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Syncing Grid Ledgers...</span>
                    </>
                  ) : (
                    <span>Publish Listing</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}