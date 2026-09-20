import { useState, useEffect, useContext } from 'react';
import { Plus, ShoppingCart, Loader2, Image, CheckCircle, Edit2, Trash2, ToggleLeft, ToggleRight, X, Star, Crown } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import API from '../services/api';
import Navbar from '../components/common/Navbar';
import SEO from '../components/common/SEO';
import MediaUploader from '../components/premium/MediaUploader';
import UnitSelector, { unitLabel } from '../components/premium/UnitSelector';
import VerifiedBadge from '../components/premium/VerifiedBadge';

export default function Marketplace() {
  const { user } = useContext(AuthContext);

  const isFarmer = user?.role === 'farmer';
  const isBuyer = user?.role === 'buyer';

  // ── State ─────────────────────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [productMedia, setProductMedia] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [mediaError, setMediaError] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  // Create listing modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionStatus, setActionStatus] = useState({ type: '', text: '' });

  // Edit listing modal
  const [editingProduct, setEditingProduct] = useState(null); // product object | null
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editStatus, setEditStatus] = useState({ type: '', text: '' });

  // Create form state
  const [formData, setFormData] = useState({
    title: '',
    category: 'Vegetables',
    description: '',
    price_per_unit: '',
    unit: 'kg',
    stock_quantity: '',
    image_url: '',
    is_premium: false,
    allows_group_buying: false,
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);

  // Edit form state (mirrors formData shape)
  const [editForm, setEditForm] = useState({});

  // Buyer quantity mapping
  const [orderQuantities, setOrderQuantities] = useState({});

  const categories = ['Vegetables', 'Cereals', 'Fruits', 'Grains & Tubers'];

  // ── Data Fetch ─────────────────────────────────────────────────────────
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setLoadError('');
      setMediaError('');
      const url = activeCategory ? `/products/?category=${activeCategory}` : '/products/';
      const res = await API.get(url);
      const data = res.data;
      const nextProducts = Array.isArray(data) ? data : data.items || [];
      setProducts(nextProducts);
      const mediaEntries = await Promise.all(nextProducts.map(async (product) => {
        try {
          const response = await API.get(`/trust/media?owner_type=product&owner_id=${product.id}`);
          return [product.id, response.data?.items || response.data || []];
        } catch (error) {
          setMediaError('Unable to load product media.');
          return [product.id, []];
        }
      }));
      setProductMedia(Object.fromEntries(mediaEntries));
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Unable to load marketplace catalog.');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [activeCategory]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const uploadProductMedia = async (productId) => {
    const uploads = [];
    if (photoFile) {
      const photoData = new FormData();
      photoData.append('file', photoFile);
      photoData.append('owner_type', 'product');
      photoData.append('owner_id', String(productId));
      photoData.append('kind', 'photo');
      uploads.push(API.post('/trust/media', photoData, { headers: { 'Content-Type': 'multipart/form-data' } }));
    }
    if (videoFile) {
      const videoData = new FormData();
      videoData.append('file', videoFile);
      videoData.append('owner_type', 'product');
      videoData.append('owner_id', String(productId));
      videoData.append('kind', 'video');
      uploads.push(API.post('/trust/media', videoData, { headers: { 'Content-Type': 'multipart/form-data' } }));
    }
    if (uploads.length) await Promise.all(uploads);
  };

  const handleEditInputChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const chooseProductPhoto = (event) => {
    const file = event.target.files?.[0] || null;
    setPhotoFile(file);
  };

  const chooseProductVideo = (event) => {
    const file = event.target.files?.[0] || null;
    setVideoFile(file);
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionStatus({ type: '', text: '' });
    try {
      const response = await API.post('/products/', formData);
      const productId = response.data?.id;
      let mediaError = null;
      if (productId) {
        try {
          await uploadProductMedia(productId);
        } catch (error) {
          mediaError = error;
        }
      }
      setActionStatus({ type: mediaError ? 'error' : 'success', text: mediaError ? (mediaError.response?.data?.message || 'Listing created, but media upload failed.') : 'Agricultural produce listed successfully!' });
      setFormData({ title: '', category: 'Vegetables', description: '', price_per_unit: '', unit: 'kg', stock_quantity: '', image_url: '', is_premium: false, allows_group_buying: false });
      setPhotoFile(null);
      setVideoFile(null);
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

  // Farmer: open edit modal
const openEditModal = (product) => {
    setEditingProduct(product);
    setEditForm({
      title: product.title,
      category: product.category,
      description: product.description || '',
      price_per_unit: product.price_per_unit,
      unit: product.unit,
      stock_quantity: product.stock_quantity,
      image_url: product.image_url || '',
      is_available: product.is_available,
      is_premium: product.is_premium || false,
      allows_group_buying: product.allows_group_buying || false,
      unit_weight_kg: product.unit_weight_kg || ''
    });
  };

  // Farmer: submit edited product
  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    setIsEditSubmitting(true);
    setEditStatus({ type: '', text: '' });
    try {
      await API.put(`/products/${editingProduct.id}`, editForm);
      setEditStatus({ type: 'success', text: 'Product updated successfully!' });
      setTimeout(() => {
        setEditingProduct(null);
        fetchProducts();
      }, 1200);
    } catch (err) {
      setEditStatus({ type: 'error', text: err.response?.data?.message || 'Update failed.' });
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Farmer: toggle availability
  const handleToggleAvailability = async (product) => {
    try {
      await API.put(`/products/${product.id}`, { is_available: !product.is_available });
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle availability.');
    }
  };

  // Farmer: delete product
  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Delete "${product.title}"? This cannot be undone.`)) return;
    try {
      await API.delete(`/products/${product.id}`);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not delete product.');
    }
  };

  // Buyer: place order
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
        delivery_address: user?.location || '',
        contact_phone: user?.phone || user?.phone_number || ''
      });
      alert('Order placed! Go to Orders to pay via M-Pesa.');
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
    <div className="space-y-6 w-full pb-16">
      <SEO title="Marketplace | Acreage" description="Browse and order fresh produce from verified local farmers. Direct trade, no middlemen." />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <Navbar title="Acreage Produce Marketplace" />
        {isFarmer && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-md shadow-green-600/10 flex items-center space-x-2 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>List New Produce</span>
          </button>
        )}
      </div>

      {/* Category Filter Pills */}
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

      {/* Product Grid */}
      {mediaError && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold text-amber-800" role="alert">{mediaError}</div>}
      {loadError && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700" role="alert">{loadError}</div>}
      {isLoading ? (
        <div className="py-24 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-100">
          <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
          <p className="text-xs text-slate-500 font-bold mt-2 uppercase tracking-widest">Querying active regional inventory grids...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {products.length > 0 ? (
            products.map((prod) => {
              const isOwner = isFarmer && prod.farmer_id === user?.id;
              return (
                <div key={prod.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col justify-between group hover:shadow-lg hover:border-green-100 transition-all ${prod.is_available ? 'border-slate-100' : 'border-slate-200 opacity-75'}`}>

                  {/* Product Image */}
                  <div className="h-44 w-full bg-slate-50 relative overflow-hidden flex items-center justify-center border-b border-slate-50">
                    {prod.image_url ? (
                      <img
                        src={prod.image_url}
                        alt={prod.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
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
                    {prod.is_premium && (
                      <span className="absolute left-3 bottom-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                        <Crown className="w-2.5 h-2.5" /> Premium
                      </span>
                    )}
                    {/* Availability badge */}
                    {isFarmer && isOwner && !prod.is_available && (
                      <span className="absolute right-3 top-3 bg-red-500/90 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">
                        Unlisted
                      </span>
                    )}
                    {!prod.is_available && !isOwner && (
                      <span className="absolute right-3 top-3 bg-slate-500/90 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">
                        Sold Out
                      </span>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="font-extrabold text-slate-800 text-sm tracking-tight truncate">{prod.title}</h3>
                        <VerifiedBadge user={prod.farmer} />
                      </div>
                      {productMedia[prod.id]?.length > 0 && (
                        <div className="mt-2 flex gap-1 overflow-hidden">
                          {productMedia[prod.id].slice(0, 3).map((asset) => asset.kind === 'video' ? <video key={asset.id} src={asset.url} className="h-6 w-10 rounded object-cover" aria-label="Product video preview" /> : <img key={asset.id} src={asset.url} alt="Product photo preview" className="h-6 w-10 rounded object-cover" />)}
                        </div>
                      )}
                      <p className="text-xs text-slate-500 font-medium line-clamp-2 min-h-[2rem] leading-relaxed">
                        {prod.description || 'No description provided.'}
                      </p>
                      {prod.is_premium && (
                        <div className="flex items-center gap-1 text-amber-400">
                          <Star className="w-3 h-3 fill-current" />
                          <span className="text-xs font-black text-slate-800">Featured Listing</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Price Per Unit</span>
                        <p className="text-sm font-black text-slate-800 font-mono">KES {prod.price_per_unit} <span className="text-xs font-bold text-slate-500">/{unitLabel(prod.unit)}</span></p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Available Supply</span>
                        <p className="text-xs font-extrabold text-green-600 font-mono">{prod.stock_quantity} {unitLabel(prod.unit)}{Number(prod.stock_quantity) === 1 ? '' : 's'}</p>
                      </div>
                    </div>

                    {/* ── Buyer actions ── */}
                    {isBuyer && prod.is_available && (
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
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold text-xs uppercase tracking-wider py-1.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-1 shadow-sm shadow-green-600/5"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Place Order</span>
                        </button>
                      </div>
                    )}

                    {/* ── Farmer actions (own listings) ── */}
                    {isOwner && (
                      <div className="pt-2 space-y-2">
                        {/* Ownership label */}
                        <div className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Your Listing
                        </div>
                        {/* Action buttons row */}
                        <div className="flex items-center gap-2">
                          {/* Edit */}
                          <button
                            onClick={() => openEditModal(prod)}
                            title="Edit listing"
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold uppercase rounded-xl transition cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>

                          {/* Toggle availability */}
                          <button
                            onClick={() => handleToggleAvailability(prod)}
                            title={prod.is_available ? 'Unlist product' : 'List product'}
                            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-bold uppercase rounded-xl transition cursor-pointer ${
                              prod.is_available
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {prod.is_available
                              ? <><ToggleRight className="w-3 h-3" /><span>Unlist</span></>
                              : <><ToggleLeft className="w-3 h-3" /><span>List</span></>
                            }
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteProduct(prod)}
                            title="Delete listing"
                            className="flex items-center justify-center px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold uppercase rounded-xl transition cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Farmer viewing other farmers' listings */}
                    {isFarmer && !isOwner && (
                      <div className="pt-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 py-2 rounded-xl border border-slate-100">
                        External Partner Lot
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-100 text-slate-500 font-medium text-xs">
              No agricultural listings available under this specific filter track layout context.
            </div>
          )}
        </div>
      )}

      {/* ═══ CREATE LISTING MODAL ═══ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-xl space-y-4 border border-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-800 text-sm tracking-tight uppercase">Configure New Market Commodity</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-600 font-bold text-sm cursor-pointer">
                <X className="w-4 h-4" />
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
                <input type="text" name="title" required placeholder="e.g. Export Hass Avocados" value={formData.title} onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select name="category" value={formData.category} onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 bg-white">
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit Scale</label>
                <UnitSelector value={formData.unit} onChange={(value) => setFormData({ ...formData, unit: value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Price Per Unit (KES)</label>
                  <input type="number" name="price_per_unit" required min="1" placeholder="150" value={formData.price_per_unit} onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Total Available Stock</label>
                  <input type="number" name="stock_quantity" required min="1" placeholder="500" value={formData.stock_quantity} onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit Weight (kg, optional)</label>
                  <input type="number" name="unit_weight_kg" min="0.1" step="0.1" placeholder="e.g. 18" value={formData.unit_weight_kg || ''} onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Group Buying</label>
                  <select name="allows_group_buying" value={formData.allows_group_buying ? 'true' : 'false'} onChange={(event) => setFormData({ ...formData, allows_group_buying: event.target.value === 'true' })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 bg-white">
                    <option value="false">Not available</option>
                    <option value="true">Allow group orders</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Image URL</label>
                <input type="url" name="image_url" placeholder="Remote image URL" value={formData.image_url} onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea name="description" rows="2" placeholder="Grade A organic produce ready for dispatch..." value={formData.description} onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="cursor-pointer rounded-xl border border-dashed border-slate-200 p-3 text-center hover:border-emerald-300">
                  <span className="block text-[10px] font-extrabold text-slate-600">Product photo</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseProductPhoto} className="mt-2 w-full text-[10px] text-slate-500" aria-label="Product photo upload" />
                  <span className="mt-1 block text-[9px] font-bold text-slate-400">{photoFile ? photoFile.name : 'Optional'}</span>
                </label>
                <label className="cursor-pointer rounded-xl border border-dashed border-slate-200 p-3 text-center hover:border-emerald-300">
                  <span className="block text-[10px] font-extrabold text-slate-600">Product video</span>
                  <input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={chooseProductVideo} className="mt-2 w-full text-[10px] text-slate-500" aria-label="Product video upload" />
                  <span className="mt-1 block text-[9px] font-bold text-slate-400">{videoFile ? videoFile.name : 'Optional'}</span>
                </label>
              </div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="is_premium"
                  checked={formData.is_premium || false}
                  onChange={(e) => setFormData({ ...formData, is_premium: e.target.checked })}
                  className="w-4 h-4 accent-amber-500"
                />
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                  Premium Listing (Featured)
                </span>
              </label>
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold px-5 py-2 rounded-xl transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer">
                  {isSubmitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Publishing...</span></> : <span>Publish Listing</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ EDIT LISTING MODAL ═══ */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-xl space-y-4 border border-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-800 text-sm tracking-tight uppercase">Edit Listing — {editingProduct.title}</h3>
              <button onClick={() => setEditingProduct(null)} className="text-slate-500 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {editStatus.text && (
              <div className={`p-3 rounded-xl text-xs font-bold border flex items-center gap-2 ${editStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                {editStatus.type === 'success' && <CheckCircle className="w-4 h-4" />}
                <span>{editStatus.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Produce Title</label>
                <input type="text" name="title" required value={editForm.title || ''} onChange={handleEditInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select name="category" value={editForm.category || 'Vegetables'} onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 bg-white">
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit Scale</label>
                  <UnitSelector value={editForm.unit || 'kg'} onChange={(value) => setEditForm({ ...editForm, unit: value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Price Per Unit (KES)</label>
                  <input type="number" name="price_per_unit" required min="1" value={editForm.price_per_unit || ''} onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Stock Quantity</label>
                  <input type="number" name="stock_quantity" required min="0" value={editForm.stock_quantity || ''} onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit Weight (kg, optional)</label>
                  <input type="number" name="unit_weight_kg" min="0.1" step="0.1" value={editForm.unit_weight_kg || ''} onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Group Buying</label>
                  <select name="allows_group_buying" value={editForm.allows_group_buying ? 'true' : 'false'} onChange={(event) => setEditForm({ ...editForm, allows_group_buying: event.target.value === 'true' })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 bg-white">
                    <option value="false">Not available</option>
                    <option value="true">Allow group orders</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Image URL</label>
                <input type="url" name="image_url" value={editForm.image_url || ''} onChange={handleEditInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea name="description" rows="2" value={editForm.description || ''} onChange={handleEditInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MediaUploader ownerType="product" ownerId={editingProduct.id} kind="photo" onUpload={fetchProducts} onError={() => setEditStatus({ type: 'error', text: 'Photo upload failed.' })} label="Add product photo" compact />
                <MediaUploader ownerType="product" ownerId={editingProduct.id} kind="video" onUpload={fetchProducts} onError={() => setEditStatus({ type: 'error', text: 'Video upload failed.' })} label="Add product video" compact />
              </div>
              {/* Availability toggle inside edit form */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={editForm.is_available ?? true}
                  onChange={(e) => setEditForm({ ...editForm, is_available: e.target.checked })}
                  className="w-4 h-4 accent-green-600"
                />
                <span className="font-bold text-slate-700">Listed / Visible on Marketplace</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="is_premium"
                  checked={editForm.is_premium || false}
                  onChange={(e) => setEditForm({ ...editForm, is_premium: e.target.checked })}
                  className="w-4 h-4 accent-amber-500"
                />
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                  Premium Listing (Featured)
                </span>
              </label>
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isEditSubmitting}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold px-5 py-2 rounded-xl transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer">
                  {isEditSubmitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Saving...</span></> : <span>Save Changes</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}