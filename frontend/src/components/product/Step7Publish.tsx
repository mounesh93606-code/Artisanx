import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { useProductStore } from '../../stores/productStore';
import api from '../../lib/api';
import ReadinessScore from './ReadinessScore';
import { Button } from '../ui/Button';

const Step7Publish = ({ t }: { t: any }) => {
    const { photos, catalogueData, pricingData, setStep, saveDraft, publishProduct, draftId } = useProductStore();
    const navigate = useNavigate();
    const [isPublishing, setIsPublishing] = useState(false);
    const [success, setSuccess] = useState(false);
    
    const [readiness, setReadiness] = useState<any>(null);
    const [loadingReadiness, setLoadingReadiness] = useState(true);

    useEffect(() => {
        const initReadiness = async () => {
            try {
                if (!draftId) {
                    await saveDraft();
                }
                const currentDraftId = useProductStore.getState().draftId;
                if (currentDraftId) {
                    const { data } = await api.get(`/products/${currentDraftId}/readiness`);
                    setReadiness(data);
                }
            } catch (error) {
                console.error("Failed to fetch readiness", error);
            } finally {
                setLoadingReadiness(false);
            }
        };
        initReadiness();
    }, [draftId, saveDraft]);

    const handlePublish = async () => {
        setIsPublishing(true);
        try {
            // Feature guard: verify profile exists before publishing/passport generation
            try {
                await api.get('/artisans/me');
            } catch (err) {
                alert("Complete your artisan profile before generating a Product Passport.");
                navigate('/artisan/profile');
                return;
            }

            await publishProduct();
            setSuccess(true);
            navigate('/artisan');
        } catch (error: any) {
            console.error(error);
            if (error.response?.data?.detail?.message === "Product not ready for publishing") {
                alert("Product is not ready for publishing. Ensure score is >= 70.");
                // Update readiness dynamically if failed on server
                setReadiness(error.response.data.detail.readiness);
            } else {
                alert("Failed to publish product.");
            }
        } finally {
            setIsPublishing(false);
        }
    };

    const handleFixItem = (field: string) => {
        const stepMapping: Record<string, number> = {
            main_image: 1,
            additional_images: 1,
            title: 3,
            description: 3,
            category: 3,
            tags: 3,
            materials: 4,
            price: 5,
            stock_quantity: 5,
            moq: 5,
            lead_time_days: 5,
            dimensions: 3,
            care_instructions: 3,
            verification: 1 // Can't really fix verification in product setup, but it redirects them anyway
        };
        const targetStep = stepMapping[field] || 3;
        setStep(targetStep);
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center bg-surface-container-lowest rounded-3xl border border-outline-variant/30 mt-4 shadow-sm" data-guide-id="publish-success">
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-secondary rounded-full animate-ping opacity-40"></div>
                    <CheckCircle className="w-24 h-24 text-secondary relative z-10 bg-surface-container-lowest rounded-full" />
                </div>
                <h2 className="text-2xl font-bold text-on-surface mb-2">{t.successMsg || 'Product Published!'}</h2>
                <p className="text-on-surface-variant max-w-[250px] mx-auto text-sm">
                    Your product is now live on the marketplace. Returning to dashboard...
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 mt-2">
                <div className="flex items-center gap-2 px-1">
                    <span className="material-symbols-outlined text-[24px] text-primary">verified_user</span>
                    <h2 className="text-xl font-bold text-on-surface">{t.publishTitle || 'Review & Publish'}</h2>
                </div>
                <p className="text-sm text-on-surface-variant px-1 mb-2">
                    Ensure your product meets quality standards before publishing.
                </p>
            </div>
            
            <div data-guide-id="readiness-score">
                {loadingReadiness ? (
                    <div className="py-8 flex justify-center"><span className="material-symbols-outlined animate-spin text-primary text-[32px]">progress_activity</span></div>
                ) : readiness ? (
                    <ReadinessScore 
                        score={readiness.total_score} 
                        missingFields={readiness.missing_fields} 
                        onFixItem={handleFixItem} 
                    />
                ) : (
                    <div className="bg-error-container text-on-error-container p-4 rounded-xl text-sm font-medium">Failed to calculate readiness score.</div>
                )}
            </div>

            <div className="bg-surface-container-lowest rounded-3xl overflow-hidden border border-outline-variant/30 mt-2 shadow-sm">
                <div className="h-48 bg-surface-container-high relative">
                    {photos.length > 0 ? (
                        <img src={photos[0].image_url} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-on-surface-variant">
                            <span className="material-symbols-outlined text-[32px] mb-2 opacity-50">hide_image</span>
                            <span className="text-sm font-bold uppercase tracking-wider opacity-50">No Photo</span>
                        </div>
                    )}
                    <div className="absolute bottom-3 right-3 bg-surface-container-lowest/90 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-sm border border-outline-variant/20">
                        <span className="font-black text-on-surface">₹{pricingData.finalPrice.toFixed(2)}</span>
                    </div>
                </div>
                <div className="p-5">
                    <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">category</span>
                        {catalogueData?.category || 'Category'}
                    </div>
                    <h3 className="text-lg font-bold text-on-surface line-clamp-1 mb-1">{catalogueData?.title || 'Product Title'}</h3>
                    <p className="text-sm text-on-surface-variant line-clamp-2 leading-relaxed">{catalogueData?.description || 'Product description will appear here...'}</p>
                </div>
            </div>

            <div className="mt-4 flex flex-col gap-3">
                <Button 
                    data-help="publish-product"
                    data-guide-id="publish-button"
                    onClick={handlePublish}
                    disabled={!readiness?.is_publishable || isPublishing || loadingReadiness}
                    fullWidth
                    size="lg"
                    className="h-14 text-base"
                >
                    {isPublishing ? (
                        <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined animate-spin">progress_activity</span>
                            Publishing...
                        </span>
                    ) : (
                        <><span className="material-symbols-outlined mr-2">rocket_launch</span> {t.publish || 'Publish Product'}</>
                    )}
                </Button>
                <Button 
                    variant="outline"
                    onClick={async () => { await saveDraft(); navigate('/artisan'); }}
                    disabled={isPublishing}
                    fullWidth
                    className="h-14 bg-surface-container-lowest text-base border-outline-variant/50"
                >
                    {t.saveDraft || 'Save as Draft & Exit'}
                </Button>
            </div>
            
            <div className="flex justify-center mt-2">
                <Button variant="ghost" onClick={() => setStep(6)} className="px-6">{t.back || 'Back to Inventory'}</Button>
            </div>
        </div>
    );
};
export default Step7Publish;
