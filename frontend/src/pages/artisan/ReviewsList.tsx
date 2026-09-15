import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

export default function ReviewsList() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await api.get('/reviews/artisan');
        setData(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, []);

  return (
    <div className="w-full min-h-screen bg-surface flex flex-col pb-safe">
      <header className="fixed top-0 inset-x-0 mobile-shell-width mx-auto z-40 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-safe">
        <div className="h-16 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/artisan')}
              className="min-w-[44px] min-h-[44px] -ml-2 flex items-center justify-center text-on-surface rounded-full hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <h1 className="font-bold text-lg text-on-surface tracking-tight truncate ml-1">Reviews</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 pt-24 pb-8 w-full max-w-lg mx-auto space-y-6">
        {loading ? (
          <div className="flex justify-center p-8"><span className="text-on-surface-variant font-medium">Loading...</span></div>
        ) : !data || data.reviews.length === 0 ? (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 flex flex-col items-center text-center shadow-sm">
            <div className="w-16 h-16 bg-surface-container-high rounded-full flex items-center justify-center mb-4 text-tertiary">
              <span className="material-symbols-outlined text-3xl">star</span>
            </div>
            <h3 className="text-lg font-bold text-on-surface mb-2">No reviews yet</h3>
            <p className="text-sm text-on-surface-variant">Complete orders to receive verified reviews from buyers.</p>
          </div>
        ) : (
          <>
            <section className="bg-tertiary-fixed/30 border border-tertiary/20 rounded-xl p-5 shadow-sm text-center">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">Average Rating</span>
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-4xl font-black text-tertiary">{data.aggregates.overall}</span>
                <span className="material-symbols-outlined text-[36px] text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              </div>
              <span className="text-sm font-semibold text-on-surface-variant">Based on {data.total_reviews} reviews</span>
              
              <div className="mt-4 pt-4 border-t border-outline-variant/30 grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold text-on-surface">{data.aggregates.quality}</span>
                  <span className="text-[9px] font-semibold text-on-surface-variant uppercase mt-1">Quality</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold text-on-surface">{data.aggregates.communication}</span>
                  <span className="text-[9px] font-semibold text-on-surface-variant uppercase mt-1">Comm</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold text-on-surface">{data.aggregates.timeliness}</span>
                  <span className="text-[9px] font-semibold text-on-surface-variant uppercase mt-1">Time</span>
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-4">
              {data.reviews.map((rev: any) => (
                <div key={rev.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm">
                        {rev.buyer?.display_name?.charAt(0) || 'B'}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-on-surface">{rev.buyer?.display_name || 'Verified Buyer'}</span>
                        <div className="flex items-center gap-1 text-tertiary">
                          {Array.from({length: 5}).map((_, i) => (
                            <span key={i} className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: i < rev.rating_overall ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {rev.is_verified_buyer && (
                      <div className="flex items-center gap-1 bg-tertiary/10 text-tertiary px-2 py-1 rounded-full border border-tertiary/20">
                        <span className="material-symbols-outlined text-[12px]">verified</span>
                        <span className="text-[9px] font-bold uppercase">Verified</span>
                      </div>
                    )}
                  </div>
                  
                  {rev.review_text && (
                    <p className="text-sm text-on-surface-variant leading-relaxed">"{rev.review_text}"</p>
                  )}
                  
                  <div className="flex justify-between items-center text-[10px] text-on-surface-variant font-medium mt-1">
                    <span className="truncate flex-1 pr-4 text-outline">{rev.products?.title}</span>
                    <span className="shrink-0">{new Date(rev.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
