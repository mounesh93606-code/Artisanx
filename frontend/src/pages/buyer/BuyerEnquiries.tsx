import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Clock, CheckCircle, ChevronRight, AlertCircle, Sparkles, Filter } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

type FilterType = 'all' | 'quotes' | 'in_progress' | 'completed';

export default function BuyerEnquiries() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { token } = useAuthStore();
    const [enquiries, setEnquiries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');

    useEffect(() => {
        async function fetchEnquiries() {
            try {
                const res = await axios.get(`${API_URL}/enquiries/buyer`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setEnquiries(res.data.enquiries || []);
            } catch (error) {
                console.error("Failed to fetch enquiries", error);
            } finally {
                setLoading(false);
            }
        }
        
        fetchEnquiries();
    }, [token]);

    const quotesCount = useMemo(() => {
        return enquiries.filter(e => e.status === 'quote_sent').length;
    }, [enquiries]);

    const filteredEnquiries = useMemo(() => {
        if (activeFilter === 'quotes') {
            return enquiries.filter(e => e.status === 'quote_sent');
        }
        if (activeFilter === 'in_progress') {
            return enquiries.filter(e => ['new', 'viewed', 'responded', 'changes_requested'].includes(e.status));
        }
        if (activeFilter === 'completed') {
            return enquiries.filter(e => e.status === 'accepted');
        }
        return enquiries;
    }, [enquiries, activeFilter]);

    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'quote_sent':
                return (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 bg-amber-100 text-amber-900 border border-amber-300 shadow-sm animate-pulse">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        Quotation Received
                    </span>
                );
            case 'accepted':
                return (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 bg-green-100 text-green-800 border border-green-300">
                        <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                        Order Confirmed
                    </span>
                );
            case 'changes_requested':
                return (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 bg-purple-100 text-purple-800 border border-purple-200">
                        <Clock className="w-3.5 h-3.5 text-purple-600" />
                        Changes Requested
                    </span>
                );
            case 'responded':
                return (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 bg-blue-100 text-blue-800 border border-blue-200">
                        <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                        Responded
                    </span>
                );
            case 'viewed':
                return (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 bg-stone-100 text-stone-700 border border-stone-200">
                        <Clock className="w-3.5 h-3.5 text-stone-500" />
                        Seen by Artisan
                    </span>
                );
            case 'rejected':
                return (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                        Declined
                    </span>
                );
            default:
                return (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 bg-stone-100 text-stone-600 border border-stone-200">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        Pending Response
                    </span>
                );
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-28">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
                <div>
                    <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2.5">
                        <Mail className="w-6 h-6 text-primary" />
                        {t('buyer_enquiries.title', 'My Enquiries')}
                    </h1>
                    <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
                        Track discussions, quotes, and custom orders with artisans
                    </p>
                </div>
                {quotesCount > 0 && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs font-bold self-start sm:self-auto">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <span>{quotesCount} {quotesCount === 1 ? 'quote awaits review' : 'quotes await review'}</span>
                    </div>
                )}
            </div>

            {/* Filter Tabs */}
            {enquiries.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
                    <button
                        onClick={() => setActiveFilter('all')}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors shrink-0 ${
                            activeFilter === 'all'
                                ? 'bg-primary text-on-primary'
                                : 'bg-surface border border-outline-variant text-stone-600 hover:bg-surface-container'
                        }`}
                    >
                        All ({enquiries.length})
                    </button>
                    {quotesCount > 0 && (
                        <button
                            onClick={() => setActiveFilter('quotes')}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 ${
                                activeFilter === 'quotes'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100'
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            Quotations Received ({quotesCount})
                        </button>
                    )}
                    <button
                        onClick={() => setActiveFilter('in_progress')}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors shrink-0 ${
                            activeFilter === 'in_progress'
                                ? 'bg-primary text-on-primary'
                                : 'bg-surface border border-outline-variant text-stone-600 hover:bg-surface-container'
                        }`}
                    >
                        In Progress
                    </button>
                    <button
                        onClick={() => setActiveFilter('completed')}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors shrink-0 ${
                            activeFilter === 'completed'
                                ? 'bg-primary text-on-primary'
                                : 'bg-surface border border-outline-variant text-stone-600 hover:bg-surface-container'
                        }`}
                    >
                        Confirmed Orders
                    </button>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-9 h-9 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-stone-400">Loading enquiries...</span>
                </div>
            ) : enquiries.length > 0 ? (
                <div className="space-y-3.5">
                    {filteredEnquiries.length === 0 ? (
                        <div className="text-center py-12 bg-surface rounded-2xl border border-outline-variant">
                            <Filter className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                            <p className="text-sm font-semibold text-stone-600">No enquiries matching this filter</p>
                            <button 
                                onClick={() => setActiveFilter('all')} 
                                className="mt-3 text-xs font-bold text-primary hover:underline"
                            >
                                Show all enquiries
                            </button>
                        </div>
                    ) : (
                        filteredEnquiries.map((enq) => {
                            const isQuote = enq.status === 'quote_sent';
                            return (
                                <div 
                                    key={enq.id} 
                                    onClick={() => navigate(`/buyer/enquiry/${enq.id}`)}
                                    className={`bg-surface rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer hover:shadow-md group active:scale-[0.99] ${
                                        isQuote 
                                            ? 'border-amber-300 ring-2 ring-amber-300/40 shadow-sm bg-gradient-to-r from-amber-50/20 via-surface to-surface' 
                                            : 'border-outline-variant shadow-sm'
                                    }`}
                                >
                                    <div className="flex gap-3.5 sm:gap-4 items-start sm:items-center">
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-stone-100 rounded-xl overflow-hidden shrink-0 border border-stone-200">
                                            {enq.products?.images?.[0]?.image_url ? (
                                                <img src={enq.products.images[0].image_url} alt="Product" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-stone-400">
                                                    <Mail className="w-6 h-6 opacity-40" />
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1">
                                                <h3 className="font-bold text-on-surface group-hover:text-primary transition-colors text-base truncate">
                                                    {enq.products?.title || 'Custom Product'}
                                                </h3>
                                                <div className="self-start sm:self-auto">
                                                    {renderStatusBadge(enq.status)}
                                                </div>
                                            </div>

                                            <div className="text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                                                <span>Artisan:</span>
                                                <span className="font-semibold text-stone-800">{enq.artisan?.display_name || 'Handmade Artisan'}</span>
                                            </div>

                                            <div className="text-xs text-stone-500 mt-2 flex flex-wrap items-center gap-3">
                                                <span className="bg-stone-100 px-2 py-0.5 rounded text-stone-700 font-medium">
                                                    Qty: {enq.quantity}
                                                </span>
                                                {enq.budget && (
                                                    <span className="bg-stone-100 px-2 py-0.5 rounded text-stone-700 font-medium">
                                                        Budget: ₹{enq.budget}
                                                    </span>
                                                )}
                                                <span className="text-stone-400">
                                                    {new Date(enq.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="hidden sm:flex items-center justify-center text-stone-300 group-hover:text-primary transition-colors pl-2">
                                            <ChevronRight className="w-5 h-5" />
                                        </div>
                                    </div>

                                    {/* Action reminder callout when quote is sent */}
                                    {isQuote && (
                                        <div className="mt-3.5 pt-3 border-t border-amber-200/80 flex items-center justify-between gap-2 text-xs text-amber-900 font-medium">
                                            <span className="flex items-center gap-1.5">
                                                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                                                <span>Artisan sent quotation! Tap to review unit pricing and accept order.</span>
                                            </span>
                                            <span className="font-bold text-amber-700 group-hover:underline shrink-0 hidden sm:inline">
                                                Review Quote &rarr;
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                <div className="text-center py-20 bg-surface rounded-3xl border border-outline-variant mt-4">
                    <Mail className="w-16 h-16 text-on-surface-variant/30 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-on-surface mb-2">No Enquiries Yet</h2>
                    <p className="text-on-surface-variant text-sm mb-6 max-w-md mx-auto px-4">
                        You haven't sent any product enquiries to artisans yet. Start by browsing handcrafted items in our catalogue.
                    </p>
                    <button 
                        onClick={() => navigate('/buyer/catalogue')} 
                        className="px-6 py-3 bg-primary text-on-primary font-bold rounded-full hover:bg-primary/90 transition-colors shadow-sm active:scale-95"
                    >
                        Browse Catalogue
                    </button>
                </div>
            )}
        </div>
    );
}
