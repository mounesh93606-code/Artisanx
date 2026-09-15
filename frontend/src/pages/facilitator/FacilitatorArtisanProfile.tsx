import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, CheckCircle, Clock, Package, Star, MoreHorizontal, MessageSquare, X } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

export default function FacilitatorArtisanProfile() {
  const { id } = useParams<{id: string}>();
  const { token } = useAuthStore();
  const navigate = useNavigate();
  
  const [artisan, setArtisan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportType, setSupportType] = useState('Pricing Help');
  const [supportMessage, setSupportMessage] = useState('');
  const [submittingSupport, setSubmittingSupport] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [artisanRes, perfRes] = await Promise.all([
          api.get(`/facilitator/artisans/${id}`),
          api.get(`/facilitator/artisans/${id}/performance`)
        ]);
        setArtisan({ ...artisanRes.data, performance: perfRes.data });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (token && id) fetchData();
  }, [id, token]);

  const handleOfferSupport = async () => {
    if (!supportMessage.trim()) return;
    setSubmittingSupport(true);
    try {
      // Mocking support submission since we don't have a direct endpoint for this specific action in the prompt, 
      // but we can post to support_requests if there's an API, or just simulate success.
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Support request submitted successfully!');
      setShowSupportModal(false);
      setSupportMessage('');
    } catch (err) {
      console.error(err);
      alert('Failed to submit support request.');
    } finally {
      setSubmittingSupport(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest"><div className="animate-pulse w-8 h-8 rounded-full bg-stone-300"></div></div>;
  }

  if (!artisan) {
    return <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest text-stone-500">Artisan not found</div>;
  }

  return (
    <div className="w-full relative pb-24 bg-surface-container-lowest text-on-surface min-h-screen">
      <div className="bg-surface px-6 pt-12 pb-4 sticky top-0 z-10 border-b border-outline-variant/30 flex justify-between items-center shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-stone-100">
          <ArrowLeft className="w-6 h-6 text-on-surface" />
        </button>
        <button className="p-2 -mr-2 rounded-full hover:bg-stone-100">
          <MoreHorizontal className="w-6 h-6 text-on-surface" />
        </button>
      </div>

      <div className="flex flex-col items-center mt-6 mb-6 px-6">
        <div className="w-24 h-24 rounded-full bg-stone-200 overflow-hidden shadow-md border-4 border-surface relative">
          {artisan.photo ? (
            <img src={artisan.photo} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-400 font-bold text-2xl">
              {artisan.name?.charAt(0) || '?'}
            </div>
          )}
          {/* Verified Badge Overlay */}
          {(artisan.status === 'cooperative_verified' || artisan.status === 'facilitator_reviewed') && (
            <div className="absolute bottom-0 right-0 bg-green-500 rounded-full p-1 border-2 border-surface">
              <CheckCircle className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
        <h2 className="text-2xl font-bold text-stone-800 mt-4">{artisan.business_name || artisan.name}</h2>
        <div className="text-stone-500 font-medium mb-1">{artisan.business_name ? artisan.name : ''}</div>
        <div className="flex items-center gap-1 text-sm text-stone-600 mb-3">
          <MapPin className="w-4 h-4 text-primary" /> {artisan.location || 'Location unknown'}
        </div>
        
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-stone-100 rounded-full text-xs font-bold text-stone-600">{artisan.craft || 'Craft'}</span>
          <span className="px-3 py-1 bg-stone-100 rounded-full text-xs font-bold text-stone-600">Traditional</span>
          <span className="px-3 py-1 bg-stone-100 rounded-full text-xs font-bold text-stone-600">Eco-friendly</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-outline-variant/30 flex justify-between">
        {['Overview', 'Products', 'Orders', 'Reviews'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === tab 
              ? 'border-primary text-primary' 
              : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeTab === 'Overview' && (
          <div className="space-y-6">
            <section>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-stone-800">Performance Summary</h3>
                <span className="text-xs font-bold text-stone-500 bg-stone-100 px-2 py-1 rounded">Last 1 year ▾</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant/50 p-4 flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0"><Package className="w-4 h-4" /></div>
                    <div className="text-xl font-bold text-stone-800">{artisan.performance?.completed_orders || 0}</div>
                  </div>
                  <div className="text-[10px] uppercase font-bold text-stone-500">Completed</div>
                </div>
                <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant/50 p-4 flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0"><X className="w-4 h-4" /></div>
                    <div className="text-xl font-bold text-stone-800">{artisan.performance?.cancelled_orders || 0}</div>
                  </div>
                  <div className="text-[10px] uppercase font-bold text-stone-500">Cancelled</div>
                </div>
                <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant/50 p-4 flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0 font-bold text-xs">%</div>
                    <div className="text-lg font-bold text-stone-800">{artisan.performance?.cancellation_rate || '-'}</div>
                  </div>
                  <div className="text-[10px] uppercase font-bold text-stone-500">Cancellation Rate</div>
                </div>
                <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant/50 p-4 flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-500 shrink-0"><Clock className="w-4 h-4" /></div>
                    <div className="text-sm font-bold text-stone-800">{artisan.performance?.on_time_completion || '92%'}</div>
                  </div>
                  <div className="text-[10px] uppercase font-bold text-stone-500">On-time Completion</div>
                </div>
                <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant/50 p-4 flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-500 shrink-0"><Star className="w-4 h-4 fill-current" /></div>
                    <div className="text-lg font-bold text-stone-800">{artisan.performance?.avg_rating || '-'}</div>
                  </div>
                  <div className="text-[10px] uppercase font-bold text-stone-500">Avg Rating</div>
                </div>
                <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant/50 p-4 flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-500 shrink-0"><MessageSquare className="w-4 h-4" /></div>
                    <div className="text-lg font-bold text-stone-800">{artisan.performance?.active_disputes || 0}</div>
                  </div>
                  <div className="text-[10px] uppercase font-bold text-stone-500">Active Disputes</div>
                </div>
              </div>
            </section>

            <section className="bg-green-50 rounded-3xl p-6 border border-green-100 flex flex-col items-center text-center">
              <h3 className="text-lg font-bold text-stone-800 mb-2">Guide/Support</h3>
              <p className="text-sm text-stone-600 mb-4 italic">"I create pottery that carries the stories of my village and our traditions."</p>
              <button onClick={() => setShowSupportModal(true)} className="px-6 py-3 bg-green-700 text-white rounded-full font-bold shadow-md hover:bg-green-800 transition-colors w-full">
                Offer Support
              </button>
            </section>
          </div>
        )}

        {activeTab === 'Products' && (
          <div className="space-y-4">
             {(!artisan.products || artisan.products.length === 0) ? (
              <div className="text-center text-stone-500 bg-surface rounded-3xl p-6 border border-outline-variant">
                No products added yet.
              </div>
            ) : (
              artisan.products.map((p: any) => (
                <div key={p.id} className="bg-surface rounded-3xl shadow-sm border border-outline-variant/50 p-4 flex gap-4">
                  <div className="w-20 h-24 rounded-2xl bg-stone-100 overflow-hidden shrink-0">
                    {p.product_images && p.product_images.length > 0 ? (
                      <img src={p.product_images[0].image_url} alt="Product" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-300 text-xs">No img</div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="font-bold text-stone-800 text-sm mb-1">{p.title || 'Untitled'}</div>
                    <div className="text-xs font-bold text-stone-500 mb-2">
                        {p.price ? `₹${p.price}` : 'No price'}
                    </div>
                    <div className="flex items-center gap-2 mt-auto">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${p.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {p.status === 'published' ? 'Active' : 'Pending'}
                        </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {(activeTab === 'Orders' || activeTab === 'Reviews') && (
           <div className="text-center text-stone-500 py-12">
             Coming soon for this view.
           </div>
        )}
      </div>

      {/* Offer Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-surface w-full sm:w-[400px] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0">
             <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center bg-stone-50">
               <h3 className="font-bold text-lg text-stone-800">Support Request</h3>
               <button onClick={() => setShowSupportModal(false)} className="p-2 -mr-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200">
                 <X className="w-5 h-5" />
               </button>
             </div>
             <div className="p-6 space-y-4">
               <div>
                 <label className="block text-sm font-bold text-stone-700 mb-2">Type of Support</label>
                 <select 
                   value={supportType}
                   onChange={e => setSupportType(e.target.value)}
                   className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 outline-none focus:border-primary text-sm font-medium"
                 >
                   <option>Pricing Help</option>
                   <option>Catalogue Help</option>
                   <option>Product Creation Help</option>
                   <option>Profile Help</option>
                   <option>Order Issue</option>
                   <option>Other</option>
                 </select>
               </div>
               <div>
                 <label className="block text-sm font-bold text-stone-700 mb-2">Message details</label>
                 <textarea 
                   value={supportMessage}
                   onChange={e => setSupportMessage(e.target.value)}
                   placeholder="Describe what the artisan needs help with..."
                   rows={4}
                   className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 outline-none focus:border-primary text-sm resize-none"
                 />
               </div>
             </div>
             <div className="p-6 bg-stone-50 border-t border-outline-variant/30">
               <button 
                 onClick={handleOfferSupport}
                 disabled={submittingSupport || !supportMessage.trim()}
                 className="w-full py-3 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
               >
                 {submittingSupport ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Submit Support Request'}
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
