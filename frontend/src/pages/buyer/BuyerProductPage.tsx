import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
    ArrowLeft, MapPin, Package, Clock, ShieldCheck, Mail, Heart, 
    Share2, Copy, Check, ShoppingBag, AlertCircle, CheckCircle2,
    Zap, Plus, Minus, Sparkles, FileText, XCircle, X, RefreshCw, ArrowRight, Star
} from 'lucide-react';
import axios from 'axios';
import api from '../../lib/api';
import ProductPassport from '../../components/product/ProductPassport';
import EnquiryForm from '../../components/buyer/EnquiryForm';
import InvoiceModal from '../../components/buyer/InvoiceModal';
import { useTranslation } from 'react-i18next';
import { useBuyerStore } from '../../stores/buyerStore';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function BuyerProductPage() {
    const { t, i18n } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const orderIdParam = searchParams.get('order_id') || searchParams.get('cf_order_id') || '';

    const { savedProducts, toggleSavedProduct, addRecentlyViewed } = useBuyerStore();
    const { user, token } = useAuthStore();
    const { setDirectItem, getItemCount } = useCartStore();

    const [detail, setDetail] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentImageIdx, setCurrentImageIdx] = useState(0);
    const [showEnquiryForm, setShowEnquiryForm] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [copied, setCopied] = useState(false);
    const [buyerEnquiry, setBuyerEnquiry] = useState<any | null>(null);
    const [retailQty, setRetailQty] = useState(1);

    // Reviews state (past 1 month default)
    const [reviewsData, setReviewsData] = useState<any>({ reviews: [], all_reviews: [], total_reviews: 0, aggregates: { overall: 0 } });

    // Payment Status Popup states
    const [paymentStatusLoading, setPaymentStatusLoading] = useState(false);
    const [paymentStatusData, setPaymentStatusData] = useState<any>(null);
    const [paymentStatusError, setPaymentStatusError] = useState<string | null>(null);
    const [showPaymentPopup, setShowPaymentPopup] = useState(false);
    const [showInvoice, setShowInvoice] = useState(false);
    const [invoiceData, setInvoiceData] = useState<any>(null);
    const [pollCount, setPollCount] = useState(0);

    const checkPaymentStatus = async (oid: string, retryCount = 0) => {
        if (!oid) return;
        if (retryCount === 0) {
            setPaymentStatusLoading(true);
            setShowPaymentPopup(true);
            setPaymentStatusError(null);
            setPollCount(0);
        }
        try {
            const res = await api.get(`/payments/cashfree/status/${oid}`);
            setPaymentStatusData(res.data);

            if (res.data.payment_status === 'paid') {
                setPaymentStatusLoading(false);
                // Refresh enquiry to reset buttons to default
                fetchBuyerEnquiry();
                try {
                    const invRes = await api.get(`/payments/invoice/${oid}`);
                    setInvoiceData(invRes.data);
                } catch (e) {
                    console.log('Invoice prefetch error', e);
                }
                return;
            }

            // If pending, retry up to 6 times (1.5s interval)
            if ((res.data.payment_status === 'payment_pending' || res.data.payment_status === 'payment_initiated') && retryCount < 6) {
                setPollCount(retryCount + 1);
                setTimeout(() => {
                    checkPaymentStatus(oid, retryCount + 1);
                }, 1500);
            } else {
                setPaymentStatusLoading(false);
            }
        } catch (err: any) {
            console.error('Failed to check payment status', err);
            if (retryCount < 4) {
                setPollCount(retryCount + 1);
                setTimeout(() => {
                    checkPaymentStatus(oid, retryCount + 1);
                }, 2000);
            } else {
                setPaymentStatusLoading(false);
                setPaymentStatusError(err.response?.data?.detail || 'Could not verify payment status.');
            }
        }
    };

    useEffect(() => {
        if (orderIdParam) {
            checkPaymentStatus(orderIdParam);
        }
    }, [orderIdParam]);

    const closePaymentPopup = () => {
        setShowPaymentPopup(false);
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('order_id');
        newParams.delete('cf_order_id');
        setSearchParams(newParams, { replace: true });
        // Restore default enquiry & state
        fetchBuyerEnquiry();
    };

    const fetchBuyerEnquiry = async () => {
        if (!token || user?.role !== 'buyer' || !id) return;
        try {
            const res = await api.get('/enquiries/buyer');
            const enqs = res.data?.enquiries || [];
            // Only match active pending/unfulfilled enquiries, not previously ordered or consumed ones
            const match = enqs.find((e: any) => 
                e.product_id === id && 
                !e.is_consumed && 
                !['ordered', 'completed', 'closed', 'cancelled'].includes(e.status)
            );
            if (match) {
                setBuyerEnquiry(match);
            } else {
                setBuyerEnquiry(null);
            }
        } catch (e) {
            console.error('Error fetching buyer enquiry', e);
        }
    };

    useEffect(() => {
        async function fetchDetail() {
            try {
                const response = await axios.get(`${API_URL}/products/catalogue/detail/${id}`);
                const data = response.data;
                setDetail(data);
                
                if (data.product) {
                    addRecentlyViewed({
                        id: data.product.id,
                        title: data.product.title,
                        price: data.product.price,
                        image_url: data.images?.[0]?.image_url,
                        artisan_name: data.artisan?.artisan_name
                    });
                }

                api.post('/analytics/track', {
                    product_id: id,
                    event_type: 'view'
                }).catch(e => console.error(e));

            } catch (err: any) {
                setError(err.response?.data?.detail || 'Product not found or unavailable.');
            } finally {
                setLoading(false);
            }
        }
        
        if (id) {
            fetchDetail();
            fetchBuyerEnquiry();
            fetchProductReviews();
        }
    }, [id, addRecentlyViewed, token, user]);

    const fetchProductReviews = async () => {
        if (!id) return;
        try {
            const res = await api.get(`/reviews/product/${id}?days=30`);
            setReviewsData(res.data);
        } catch (e) {
            console.error('Error fetching product reviews', e);
        }
    };

    const handleEnquiry = () => {
        setShowEnquiryForm(true);
    };

    const isEnquiryPending = buyerEnquiry && (
        buyerEnquiry.status === 'new' ||
        buyerEnquiry.status === 'viewed' ||
        (buyerEnquiry.status === 'responded' && buyerEnquiry.artisan_response === 'need_details')
    );

    const isEnquiryConfirmed = buyerEnquiry && (
        ((['accepted', 'responded'].includes(buyerEnquiry.status)) &&
        (['accepted', 'interested'].includes(buyerEnquiry.artisan_response))) ||
        buyerEnquiry.status === 'quote_sent' ||
        buyerEnquiry.status === 'accepted'
    );

    const isEnquiryRejected = buyerEnquiry && (
        buyerEnquiry.status === 'rejected' ||
        ['cannot_fulfil', 'rejected'].includes(buyerEnquiry.artisan_response)
    );

    const handleBuyNow = (customQty?: number) => {
        if (!detail?.product) return;
        const prod = detail.product;
        const qtyToUse = customQty || (isEnquiryConfirmed ? (buyerEnquiry?.quantity || prod.moq || 1) : retailQty);
        setDirectItem({
            id: `${prod.id}_direct`,
            productId: prod.id,
            title: prod.title,
            price: Number(prod.price),
            image: mainImages[0]?.image_url || '',
            artisanId: detail.artisan?.id || prod.artisan_id,
            artisanName: detail.artisan?.artisan_name || 'Artisan',
            quantity: qtyToUse,
            moq: isEnquiryConfirmed ? (prod.moq || 1) : 1,
            stockQuantity: prod.stock_quantity,
            isMadeToOrder: prod.is_made_to_order,
            enquiryId: isEnquiryConfirmed ? buyerEnquiry?.id : undefined,
            enquiryConfirmed: !!isEnquiryConfirmed,
            customization: isEnquiryConfirmed ? buyerEnquiry?.customisation_request : undefined
        });
        navigate('/buyer/checkout?direct=true');
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest"><div className="animate-pulse w-8 h-8 rounded-full bg-stone-300"></div></div>;
    }

    if (error || !detail) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest p-6">
                <div className="bg-surface p-8 rounded-3xl shadow-sm text-center w-full max-w-sm border border-outline-variant">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Unavailable</h2>
                    <p className="text-stone-600">{error}</p>
                    <button onClick={() => navigate('/buyer')} className="mt-6 px-6 py-2 bg-stone-100 rounded-full font-bold text-stone-700">Back to Home</button>
                </div>
            </div>
        );
    }

    const { product, artisan, images, passport } = detail;
    const mainImages = images.length > 0 ? images : [{ image_url: '' }];
    const isSaved = savedProducts.some(p => p.id === product.id);
    const currentLang = i18n.language || 'en';
    const displayTitle = product?.translations?.[currentLang]?.title || product?.title || 'Product';
    const displayDescription = product?.translations?.[currentLang]?.description || product?.description || '';

    return (
        <div className="w-full relative pb-36 bg-surface-container-lowest min-h-screen">
            {/* Top Nav */}
            <div className="absolute top-4 left-4 right-4 z-10 flex justify-between pt-safe">
                <button 
                    onClick={() => navigate(-1)} 
                    className="w-11 h-11 min-w-[44px] min-h-[44px] bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-stone-800 shadow-sm active:scale-95 transition-all"
                    aria-label="Back"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex gap-2">
                    {/* Cart Button with Count Badge */}
                    <button 
                        onClick={() => navigate('/buyer/cart')} 
                        className="w-11 h-11 min-w-[44px] min-h-[44px] bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-stone-800 shadow-sm transition-all active:scale-95 relative"
                        aria-label="View Cart"
                    >
                        <ShoppingBag className="w-5 h-5 text-stone-600" />
                        {getItemCount() > 0 && (
                            <span className="absolute -top-1 -right-1 bg-primary text-on-primary text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                                {getItemCount()}
                            </span>
                        )}
                    </button>

                    <div className="relative">
                        <button 
                            onClick={() => setShowShareMenu(!showShareMenu)}
                            className="w-11 h-11 min-w-[44px] min-h-[44px] bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-stone-800 shadow-sm transition-all active:scale-95"
                            aria-label="Share"
                        >
                            <Share2 className="w-5 h-5 text-stone-600" />
                        </button>
                        
                        {showShareMenu && (
                            <div className="absolute right-0 top-12 w-48 bg-white rounded-2xl shadow-xl border border-stone-100 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(window.location.href);
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors text-left text-sm font-bold text-stone-700"
                                >
                                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    {copied ? 'Copied!' : 'Copy Link'}
                                </button>
                                <button 
                                    onClick={() => {
                                        window.open(`https://wa.me/?text=${encodeURIComponent(`Check out this product on ArtisanX: ${window.location.href}`)}`, '_blank');
                                        setShowShareMenu(false);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors text-left text-sm font-bold text-stone-700"
                                >
                                    <svg className="w-4 h-4 text-green-500 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                    WhatsApp
                                </button>
                                {navigator.share && (
                                    <button 
                                        onClick={() => {
                                            navigator.share({
                                                title: displayTitle,
                                                text: `Check out ${displayTitle} on ArtisanX`,
                                                url: window.location.href
                                            });
                                            setShowShareMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors text-left text-sm font-bold text-stone-700"
                                    >
                                        <Share2 className="w-4 h-4 text-primary" />
                                        More Options
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <button 
                        onClick={() => toggleSavedProduct(product)} 
                        className="w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-stone-800 shadow-sm transition-all"
                    >
                        <Heart className={`w-5 h-5 ${isSaved ? 'fill-red-500 text-red-500' : 'text-stone-600'}`} />
                    </button>
                </div>
            </div>

            {/* Image Gallery */}
            <div className="w-full aspect-[4/5] bg-stone-200 relative overflow-hidden">
                {mainImages[currentImageIdx].image_url ? (
                    <img src={mainImages[currentImageIdx].image_url} alt={displayTitle} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-400">No Image</div>
                )}
                {mainImages.length > 1 && (
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                        {mainImages.map((_: any, idx: number) => (
                            <button 
                                key={idx} 
                                onClick={() => setCurrentImageIdx(idx)}
                                className={`w-2 h-2 rounded-full transition-all ${currentImageIdx === idx ? 'bg-white w-4' : 'bg-white/50'}`}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="px-6 py-6 -mt-6 relative bg-surface-container-lowest rounded-t-3xl text-on-surface">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h1 className="text-2xl font-bold text-stone-800">{displayTitle}</h1>
                        <span className="text-xs font-bold text-primary uppercase tracking-wide">{product.category}</span>
                    </div>
                    <div className="text-2xl font-bold text-primary">₹{product.price}</div>
                </div>

                {/* Enquiry Status Banner (Enquiry-First Purchase Rule) */}
                {isEnquiryPending && (
                    <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
                        <div className="flex items-center gap-2 font-bold text-sm mb-1">
                            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                            Your Enquiry is Pending with the Artisan
                        </div>
                        <p className="text-xs text-amber-800 leading-relaxed mb-2">
                            Your enquiry for {buyerEnquiry.quantity} unit(s) has been submitted. Please wait for the artisan's confirmation before proceeding with payment.
                        </p>
                        <button 
                            onClick={() => navigate(`/buyer/enquiry/${buyerEnquiry.id}`)}
                            className="text-xs font-bold text-amber-900 underline hover:text-amber-950"
                        >
                            View Enquiry Discussion →
                        </button>
                    </div>
                )}

                {isEnquiryRejected && (
                    <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900">
                        <div className="flex items-center gap-2 font-bold text-sm mb-1">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                            Your Enquiry Was Not Approved by the Artisan
                        </div>
                        <p className="text-xs text-red-800 leading-relaxed mb-2">
                            The artisan was unable to fulfil this custom requirement. You may submit a new enquiry with updated specifications.
                        </p>
                        <button 
                            onClick={handleEnquiry}
                            className="px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-red-700"
                        >
                            Send New Enquiry
                        </button>
                    </div>
                )}

                {isEnquiryConfirmed && (
                    <div className="mt-4 p-4 rounded-2xl bg-green-50 border border-green-200 text-green-900">
                        <div className="flex items-center gap-2 font-bold text-sm mb-1">
                            <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
                            Artisan Approved Your Enquiry!
                        </div>
                        <p className="text-xs text-green-800 leading-relaxed">
                            The artisan confirmed your order for {buyerEnquiry.quantity} unit(s). You can now proceed directly to payment!
                        </p>
                    </div>
                )}

                {!buyerEnquiry && (
                    <div className="mt-4 p-4 rounded-2xl bg-primary/5 border border-primary/20 text-stone-900">
                        <div className="flex items-center gap-2 font-bold text-sm mb-1 text-primary">
                            <Sparkles className="w-4 h-4 text-primary shrink-0" />
                            Enquiry Required Before Purchase
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed">
                            Every purchase on ArtisanX connects directly with the artisan. Send a purchase enquiry to confirm availability and proceed to payment.
                        </p>
                    </div>
                )}
                
                <p className="text-stone-600 mt-4 leading-relaxed whitespace-pre-wrap">{displayDescription}</p>
                
                <div className="grid grid-cols-2 gap-4 mt-6 border-y border-stone-200 py-6">
                    <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-stone-400" />
                        <div>
                            <div className="text-xs text-stone-500">{t('passport.moq', { defaultValue: 'MOQ' })}</div>
                            <div className="font-bold text-stone-800">{product.moq || 1} {t('cart.items', { defaultValue: 'units' })}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-stone-400" />
                        <div>
                            <div className="text-xs text-stone-500">{t('passport.lead_time', { defaultValue: 'Lead Time' })}</div>
                            <div className="font-bold text-stone-800">{product.lead_time_days || 0} {t('products.lead_time', { defaultValue: 'days' })}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 flex items-center justify-center rounded bg-stone-100 text-stone-500 text-xs font-bold">Qty</div>
                        <div>
                            <div className="text-xs text-stone-500">{t('passport.stock', { defaultValue: 'Available' })}</div>
                            <div className="font-bold text-stone-800">
                                {product.is_made_to_order ? t('products.made_to_order', { defaultValue: 'Made to Order' }) : `${product.stock_quantity || 0} ${t('cart.items', { defaultValue: 'units' })}`}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Purchase Action Card */}
                <div className="mt-6 p-4 rounded-2xl bg-surface border border-outline-variant space-y-3.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-bold text-stone-900 text-sm">Purchase Order</h4>
                            <p className="text-xs text-stone-500">
                                {isEnquiryConfirmed 
                                    ? `Approved for ${buyerEnquiry.quantity} unit(s)` 
                                    : isEnquiryPending 
                                    ? 'Enquiry pending confirmation' 
                                    : 'Select quantity & send enquiry'}
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="text-lg font-black text-primary">
                                ₹{product.price * (isEnquiryConfirmed ? (buyerEnquiry?.quantity || 1) : retailQty)}
                            </span>
                        </div>
                    </div>

                    {/* Quantity Selector & Action Button */}
                    <div className="flex items-center justify-between gap-3 pt-1">
                        {!isEnquiryConfirmed && !isEnquiryPending && (
                            <div className="flex items-center border border-stone-300 rounded-xl bg-white px-2 py-1 shadow-2xs">
                                <button 
                                    onClick={() => setRetailQty(Math.max(1, retailQty - 1))}
                                    className="p-1 rounded-lg hover:bg-stone-100 text-stone-600 disabled:opacity-30"
                                    disabled={retailQty <= 1}
                                    aria-label="Decrease quantity"
                                >
                                    <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-8 text-center text-sm font-bold text-stone-800">{retailQty}</span>
                                <button 
                                    onClick={() => setRetailQty(retailQty + 1)}
                                    className="p-1 rounded-lg hover:bg-stone-100 text-stone-600"
                                    aria-label="Increase quantity"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}

                        <div className="flex-1">
                            {isEnquiryConfirmed ? (
                                <button 
                                    onClick={() => handleBuyNow(buyerEnquiry?.quantity)}
                                    className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-on-primary rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-primary/20"
                                >
                                    <Zap className="w-4 h-4 fill-current" />
                                    <span>Proceed to Payment (₹{product.price * buyerEnquiry.quantity})</span>
                                </button>
                            ) : isEnquiryPending ? (
                                <button 
                                    onClick={() => navigate(`/buyer/enquiry/${buyerEnquiry.id}`)}
                                    className="w-full py-3 px-4 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                                >
                                    <Clock className="w-4 h-4 text-amber-700" />
                                    <span>Enquiry Pending • View Status</span>
                                </button>
                            ) : isEnquiryRejected ? (
                                <button 
                                    onClick={handleEnquiry}
                                    className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                                >
                                    <Mail className="w-4 h-4" />
                                    <span>Send New Enquiry</span>
                                </button>
                            ) : (
                                <button 
                                    onClick={handleEnquiry}
                                    className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-on-primary rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-primary/20"
                                >
                                    <Mail className="w-4 h-4" />
                                    <span>Send Enquiry to Artisan</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {(product.materials || product.dimensions || product.care_instructions) && (
                    <div className="mt-6 space-y-4">
                        <h3 className="font-bold text-stone-800 text-lg">{t('passport.product_details', { defaultValue: 'Product Details' })}</h3>
                        {product.materials && product.materials.list && product.materials.list.length > 0 && (
                            <div>
                                <div className="text-sm font-bold text-stone-700 mb-1">{t('passport.materials', { defaultValue: 'Materials' })}</div>
                                <div className="flex flex-wrap gap-2">
                                    {product.materials.list.map((m: any, i: number) => (
                                        <span key={i} className="px-3 py-1 bg-white border border-stone-200 rounded-full text-xs text-stone-600">{m.name}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {product.dimensions && (
                            <div>
                                <div className="text-sm font-bold text-stone-700">{t('product_guidance.size', { defaultValue: 'Dimensions' })}</div>
                                <div className="text-sm text-stone-600">{product.dimensions}</div>
                            </div>
                        )}
                        {product.care_instructions && (
                            <div>
                                <div className="text-sm font-bold text-stone-700">{t('passport.care', { defaultValue: 'Care Instructions' })}</div>
                                <div className="text-sm text-stone-600">{product.care_instructions}</div>
                            </div>
                        )}
                    </div>
                )}

                {artisan && (
                    <div className="mt-8 bg-surface border border-outline-variant rounded-3xl p-5 shadow-sm">
                        <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-green-600" /> {t('common.profile', { defaultValue: 'Artisan Profile' })}</h3>
                        <div 
                            className="flex gap-4 items-center mb-4 cursor-pointer hover:bg-stone-50 p-2 -mx-2 rounded-xl transition-colors"
                            onClick={() => navigate(`/buyer/artisan/${artisan.id}`)}
                        >
                            <div className="w-16 h-16 rounded-full bg-stone-200 overflow-hidden shrink-0 border border-stone-200">
                                {artisan.profile_photo_url ? (
                                    <img src={artisan.profile_photo_url} alt={artisan.artisan_name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs text-center leading-tight">{t('common.no_image', { defaultValue: 'No Photo' })}</div>
                                )}
                            </div>
                            <div>
                                <h4 className="font-bold text-stone-800">{artisan.artisan_name}</h4>
                                <div className="text-sm text-stone-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {artisan.location || 'Craft Cluster'}</div>
                                <div className="text-xs text-on-secondary-container font-bold mt-1 bg-secondary-container px-2 py-0.5 rounded w-max">{artisan.craft_type || t('auth.artisan')}</div>
                            </div>
                        </div>
                        {artisan.craft_story && (
                            <p className="text-sm text-stone-600 leading-relaxed italic border-l-2 border-stone-200 pl-3">"{artisan.craft_story}"</p>
                        )}
                    </div>
                )}

                {passport && (
                    <div className="mt-8">
                        <h3 className="font-bold text-stone-800 text-lg mb-4">{t('passport.authenticity', { defaultValue: 'Product Passport' })}</h3>
                        <ProductPassport 
                            passportData={passport.passport_data} 
                            qrCodeUrl={passport.qr_code_url} 
                            shareableUrl={passport.shareable_url} 
                            onEnquire={handleEnquiry}
                        />
                    </div>
                )}

                {/* Customer Reviews Section */}
                <div className="mt-8 bg-surface border border-outline-variant rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg sm:text-xl font-bold text-on-surface flex items-center gap-2">
                                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                                <span>Customer Reviews</span>
                            </h3>
                            <p className="text-xs text-stone-500 mt-0.5">
                                Verified buyer reviews from the past 30 days
                            </p>
                        </div>
                        {reviewsData.total_reviews > 0 && (
                            <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 shadow-2xs">
                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                <span className="font-extrabold text-amber-900 text-sm">{reviewsData.aggregates?.overall || 5.0}</span>
                                <span className="text-xs text-amber-700">({reviewsData.total_reviews})</span>
                            </div>
                        )}
                    </div>

                    {/* Breakdown cards if reviews exist */}
                    {reviewsData.total_reviews > 0 && (
                        <div className="grid grid-cols-3 gap-2 py-3 px-3 bg-stone-50 rounded-2xl border border-stone-200/70 text-center text-xs">
                            <div>
                                <span className="text-stone-500 block text-[10px] uppercase font-bold">Quality</span>
                                <span className="font-bold text-stone-800 flex items-center justify-center gap-1 mt-0.5">
                                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                    {reviewsData.aggregates?.quality || reviewsData.aggregates?.overall}
                                </span>
                            </div>
                            <div className="border-x border-stone-200">
                                <span className="text-stone-500 block text-[10px] uppercase font-bold">Communication</span>
                                <span className="font-bold text-stone-800 flex items-center justify-center gap-1 mt-0.5">
                                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                    {reviewsData.aggregates?.communication || reviewsData.aggregates?.overall}
                                </span>
                            </div>
                            <div>
                                <span className="text-stone-500 block text-[10px] uppercase font-bold">Timeliness</span>
                                <span className="font-bold text-stone-800 flex items-center justify-center gap-1 mt-0.5">
                                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                    {reviewsData.aggregates?.timeliness || reviewsData.aggregates?.overall}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Review List */}
                    <div className="space-y-3 pt-1">
                        {reviewsData.reviews && reviewsData.reviews.length > 0 ? (
                            reviewsData.reviews.map((rev: any) => (
                                <div key={rev.id} className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                                {(rev.buyer?.display_name || 'B').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <span className="font-bold text-stone-800 text-xs block leading-tight">
                                                    {rev.buyer?.display_name || 'Verified Buyer'}
                                                </span>
                                                <span className="inline-flex items-center gap-1 text-[10px] text-green-700 font-semibold">
                                                    <CheckCircle2 className="w-2.5 h-2.5 text-green-600" /> Verified Purchase
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star 
                                                    key={s} 
                                                    className={`w-3.5 h-3.5 ${s <= (rev.rating_overall || 5) ? 'text-amber-400 fill-amber-400' : 'text-stone-200'}`} 
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    {rev.review_text && (
                                        <p className="text-xs sm:text-sm text-stone-700 leading-relaxed pl-1">
                                            "{rev.review_text}"
                                        </p>
                                    )}
                                    <div className="text-[10px] text-stone-400 pl-1">
                                        {rev.created_at ? new Date(rev.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recent'}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-6 px-4 bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-xs text-stone-500 space-y-1">
                                <p className="font-semibold text-stone-700">No reviews in the past month</p>
                                <p>Be among the first to purchase and review this handcrafted craft!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 mobile-shell-width mx-auto p-3.5 bg-surface/95 backdrop-blur-md border-t border-outline-variant flex items-center gap-2.5 z-40 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
                {isEnquiryConfirmed ? (
                    <button 
                        data-help="buy-now"
                        onClick={() => handleBuyNow(buyerEnquiry?.quantity)}
                        className="w-full min-h-[48px] py-2.5 px-4 bg-primary hover:bg-primary/90 text-on-primary rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-primary/20"
                    >
                        <Zap className="w-4 h-4 fill-current" />
                        <span className="text-sm font-bold">
                            Proceed to Payment • ₹{product.price * buyerEnquiry.quantity} ({buyerEnquiry.quantity} units)
                        </span>
                    </button>
                ) : isEnquiryPending ? (
                    <button 
                        onClick={() => navigate(`/buyer/enquiry/${buyerEnquiry.id}`)}
                        className="w-full min-h-[48px] py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-bold">Enquiry Pending • View Status</span>
                    </button>
                ) : isEnquiryRejected ? (
                    <button 
                        onClick={handleEnquiry}
                        className="w-full min-h-[48px] py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                        <Mail className="w-4 h-4" />
                        <span className="text-sm font-bold">Send New Enquiry</span>
                    </button>
                ) : (
                    <button 
                        data-help="buy-now"
                        onClick={handleEnquiry}
                        className="w-full min-h-[48px] py-2.5 px-4 bg-primary hover:bg-primary/90 text-on-primary rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-primary/20"
                    >
                        <Mail className="w-4 h-4" />
                        <span className="text-sm font-bold">Send Enquiry to Artisan</span>
                    </button>
                )}
            </div>

            {showEnquiryForm && (
                <EnquiryForm 
                    productId={product.id} 
                    moq={product.moq || 1} 
                    onClose={() => {
                        setShowEnquiryForm(false);
                        fetchBuyerEnquiry();
                    }} 
                />
            )}

            {/* Payment Status Popup Modal (Displays right on this Product Page after checkout) */}
            {showPaymentPopup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-md p-6 text-center relative border border-outline-variant animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
                        <button 
                            onClick={closePaymentPopup} 
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-800 transition-colors"
                            aria-label="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {paymentStatusLoading ? (
                            <div className="py-8 flex flex-col items-center gap-3">
                                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <h3 className="font-bold text-stone-800 text-base">
                                    {pollCount > 0 ? `Verifying with bank (${pollCount}/6)...` : 'Verifying payment with backend...'}
                                </h3>
                                <p className="text-xs text-stone-500 font-mono">Order ID: {orderIdParam}</p>
                                <p className="text-xs text-stone-400">Please do not close this window</p>
                            </div>
                        ) : paymentStatusData?.payment_status === 'paid' ? (
                            <div>
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-3 shadow-inner">
                                    <CheckCircle2 className="w-10 h-10" />
                                </div>

                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-black tracking-wide uppercase mb-1 border border-green-200">
                                    <ShieldCheck className="w-3.5 h-3.5 text-green-600" /> Payment Verified
                                </span>
                                
                                <h2 className="text-xl font-extrabold text-stone-900 mb-1">Payment Successful</h2>
                                <p className="text-xs text-stone-600 mb-4">
                                    Thank you! Your payment for <b>{paymentStatusData?.product_title || displayTitle}</b> has been verified by the backend.
                                </p>

                                <div className="bg-stone-50 rounded-2xl p-4 mb-5 text-left text-xs space-y-2 border border-stone-100">
                                    <div className="flex justify-between items-center">
                                        <span className="text-stone-500 font-medium">Product:</span>
                                        <span className="font-bold text-stone-800 text-right max-w-[200px] truncate">{paymentStatusData?.product_title || displayTitle}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-stone-500 font-medium">Order ID:</span>
                                        <span className="font-bold text-primary font-mono">{paymentStatusData?.display_id || paymentStatusData?.order_id || orderIdParam}</span>
                                    </div>
                                    {paymentStatusData?.gateway_payment_id && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-stone-500 font-medium">Cashfree Ref ID:</span>
                                            <span className="font-mono text-stone-700 text-[11px] max-w-[190px] truncate">{paymentStatusData.gateway_payment_id}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center">
                                        <span className="text-stone-500 font-medium">Amount Paid:</span>
                                        <span className="font-extrabold text-stone-900 text-sm">₹{(paymentStatusData?.amount || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-stone-500 font-medium">Payment Date/Time:</span>
                                        <span className="text-stone-700 font-medium">
                                            {paymentStatusData?.paid_at ? new Date(paymentStatusData.paid_at).toLocaleString() : new Date().toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-stone-500 font-medium">Payment Method:</span>
                                        <span className="font-bold text-stone-800">{paymentStatusData?.payment_method?.toUpperCase() || 'UPI'}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-1 border-t border-stone-200/60">
                                        <span className="text-stone-500 font-medium">Verification:</span>
                                        <span className="font-bold text-green-700 flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-2.5">
                                    <button 
                                        onClick={() => setShowInvoice(true)}
                                        className="w-full py-3 bg-primary hover:bg-primary/90 text-on-primary font-bold rounded-2xl shadow-md flex items-center justify-center gap-2 transition-transform active:scale-[0.98] text-xs sm:text-sm"
                                    >
                                        <FileText className="w-4 h-4" /> View Invoice
                                    </button>

                                    <button 
                                        onClick={closePaymentPopup}
                                        className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-2xl transition-colors text-xs flex items-center justify-center gap-1.5"
                                    >
                                        Continue
                                    </button>

                                    <button 
                                        onClick={() => navigate(paymentStatusData.order_id ? `/buyer/orders/${paymentStatusData.order_id}` : '/buyer/orders')}
                                        className="w-full py-1.5 text-stone-500 hover:text-stone-800 text-[11px] font-medium flex items-center justify-center gap-1"
                                    >
                                        <span>View in My Orders</span>
                                        <ArrowRight className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ) : (paymentStatusData?.payment_status === 'payment_pending' || paymentStatusData?.payment_status === 'payment_initiated') ? (
                            <div>
                                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mx-auto mb-3">
                                    <Clock className="w-10 h-10 animate-pulse" />
                                </div>
                                <span className="inline-block px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold mb-1 border border-amber-200">
                                    ⏳ Payment Pending
                                </span>
                                <h2 className="text-xl font-bold text-stone-800 mb-1">Payment Pending</h2>
                                <p className="text-xs text-stone-600 mb-4 leading-relaxed">
                                    Your payment is being processed. We will update your order once Cashfree confirms the payment.
                                </p>

                                <div className="bg-stone-50 rounded-2xl p-4 mb-5 text-left text-xs space-y-2 border border-stone-100">
                                    <div className="flex justify-between items-center">
                                        <span className="text-stone-500 font-medium">Product:</span>
                                        <span className="font-bold text-stone-800 text-right max-w-[200px] truncate">{paymentStatusData?.product_title || displayTitle}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-stone-500 font-medium">Order ID:</span>
                                        <span className="font-bold text-primary font-mono">{paymentStatusData?.display_id || paymentStatusData?.order_id || orderIdParam}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-stone-500 font-medium">Amount:</span>
                                        <span className="font-bold text-stone-800">
                                            ₹{(paymentStatusData?.amount || (product?.price * retailQty) || 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <button 
                                        onClick={() => checkPaymentStatus(orderIdParam)}
                                        className="w-full py-3 bg-primary text-on-primary font-bold rounded-2xl shadow-md flex items-center justify-center gap-2 text-xs transition-transform active:scale-[0.98]"
                                    >
                                        <RefreshCw className="w-4 h-4" /> Check Status
                                    </button>
                                    <button 
                                        onClick={closePaymentPopup}
                                        className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-2xl text-xs transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto mb-3">
                                    <XCircle className="w-10 h-10" />
                                </div>
                                <span className="inline-block px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold mb-1 border border-red-200">
                                    ✕ Payment Failed
                                </span>
                                <h2 className="text-xl font-bold text-stone-800 mb-1">Payment Failed</h2>
                                <p className="text-xs text-stone-600 mb-4 leading-relaxed">
                                    {paymentStatusError || 'Your payment could not be completed.'}
                                </p>

                                <div className="bg-stone-50 rounded-2xl p-4 mb-5 text-left text-xs space-y-2 border border-stone-100">
                                    <div className="flex justify-between items-center">
                                        <span className="text-stone-500 font-medium">Product:</span>
                                        <span className="font-bold text-stone-800 text-right max-w-[200px] truncate">{paymentStatusData?.product_title || displayTitle}</span>
                                    </div>
                                    {(paymentStatusData?.display_id || orderIdParam) && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-stone-500 font-medium">Order ID:</span>
                                            <span className="font-bold text-primary font-mono">{paymentStatusData?.display_id || orderIdParam}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center">
                                        <span className="text-stone-500 font-medium">Amount:</span>
                                        <span className="font-bold text-stone-800">
                                            ₹{(paymentStatusData?.amount || (product?.price * retailQty) || 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <button 
                                        onClick={() => {
                                            closePaymentPopup();
                                            handleBuyNow(retailQty);
                                        }}
                                        className="w-full py-3 bg-primary text-on-primary font-bold rounded-2xl shadow-md flex items-center justify-center gap-2 text-xs transition-transform active:scale-[0.98]"
                                    >
                                        <Zap className="w-4 h-4 fill-current" /> Try Again
                                    </button>
                                    <button 
                                        onClick={closePaymentPopup}
                                        className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-2xl text-xs transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Invoice Modal */}
            <InvoiceModal
                isOpen={showInvoice}
                onClose={() => setShowInvoice(false)}
                invoice={invoiceData || {
                    invoice_number: paymentStatusData?.invoice_id || `INV-${paymentStatusData?.display_id}`,
                    order_id: paymentStatusData?.order_id,
                    display_id: paymentStatusData?.display_id,
                    amount: paymentStatusData?.amount,
                    total: paymentStatusData?.amount,
                    payment_method: paymentStatusData?.payment_method || 'UPI',
                    payment_status: paymentStatusData?.payment_status?.toUpperCase() || 'PAID',
                    gateway_payment_id: paymentStatusData?.gateway_payment_id,
                    created_at: paymentStatusData?.paid_at
                }}
            />
        </div>
    );
}
