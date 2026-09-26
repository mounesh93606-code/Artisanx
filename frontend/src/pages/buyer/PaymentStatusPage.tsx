import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle, ArrowRight, FileText, ShoppingBag, RefreshCw, ArrowLeft, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../lib/api';
import InvoiceModal from '../../components/buyer/InvoiceModal';

export default function PaymentStatusPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('order_id') || searchParams.get('cf_order_id') || '';
    const paramProductId = searchParams.get('product_id') || '';

    const [loading, setLoading] = useState(true);
    const [statusData, setStatusData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [showInvoice, setShowInvoice] = useState(false);
    const [invoiceData, setInvoiceData] = useState<any>(null);
    const [showSuccessPopup, setShowSuccessPopup] = useState(true);

    // Auto-polling state
    const [pollCount, setPollCount] = useState(0);
    const maxPolls = 8;
    const pollTimeoutRef = useRef<any>(null);

    const checkStatus = async (isRetry = false) => {
        if (!orderId) {
            setError('No order ID provided');
            setLoading(false);
            return;
        }

        if (!isRetry) {
            setLoading(true);
        }
        setError(null);

        try {
            const res = await api.get(`/payments/cashfree/status/${orderId}`);
            const data = res.data;
            setStatusData(data);

            // Automatically redirect to the product details page where the payment modal opens
            const targetProdId = paramProductId || data.product_id;
            if (targetProdId) {
                navigate(`/buyer/product/${targetProdId}?order_id=${orderId}`, { replace: true });
                return;
            }

            if (data.payment_status === 'paid') {
                setLoading(false);
                setShowSuccessPopup(true);
                // Pre-fetch invoice data
                try {
                    const invRes = await api.get(`/payments/invoice/${orderId}`);
                    setInvoiceData(invRes.data);
                } catch (invErr) {
                    console.log('Invoice fetch deferred', invErr);
                }
                return;
            }

            // If still pending or initiated, poll if below maxPolls
            if (data.payment_status === 'payment_pending' || data.payment_status === 'payment_initiated') {
                setPollCount(prev => {
                    const next = prev + 1;
                    if (next < maxPolls) {
                        pollTimeoutRef.current = setTimeout(() => {
                            checkStatus(true);
                        }, 1500);
                    } else {
                        setLoading(false);
                    }
                    return next;
                });
            } else {
                setLoading(false);
            }
        } catch (err: any) {
            console.error('Failed to verify payment status', err);
            // On network hiccup, retry if within poll limit
            setPollCount(prev => {
                const next = prev + 1;
                if (next < maxPolls) {
                    pollTimeoutRef.current = setTimeout(() => {
                        checkStatus(true);
                    }, 2000);
                } else {
                    setLoading(false);
                    setError(err.response?.data?.detail || 'Unable to verify payment status. Please check your orders.');
                }
                return next;
            });
        }
    };

    useEffect(() => {
        checkStatus();
        return () => {
            if (pollTimeoutRef.current) {
                clearTimeout(pollTimeoutRef.current);
            }
        };
    }, [orderId]);

    const isPaid = statusData?.payment_status === 'paid';
    const isPending = statusData?.payment_status === 'payment_pending' || statusData?.payment_status === 'payment_initiated';
    const targetProductId = paramProductId || statusData?.product_id || '';

    const handleReturnToProduct = () => {
        if (targetProductId) {
            navigate(`/buyer/product/${targetProductId}`);
        } else {
            navigate('/buyer/catalogue');
        }
    };

    return (
        <div className="w-full min-h-screen bg-surface-container-lowest p-4 sm:p-6 flex flex-col justify-center items-center text-center relative">
            {loading ? (
                <div className="flex flex-col items-center gap-4 animate-in fade-in max-w-sm">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <h2 className="text-xl font-bold text-stone-800">
                        {pollCount > 0 ? 'Confirming payment with bank...' : t('payment.verifying_desc', { defaultValue: 'Verifying payment status...' })}
                    </h2>
                    <p className="text-xs text-stone-500 max-w-xs font-mono">Order: {orderId}</p>
                    {pollCount > 0 && (
                        <p className="text-xs text-stone-400">Verifying confirmation ({pollCount}/{maxPolls})</p>
                    )}
                </div>
            ) : error ? (
                <div className="max-w-md w-full bg-surface border border-outline-variant rounded-3xl p-6 shadow-sm space-y-4 animate-in zoom-in-95">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto">
                        <XCircle className="w-10 h-10" />
                    </div>
                    <h2 className="text-xl font-bold text-stone-800">{t('payment.payment_failed', { defaultValue: 'Payment Verification Failed' })}</h2>
                    <p className="text-sm text-stone-600">{error}</p>
                    <div className="flex flex-col gap-2 pt-2">
                        <button
                            onClick={() => { setPollCount(0); checkStatus(); }}
                            className="w-full py-3 bg-primary text-on-primary rounded-full font-bold flex items-center justify-center gap-2 shadow-md hover:bg-primary/90 transition-transform active:scale-95"
                        >
                            <RefreshCw className="w-4 h-4" /> {t('payment.check_status', { defaultValue: 'Check Status Again' })}
                        </button>
                        <button
                            onClick={handleReturnToProduct}
                            className="w-full py-2.5 text-stone-600 font-bold hover:text-stone-900"
                        >
                            Return to Product Page
                        </button>
                    </div>
                </div>
            ) : isPaid ? (
                <div className="max-w-md w-full animate-in zoom-in-95 space-y-5">
                    {/* Success Icon */}
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto shadow-md">
                        <CheckCircle2 className="w-12 h-12" />
                    </div>

                    <div>
                        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-bold mb-2">
                            <Sparkles className="w-3.5 h-3.5" /> Order Confirmed
                        </div>
                        <h1 className="text-2xl font-black text-stone-800 tracking-tight">
                            {t('payment.payment_successful', { defaultValue: 'Payment Confirmation' })}
                        </h1>
                        <p className="text-sm text-green-700 font-bold mt-1">
                            ✓ {t('payment.payment_received', { defaultValue: 'Payment received successfully' })}
                        </p>
                        <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
                            {t('payment.success_desc', { defaultValue: 'Your order is confirmed and the artisan has been notified to begin preparing your craft.' })}
                        </p>
                    </div>

                    {/* Verified Order Receipt Card */}
                    <div className="bg-surface border border-outline-variant rounded-2xl p-5 text-left space-y-3 shadow-sm">
                        <div className="flex justify-between items-center text-xs sm:text-sm border-b border-stone-100 pb-2.5">
                            <span className="text-stone-500 font-medium">{t('payment.order_id', { defaultValue: 'Order ID' })}</span>
                            <span className="font-bold text-primary font-mono text-sm">{statusData.display_id || statusData.order_id}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs sm:text-sm border-b border-stone-100 pb-2.5">
                            <span className="text-stone-500 font-medium">{t('payment.amount_paid', { defaultValue: 'Amount Paid' })}</span>
                            <span className="font-black text-stone-800 text-lg">₹{(statusData.amount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs sm:text-sm border-b border-stone-100 pb-2.5">
                            <span className="text-stone-500 font-medium">{t('payment.payment_method', { defaultValue: 'Payment Method' })}</span>
                            <span className="font-bold text-stone-700 uppercase bg-stone-100 px-2 py-0.5 rounded text-xs">{statusData.payment_method || 'UPI'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs sm:text-sm">
                            <span className="text-stone-500 font-medium">{t('payment.payment_status', { defaultValue: 'Status' })}</span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-green-100 text-green-800 border border-green-200">
                                {t('payment.paid', { defaultValue: 'PAID' })}
                            </span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2.5 pt-1">
                        {/* Primary Return to Product Page button */}
                        <button
                            onClick={handleReturnToProduct}
                            className="w-full py-3.5 bg-primary text-on-primary hover:bg-primary/90 shadow-lg font-bold rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-[0.98] text-sm"
                        >
                            <ArrowLeft className="w-4 h-4" /> Return to Product Page
                        </button>

                        {/* View Order Details button */}
                        <button
                            onClick={() => navigate(statusData.order_id ? `/buyer/orders/${statusData.order_id}` : '/buyer/orders')}
                            className="w-full py-3 bg-surface border border-stone-300 text-stone-800 font-bold rounded-2xl hover:bg-stone-50 flex items-center justify-center gap-2 transition-colors shadow-2xs text-sm"
                        >
                            {t('payment.view_order', { defaultValue: 'View Order Details' })} <ArrowRight className="w-4 h-4" />
                        </button>

                        {/* Download Invoice button */}
                        <button
                            onClick={() => setShowInvoice(true)}
                            className="w-full py-2.5 text-primary hover:text-primary/80 font-bold flex items-center justify-center gap-1.5 transition-colors text-xs"
                        >
                            <FileText className="w-4 h-4" /> {t('payment.view_invoice', { defaultValue: 'Download Tax Invoice' })}
                        </button>

                        <button
                            onClick={() => navigate('/buyer/catalogue')}
                            className="w-full py-2 text-stone-500 font-medium hover:text-stone-800 transition-colors text-xs"
                        >
                            <ShoppingBag className="w-3.5 h-3.5 inline mr-1" /> Continue Marketplace Browsing
                        </button>
                    </div>
                </div>
            ) : isPending ? (
                <div className="max-w-md w-full bg-surface border border-outline-variant rounded-3xl p-6 shadow-sm space-y-4 animate-in zoom-in-95">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mx-auto">
                        <Clock className="w-10 h-10 animate-pulse" />
                    </div>
                    <h2 className="text-xl font-bold text-stone-800">{t('payment.payment_pending', { defaultValue: 'Payment Processing' })}</h2>
                    <p className="text-sm text-stone-600">
                        {t('payment.verifying_desc', { defaultValue: 'Your payment is being confirmed with the bank. If you completed the payment, it will update shortly.' })}
                    </p>
                    <div className="flex flex-col gap-2 pt-4">
                        <button
                            onClick={() => { setPollCount(0); checkStatus(); }}
                            className="w-full py-3 bg-primary text-on-primary rounded-full font-bold flex items-center justify-center gap-2 shadow-md hover:bg-primary/90 transition-transform active:scale-95"
                        >
                            <RefreshCw className="w-4 h-4" /> {t('payment.check_status', { defaultValue: 'Check Status' })}
                        </button>
                        <button
                            onClick={handleReturnToProduct}
                            className="w-full py-2.5 text-stone-600 font-bold hover:text-stone-900"
                        >
                            Return to Product Page
                        </button>
                    </div>
                </div>
            ) : (
                <div className="max-w-md w-full bg-surface border border-outline-variant rounded-3xl p-6 shadow-sm space-y-4 animate-in zoom-in-95">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto">
                        <XCircle className="w-10 h-10" />
                    </div>
                    <h2 className="text-xl font-bold text-stone-800">{t('payment.payment_failed', { defaultValue: 'Payment Incomplete' })}</h2>
                    <p className="text-sm text-stone-600">{t('payment.failed_desc', { defaultValue: 'We could not complete your transaction. Please retry or choose another payment method.' })}</p>
                    <div className="flex flex-col gap-2 pt-4">
                        <button
                            onClick={() => navigate('/buyer/cart')}
                            className="w-full py-3 bg-primary text-on-primary rounded-full font-bold flex items-center justify-center gap-2 shadow-md hover:bg-primary/90 transition-transform active:scale-95"
                        >
                            {t('payment.retry_payment', { defaultValue: 'Retry Payment' })}
                        </button>
                        <button
                            onClick={handleReturnToProduct}
                            className="w-full py-2.5 text-stone-600 font-bold hover:text-stone-900"
                        >
                            Return to Product Page
                        </button>
                    </div>
                </div>
            )}

            {/* Payment Success Popup Modal (Displays upon verified payment completion) */}
            {isPaid && showSuccessPopup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center relative border border-outline-variant animate-in zoom-in-95">
                        <button 
                            onClick={() => setShowSuccessPopup(false)} 
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-800"
                            aria-label="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-3 shadow-inner">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>

                        <span className="inline-block px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-black tracking-wide uppercase mb-1">
                            Payment Confirmed
                        </span>
                        
                        <h2 className="text-xl font-extrabold text-stone-900 mb-1">Order Placed Successfully!</h2>
                        <p className="text-xs text-stone-500 mb-4">Your payment of ₹{(statusData?.amount || 0).toLocaleString()} was received.</p>

                        <div className="bg-stone-50 rounded-2xl p-3.5 mb-5 text-left text-xs space-y-1.5 border border-stone-100">
                            <div className="flex justify-between">
                                <span className="text-stone-500">Order ID:</span>
                                <span className="font-bold text-primary font-mono">{statusData?.display_id || statusData?.order_id}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-stone-500">Status:</span>
                                <span className="font-bold text-green-700">PAID & CONFIRMED</span>
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <button 
                                onClick={handleReturnToProduct}
                                className="w-full py-3.5 bg-primary hover:bg-primary/90 text-on-primary font-bold rounded-2xl shadow-md flex items-center justify-center gap-2 transition-transform active:scale-[0.98] text-sm"
                            >
                                <ArrowLeft className="w-4 h-4" /> Return to Product Page
                            </button>
                            <button 
                                onClick={() => setShowSuccessPopup(false)}
                                className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-2xl transition-colors text-xs"
                            >
                                View Payment Confirmation Card
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Invoice Modal */}
            <InvoiceModal
                isOpen={showInvoice}
                onClose={() => setShowInvoice(false)}
                invoice={invoiceData || {
                    invoice_number: statusData?.invoice_id || `INV-${statusData?.display_id}`,
                    order_id: statusData?.order_id,
                    display_id: statusData?.display_id,
                    amount: statusData?.amount,
                    total: statusData?.amount,
                    payment_method: statusData?.payment_method || 'UPI',
                    payment_status: statusData?.payment_status?.toUpperCase() || 'PAID',
                    gateway_payment_id: statusData?.gateway_payment_id,
                    created_at: statusData?.paid_at
                }}
            />
        </div>
    );
}
