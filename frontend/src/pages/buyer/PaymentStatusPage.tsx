import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle, ArrowRight, FileText, ShoppingBag, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../lib/api';
import InvoiceModal from '../../components/buyer/InvoiceModal';

export default function PaymentStatusPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('order_id') || searchParams.get('cf_order_id') || '';

    const [loading, setLoading] = useState(true);
    const [statusData, setStatusData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [showInvoice, setShowInvoice] = useState(false);
    const [invoiceData, setInvoiceData] = useState<any>(null);

    const checkStatus = async () => {
        if (!orderId) {
            setError('No order ID provided');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/payments/cashfree/status/${orderId}`);
            setStatusData(res.data);

            // If paid, also pre-fetch invoice data
            if (res.data.payment_status === 'paid') {
                try {
                    const invRes = await api.get(`/payments/invoice/${orderId}`);
                    setInvoiceData(invRes.data);
                } catch (invErr) {
                    console.log('Invoice fetch deferred', invErr);
                }
            }
        } catch (err: any) {
            console.error('Failed to verify payment status', err);
            setError(err.response?.data?.detail || 'Unable to verify payment status. Please check your orders.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkStatus();
    }, [orderId]);

    const isPaid = statusData?.payment_status === 'paid';
    const isPending = statusData?.payment_status === 'payment_pending' || statusData?.payment_status === 'payment_initiated';

    return (
        <div className="w-full min-h-screen bg-surface-container-lowest p-4 sm:p-6 flex flex-col justify-center items-center text-center">
            {loading ? (
                <div className="flex flex-col items-center gap-4 animate-in fade-in">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <h2 className="text-xl font-bold text-stone-800">{t('payment.verifying_desc')}</h2>
                    <p className="text-sm text-stone-500 max-w-xs font-mono">Order: {orderId}</p>
                </div>
            ) : error ? (
                <div className="max-w-md w-full bg-surface border border-outline-variant rounded-3xl p-6 shadow-sm space-y-4 animate-in zoom-in-95">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto">
                        <XCircle className="w-10 h-10" />
                    </div>
                    <h2 className="text-xl font-bold text-stone-800">{t('payment.payment_failed')}</h2>
                    <p className="text-sm text-stone-600">{error}</p>
                    <div className="flex flex-col gap-2 pt-2">
                        <button
                            onClick={checkStatus}
                            className="w-full py-3 bg-primary text-on-primary rounded-full font-bold flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" /> {t('payment.check_status')}
                        </button>
                        <button
                            onClick={() => navigate('/buyer/orders')}
                            className="w-full py-2.5 text-stone-600 font-bold hover:text-stone-900"
                        >
                            {t('payment.view_order')}
                        </button>
                    </div>
                </div>
            ) : isPaid ? (
                <div className="max-w-md w-full animate-in zoom-in-95 space-y-6">
                    {/* Success Icon */}
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto shadow-md">
                        <CheckCircle2 className="w-12 h-12" />
                    </div>

                    <div>
                        <h1 className="text-2xl font-black text-stone-800 tracking-tight">{t('payment.payment_successful')}</h1>
                        <p className="text-sm text-green-700 font-bold mt-1">✓ {t('payment.payment_received')}</p>
                        <p className="text-xs text-stone-500 mt-2 max-w-xs mx-auto">
                            {t('payment.success_desc')}
                        </p>
                    </div>

                    {/* Verified Order Receipt Card */}
                    <div className="bg-surface border border-outline-variant rounded-2xl p-5 text-left space-y-3 shadow-sm">
                        <div className="flex justify-between items-center text-xs sm:text-sm border-b border-stone-100 pb-2.5">
                            <span className="text-stone-500 font-medium">{t('payment.order_id')}</span>
                            <span className="font-bold text-primary font-mono text-sm">{statusData.display_id || statusData.order_id}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs sm:text-sm border-b border-stone-100 pb-2.5">
                            <span className="text-stone-500 font-medium">{t('payment.amount_paid')}</span>
                            <span className="font-black text-stone-800 text-lg">₹{(statusData.amount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs sm:text-sm border-b border-stone-100 pb-2.5">
                            <span className="text-stone-500 font-medium">{t('payment.payment_method')}</span>
                            <span className="font-bold text-stone-700 uppercase bg-stone-100 px-2 py-0.5 rounded text-xs">{statusData.payment_method || 'UPI'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs sm:text-sm">
                            <span className="text-stone-500 font-medium">{t('payment.payment_status')}</span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-green-100 text-green-800 border border-green-200">
                                {t('payment.paid')}
                            </span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => navigate(statusData.order_id ? `/buyer/orders/${statusData.order_id}` : '/buyer/orders')}
                            className="w-full py-3.5 bg-primary text-on-primary font-bold rounded-full shadow-lg hover:bg-primary/90 flex items-center justify-center gap-2 transition-transform active:scale-95"
                        >
                            {t('payment.view_order')} <ArrowRight className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => setShowInvoice(true)}
                            className="w-full py-3.5 bg-surface border border-stone-300 text-stone-800 font-bold rounded-full hover:bg-stone-50 flex items-center justify-center gap-2 transition-colors shadow-sm"
                        >
                            <FileText className="w-4 h-4 text-primary" /> {t('payment.view_invoice')}
                        </button>

                        <button
                            onClick={() => navigate('/buyer/catalogue')}
                            className="w-full py-2.5 text-stone-500 font-bold hover:text-stone-800 transition-colors text-xs"
                        >
                            <ShoppingBag className="w-3.5 h-3.5 inline mr-1" /> Continue Shopping
                        </button>
                    </div>
                </div>
            ) : isPending ? (
                <div className="max-w-md w-full bg-surface border border-outline-variant rounded-3xl p-6 shadow-sm space-y-4 animate-in zoom-in-95">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mx-auto">
                        <Clock className="w-10 h-10 animate-pulse" />
                    </div>
                    <h2 className="text-xl font-bold text-stone-800">{t('payment.payment_pending')}</h2>
                    <p className="text-sm text-stone-600">{t('payment.verifying_desc')}</p>
                    <div className="flex flex-col gap-2 pt-4">
                        <button
                            onClick={checkStatus}
                            className="w-full py-3 bg-primary text-on-primary rounded-full font-bold flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" /> {t('payment.check_status')}
                        </button>
                        <button
                            onClick={() => navigate('/buyer/orders')}
                            className="w-full py-2.5 text-stone-600 font-bold hover:text-stone-900"
                        >
                            {t('payment.view_order')}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="max-w-md w-full bg-surface border border-outline-variant rounded-3xl p-6 shadow-sm space-y-4 animate-in zoom-in-95">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto">
                        <XCircle className="w-10 h-10" />
                    </div>
                    <h2 className="text-xl font-bold text-stone-800">{t('payment.payment_failed')}</h2>
                    <p className="text-sm text-stone-600">{t('payment.failed_desc')}</p>
                    <div className="flex flex-col gap-2 pt-4">
                        <button
                            onClick={() => navigate('/buyer/cart')}
                            className="w-full py-3 bg-primary text-on-primary rounded-full font-bold flex items-center justify-center gap-2"
                        >
                            {t('payment.retry_payment')}
                        </button>
                        <button
                            onClick={() => navigate('/buyer/catalogue')}
                            className="w-full py-2.5 text-stone-600 font-bold hover:text-stone-900"
                        >
                            Back to Marketplace
                        </button>
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
