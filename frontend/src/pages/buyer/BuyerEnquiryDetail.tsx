import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { 
  Calendar, Package, ArrowLeft, ExternalLink, Check, X, 
  Edit3, Sparkles, Clock, AlertCircle, FileText, CheckCircle2 
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import MessagingUI from '../../components/buyer/MessagingUI';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function BuyerEnquiryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, token } = useAuthStore();
  
  const [enquiry, setEnquiry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Quotation action state
  const [actionLoading, setActionLoading] = useState(false);
  const [showChangeInput, setShowChangeInput] = useState(false);
  const [changeReason, setChangeReason] = useState('');

  const fetchEnquiry = async () => {
    if (!id || !user || !token) return;
    try {
      const res = await axios.get(`${API_URL}/enquiries/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = res.data;

      // If quotation is not already populated, check the by-enquiry endpoint
      if (!data.quotation) {
        try {
          const qRes = await axios.get(`${API_URL}/quotations/by-enquiry/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (qRes.data?.quotation) {
            data.quotation = {
              ...qRes.data.quotation,
              revisions: qRes.data.revisions || [],
              current_revision: qRes.data.revisions?.[0] || null,
              order_id: qRes.data.order_id
            };
          }
        } catch {
          // No quotation created yet for this enquiry
        }
      }
      setEnquiry(data);
    } catch (err: any) {
      if (err.response?.status === 403 || err.response?.status === 404) {
        setError('Enquiry not found or access denied');
      } else {
        setError(err.response?.data?.detail || err.message || 'Failed to load enquiry');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchEnquiry();
  }, [id, user, token]);

  const handleQuoteAction = async (action: 'accept' | 'reject' | 'request-changes') => {
    const quote = enquiry?.quotation;
    if (!quote?.id) return;

    if (action === 'request-changes' && !changeReason.trim()) {
      alert('Please specify what changes you need.');
      return;
    }

    if (action === 'reject' && !window.confirm('Are you sure you want to decline this quotation?')) {
      return;
    }

    setActionLoading(true);
    try {
      const payload = (action === 'request-changes' || action === 'reject') 
        ? { reason: changeReason } 
        : {};

      const res = await axios.post(`${API_URL}/quotations/${quote.id}/${action}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (action === 'accept' && res.data.order_id) {
        navigate(`/buyer/orders/${res.data.order_id}`);
      } else {
        // Refresh local view
        await fetchEnquiry();
        setShowChangeInput(false);
        setChangeReason('');
      }
    } catch (err: any) {
      console.error(`Quotation ${action} failed:`, err);
      alert(err.response?.data?.detail || `Failed to ${action} quotation.`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-stone-500">Loading enquiry details...</p>
      </div>
    );
  }

  if (error || !enquiry) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center text-on-surface-variant mb-4 hover:text-primary">
          <ArrowLeft className="w-5 h-5 mr-2" />
          {t('common.back', 'Back')}
        </button>
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center font-medium shadow-sm">
          {error || t('common.error', 'Error loading data')}
        </div>
      </div>
    );
  }

  const product = enquiry.products;
  const image = product?.images?.[0]?.image_url;
  const quotation = enquiry.quotation;
  const rev = quotation?.current_revision || quotation?.latest_revision || quotation?.revisions?.[0];
  const isClosed = enquiry.status === 'closed' || enquiry.status === 'ordered' || enquiry.status === 'completed' || enquiry.is_consumed;
  const isQuoteSent = !isClosed && (enquiry.status === 'quote_sent' || quotation?.status === 'sent');
  const isAccepted = !isClosed && (enquiry.status === 'accepted' || quotation?.status === 'accepted');
  const isChangesRequested = !isClosed && (enquiry.status === 'changes_requested' || quotation?.status === 'changes_requested');
  const isRejected = !isClosed && (enquiry.status === 'rejected' || quotation?.status === 'rejected');

  return (
    <div className="max-w-3xl mx-auto px-4 pt-14 pb-28 sm:p-6 space-y-5">
      {/* Top Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button 
          onClick={() => navigate('/buyer/enquiries')} 
          className="flex items-center text-stone-600 hover:text-primary transition-colors text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          {t('common.back', 'Back to Enquiries')}
        </button>
      </div>

      {/* Header with Title & Status Badge */}
      <div className="bg-surface rounded-2xl p-4 sm:p-5 border border-outline-variant shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface">
            {t('buyer_enquiry.title', 'Enquiry with Artisan')}
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Artisan: <span className="font-semibold text-stone-800">{enquiry.artisan?.display_name || 'Handmade Artisan'}</span>
          </p>
        </div>

        <div>
          {isClosed && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Order Placed & Paid
            </span>
          )}
          {isQuoteSent && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-sm animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Quotation Received
            </span>
          )}
          {isAccepted && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              Order Confirmed
            </span>
          )}
          {isChangesRequested && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
              <Clock className="w-3.5 h-3.5 text-purple-600" />
              Changes Requested
            </span>
          )}
          {isRejected && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              Declined
            </span>
          )}
          {!isClosed && !isQuoteSent && !isAccepted && !isChangesRequested && !isRejected && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-700 border border-stone-200">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              {enquiry.status === 'responded' ? 'Responded' : enquiry.status === 'viewed' ? 'Seen by Artisan' : 'Pending Response'}
            </span>
          )}
        </div>
      </div>

      {/* Closed / Completed Order Callout Banner */}
      {isClosed && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-emerald-900 text-sm">Enquiry Converted & Closed</h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                This discussion resulted in a confirmed order. If you want to order again, you can visit the product page.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              onClick={() => navigate('/buyer/orders')}
              className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors text-center"
            >
              View My Orders
            </button>
            <button
              onClick={() => navigate(`/buyer/product/${enquiry.product_id}`)}
              className="flex-1 sm:flex-none px-4 py-2 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100/50 font-bold text-xs rounded-xl transition-colors text-center"
            >
              Product Page
            </button>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* PROMINENT QUOTATION CARD (When artisan has sent a quotation) */}
      {/* ======================================================================= */}
      {quotation && rev && (
        <div className="bg-surface rounded-2xl shadow-md border-2 border-amber-400/80 overflow-hidden">
          {/* Quotation Header Bar */}
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-base leading-tight">Formal Quotation from Artisan</h2>
                <span className="text-xs text-white/80">Ref: {quotation.display_id || 'Quote'} (v{quotation.current_version || 1})</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-white text-amber-900 shadow-sm uppercase tracking-wide">
                {quotation.status === 'sent' ? 'Ready for Review' : quotation.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* Quotation Details Body */}
          <div className="p-4 sm:p-5 space-y-4">
            {/* Price & Quantity Grid */}
            <div className="bg-surface-container rounded-xl p-4 border border-outline-variant/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-stone-500 font-medium block">Quantity</span>
                <span className="font-bold text-stone-900 text-base">{rev.quantity} units</span>
              </div>
              <div>
                <span className="text-stone-500 font-medium block">Unit Price</span>
                <span className="font-bold text-stone-900 text-base">₹{rev.unit_price}</span>
              </div>
              <div>
                <span className="text-stone-500 font-medium block">Customization</span>
                <span className="font-bold text-stone-900 text-base">₹{rev.customization_cost || 0}</span>
              </div>
              <div>
                <span className="text-stone-500 font-medium block">Total Order Price</span>
                <span className="font-black text-primary text-base sm:text-lg">₹{rev.total_price}</span>
              </div>
            </div>

            {/* Timeline & Notes info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/70">
                <span className="text-stone-500 font-medium block mb-0.5">Production Lead Time</span>
                <span className="font-bold text-stone-800 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  {rev.production_lead_time_days || 7} working days
                </span>
              </div>
              {rev.expiry_date && (
                <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/70">
                  <span className="text-stone-500 font-medium block mb-0.5">Valid Until</span>
                  <span className="font-bold text-stone-800 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-stone-600" />
                    {new Date(rev.expiry_date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* Artisan Notes */}
            {rev.artisan_notes && (
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-950">
                <span className="font-bold block mb-1">Artisan's Note on this Quote:</span>
                <p className="whitespace-pre-wrap leading-relaxed">{rev.artisan_notes}</p>
              </div>
            )}

            {/* Action Buttons for Quote Sent State */}
            {quotation.status === 'sent' && (
              <div className="pt-2 border-t border-outline-variant/40 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => handleQuoteAction('accept')}
                    disabled={actionLoading}
                    className="flex-1 min-h-[48px] py-3 px-4 bg-primary text-on-primary font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
                  >
                    <Check className="w-5 h-5" />
                    {actionLoading ? 'Processing...' : 'Accept Quotation & Confirm Order'}
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowChangeInput(!showChangeInput)}
                      disabled={actionLoading}
                      className="flex-1 sm:flex-none min-h-[48px] py-3 px-4 bg-surface border border-outline-variant text-stone-700 font-bold rounded-xl flex items-center justify-center gap-1.5 hover:bg-surface-container transition-colors active:scale-[0.98]"
                    >
                      <Edit3 className="w-4 h-4" />
                      Request Changes
                    </button>
                    <button
                      onClick={() => handleQuoteAction('reject')}
                      disabled={actionLoading}
                      className="min-h-[48px] py-3 px-3 border border-red-300 text-red-600 font-bold rounded-xl flex items-center justify-center hover:bg-red-50 transition-colors active:scale-[0.98]"
                      title="Decline Quotation"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Inline Request Changes Form */}
                {showChangeInput && (
                  <div className="p-4 bg-surface-container rounded-xl border border-outline-variant animate-in fade-in duration-200 space-y-3">
                    <label className="block text-xs font-bold text-stone-700">
                      What changes would you like the artisan to make?
                    </label>
                    <textarea
                      value={changeReason}
                      onChange={(e) => setChangeReason(e.target.value)}
                      placeholder="E.g., Could we reduce quantity to 20 units or shorten the lead time?"
                      className="w-full p-3 text-xs bg-surface border border-outline-variant rounded-xl outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowChangeInput(false)}
                        className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleQuoteAction('request-changes')}
                        disabled={actionLoading || !changeReason.trim()}
                        className="px-4 py-1.5 text-xs bg-stone-900 text-white font-bold rounded-lg hover:bg-black disabled:opacity-50"
                      >
                        {actionLoading ? 'Sending...' : 'Send Request'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* If Quote is Accepted */}
            {isAccepted && (
              <div className="pt-2 border-t border-outline-variant/40">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                    <div>
                      <span className="font-bold text-green-900 text-xs sm:text-sm block">Quotation Accepted!</span>
                      <span className="text-[11px] text-green-700">The artisan has been notified and the order has been created.</span>
                    </div>
                  </div>
                  {quotation.order_id && (
                    <button
                      onClick={() => navigate(`/buyer/orders/${quotation.order_id}`)}
                      className="min-h-[40px] px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors shadow-sm self-start sm:self-auto shrink-0"
                    >
                      View Order &rarr;
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* If Changes Requested */}
            {isChangesRequested && (
              <div className="pt-2 border-t border-outline-variant/40">
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 text-xs text-purple-900">
                  <span className="font-bold block mb-0.5">Changes Requested</span>
                  <span>You requested modifications to this quotation. The artisan has been notified to provide a revised quote.</span>
                </div>
              </div>
            )}

            {/* If Declined */}
            {isRejected && (
              <div className="pt-2 border-t border-outline-variant/40">
                <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-900">
                  <span className="font-bold block mb-0.5">Quotation Declined</span>
                  <span>You declined this quotation. You can message the artisan below if you want to explore other options.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Information Card */}
      <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-4 border-b border-outline-variant/30 bg-surface-container-lowest flex justify-between items-center">
          <h2 className="font-bold text-on-surface flex items-center gap-2 text-sm sm:text-base">
            <Package className="w-4 h-4 text-primary" />
            {t('buyer_enquiry.product_section', 'Enquired Product')}
          </h2>
          <button 
            onClick={() => navigate(`/buyer/product/${enquiry.product_id}`)}
            className="flex items-center text-xs sm:text-sm text-primary hover:text-primary/80 font-bold"
          >
            {t('buyer_enquiry.view_product', 'View Product')}
            <ExternalLink className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>
        <div className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {image ? (
            <img src={image} alt={product?.title} className="w-20 h-20 rounded-xl object-cover bg-stone-100 shrink-0 border border-stone-200" />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-stone-100 flex items-center justify-center shrink-0 text-stone-400 border border-stone-200">
              <Package className="w-7 h-7" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-stone-900">{product?.title || 'Handcrafted Product'}</h3>
            <p className="text-xs text-stone-500 mt-0.5">Category: {product?.category || 'Handicrafts'}</p>
            {product?.price && (
              <p className="text-primary font-bold text-sm mt-1.5">Catalog Price: ₹{product.price}</p>
            )}
          </div>
        </div>
      </div>

      {/* Buyer's Original Enquiry Details */}
      <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-4 border-b border-outline-variant/30 bg-surface-container-lowest">
          <h2 className="font-bold text-on-surface text-sm sm:text-base">
            {t('buyer_enquiry.your_enquiry', 'Your Original Enquiry')}
          </h2>
        </div>
        <div className="p-4 space-y-3.5 text-xs sm:text-sm">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/60">
              <span className="text-stone-500 font-medium block text-xs mb-0.5">Quantity Requested</span>
              <span className="font-bold text-stone-900">{enquiry.quantity} units</span>
            </div>
            {enquiry.budget && (
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/60">
                <span className="text-stone-500 font-medium block text-xs mb-0.5">Your Target Budget</span>
                <span className="font-bold text-stone-900">₹{enquiry.budget}</span>
              </div>
            )}
            {enquiry.created_at && (
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/60">
                <span className="text-stone-500 font-medium block text-xs mb-0.5">Sent On</span>
                <span className="font-bold text-stone-900">{new Date(enquiry.created_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>
          
          {enquiry.customisation_request && (
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60">
              <span className="text-stone-500 font-medium block text-xs mb-1">Customisation Requirements</span>
              <p className="text-stone-800 whitespace-pre-wrap leading-relaxed">{enquiry.customisation_request}</p>
            </div>
          )}
          
          {enquiry.buyer_message && (
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60">
              <span className="text-stone-500 font-medium block text-xs mb-1">Your Message to Artisan</span>
              <p className="text-stone-800 whitespace-pre-wrap leading-relaxed">{enquiry.buyer_message}</p>
            </div>
          )}
        </div>
      </div>

      {/* Artisan Text Response Section (If artisan entered a general note or status response) */}
      {enquiry.artisan_response_note && (
        <div className="bg-surface rounded-2xl p-4 sm:p-5 shadow-sm border border-outline-variant">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-bold text-stone-800 text-sm sm:text-base">Note from Artisan</h3>
            {enquiry.responded_at && (
              <span className="text-[11px] text-stone-400">
                ({new Date(enquiry.responded_at).toLocaleDateString()})
              </span>
            )}
          </div>
          <div className="bg-surface-container p-3.5 rounded-xl border border-outline-variant/60 text-xs sm:text-sm text-stone-800 leading-relaxed whitespace-pre-wrap">
            {enquiry.artisan_response_note}
          </div>
        </div>
      )}

      {/* Real-time Messaging UI with Artisan */}
      <div className="pt-2">
        <div className="mb-2">
          <h2 className="font-bold text-on-surface text-base">Direct Conversation with Artisan</h2>
          <p className="text-xs text-stone-500">Ask questions, discuss customization, or follow up on your quote</p>
        </div>
        <MessagingUI enquiryId={id || ""} currentUserId={user?.id || enquiry.buyer_id || ""} />
      </div>
    </div>
  );
}
