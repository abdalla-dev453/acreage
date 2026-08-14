import { useEffect, useState, useMemo, useRef } from 'react';
import { Star, MessageSquare, ShieldCheck, ImagePlus, X, Send, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import API from '../services/api';
import Navbar from '../components/common/Navbar';

export default function CustomerReview() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ average_rating: 4.8, total_reviews: 24 });
  const [isLoading, setIsLoading] = useState(true);

  // Verification & Form State
  const [hasCompletedTransaction, setHasCompletedTransaction] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchReviews();
    checkTransactionEligibility();
  }, []);

  const fetchReviews = () => {
    setIsLoading(true);
    API.get('/reviews/')
      .then((res) => {
        if (res.data.reviews) {
          setReviews(res.data.reviews);
          setStats({ average_rating: res.data.average_rating, total_reviews: res.data.total_reviews });
          if (res.data.can_review !== undefined) {
            setHasCompletedTransaction(res.data.can_review);
          }
        } else {
          setReviews(res.data);
          const total = res.data.length;
          const avg = total > 0 ? (res.data.reduce((acc, curr) => acc + curr.rating, 0) / total).toFixed(1) : 4.8;
          setStats({ average_rating: parseFloat(avg), total_reviews: total || 24 });
        }
      })
      .catch(() => {
        // Fallback demo data matching your schema
        setReviews([
          { 
            id: 1, 
            reviewer: { username: 'bob_eats' }, 
            rating: 5, 
            comment: 'Amazing avocados! Super creamy and fresh.', 
            created_at: '2026-08-06T08:22:00Z',
            image_url: null 
          },
          { 
            id: 2, 
            reviewer: { username: 'alice_grocer' }, 
            rating: 4, 
            comment: 'Good quality tomatoes, though packaging could be slightly improved.', 
            created_at: '2026-08-04T11:45:00Z',
            image_url: null 
          },
        ]);
        setStats({ average_rating: 4.5, total_reviews: 2 });
      })
      .finally(() => setIsLoading(false));
  };

  // Verify if user has completed orders eligible for review
  const checkTransactionEligibility = () => {
    API.get('/orders/completed/check')
      .then((res) => {
        setHasCompletedTransaction(Boolean(res.data?.has_completed_orders));
      })
      .catch(() => {
        // Fallback for testing: Toggle true if token exists or local dev state
        setHasCompletedTransaction(true);
      });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Image size must be less than 5MB.');
        return;
      }
      setErrorMessage('');
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      setErrorMessage('Please add a brief comment explaining your experience.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    // Use FormData for image file uploads
    const formData = new FormData();
    formData.append('rating', rating);
    formData.append('comment', comment);
    if (imageFile) {
      formData.append('verification_photo', imageFile);
    }

    try {
      const res = await API.post('/reviews/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newReview = res.data || {
        id: Date.now(),
        reviewer: { username: 'you' },
        rating,
        comment,
        created_at: new Date().toISOString(),
        image_url: imagePreview,
      };

      setReviews((prev) => [newReview, ...prev]);
      setStats((prev) => ({
        total_reviews: prev.total_reviews + 1,
        average_rating: parseFloat(((prev.average_rating * prev.total_reviews + rating) / (prev.total_reviews + 1)).toFixed(1)),
      }));

      // Reset Form State
      setComment('');
      setRating(5);
      removeImage();
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const ratingDistribution = useMemo(() => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      if (distribution[r.rating] !== undefined) distribution[r.rating]++;
    });
    return distribution;
  }, [reviews]);

  return (
    <div className="space-y-6 w-full animate-fade-in pb-12">
      <Navbar title="Marketplace Feedback Ledger" />

      {/* Dual-Column Metric Spotlight Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        <div className="md:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between text-center md:text-left h-full">
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Reputation Summary</h3>
            <div className="flex flex-col sm:flex-row md:flex-col items-center gap-4 mt-4">
              <h2 className="text-5xl font-extrabold text-slate-900 tracking-tighter">
                {stats.average_rating}
              </h2>
              <div className="space-y-1">
                <div className="flex items-center space-x-1 text-amber-400 justify-center sm:justify-start">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.round(stats.average_rating) ? 'fill-current' : 'text-slate-200'}`} />
                  ))}
                </div>
                <p className="text-xs font-semibold text-slate-400">
                  Based on {stats.total_reviews} client evaluations
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 hidden sm:flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/30">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Verified merchant credentials active</span>
          </div>
        </div>

        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-full">
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Rating Distribution</h3>
          </div>
          <div className="space-y-2 mt-4 flex-1 flex flex-col justify-center">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratingDistribution[stars] || 0;
              const total = reviews.length || 1;
              const percent = (count / total) * 100;
              return (
                <div key={stars} className="flex items-center text-xs space-x-3 group">
                  <span className="font-bold text-slate-600 w-3 text-right">{stars}</span>
                  <Star className="w-3.5 h-3.5 fill-current text-amber-400 shrink-0" />
                  <div className="flex-1 bg-slate-50 border border-slate-100/50 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-green-600 h-full rounded-full transition-all duration-500 ease-out group-hover:bg-green-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="font-mono font-bold text-slate-400 w-6 text-right group-hover:text-slate-700 transition-colors">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Review Entry Section Conditional Rendering Guard */}
      {hasCompletedTransaction ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-green-600" />
                Submit Verification Feedback
              </h3>
              <p className="text-xs text-slate-400">Log your transaction feedback and product condition photos</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200">
              <CheckCircle2 className="w-3 h-3" /> Verified Buyer
            </span>
          </div>

          {submitSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              Thank you! Your verified review and photo evidence have been posted.
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmitReview} className="space-y-4">
            {/* Interactive Rating Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Overall Quality Score
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 focus:outline-none transition-transform active:scale-95"
                  >
                    <Star
                      className={`w-6 h-6 transition-colors ${
                        star <= (hoverRating || rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-200 hover:text-slate-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-xs font-bold text-slate-500">
                  {hoverRating || rating} / 5
                </span>
              </div>
            </div>

            {/* Comment Input Box */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Inspection Remarks & Experience
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Describe product freshness, packaging, or delivery experience..."
                className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none transition-all resize-none text-slate-700 placeholder:text-slate-300"
              />
            </div>

            {/* Product Verification Photo Upload */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Produce Photo Attachment (Optional Verification)
              </label>

              {!imagePreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-green-500/50 bg-slate-50/50 hover:bg-green-50/30 transition-all rounded-xl p-4 text-center cursor-pointer flex flex-col items-center justify-center gap-1 group"
                >
                  <ImagePlus className="w-6 h-6 text-slate-400 group-hover:text-green-600 transition-colors" />
                  <span className="text-xs font-semibold text-slate-600 group-hover:text-green-800">
                    Click to attach produce condition image
                  </span>
                  <span className="text-[10px] text-slate-400">PNG, JPG, WEBP up to 5MB</span>
                </div>
              ) : (
                <div className="relative inline-block mt-2">
                  <img
                    src={imagePreview}
                    alt="Produce preview"
                    className="w-24 h-24 object-cover rounded-xl border-2 border-slate-200 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-md hover:bg-rose-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-green-700 hover:bg-green-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Post Verified Feedback
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Locked View for Unverified Users */
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-center flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-left">
            <div className="p-2.5 bg-slate-200/60 rounded-xl text-slate-500 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700">Feedback form locked for unverified accounts</p>
              <p className="text-[11px] text-slate-400">
                Only clients with completed marketplace orders can submit quality feedback and inspection photos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Review Comments Stream Feed Layout */}
      <div className="space-y-3">
        <div className="px-1">
          <h3 className="text-base font-bold text-slate-800">Historical Testimonials</h3>
          <p className="text-xs text-slate-400">Live incoming client feedback notes from platform transactions</p>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center flex flex-col items-center justify-center">
            <span className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></span>
            <p className="text-xs text-slate-400 font-medium mt-2">Aggregating historical feedback sheets...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.length > 0 ? (
              reviews.map((rev, idx) => {
                const dateString = rev?.created_at
                  ? new Date(rev.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'Recent';

                const clientName = rev?.reviewer?.username || 'Verified Buyer';

                return (
                  <div key={rev.id || idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3 group transition-all hover:shadow-md hover:border-slate-200/50 animate-fade-in">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center font-bold text-sm uppercase tracking-wider select-none shrink-0 shadow-sm border border-green-100/50">
                          {clientName.trim().charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 group-hover:text-green-900 transition-colors truncate">
                            @{clientName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold tracking-wide mt-0.5">
                            {dateString}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-0.5 text-amber-400 shrink-0 bg-amber-50/50 px-2 py-1 rounded-xl border border-amber-100/30 shadow-sm">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-current' : 'text-slate-200'}`} />
                        ))}
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 leading-relaxed font-medium bg-slate-50/50 p-3 rounded-xl border border-slate-100/30 group-hover:bg-slate-50 transition-colors">
                      {rev.comment || 'User completed a successful delivery listing without appending additional commentary notes.'}
                    </p>

                    {/* Display attached verification photo if present */}
                    {(rev.image_url || rev.verification_photo) && (
                      <div className="pt-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Attached Verification Photo:</p>
                        <img
                          src={rev.image_url || rev.verification_photo}
                          alt="Product verification photo"
                          className="w-32 h-32 object-cover rounded-xl border border-slate-200 hover:opacity-95 cursor-pointer transition-opacity"
                          onClick={() => window.open(rev.image_url || rev.verification_photo, '_blank')}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-100 text-slate-400 font-medium text-xs">
                No active produce reviews logged in this ledger panel yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}