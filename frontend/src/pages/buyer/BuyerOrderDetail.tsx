import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Star, X, RefreshCcw, ShieldAlert, FileText, FileDown, Loader2, CheckCircle, PackageCheck } from 'lucide-react';
import axios from 'axios';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { isOrderPaid, downloadOrderInvoice } from '../../lib/invoiceDownload';
import MessagingUI from '../../components/buyer/MessagingUI';
import ReviewModal from '../../components/buyer/ReviewModal';
import InvoiceModal from '../../components/buyer/InvoiceModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const STATUS_STAGES = [
    { id: 'confirmed', label: 'Confirmed' },
    { id: 'in_production', label: 'In Production' },
    { id: 'ready_for_dispatch', label: 'Ready for Dispatch' },
    { id: 'dispatched', label: 'Dispatched' },
    { id: 'delivered', label: 'Delivered' },
    { id: 'completed', label: 'Completed' }
];

export default function BuyerOrderDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { token } = useAuthStore();
    
    const [order, setOrder] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const [cancelNotes, setCancelNotes] = useState("");
    const [isCancelling, setIsCancelling] = useState(false);

    const [showReviewModal, setShowReviewModal] = useState(false);
    const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false);

    const [showDisputeModal, setShowDisputeModal] = useState(false);
    const [disputeReason, setDisputeReason] = useState('quality_issue');
    const [disputeExplanation, setDisputeExplanation] = useState('');

    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceData, setInvoiceData] = useState<any>(null);

    const handleViewInvoice = async () => {
        try {
            const res = await api.get(`/payments/invoice/${id}`);
            setInvoiceData(res.data);
        } catch (e) {
            const snapshot = order?.product_snapshot || {};
            const invMeta = snapshot.invoice?.invoice_data;
            if (invMeta) {
                setInvoiceData(invMeta);
            } else {
                setInvoiceData({
                    invoice_number: `INV-${order?.display_id || id}`,
                    order_id: order?.id,
                    display_id: order?.display_id,
                    product_title: snapshot.title,
                    quantity: order?.quantity,
                    unit_price: order?.unit_price,
                    total: order?.total_order_value,
                    buyer_name: 'Buyer',
                    artisan_name: order?.artisan?.display_name || 'Artisan',
                    payment_method: 'UPI',
                    payment_status: 'PAID',
                    gateway_payment_id: snapshot.payment?.gateway_payment_id,
                    created_at: order?.created_at,
                    delivery_address: snapshot.delivery_address
                });
            }
        }
        setShowInvoiceModal(true);
    };

    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

    const handleDownloadPdf = async () => {
        if (!id) return;
        setIsDownloadingPdf(true);
        try {
            await downloadOrderInvoice(order || id, order?.display_id);
        } catch (err: any) {
            console.error("Failed to download invoice:", err);
            alert(err?.message || "Failed to download invoice PDF.");
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    useEffect(() => {
        fetchOrder();
    }, [id, token]);

    async function fetchOrder() {
        try {
            const res = await api.get(`/orders/${id}`);
            setOrder(res.data.order);
            setHistory(res.data.history || []);
        } catch (err: any) {
            console.error("Failed to load order", err);
            alert(err.response?.data?.detail || "Failed to load order");
        } finally {
            setLoading(false);
        }
    }

    const handleCancel = async () => {
        if (!cancelReason) return alert("Please select a reason.");
        setIsCancelling(true);
        try {
            await axios.post(`${API_URL}/orders/${id}/cancel`, {
                reason: cancelReason,
                notes: cancelNotes
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowCancelModal(false);
            fetchOrder(); // refresh
        } catch (err: any) {
            console.error("Cancellation failed", err);
            alert(err.response?.data?.detail || "Cancellation failed");
        } finally {
            setIsCancelling(false);
        }
    };

    const handleRaiseDispute = async () => {
        if (!id || !order) return;
        setIsCancelling(true);
        try {
            await axios.post(`${API_URL}/disputes/`, {
                order_id: id,
                product_id: order.product_snapshot.product_id,
                reason: disputeReason,
                explanation: disputeExplanation
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowDisputeModal(false);
            alert('Dispute raised successfully.');
            fetchOrder();
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.detail || 'Failed to raise dispute.');
        } finally {
            setIsCancelling(false);
        }
    };

    const handleConfirmDelivery = async () => {
        if (!id) return;
        setIsConfirmingDelivery(true);
        try {
            await api.patch(`/orders/${id}/status`, {
                status: 'completed',
                note: 'Buyer confirmed receipt and completed order'
            });
            await fetchOrder();
            setShowReviewModal(true);
        } catch (err: any) {
            console.error("Failed to confirm delivery", err);
            alert(err.response?.data?.detail || "Failed to confirm delivery");
        } finally {
            setIsConfirmingDelivery(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center py-20 min-h-screen bg-surface-container-lowest"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
    }
    
    if (!order) return <div className="p-6 text-center">Order not found.</div>;

    const isCancelled = ['cancelled', 'cancellation_requested'].includes(order.status);
    const isReturned = ['return_requested', 'returned', 'disputed'].includes(order.status);

    const canCancel = ['confirmed', 'in_production'].includes(order.status);
    const canReview = ['completed', 'delivered'].includes(order.status);

    return (
        <div className="max-w-5xl mx-auto px-4 pt-14 pb-24 sm:p-6 bg-surface-container-lowest min-h-screen">
            <div className="flex items-center mb-6 pt-3">
                <button 
                    onClick={() => navigate('/buyer/orders')} 
                    className="mr-4 w-10 h-10 bg-surface rounded-full flex items-center justify-center hover:bg-surface-container shadow-sm border border-outline-variant cursor-pointer active:scale-95 shrink-0"
                    aria-label="Back to Orders"
                >
                    <ArrowLeft className="w-5 h-5 text-on-surface" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-on-surface">Order #{order.display_id}</h1>
                    <p className="text-sm text-stone-500">Placed on {new Date(order.created_at).toLocaleDateString()}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Tracking & Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Status Tracking Timeline */}
                    <div className="bg-surface rounded-2xl p-6 shadow-sm border border-outline-variant">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold">Tracking</h2>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                isCancelled ? 'bg-red-100 text-red-700 border-red-200' :
                                isReturned ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                'bg-blue-100 text-blue-700 border-blue-200'
                            }`}>
                                {order.status.replace(/_/g, ' ').toUpperCase()}
                            </span>
                        </div>

                        {isCancelled || isReturned ? (
                            <div className={`p-4 rounded-xl border flex gap-3 ${isCancelled ? 'bg-red-50 border-red-200 text-red-800' : 'bg-orange-50 border-orange-200 text-orange-800'}`}>
                                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold">{order.status === 'cancellation_requested' ? 'Cancellation Requested' : 'Order Issue'}</h4>
                                    <p className="text-sm mt-1">This order's progress has halted due to a cancellation or return/dispute.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="relative pl-6 border-l-2 border-stone-200 space-y-8 py-2">
                                {STATUS_STAGES.map((stage) => {
                                    const stageHist = history.find(h => h.to_status === stage.id);
                                    const isCompleted = !!stageHist;
                                                                        
                                    return (
                                        <div key={stage.id} className="relative">
                                            <div className={`absolute -left-[35px] w-6 h-6 rounded-full border-2 bg-surface flex items-center justify-center ${
                                                isCompleted ? 'border-primary' : 'border-stone-300'
                                            }`}>
                                                {isCompleted ? <div className="w-2.5 h-2.5 bg-primary rounded-full"></div> : null}
                                            </div>
                                            <div>
                                                <h4 className={`font-bold ${isCompleted ? 'text-stone-800' : 'text-stone-400'}`}>{stage.label}</h4>
                                                {stageHist && <p className="text-xs text-stone-500 mt-1">{new Date(stageHist.created_at).toLocaleString()}</p>}
                                                {stageHist?.note && <p className="text-xs text-stone-600 mt-1 bg-stone-100 p-2 rounded inline-block">{stageHist.note}</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Order Details */}
                    <div className="bg-surface rounded-2xl p-6 shadow-sm border border-outline-variant">
                        <h2 className="text-lg font-bold mb-4">Order Details</h2>
                        <div className="flex gap-4 mb-6 border-b border-outline-variant pb-6">
                            {order.product_snapshot?.image_url ? (
                                <img src={order.product_snapshot.image_url} alt="Product" className="w-20 h-20 object-cover rounded-xl border border-stone-200" />
                            ) : (
                                <div className="w-20 h-20 bg-stone-100 rounded-xl flex items-center justify-center text-stone-400">No Image</div>
                            )}
                            <div>
                                <h3 className="font-bold text-stone-800 text-lg">{order.product_snapshot?.title || 'Product'}</h3>
                                <p className="text-sm text-stone-500">Sold by: {order.artisan?.display_name}</p>
                                {order.product_snapshot?.variant && <p className="text-xs text-primary bg-primary-container inline-block px-2 py-1 rounded mt-2">{order.product_snapshot.variant}</p>}
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-y-4 text-sm">
                            <div><span className="text-stone-500">Unit Price:</span> <br/><span className="font-bold">₹{order.unit_price}</span></div>
                            <div><span className="text-stone-500">Quantity:</span> <br/><span className="font-bold">{order.quantity}</span></div>
                            <div><span className="text-stone-500">Total Amount:</span> <br/><span className="font-bold text-lg text-primary">₹{order.total_order_value}</span></div>
                            <div>
                                <span className="text-stone-500">Payment:</span> <br/>
                                <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded text-[11px] font-black bg-green-100 text-green-800 uppercase">
                                    UPI — PAID
                                </span>
                            </div>
                        </div>

                        {order.customization_details && (
                            <div className="mt-6 p-4 bg-stone-50 rounded-xl border border-stone-200 text-sm">
                                <span className="font-bold block mb-1">Customization / Notes:</span>
                                {order.customization_details}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Actions & Messages */}
                <div className="space-y-6">
                    <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant space-y-3">
                        <h2 className="font-bold mb-2">Actions</h2>
                        
                        {['dispatched', 'delivered'].includes(order.status) && (
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2.5 shadow-sm">
                                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                                    <PackageCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                                    <span>Package Arrived?</span>
                                </div>
                                <p className="text-xs text-emerald-700 leading-relaxed">
                                    Confirm you received your order to complete the purchase and rate your artisan.
                                </p>
                                <button
                                    onClick={handleConfirmDelivery}
                                    disabled={isConfirmingDelivery}
                                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xs disabled:opacity-60 cursor-pointer"
                                >
                                    {isConfirmingDelivery ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                            <span>Confirming Receipt...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-4 h-4 shrink-0" />
                                            <span>Confirm Received & Rate</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {canReview && (
                            <button 
                                onClick={() => setShowReviewModal(true)}
                                className="w-full py-3 bg-secondary-container text-on-secondary-container font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-secondary-container/90 transition-colors shadow-sm cursor-pointer"
                            >
                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Rate & Review Artisan
                            </button>
                        )}

                        <button 
                            onClick={() => navigate(`/buyer/product/${order.product_id}`)}
                            className="w-full py-3 bg-surface-container border border-outline-variant/60 text-stone-700 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-surface-container-high transition-colors"
                        >
                            <RefreshCcw className="w-4 h-4" /> Send Similar Enquiry
                        </button>
                        
                        {isOrderPaid(order) && (
                            <div className="flex gap-2">
                                <button 
                                    className="flex-1 py-3 bg-primary text-on-primary font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-sm active:scale-95 disabled:opacity-60"
                                    onClick={handleDownloadPdf}
                                    disabled={isDownloadingPdf}
                                >
                                    {isDownloadingPdf ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                            <span>Downloading PDF...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FileDown className="w-4 h-4 shrink-0" />
                                            <span>Download Invoice</span>
                                        </>
                                    )}
                                </button>
                                <button 
                                    className="p-3 border border-stone-200 bg-white text-stone-700 font-bold rounded-xl flex items-center justify-center gap-1.5 hover:bg-stone-50 transition-colors shadow-sm"
                                    onClick={handleViewInvoice}
                                    title="View Invoice Details"
                                >
                                    <FileText className="w-4 h-4 text-stone-600" />
                                    <span className="hidden sm:inline text-xs">Preview</span>
                                </button>
                            </div>
                        )}
                        
                        {canCancel && (
                            <button 
                                onClick={() => setShowCancelModal(true)}
                                className="w-full py-3 border border-red-200 text-red-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-50 transition-colors mt-4"
                            >
                                <X className="w-4 h-4" /> Request Cancellation
                            </button>
                        )}
                        
                        {!isCancelled && (
                            <button 
                                onClick={() => setShowDisputeModal(true)}
                                className="w-full py-3 border border-stone-200 text-stone-700 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-stone-100 transition-colors mt-2"
                            >
                                <ShieldAlert className="w-4 h-4" /> Raise Dispute
                            </button>
                        )}
                    </div>

                    <MessagingUI enquiryId={order.enquiry_id} orderId={order.id} currentUserId={order.buyer_id} />
                </div>
            </div>

            {/* Cancel Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-surface rounded-3xl w-full max-w-md p-6 animate-in zoom-in-95">
                        <h2 className="text-xl font-bold mb-4">Request Cancellation</h2>
                        <p className="text-sm text-stone-500 mb-6">The artisan must approve this cancellation request as production may have already started.</p>
                        
                        <div className="space-y-4 mb-6">
                            <label className="block">
                                <span className="text-sm font-bold text-stone-700">Reason for cancellation</span>
                                <select 
                                    className="mt-1 w-full border border-stone-300 rounded-xl p-3 bg-white"
                                    value={cancelReason}
                                    onChange={e => setCancelReason(e.target.value)}
                                >
                                    <option value="">Select a reason</option>
                                    <option value="Changed requirement">Changed requirement</option>
                                    <option value="Ordered incorrectly">Ordered incorrectly</option>
                                    <option value="Delivery/production time too long">Delivery/production time too long</option>
                                    <option value="Other">Other</option>
                                </select>
                            </label>
                            <label className="block">
                                <span className="text-sm font-bold text-stone-700">Additional explanation (optional)</span>
                                <textarea 
                                    className="mt-1 w-full border border-stone-300 rounded-xl p-3 bg-white min-h-[100px]"
                                    value={cancelNotes}
                                    onChange={e => setCancelNotes(e.target.value)}
                                    placeholder="Please provide details to help the artisan understand..."
                                />
                            </label>
                        </div>
                        
                        <div className="flex gap-3">
                            <button onClick={() => setShowCancelModal(false)} className="flex-1 py-3 text-stone-600 font-bold rounded-xl border border-stone-200 hover:bg-stone-50">Back</button>
                            <button onClick={handleCancel} disabled={!cancelReason || isCancelling} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 flex items-center justify-center">
                                {isCancelling ? 'Requesting...' : 'Submit Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Review Modal */}
            {showReviewModal && (
                <ReviewModal 
                    order={order} 
                    onClose={() => setShowReviewModal(false)} 
                    onSuccess={() => {
                        setShowReviewModal(false);
                        alert("Review submitted successfully!");
                    }}
                />
            )}

            {/* Dispute Modal */}
            {showDisputeModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-surface rounded-3xl w-full max-w-md p-6 animate-in zoom-in-95 relative">
                        <button onClick={() => setShowDisputeModal(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600">
                            <X className="w-6 h-6" />
                        </button>
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-600">
                            <ShieldAlert className="w-5 h-5" /> Raise Dispute
                        </h2>
                        <div className="space-y-4 mb-6">
                            <label className="block">
                                <span className="text-sm font-bold text-stone-700">Reason</span>
                                <select 
                                    className="mt-1 w-full border border-stone-300 rounded-xl p-3 bg-white"
                                    value={disputeReason}
                                    onChange={e => setDisputeReason(e.target.value)}
                                >
                                    <option value="quality_issue">Quality Issue</option>
                                    <option value="item_not_received">Item Not Received</option>
                                    <option value="item_not_as_described">Item Not As Described</option>
                                    <option value="shipping_damage">Shipping Damage</option>
                                    <option value="payment_issue">Payment Issue</option>
                                    <option value="communication_issue">Communication Issue</option>
                                    <option value="other">Other</option>
                                </select>
                            </label>
                            <label className="block">
                                <span className="text-sm font-bold text-stone-700">Explanation</span>
                                <textarea 
                                    className="mt-1 w-full border border-stone-300 rounded-xl p-3 bg-white min-h-[100px]"
                                    value={disputeExplanation}
                                    onChange={e => setDisputeExplanation(e.target.value)}
                                    placeholder="Provide details for the facilitator..."
                                />
                            </label>
                        </div>
                        <button 
                            onClick={handleRaiseDispute} 
                            disabled={!disputeExplanation.trim() || isCancelling} 
                            className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
                        >
                            {isCancelling ? 'Processing...' : 'Submit Dispute'}
                        </button>
                    </div>
                </div>
            )}
            {/* Invoice Modal */}
            <InvoiceModal
                isOpen={showInvoiceModal}
                onClose={() => setShowInvoiceModal(false)}
                invoice={invoiceData}
            />
        </div>
    );
}
