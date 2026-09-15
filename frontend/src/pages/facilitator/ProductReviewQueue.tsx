import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ArrowLeft, Search, Filter, ChevronRight, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProductReviewQueue() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Pending');
  
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'needs_changes'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewFlags, setReviewFlags] = useState<string[]>([]);
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleSubmitReview = async () => {
    if (!selectedProduct) return;
    setSubmittingReview(true);
    try {
      await api.post(`/facilitator/review/${selectedProduct.product_id}`, {
        review_status: reviewStatus,
        notes: reviewNotes || null,
        flags: reviewFlags.length > 0 ? reviewFlags : null
      });
      alert('Review submitted successfully!');
      setSelectedProduct(null);
      setReviewNotes('');
      setReviewFlags([]);
      // Refresh issues list
      const issuesRes = await api.get(`/facilitator/products/issues`);
      setIssues(issuesRes.data.issues);
    } catch (err) {
      console.error(err);
      alert('Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  useEffect(() => {
    async function fetchIssues() {
      try {
        const res = await api.get('/facilitator/products/issues');
        setIssues(res.data.issues || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchIssues();
  }, []);

  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface pb-24">
      <div className="sticky top-0 z-10 bg-surface px-6 pt-12 pb-4 flex flex-col gap-4 shadow-sm border-b border-outline-variant/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-stone-500 hover:text-stone-800 rounded-full hover:bg-stone-100 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold">Product Reviews</h1>
          </div>
          <div className="flex items-center gap-4 text-stone-500">
            <Search className="w-5 h-5 cursor-pointer hover:text-primary" />
            <Filter className="w-5 h-5 cursor-pointer hover:text-primary" />
          </div>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {['Pending', 'In Review', 'Approved'].map(tab => (
            <button 
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-5 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all ${
                filter === tab 
                  ? 'bg-primary text-on-primary' 
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {tab} {tab === 'Pending' && `(${issues.length})`}
            </button>
          ))}
        </div>
      </div>
      
      <div className="p-6 space-y-4">
        {loading ? (
           <div className="flex justify-center p-8"><div className="animate-pulse w-8 h-8 rounded-full bg-stone-300"></div></div>
        ) : issues.length === 0 ? (
          <div className="text-center text-stone-500 p-8">No products to review.</div>
        ) : (
          issues.map((product, i) => (
            <div 
              key={product.product_id || i}
              onClick={() => setSelectedProduct(product)}
              className="bg-surface rounded-3xl p-4 flex gap-4 shadow-sm border border-outline-variant/50 cursor-pointer hover:shadow-md transition-all group"
            >
              <div className="w-20 h-24 rounded-2xl overflow-hidden bg-stone-100 shrink-0 border border-outline-variant/30">
                {product.image ? (
                  <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-400">
                    No Img
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h3 className="font-bold text-base text-stone-800 line-clamp-1">{product.title || 'Untitled'}</h3>
                <p className="text-xs text-stone-500 mb-1">by {product.artisan_name}</p>
                <div className="font-bold text-stone-700 text-sm mb-2">₹ {product.price || '---'}</div>
                
                <div className="flex items-center justify-between mt-auto">
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-bold tracking-wide uppercase">
                    Pending
                  </span>
                  <div className="text-stone-300 group-hover:text-primary transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Review Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-surface w-full sm:w-[450px] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0">
            <div className="flex justify-between items-center p-6 border-b border-outline-variant/30 bg-stone-50">
              <h2 className="text-xl font-bold text-on-surface">Review Product</h2>
              <button onClick={() => setSelectedProduct(null)} className="p-2 -mr-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <h3 className="font-bold text-stone-800 mb-2">{selectedProduct.title || 'Untitled'}</h3>
              <div className="text-sm text-stone-500 mb-4">Artisan: {selectedProduct.artisan_name}</div>
              
              <div className="space-y-3 mb-6">
                <div 
                  onClick={() => setReviewStatus('approved')}
                  className={`p-4 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-all ${reviewStatus === 'approved' ? 'border-green-500 bg-green-50' : 'border-stone-100 hover:border-stone-200'}`}
                >
                  <CheckCircle className={`w-5 h-5 ${reviewStatus === 'approved' ? 'text-green-500' : 'text-stone-400'}`} />
                  <span className={`font-bold ${reviewStatus === 'approved' ? 'text-green-800' : 'text-on-surface-variant'}`}>Approved</span>
                </div>
                <div 
                  onClick={() => setReviewStatus('needs_changes')}
                  className={`p-4 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-all ${reviewStatus === 'needs_changes' ? 'border-primary bg-primary-container' : 'border-outline-variant/30 hover:border-primary/50'}`}
                >
                  <AlertTriangle className={`w-5 h-5 ${reviewStatus === 'needs_changes' ? 'text-primary' : 'text-stone-400'}`} />
                  <span className={`font-bold ${reviewStatus === 'needs_changes' ? 'text-primary' : 'text-on-surface-variant'}`}>Needs Changes</span>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-bold text-stone-700 mb-2">Review Notes</label>
                <textarea 
                  rows={4}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full p-3 border border-outline-variant/50 rounded-xl focus:ring-2 focus:ring-primary outline-none resize-none bg-surface-container-lowest text-on-surface mb-4"
                  placeholder="What needs to be fixed?"
                ></textarea>

                {reviewStatus === 'needs_changes' && (
                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2">Flags</label>
                    <div className="flex flex-wrap gap-2">
                      {['pricing', 'images', 'description', 'materials'].map(flag => (
                        <button
                          key={flag}
                          onClick={() => {
                            if (reviewFlags.includes(flag)) {
                              setReviewFlags(reviewFlags.filter(f => f !== flag));
                            } else {
                              setReviewFlags([...reviewFlags, flag]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                            reviewFlags.includes(flag) 
                            ? 'bg-primary text-on-primary border-primary' 
                            : 'bg-surface border-outline-variant text-on-surface-variant'
                          }`}
                        >
                          {flag.charAt(0).toUpperCase() + flag.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 bg-stone-50 border-t border-outline-variant/30">
              <button 
                onClick={handleSubmitReview}
                disabled={submittingReview}
                className="w-full py-3 bg-primary hover:bg-primary/90 text-on-primary font-bold rounded-full transition-all shadow-md disabled:opacity-50 flex justify-center items-center"
              >
                {submittingReview ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : 'Submit Review'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
