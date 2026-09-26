import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface EnquiryFormProps {
  productId: string;
  moq: number;
  onClose: () => void;
}

export default function EnquiryForm({ productId, moq, onClose }: EnquiryFormProps) {
  const { t } = useTranslation();
  const { token, isAuthenticated, user } = useAuthStore();
  
  const [quantity, setQuantity] = useState(moq > 0 ? moq : 1);
  const [budget, setBudget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [customisation, setCustomisation] = useState('');
  const [buyerMessage, setBuyerMessage] = useState('');
  
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  
  React.useEffect(() => {
    // Fetch variants
    const fetchVariants = async () => {
      try {
        const res = await axios.get(`${API_URL}/products/variants/${productId}`);
        if (res.data.variants) {
          setVariants(res.data.variants);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchVariants();
  }, [productId]);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || user?.role !== 'buyer') {
      setError(t('enquiry.must_be_buyer') || 'You must be logged in as a buyer to send an enquiry.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await axios.post(
        `${API_URL}/enquiries/`,
        {
          product_id: productId,
          quantity: Number(quantity),
          budget: budget ? Number(budget) : null,
          delivery_deadline: deadline ? new Date(deadline).toISOString() : null,
          customisation_request: customisation || null,
          buyer_message: buyerMessage || null,
          requested_variant: selectedVariantId ? variants.find(v => v.id === selectedVariantId) : null
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('enquiry.error_submitting') || 'Failed to submit enquiry.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-surface rounded-2xl shadow-xl w-[calc(100%-24px)] max-w-[406px] p-8 text-center relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface">
            <X className="w-5 h-5" />
          </button>
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-on-surface mb-2">{t('enquiry.success_title') || 'Enquiry Sent!'}</h2>
          <p className="text-on-surface-variant mb-6">{t('enquiry.success_message') || 'The artisan will review your request and respond soon.'}</p>
          <button 
            onClick={onClose}
            className="w-full py-3 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold rounded-full transition-colors"
          >
            {t('enquiry.close') || 'Close'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface rounded-t-3xl sm:rounded-2xl shadow-xl w-[calc(100%-24px)] max-w-[406px] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-outline-variant/30 bg-surface-container-lowest">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider mb-1">
              <span>Artisan Enquiry</span>
            </div>
            <h2 className="text-lg font-bold text-on-surface">{t('enquiry.form_title', { defaultValue: 'Send Purchase Enquiry' })}</h2>
          </div>
          <button 
            onClick={onClose} 
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-stone-100 text-on-surface-variant hover:text-on-surface transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-on-surface mb-1">
                {t('enquiry.quantity') || 'Quantity'} *
              </label>
              <input 
                type="number" 
                required 
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full p-3 border border-outline-variant/50 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-surface-container-lowest text-on-surface font-bold"
              />
            </div>

            {variants.length > 0 && (
              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">
                  Select Option / Variant (Optional)
                </label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className="w-full p-3 border border-outline-variant/50 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-surface-container-lowest text-on-surface"
                >
                  <option value="">No specific variant</option>
                  {variants.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.type.toUpperCase()}: {v.value} {v.price_adjustment > 0 ? `(+₹${v.price_adjustment})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-bold text-on-surface mb-1">
                {t('enquiry.budget') || 'Budget per unit (Optional)'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3.5 text-stone-500">₹</span>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full p-3 pl-8 border border-outline-variant/50 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-surface-container-lowest text-on-surface"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-on-surface mb-1">
                {t('enquiry.deadline') || 'Delivery Deadline (Optional)'}
              </label>
              <input 
                type="date" 
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-3 border border-outline-variant/50 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-surface-container-lowest text-on-surface"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-on-surface mb-1">
                {t('enquiry.customisation') || 'Customisation Request (Optional)'}
              </label>
              <textarea 
                rows={2}
                value={customisation}
                onChange={(e) => setCustomisation(e.target.value)}
                placeholder={t('enquiry.customisation_placeholder') || 'Describe any specific changes or requirements...'}
                className="w-full p-3 border border-outline-variant/50 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none bg-surface-container-lowest text-on-surface"
              ></textarea>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-on-surface mb-1">
                {t('enquiry.buyer_message') || 'Message to Artisan (Optional)'}
              </label>
              <textarea 
                rows={2}
                value={buyerMessage}
                onChange={(e) => setBuyerMessage(e.target.value)}
                placeholder={t('enquiry.buyer_message_placeholder') || 'Introduce yourself or ask a question...'}
                className="w-full p-3 border border-outline-variant/50 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none bg-surface-container-lowest text-on-surface"
              ></textarea>
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-2 py-4 bg-primary hover:bg-primary/90 text-on-primary font-bold rounded-full transition-all shadow-md disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                t('enquiry.send_btn') || 'Send Enquiry'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
