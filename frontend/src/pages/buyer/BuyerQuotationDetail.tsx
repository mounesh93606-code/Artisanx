import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, Edit3, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';
import MessagingUI from '../../components/buyer/MessagingUI';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function BuyerQuotationDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { token } = useAuthStore();
    
    const [quotation, setQuotation] = useState<any>(null);
    const [revisions, setRevisions] = useState<any[]>([]);
    const [orderId, setOrderId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [changeReason, setChangeReason] = useState("");
    const [showChangeInput, setShowChangeInput] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        async function fetchQuotation() {
            try {
                const res = await axios.get(`${API_URL}/quotations/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setQuotation(res.data.quotation);
                setRevisions(res.data.revisions || []);
                if (res.data.order_id) {
                    setOrderId(res.data.order_id);
                }
            } catch (err: any) {
                console.error("Failed to load quotation", err);
                setError(err.response?.data?.detail || "Failed to load quotation");
            } finally {
                setLoading(false);
            }
        }
        fetchQuotation();
    }, [id, token]);

    const handleAction = async (action: 'accept' | 'reject' | 'request-changes') => {
        if (action === 'request-changes' && !changeReason.trim()) {
            alert("Please describe the changes you need.");
            return;
        }
        if (action === 'reject' && !window.confirm("Are you sure you want to decline this quotation?")) {
            return;
        }
        setActionLoading(true);
        try {
            const payload = (action === 'request-changes' || action === 'reject') 
                ? { reason: changeReason } 
                : {};
            const res = await axios.post(`${API_URL}/quotations/${id}/${action}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (action === 'accept' && res.data.order_id) {
                navigate(`/buyer/orders/${res.data.order_id}`);
            } else {
                setQuotation({ ...quotation, status: action === 'reject' ? 'rejected' : 'changes_requested' });
                setShowChangeInput(false);
            }
        } catch (err: any) {
            console.error(`Action ${action} failed`, err);
            alert(err.response?.data?.detail || "Action failed");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20 min-h-screen bg-surface-container-lowest">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error || !quotation) {
        return (
            <div className="p-6 text-center text-red-500 bg-surface-container-lowest min-h-screen max-w-md mx-auto">
                <p className="font-semibold mb-4">{error || "Quotation not found"}</p>
                <button 
                    onClick={() => navigate(-1)} 
                    className="px-5 py-2.5 bg-primary text-on-primary font-bold rounded-xl"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const currentRev = revisions.find(r => r.version === quotation.current_version) || revisions[0] || {};
    
    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-24 bg-surface-container-lowest min-h-screen">
            <div className="flex items-center mb-6">
                <button 
                    onClick={() => navigate(-1)} 
                    className="mr-3 w-10 h-10 bg-surface rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container shadow-sm border border-outline-variant shrink-0"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-on-surface">Quotation {quotation.display_id}</h1>
                    <div className="text-xs sm:text-sm text-on-surface-variant flex items-center gap-2 mt-0.5">
                        <span>Version {quotation.current_version}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            quotation.status === 'accepted' ? 'bg-green-100 text-green-800' :
                            quotation.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            quotation.status === 'changes_requested' ? 'bg-purple-100 text-purple-800' :
                            'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}>
                            {quotation.status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-5">
                    {/* Quote Details Card */}
                    <div className="bg-surface rounded-2xl p-5 sm:p-6 shadow-sm border border-outline-variant">
                        <h2 className="text-base sm:text-lg font-bold mb-4 text-on-surface">Quote Details</h2>
                        <div className="flex gap-4 mb-5 border-b border-outline-variant/60 pb-4">
                            {quotation.products?.images?.[0]?.image_url ? (
                                <img src={quotation.products.images[0].image_url} alt="Product" className="w-20 h-20 object-cover rounded-xl border border-stone-200 shrink-0" />
                            ) : (
                                <div className="w-20 h-20 bg-stone-100 rounded-xl flex items-center justify-center text-stone-400 text-xs shrink-0 border border-stone-200">
                                    No Image
                                </div>
                            )}
                            <div>
                                <h3 className="font-bold text-base text-stone-900">{quotation.products?.title || 'Handcrafted Item'}</h3>
                                <p className="text-xs text-stone-500 mt-0.5">Artisan: <span className="font-semibold text-stone-700">{quotation.artisan?.display_name || 'Artisan'}</span></p>
                                {quotation.agreed_variant && (
                                    <p className="text-xs text-primary bg-primary/10 inline-block px-2 py-0.5 rounded mt-2 font-medium">
                                        {quotation.agreed_variant}
                                    </p>
                                )}
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
                            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/60">
                                <span className="text-stone-500 block text-xs">Quantity:</span>
                                <span className="font-bold text-stone-900 text-base">{currentRev.quantity} units</span>
                            </div>
                            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/60">
                                <span className="text-stone-500 block text-xs">Unit Price:</span>
                                <span className="font-bold text-stone-900 text-base">₹{currentRev.unit_price}</span>
                            </div>
                            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/60">
                                <span className="text-stone-500 block text-xs">Customization:</span>
                                <span className="font-bold text-stone-900 text-base">₹{currentRev.customization_cost || 0}</span>
                            </div>
                            <div className="bg-primary-container p-3 rounded-xl border border-primary/20 col-span-2 sm:col-span-1">
                                <span className="text-on-primary-container font-medium block text-xs">Total Order Value:</span>
                                <span className="font-black text-primary text-lg">₹{currentRev.total_price}</span>
                            </div>
                            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/60">
                                <span className="text-stone-500 block text-xs">Production Time:</span>
                                <span className="font-bold text-stone-900 text-base">{currentRev.production_lead_time_days || 7} days</span>
                            </div>
                            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/60">
                                <span className="text-stone-500 block text-xs">Valid Until:</span>
                                <span className="font-bold text-stone-900 text-base">
                                    {currentRev.expiry_date ? new Date(currentRev.expiry_date).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                        </div>

                        {currentRev.artisan_notes && (
                            <div className="mt-5 p-4 bg-secondary-container rounded-xl text-on-secondary-container text-xs sm:text-sm">
                                <span className="font-bold block mb-1">Artisan Notes:</span>
                                <p className="whitespace-pre-wrap">{currentRev.artisan_notes}</p>
                            </div>
                        )}
                    </div>

                    {/* Actions Card for 'sent' status */}
                    {quotation.status === 'sent' && (
                        <div className="bg-surface rounded-2xl p-5 sm:p-6 shadow-sm border border-outline-variant">
                            <h2 className="text-base sm:text-lg font-bold mb-3">Accept or Modify Quotation</h2>
                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={() => handleAction('accept')} 
                                    disabled={actionLoading}
                                    className="w-full min-h-[48px] py-3 bg-primary text-on-primary rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
                                >
                                    <Check className="w-5 h-5" /> 
                                    {actionLoading ? 'Processing...' : 'Accept Quotation & Create Order'}
                                </button>
                                
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button 
                                        onClick={() => setShowChangeInput(!showChangeInput)} 
                                        disabled={actionLoading}
                                        className="flex-1 min-h-[48px] py-3 bg-surface-container text-on-surface font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-surface-container-high transition-colors active:scale-[0.98]"
                                    >
                                        <Edit3 className="w-4 h-4" /> Request Changes
                                    </button>
                                    <button 
                                        onClick={() => handleAction('reject')} 
                                        disabled={actionLoading}
                                        className="flex-1 min-h-[48px] py-3 border border-red-400 text-red-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-50 transition-colors active:scale-[0.98]"
                                    >
                                        <X className="w-4 h-4" /> Decline
                                    </button>
                                </div>

                                {showChangeInput && (
                                    <div className="mt-3 p-4 border border-outline-variant rounded-xl bg-surface-container animate-in fade-in space-y-3">
                                        <label className="block text-xs font-bold text-stone-700">What needs to be changed?</label>
                                        <textarea 
                                            value={changeReason}
                                            onChange={e => setChangeReason(e.target.value)}
                                            className="w-full border border-stone-300 rounded-lg p-3 text-xs min-h-[80px] bg-white outline-none focus:ring-2 focus:ring-primary"
                                            placeholder="E.g., Can we adjust quantity or target delivery date?"
                                        ></textarea>
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => setShowChangeInput(false)} 
                                                className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-800"
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                onClick={() => handleAction('request-changes')} 
                                                disabled={!changeReason.trim() || actionLoading} 
                                                className="px-4 py-1.5 text-xs bg-stone-900 text-white font-bold rounded-lg disabled:opacity-50 hover:bg-black"
                                            >
                                                {actionLoading ? 'Sending...' : 'Send Request'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Status Banners for non-sent states */}
                    {quotation.status === 'accepted' && (
                        <div className="bg-green-50 border-2 border-green-400 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-green-950 text-base">Quotation Accepted!</h3>
                                    <p className="text-xs text-green-800 mt-0.5">
                                        You accepted this quotation and the official order has been placed with the artisan.
                                    </p>
                                </div>
                            </div>
                            {orderId && (
                                <button 
                                    onClick={() => navigate(`/buyer/orders/${orderId}`)}
                                    className="mt-4 w-full min-h-[48px] py-3 bg-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-green-700 transition-colors shadow-sm active:scale-[0.98]"
                                >
                                    View Confirmed Order &rarr;
                                </button>
                            )}
                        </div>
                    )}

                    {quotation.status === 'changes_requested' && (
                        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-purple-500 text-white flex items-center justify-center shrink-0">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-purple-950 text-sm">Changes Requested</h3>
                                    <p className="text-xs text-purple-800 mt-0.5">
                                        You requested changes on this quotation. The artisan has been notified to send a revised quote.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {quotation.status === 'rejected' && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0">
                                    <AlertCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-red-950 text-sm">Quotation Declined</h3>
                                    <p className="text-xs text-red-800 mt-0.5">
                                        You declined this quotation. You can message the artisan below or submit a new enquiry.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Messages Sidebar */}
                <div className="md:col-span-1">
                    <div className="mb-2">
                        <h3 className="font-bold text-sm text-stone-800">Chat with Artisan</h3>
                    </div>
                    <MessagingUI enquiryId={quotation.enquiry_id} currentUserId={quotation.buyer_id} />
                </div>
            </div>
        </div>
    );
}
