import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useProductStore } from '../../stores/productStore';
import { useDashboardStore } from '../../stores/dashboardStore';
import { pcTranslations } from '../../i18n/productCreate';
import { useTranslation } from 'react-i18next';
import api from '../../lib/api';

import Step1Photo from '../../components/product/Step1Photo';
import Step2Voice from '../../components/product/Step2Voice';
import Step3ReviewAI from '../../components/product/Step3ReviewAI';
import Step4Materials from '../../components/product/Step4Materials';
import Step5Pricing from '../../components/product/Step5Pricing';
import Step6Inventory from '../../components/product/Step6Inventory';
import Step7Publish from '../../components/product/Step7Publish';

const ProductEdit = () => {
    const { id } = useParams<{id: string}>();
    const navigate = useNavigate();
    const { t: tGlobal } = useTranslation();
    const { language } = useAuthStore();
    const lang = language || 'en';
    const t = pcTranslations[lang] || pcTranslations['en'];
    const { currentStep, setStep, loadProduct, reset } = useProductStore();
    const isRTL = lang === 'ur';
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('draft');
    const [reviewStatus, setReviewStatus] = useState('');
    const [reviewNotes, setReviewNotes] = useState('');
    const [reviewFlags, setReviewFlags] = useState<string[]>([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const EDIT_STEPS = [
        { id: 1, label: t.step1 || 'Photo', icon: 'photo_camera' },
        { id: 2, label: t.step2 || 'Voice', icon: 'mic' },
        { id: 3, label: t.step3 || 'Details', icon: 'auto_awesome' },
        { id: 4, label: t.step4 || 'Materials', icon: 'receipt_long' },
        { id: 5, label: t.step5 || 'Price', icon: 'sell' },
        { id: 6, label: t.step6 || 'Inventory', icon: 'inventory_2' },
        { id: 7, label: t.step7 || 'Publish', icon: 'verified' }
    ];

    useEffect(() => {
        if (id) {
            const init = async () => {
                await loadProduct(id);
                try {
                    const { data } = await api.get(`/products/${id}`);
                    setStatus(data.status);
                    setReviewStatus(data.review_status || '');
                    setReviewNotes(data.review_notes || '');
                    setReviewFlags(data.review_flags || []);
                } catch (e) {
                    console.error(e);
                }
                setLoading(false);
            };
            init();
        }
        return () => reset();
    }, [id, loadProduct, reset]);

    const handleUnpublish = async () => {
        if (!id) return;
        try {
            await api.put(`/products/${id}/unpublish`);
            setStatus('draft');
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteProduct = async () => {
        if (!id) return;
        setIsDeleting(true);
        try {
            await api.delete(`/products/${id}`);
            setShowDeleteModal(false);
            useDashboardStore.getState().fetchMetrics();
            navigate('/artisan/products');
        } catch (err: any) {
            console.error("Failed to delete product", err);
            alert(err.response?.data?.detail || "Failed to delete product.");
        } finally {
            setIsDeleting(false);
        }
    };

    const renderStep = () => {
        switch(currentStep) {
            case 1: return <Step1Photo t={t} />;
            case 2: return <Step2Voice t={t} lang={lang} />;
            case 3: return <Step3ReviewAI t={t} />;
            case 4: return <Step4Materials t={t} />;
            case 5: return <Step5Pricing t={t} isRTL={isRTL} />;
            case 6: return <Step6Inventory t={t} />;
            case 7: return <Step7Publish t={t} />;
            default: return <Step1Photo t={t} />;
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-brand-bg flex items-center justify-center">{tGlobal('common.loading')}</div>;
    }

    return (
        <div className={`w-full pb-20 relative`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="w-full bg-white relative">
                <div className="sticky top-0 bg-white border-b border-stone-200 z-10 px-4 pt-10 pb-3 shadow-xs">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-stone-800">{tGlobal('products.update')}</h1>
                            {status === 'published' && (
                                <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{tGlobal('products.published')}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {status === 'published' && (
                                <button onClick={handleUnpublish} className="text-xs font-bold text-stone-500 hover:text-stone-700 underline">
                                    {tGlobal('products.unpublish')}
                                </button>
                            )}
                            <button 
                                onClick={() => setShowDeleteModal(true)} 
                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 active:scale-95 rounded-xl transition-all ml-1 min-w-[36px] min-h-[36px] flex items-center justify-center border border-red-200/60"
                                title="Delete Product"
                                aria-label="Delete Product"
                            >
                                <Trash2 size={18} />
                            </button>
                            <button 
                                onClick={() => navigate('/artisan/products')} 
                                className="text-stone-500 hover:text-stone-700 ml-1 p-2 rounded-xl hover:bg-stone-100 active:scale-95 min-w-[36px] min-h-[36px] flex items-center justify-center font-bold text-lg"
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                    
                    {/* Interactive Step Switcher for Instant Navigation */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar pt-1">
                        {EDIT_STEPS.map((step) => {
                            const isCurrent = currentStep === step.id;
                            return (
                                <button
                                    key={step.id}
                                    type="button"
                                    onClick={() => setStep(step.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 active:scale-95 ${
                                        isCurrent 
                                            ? 'bg-primary text-on-primary shadow-sm ring-2 ring-primary/30' 
                                            : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                                    }`}
                                >
                                    <span className="text-[10px] w-4 h-4 rounded-full bg-black/10 flex items-center justify-center font-black">
                                        {step.id}
                                    </span>
                                    <span>{step.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="p-4">
                    {reviewStatus === 'needs_changes' && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                            <h3 className="font-bold text-red-800 flex items-center gap-2 mb-2">
                                <span>⚠️</span> {tGlobal('facilitator.needs_changes') || 'Correction Requested'}
                            </h3>
                            {reviewNotes && <p className="text-sm text-red-700 mb-2">{reviewNotes}</p>}
                            {reviewFlags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {reviewFlags.map(f => (
                                        <span key={f} className="text-[10px] font-bold px-2 py-0.5 bg-white text-red-600 rounded border border-red-200">
                                            {tGlobal(`facilitator.flag_${f}`) || f}
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="mt-3 text-xs text-red-600 italic">
                                Editing any field will automatically mark this product as resubmitted for review.
                            </div>
                        </div>
                    )}
                    {renderStep()}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 backdrop-blur-sm animate-fade-in" onClick={() => setShowDeleteModal(false)}>
                    <div className="bg-surface rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-outline-variant bg-white" onClick={(e) => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={24} />
                        </div>
                        <h2 className="text-lg font-bold text-center text-stone-800 mb-1">{tGlobal('products.delete_product') || "Delete Product?"}</h2>
                        <p className="text-xs sm:text-sm text-center text-stone-600 mb-6">
                            {tGlobal('products.are_you_sure_delete') || "Are you sure you want to delete this product? It will be removed from your catalogue."}
                        </p>
                        <div className="flex gap-3">
                            <button 
                                type="button"
                                onClick={() => setShowDeleteModal(false)}
                                disabled={isDeleting}
                                className="flex-1 py-3 font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl text-sm transition-colors"
                            >
                                {tGlobal('common.cancel') || "Cancel"}
                            </button>
                            <button 
                                type="button"
                                onClick={handleDeleteProduct}
                                disabled={isDeleting}
                                className="flex-1 py-3 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl text-sm shadow-md transition-colors flex items-center justify-center gap-1.5"
                            >
                                {isDeleting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Deleting...</span>
                                    </>
                                ) : (
                                    <span>{tGlobal('products.delete_confirm') || "Delete"}</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductEdit;
