import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MessageSquare, Check, X, Search, Calendar, FileText } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';
import { useQuotationStore } from '../../stores/quotationStore';
import MessagingUI from '../../components/buyer/MessagingUI';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

type ResponseType = 'interested' | 'need_details' | 'cannot_fulfil' | null;

export default function EnquiryDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const { createQuotation, sendQuotation } = useQuotationStore();
  
  const [enq, setEnq] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messaging, setMessaging] = useState(false);
  
  const [responseType, setResponseType] = useState<ResponseType>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Quote form state
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteData, setQuoteData] = useState({
    quantity: 0,
    unit_price: 0,
    customization_cost: 0,
    production_lead_time_days: 7,
    artisan_notes: ''
  });

  const handleMessageBuyer = async () => {
    const el = document.getElementById('artisan-enquiry-conversation');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setMessaging(true);
    try {
      const res = await axios.get(`${API_URL}/conversations/by-enquiry/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate(`/artisan/conversation/${res.data.conversation.id}`);
    } catch (e) {
      console.error(e);
      alert('Could not start conversation');
    } finally {
      setMessaging(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    async function fetchDetail() {
      try {
        const response = await axios.get(`${API_URL}/enquiries/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEnq(response.data);
        setQuoteData(prev => ({
          ...prev, 
          quantity: response.data.quantity,
          unit_price: response.data.products?.price || response.data.products?.suggested_price || 0
        }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (token && id) fetchDetail();
  }, [token, id]);

  const handleRespond = async () => {
    if (!responseType) return;
    setSubmitting(true);
    try {
      const res = await axios.put(`${API_URL}/enquiries/${id}/respond`, {
        artisan_response: responseType,
        artisan_response_note: note || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEnq(res.data.enquiry);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateQuote = async () => {
    setSubmitting(true);
    try {
      const quoteRes = await createQuotation({
        enquiry_id: id,
        ...quoteData
      });
      await sendQuotation(quoteRes.quotation.id);
      
      // Update local state to show quote sent
      setEnq({ ...enq, status: 'quote_sent' });
      setShowQuoteForm(false);
    } catch (err) {
      console.error("Failed to create quote", err);
    } finally {
      setSubmitting(false);
    }
  };



  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest"><div className="animate-pulse w-8 h-8 rounded-full bg-stone-300"></div></div>;
  }

  if (!enq) {
    return <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest text-on-surface">{t('common.enquiry_not_found')}</div>;
  }

  const isResponded = enq.status !== 'new' && enq.status !== 'viewed';
  const displayResponse = isResponded ? enq.artisan_response : responseType;

  return (
    <div className="min-h-screen bg-surface-container-lowest pb-28 text-on-surface">
      {/* Header */}
      <div className="bg-surface px-4 pt-12 pb-4 sticky top-0 z-10 border-b border-outline-variant/30">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/artisan/enquiries')} className="text-stone-600 hover:text-stone-900">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-stone-800">{t('enquiry.detail_title') || 'Enquiry Details'}</h1>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-lg mx-auto">
        {/* Product Info */}
        <div className="bg-surface rounded-2xl p-4 shadow-sm border border-outline-variant flex gap-4">
          <div className="w-24 h-24 rounded-xl bg-stone-200 overflow-hidden shrink-0 border border-stone-200">
            {enq.products?.images?.[0]?.image_url ? (
              <img src={enq.products.images[0].image_url} alt="Product" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">{t('common.no_image')}</div>
            )}
          </div>
          <div>
            <h3 className="font-bold text-stone-800 text-lg leading-tight mb-1">{enq.products?.title || 'Product'}</h3>
            <div className="text-sm text-stone-500 mb-2 line-clamp-2">{enq.products?.description}</div>
            <div className="text-primary font-bold">₹{enq.products?.price || enq.products?.suggested_price || 0}</div>
          </div>
        </div>

        {/* Buyer Request Details */}
        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant">
          <h3 className="font-bold text-stone-800 mb-4">{t('enquiry.request_details') || 'Request Details'}</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-surface-container p-3 rounded-xl border border-outline-variant/50">
              <div className="text-xs text-stone-500 mb-1">{t('enquiry.quantity') || 'Quantity'}</div>
              <div className="font-bold text-stone-800 text-lg">{enq.quantity}</div>
            </div>
            <div className="bg-surface-container p-3 rounded-xl border border-outline-variant/50">
              <div className="text-xs text-stone-500 mb-1">{t('enquiry.budget') || 'Budget/Unit'}</div>
              <div className="font-bold text-stone-800 text-lg">{enq.budget ? `₹${enq.budget}` : '-'}</div>
            </div>
          </div>

          {enq.delivery_deadline && (
            <div className="flex items-center gap-3 text-sm text-on-primary-container bg-primary-container p-3 rounded-xl mb-4">
              <Calendar className="w-5 h-5 text-primary shrink-0" />
              <div>
                <span className="font-bold">{t('enquiry.deadline') || 'Delivery Deadline'}:</span> {new Date(enq.delivery_deadline).toLocaleDateString()}
              </div>
            </div>
          )}

          {enq.customisation_request && (
            <div>
              <div className="text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">{t('enquiry.customisation') || 'Customisation Request'}</div>
              <p className="text-sm text-on-surface-variant bg-surface-container p-3 rounded-xl border border-outline-variant/50 italic leading-relaxed">
                "{enq.customisation_request}"
              </p>
            </div>
          )}

          {enq.requested_variant && (
            <div className="mt-4">
              <div className="text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">Requested Option / Variant</div>
              <div className="text-sm text-on-surface-variant bg-surface-container p-3 rounded-xl border border-outline-variant/50 flex flex-col">
                <span className="font-bold text-stone-800">{enq.requested_variant.type.toUpperCase()}: {enq.requested_variant.value}</span>
                {enq.requested_variant.price_adjustment > 0 && (
                   <span className="text-xs text-primary font-bold mt-1">Price impact: +₹{enq.requested_variant.price_adjustment} per unit</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Status Timeline */}
        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant">
          <h3 className="font-bold text-stone-800 mb-4">{t('enquiry.timeline') || 'Timeline'}</h3>
          <div className="relative pl-6 border-l-2 border-stone-100 space-y-6">
            
            <div className="relative">
              <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full border-4 border-white bg-green-500"></div>
              <div className="text-sm font-bold text-stone-800">{t('enquiry.enquiry_received') || 'Enquiry Received'}</div>
              <div className="text-xs text-stone-500 mt-1">{new Date(enq.created_at).toLocaleString()}</div>
            </div>

            {isResponded && (
              <div className="relative">
                <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full border-4 border-white bg-brand-dark"></div>
                <div className="text-sm font-bold text-stone-800">{t('enquiry.enquiry_responded') || 'Responded'}</div>
                <div className="text-xs text-stone-500 mt-1">{new Date(enq.responded_at || enq.updated_at).toLocaleString()}</div>
                <div className="mt-2 bg-surface-container p-3 rounded-xl text-sm text-on-surface-variant">
                  <span className="font-bold block mb-1">
                    {(enq.artisan_response === 'interested' || enq.artisan_response === 'accepted') ? 'Accepted & Confirmed' : ''}
                    {enq.artisan_response === 'need_details' ? (t('enquiry.opt_need_details') || 'Need More Details') : ''}
                    {(enq.artisan_response === 'cannot_fulfil' || enq.artisan_response === 'rejected') ? (t('enquiry.opt_cannot_fulfil') || 'Cannot Fulfil / Rejected') : ''}
                  </span>
                  {enq.artisan_response_note && <span>{enq.artisan_response_note}</span>}
                </div>
              </div>
            )}
            
            {(enq.status === 'quote_sent' || enq.status === 'accepted') && (
              <div className="relative">
                <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full border-4 border-white bg-primary"></div>
                <div className="text-sm font-bold text-stone-800">Quotation Sent</div>
              </div>
            )}

            {enq.status === 'accepted' && (
              <div className="relative">
                <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full border-4 border-white bg-green-500"></div>
                <div className="text-sm font-bold text-stone-800">Quotation Accepted (Order Created)</div>
              </div>
            )}
          </div>
        </div>

        {/* Quote Form */}
        {isResponded && enq.artisan_response === 'interested' && enq.status === 'responded' && !showQuoteForm && (
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button 
              onClick={() => setShowQuoteForm(true)}
              className="w-full sm:flex-1 min-h-[48px] bg-primary hover:bg-primary/90 text-on-primary font-bold py-3.5 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-center text-sm sm:text-base active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[20px]">request_quote</span>
              <span>{t('enquiry_detail.create_quote', { defaultValue: 'Create Quotation' })}</span>
            </button>
            <button 
              onClick={handleMessageBuyer}
              disabled={messaging}
              className="w-full sm:flex-1 min-h-[48px] bg-secondary-container hover:bg-secondary-container/80 text-on-secondary-container font-bold py-3.5 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-center text-sm sm:text-base active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[20px]">chat</span>
              <span>{messaging ? t('enquiry_detail.opening', { defaultValue: 'Opening...' }) : t('enquiry_detail.message_buyer', { defaultValue: 'Message Buyer' })}</span>
            </button>
          </div>
        )}

        {showQuoteForm && (
          <div className="bg-surface rounded-2xl p-5 shadow-sm border border-primary animate-in fade-in slide-in-from-bottom-4">
            <h3 className="font-bold text-stone-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Create Quotation
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">Quantity</label>
                <input 
                  type="number" 
                  value={quoteData.quantity}
                  onChange={e => setQuoteData({...quoteData, quantity: parseInt(e.target.value) || 0})}
                  className="w-full p-3 border border-outline-variant rounded-xl bg-surface focus:ring-2 focus:ring-primary outline-none" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">Unit Price (₹)</label>
                <input 
                  type="number" 
                  value={quoteData.unit_price}
                  onChange={e => setQuoteData({...quoteData, unit_price: parseFloat(e.target.value) || 0})}
                  className="w-full p-3 border border-outline-variant rounded-xl bg-surface focus:ring-2 focus:ring-primary outline-none" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">Customization Cost (₹) (Optional)</label>
                <input 
                  type="number" 
                  value={quoteData.customization_cost}
                  onChange={e => setQuoteData({...quoteData, customization_cost: parseFloat(e.target.value) || 0})}
                  className="w-full p-3 border border-outline-variant rounded-xl bg-surface focus:ring-2 focus:ring-primary outline-none" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">Production Lead Time (Days)</label>
                <input 
                  type="number" 
                  value={quoteData.production_lead_time_days}
                  onChange={e => setQuoteData({...quoteData, production_lead_time_days: parseInt(e.target.value) || 0})}
                  className="w-full p-3 border border-outline-variant rounded-xl bg-surface focus:ring-2 focus:ring-primary outline-none" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">Notes to Buyer</label>
                <textarea 
                  rows={2}
                  value={quoteData.artisan_notes}
                  onChange={e => setQuoteData({...quoteData, artisan_notes: e.target.value})}
                  className="w-full p-3 border border-outline-variant rounded-xl bg-surface focus:ring-2 focus:ring-primary outline-none resize-none" 
                />
              </div>
              
              <div className="bg-primary-container text-on-primary-container p-4 rounded-xl border border-primary/20">
                <div className="flex justify-between text-sm mb-1">
                  <span>Subtotal ({quoteData.quantity} × ₹{quoteData.unit_price})</span>
                  <span>₹{(quoteData.quantity * quoteData.unit_price).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Customization</span>
                  <span>₹{quoteData.customization_cost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-black text-lg pt-2 border-t border-primary/20">
                  <span>Total Order Value</span>
                  <span>₹{((quoteData.quantity * quoteData.unit_price) + quoteData.customization_cost).toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button 
                onClick={() => setShowQuoteForm(false)}
                className="w-full sm:flex-1 min-h-[48px] py-3 border border-outline-variant text-stone-700 font-bold rounded-xl active:scale-[0.98]"
              >
                {t('enquiry_detail.cancel', { defaultValue: 'Cancel' })}
              </button>
              <button 
                onClick={handleCreateQuote}
                disabled={submitting || quoteData.quantity <= 0 || quoteData.unit_price <= 0}
                className="w-full sm:flex-[2] min-h-[48px] py-3 bg-primary text-on-primary font-bold rounded-xl disabled:opacity-50 active:scale-[0.98]"
              >
                {submitting ? t('enquiry_detail.sending', { defaultValue: 'Sending...' }) : t('enquiry_detail.send_quote', { defaultValue: 'Send Quotation' })}
              </button>
            </div>
          </div>
        )}

        {/* Action Section (if not responded) */}
        {!isResponded && (
          <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant" data-guide-id="response-options">
            <h3 className="font-bold text-stone-800 mb-4">{t('enquiry.your_response') || 'Your Response'}</h3>
            
            <div className="space-y-3 mb-6">
              <div 
                onClick={() => setResponseType('interested')}
                className={`p-4 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-all ${displayResponse === 'interested' ? 'border-green-500 bg-green-50' : 'border-stone-100 bg-white hover:border-stone-200'}`}
              >
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${displayResponse === 'interested' ? 'border-green-500 bg-green-500 text-white' : 'border-stone-300'}`}>
                  {displayResponse === 'interested' && <Check className="w-4 h-4" />}
                </div>
                <div>
                  <div className={`font-bold ${displayResponse === 'interested' ? 'text-green-800' : 'text-stone-800'}`}>Accept & Confirm Request</div>
                  <div className="text-xs text-stone-500 mt-0.5">Accept and confirm this order. The buyer will be able to proceed with purchase.</div>
                </div>
              </div>

              <div 
                onClick={() => setResponseType('need_details')}
                className={`p-4 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-all ${displayResponse === 'need_details' ? 'border-blue-500 bg-blue-50' : 'border-stone-100 bg-white hover:border-stone-200'}`}
              >
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${displayResponse === 'need_details' ? 'border-blue-500 bg-blue-500 text-white' : 'border-stone-300'}`}>
                  {displayResponse === 'need_details' && <Search className="w-4 h-4" />}
                </div>
                <div>
                  <div className={`font-bold ${displayResponse === 'need_details' ? 'text-blue-800' : 'text-stone-800'}`}>{t('enquiry.opt_need_details') || 'Need More Details'}</div>
                  <div className="text-xs text-stone-500 mt-0.5">{t('enquiry.opt_need_details_desc') || 'You need clarification from the buyer.'}</div>
                </div>
              </div>

              <div 
                onClick={() => setResponseType('cannot_fulfil')}
                className={`p-4 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-all ${displayResponse === 'cannot_fulfil' ? 'border-red-500 bg-red-50' : 'border-stone-100 bg-white hover:border-stone-200'}`}
              >
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${displayResponse === 'cannot_fulfil' ? 'border-red-500 bg-red-500 text-white' : 'border-stone-300'}`}>
                  {displayResponse === 'cannot_fulfil' && <X className="w-4 h-4" />}
                </div>
                <div>
                  <div className={`font-bold ${displayResponse === 'cannot_fulfil' ? 'text-red-800' : 'text-stone-800'}`}>Cannot Fulfil / Reject</div>
                  <div className="text-xs text-stone-500 mt-0.5">Decline this request if you are unable to take the order.</div>
                </div>
              </div>
            </div>

            {responseType && (
              <div className="mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-bold text-stone-700">
                    {t('enquiry.add_note') || 'Add a note to the buyer (Optional)'}
                  </label>
                </div>
                <textarea 
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t('enquiry.add_note_placeholder') || 'Type your message here...'}
                  className="w-full p-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none text-sm bg-surface text-on-surface"
                ></textarea>
              </div>
            )}

            <button 
              onClick={handleRespond}
              disabled={!responseType || submitting}
              className="w-full py-4 bg-primary hover:bg-primary/90 text-on-primary font-bold rounded-full transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <MessageSquare className="w-5 h-5" /> 
                  {t('enquiry.send_response_btn') || 'Send Response'}
                </>
              )}
            </button>
          </div>
        )}
        
        {/* Conversation Section */}
        <div id="artisan-enquiry-conversation" className="mt-6">
          <MessagingUI enquiryId={id || ""} currentUserId={user?.id || enq.artisan_id || ""} />
        </div>

      </div>
    </div>
  );
}
