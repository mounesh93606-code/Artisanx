import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Calendar, Package, ArrowLeft, ExternalLink } from 'lucide-react';
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

  useEffect(() => {
    window.scrollTo(0, 0);
    async function fetchEnquiry() {
      if (!id || !user || !token) return;
      try {
        const res = await axios.get(`${API_URL}/enquiries/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setEnquiry(res.data);
      } catch (err: any) {
        if (err.response?.status === 403 || err.response?.status === 404) {
          setError('Enquiry not found or access denied');
        } else {
          setError(err.response?.data?.detail || err.message || 'Failed to load enquiry');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchEnquiry();
  }, [id, user, token]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !enquiry) {
    return (
      <div className="p-4">
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

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6 pb-28">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center text-on-surface-variant hover:text-primary transition-colors">
          <ArrowLeft className="w-5 h-5 mr-2" />
          {t('common.back', 'Back')}
        </button>
      </div>

      <h1 className="text-2xl font-bold text-on-surface">
        {t('buyer_enquiry.title', 'Response to your enquiry')}
      </h1>

      {/* Product Section */}
      <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-4 border-b border-outline-variant/30 bg-surface-container-lowest flex justify-between items-center">
          <h2 className="font-bold text-on-surface flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            {t('buyer_enquiry.product_section', 'Product')}
          </h2>
          <button 
            onClick={() => navigate(`/buyer/product/${enquiry.product_id}`)}
            className="flex items-center text-sm text-primary hover:text-primary/80 font-medium"
          >
            {t('buyer_enquiry.view_product', 'View Product')}
            <ExternalLink className="w-4 h-4 ml-1" />
          </button>
        </div>
        <div className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {image ? (
            <img src={image} alt={product?.title} className="w-24 h-24 rounded-lg object-cover bg-stone-100 shrink-0" />
          ) : (
            <div className="w-24 h-24 rounded-lg bg-stone-100 flex items-center justify-center shrink-0 text-stone-400">
              <Package className="w-8 h-8" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">{product?.title}</h3>
            {enquiry.artisan?.display_name && (
              <p className="text-sm text-gray-600 mt-1">Artisan: {enquiry.artisan.display_name}</p>
            )}
            {product?.price && (
              <p className="text-primary font-medium mt-2">₹{product.price}</p>
            )}
          </div>
        </div>
      </div>

      {/* Your Enquiry Section */}
      <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-4 border-b border-outline-variant/30 bg-surface-container-lowest">
          <h2 className="font-bold text-on-surface">{t('buyer_enquiry.your_enquiry', 'Your Enquiry')}</h2>
        </div>
        <div className="p-4 space-y-4">
          {enquiry.created_at && (
            <div className="flex items-center text-sm text-gray-500">
              <Calendar className="w-4 h-4 mr-2" />
              {new Date(enquiry.created_at).toLocaleDateString()}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            {enquiry.quantity && (
              <div>
                <p className="text-sm text-gray-500 font-medium">{t('buyer_enquiry.quantity', 'Quantity')}</p>
                <p className="text-gray-900">{enquiry.quantity}</p>
              </div>
            )}
            {enquiry.budget && (
              <div>
                <p className="text-sm text-gray-500 font-medium">{t('common.budget')}</p>
                <p className="text-gray-900">₹{enquiry.budget}</p>
              </div>
            )}
          </div>
          
          {enquiry.customisation_request && (
            <div className="pt-2 border-t border-stone-50">
              <p className="text-sm text-gray-500 font-medium mb-1">{t('buyer_enquiry.customisation', 'Customisation Request')}</p>
              <p className="text-gray-800 whitespace-pre-wrap">{enquiry.customisation_request}</p>
            </div>
          )}
          
          {enquiry.buyer_message && (
            <div className="pt-2 border-t border-stone-50">
              <p className="text-sm text-gray-500 font-medium mb-1">{t('buyer_enquiry.buyer_message', 'Message to Artisan')}</p>
              <p className="text-gray-800 whitespace-pre-wrap">{enquiry.buyer_message}</p>
            </div>
          )}
        </div>
      </div>

      {/* Artisan Response Section */}
      <div className="bg-primary rounded-2xl shadow-sm overflow-hidden text-on-primary">
        <div className="p-4 border-b border-on-primary/10 bg-on-primary/5">
          <h2 className="font-bold flex items-center gap-2">
            {t('buyer_enquiry.artisan_response', 'Artisan Response')}
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              enquiry.status === 'responded' || enquiry.status === 'quote_sent' ? 'bg-secondary-container text-on-secondary-container' : 'bg-on-primary/10 text-on-primary/70'
            }`}>
              {enquiry.status.replace(/_/g, ' ').toUpperCase()}
            </span>
          </h2>
        </div>
        <div className="p-4">
          {['responded', 'quote_sent', 'changes_requested', 'accepted', 'rejected'].includes(enquiry.status) ? (
            <div className="space-y-4">
              {enquiry.responded_at && (
                <div className="flex items-center text-xs text-white/50 mb-2">
                  <Calendar className="w-3 h-3 mr-1" />
                  {new Date(enquiry.responded_at).toLocaleDateString()} {new Date(enquiry.responded_at).toLocaleTimeString()}
                </div>
              )}
              
              {enquiry.artisan_response && (
                <div>
                  <p className="text-sm text-white/70 font-medium mb-1">{t('common.status_response')}</p>
                  <p className="font-medium text-secondary-container">{t(`enquiry.${enquiry.artisan_response}`)}</p>
                </div>
              )}
              
              {enquiry.artisan_response_note && (
                <div>
                  <p className="text-sm text-white/70 font-medium mb-1">{t('common.note_from_artisan')}</p>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                    <p className="whitespace-pre-wrap">{enquiry.artisan_response_note}</p>
                  </div>
                </div>
              )}
              
              {enquiry.status !== 'pending' && enquiry.status !== 'responded' && (
                <button 
                    onClick={() => {
                        // Assuming the backend has a way to get quotation by enquiry, but for now we might need an endpoint 
                        // or we can fetch quotations and filter by enquiry_id
                        axios.get(`${API_URL}/quotations/buyer`, { headers: { Authorization: `Bearer ${token}` } })
                             .then(res => {
                                 const quote = res.data.quotations.find((q: any) => q.enquiry_id === id);
                                 if (quote) navigate(`/buyer/quotations/${quote.id}`);
                                 else alert("Quotation not found");
                             })
                             .catch(err => console.error(err));
                    }}
                    className="mt-4 w-full py-3 bg-secondary-container text-on-secondary-container font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-secondary-container/90 transition-colors"
                >
                    View Quotation <ExternalLink className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="py-6 text-center text-white/50">
              <p>{t('buyer_enquiry.no_response', 'The artisan has not responded yet.')}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
          <MessagingUI enquiryId={id || ""} currentUserId={user?.id || enquiry.buyer_id || ""} />
      </div>
    </div>
  );
}
