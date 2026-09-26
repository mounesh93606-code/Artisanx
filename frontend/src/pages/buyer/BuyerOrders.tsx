import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCcw, FileDown, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { isOrderPaid, downloadOrderInvoice } from '../../lib/invoiceDownload';

export default function BuyerOrders() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    useEffect(() => {
        async function fetchOrders() {
            try {
                const res = await api.get('/orders/buyer');
                setOrders(res.data.orders || []);
            } catch (err) {
                console.error('Failed to fetch orders:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchOrders();
    }, [token]);

    const handleDownloadInvoice = async (e: React.MouseEvent, order: any) => {
        e.stopPropagation();
        setDownloadingId(order.id);
        try {
            await downloadOrderInvoice(order, order.display_id);
        } catch (err: any) {
            console.error('Failed to download invoice:', err);
            alert(err?.message || 'Failed to download invoice PDF. Please try again.');
        } finally {
            setDownloadingId(null);
        }
    };

    const tabs = [
        { id: 'All', label: t('common.all', { defaultValue: 'All' }) },
        { id: 'Active', label: t('order_status.in_production', { defaultValue: 'Active' }) },
        { id: 'Delivered', label: t('order_status.delivered', { defaultValue: 'Delivered' }) },
        { id: 'Cancelled', label: t('order_status.cancelled', { defaultValue: 'Cancelled' }) },
        { id: 'Returned', label: t('order_status.disputed', { defaultValue: 'Returned' }) }
    ];

    const getStatusGroup = (status: string) => {
        switch (status) {
            case 'confirmed':
            case 'in_production':
            case 'ready_for_dispatch':
            case 'dispatched':
                return 'Active';
            case 'delivered':
            case 'completed':
                return 'Delivered';
            case 'cancelled':
            case 'cancellation_requested':
                return 'Cancelled';
            case 'return_requested':
            case 'returned':
            case 'disputed':
                return 'Returned';
            default:
                return 'All';
        }
    };

    const getStatusColor = (status: string) => {
        const group = getStatusGroup(status);
        switch (group) {
            case 'Delivered': return 'bg-green-100 text-green-700 border-green-200';
            case 'Active': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Cancelled': return 'bg-red-100 text-red-700 border-red-200';
            case 'Returned': return 'bg-orange-100 text-orange-700 border-orange-200';
            default: return 'bg-stone-100 text-stone-700 border-stone-200';
        }
    };

    const getStatusIcon = (status: string) => {
        const group = getStatusGroup(status);
        switch (group) {
            case 'Delivered': return <CheckCircle2 className="w-4 h-4 mr-1" />;
            case 'Active': return <Clock className="w-4 h-4 mr-1" />;
            case 'Cancelled': return <XCircle className="w-4 h-4 mr-1" />;
            case 'Returned': return <RefreshCcw className="w-4 h-4 mr-1" />;
            default: return <AlertCircle className="w-4 h-4 mr-1" />;
        }
    };

    const filteredOrders = orders.filter(order => activeTab === 'All' || getStatusGroup(order.status) === activeTab);

    return (
        <div className="w-full relative pb-24 bg-surface-container-lowest min-h-screen">
            <div className="bg-surface px-6 pt-10 sm:pt-6 pb-2 sticky top-0 z-10 shadow-sm border-b border-outline-variant">
                <h1 className="text-2xl font-bold text-stone-800 mb-4">{t('orders.title', { defaultValue: 'My Orders' })}</h1>
                <div className="flex gap-4 overflow-x-auto hide-scrollbar">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-3 px-1 whitespace-nowrap text-sm font-bold border-b-2 transition-colors ${
                                activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-stone-500 hover:text-stone-700'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-4 sm:p-6">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-stone-200 animate-pulse rounded-2xl"></div>)}
                    </div>
                ) : filteredOrders.length > 0 ? (
                    <div className="space-y-4">
                        {filteredOrders.map((order: any) => {
                            const paid = isOrderPaid(order);
                            const isDownloading = downloadingId === order.id;

                            return (
                                <div key={order.id} className="bg-surface border border-outline-variant rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-stone-100 overflow-hidden shrink-0">
                                                {order.product_snapshot?.image_url ? (
                                                    <img src={order.product_snapshot.image_url} alt="Product" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-stone-300"><Package className="w-6 h-6" /></div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-xs text-stone-500 font-bold mb-0.5">{t('orders.order_id', { defaultValue: 'Order' })} #{order.display_id}</div>
                                                <div className="font-bold text-stone-800 line-clamp-1">{order.product_snapshot?.title || 'Product'}</div>
                                                <div className="text-xs text-stone-500 mt-0.5">{order.artisan?.display_name || t('orders.artisan')}</div>
                                            </div>
                                        </div>
                                        <div className={`px-2 py-1 rounded-full text-[10px] font-bold border flex items-center whitespace-nowrap ${getStatusColor(order.status)}`}>
                                            {getStatusIcon(order.status)}
                                            {t(`order_status.${order.status}`, { defaultValue: order.status.replace(/_/g, ' ').toUpperCase() })}
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2 text-sm text-stone-600 mb-4 bg-stone-50 p-3 rounded-xl border border-stone-100">
                                        <div>
                                            <span className="text-stone-400 text-xs block">{t('orders.total', { defaultValue: 'Total Amount' })}</span>
                                            <span className="font-bold text-stone-800">₹{order.total_order_value}</span>
                                        </div>
                                        <div>
                                            <span className="text-stone-400 text-xs block">{t('payment.status', { defaultValue: 'Payment' })}</span>
                                            {paid ? (
                                                <span className="inline-block mt-0.5 text-[10px] font-black px-2 py-0.5 rounded bg-green-100 text-green-800 uppercase">
                                                    UPI &bull; PAID
                                                </span>
                                            ) : (
                                                <span className="inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 uppercase">
                                                    {order.payment_status || 'PENDING'}
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <span className="text-stone-400 text-xs block">{t('orders.placed_on', { defaultValue: 'Order Date' })}</span>
                                            <span className="font-bold text-stone-800">{new Date(order.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div>
                                            <span className="text-stone-400 text-xs block">{t('cart.quantity', { defaultValue: 'Quantity' })}</span>
                                            <span className="font-bold text-stone-800">{order.quantity} {t('cart.items', { defaultValue: 'units' })}</span>
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row gap-2">
                                        <button 
                                            onClick={() => navigate(`/buyer/orders/${order.id}`)}
                                            className="flex-1 py-2.5 px-3 text-xs sm:text-sm font-bold bg-stone-100 text-stone-800 rounded-xl text-center hover:bg-stone-200 transition-colors"
                                        >
                                            {t('orders.view_details', { defaultValue: 'View Order Details' })}
                                        </button>

                                        {paid && (
                                            <button
                                                onClick={(e) => handleDownloadInvoice(e, order)}
                                                disabled={isDownloading}
                                                className="flex-1 py-2.5 px-3 text-xs sm:text-sm font-bold bg-primary text-on-primary rounded-xl text-center hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-60"
                                                title="Download Invoice PDF"
                                            >
                                                {isDownloading ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                                        <span>{t('payment.downloading', { defaultValue: 'Downloading...' })}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <FileDown className="w-4 h-4 shrink-0" />
                                                        <span>{t('payment.download_invoice', { defaultValue: 'Download Invoice' })}</span>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-surface rounded-3xl shadow-sm border border-stone-100">
                        <Package className="w-16 h-16 text-stone-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-stone-700 mb-2">{t('orders.empty', { defaultValue: 'No orders found' })}</h3>
                        <p className="text-stone-500 text-sm max-w-xs mx-auto">{t('orders.empty_desc', { defaultValue: 'When you place an order or its status changes, it will appear here.' })}</p>
                        {activeTab !== 'All' && (
                            <button onClick={() => setActiveTab('All')} className="mt-6 text-primary font-bold hover:underline">{t('common.all', { defaultValue: 'View all orders' })}</button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
