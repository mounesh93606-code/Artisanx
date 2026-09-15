import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, Edit2, Package, ShieldCheck, 
    Layers, AlertCircle, QrCode,
    Tag, Ruler, Scale, Sparkles
} from 'lucide-react';
import api from '../../lib/api';
import { useTranslation } from 'react-i18next';
import ProductPassport from '../../components/product/ProductPassport';

export default function ProductDetail() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [product, setProduct] = useState<any>(null);
    const [images, setImages] = useState<any[]>([]);
    const [pricing, setPricing] = useState<any>(null);
    const [variants, setVariants] = useState<any[]>([]);
    const [passport, setPassport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeImageIdx, setActiveImageIdx] = useState(0);
    const [imageError, setImageError] = useState<Record<number, boolean>>({});

    useEffect(() => {
        if (!id) return;
        let isMounted = true;

        async function fetchProductDetails() {
            setLoading(true);
            setError(null);
            try {
                // 1. Fetch core product
                const { data: prodData } = await api.get(`/products/${id}`);
                if (!isMounted) return;
                setProduct(prodData);

                // 2. Fetch images
                try {
                    const { data: imgData } = await api.get(`/images/product/${id}`);
                    if (isMounted && Array.isArray(imgData) && imgData.length > 0) {
                        setImages(imgData);
                    } else if (isMounted && prodData.images && prodData.images.length > 0) {
                        setImages(prodData.images);
                    } else if (isMounted && prodData.main_image) {
                        setImages([{ image_url: prodData.main_image, is_main: true }]);
                    }
                } catch (e) {
                    if (isMounted && prodData.main_image) {
                        setImages([{ image_url: prodData.main_image, is_main: true }]);
                    }
                }

                // 3. Fetch pricing breakdown if available
                try {
                    const { data: priceData } = await api.get(`/pricing/${id}`);
                    if (isMounted) setPricing(priceData);
                } catch {
                    // Pricing breakdown is optional
                }

                // 4. Fetch variants if available
                try {
                    const { data: varData } = await api.get(`/products/variants/${id}`);
                    if (isMounted && varData?.variants) setVariants(varData.variants);
                } catch {
                    // Variants are optional
                }

                // 5. Fetch passport if available
                try {
                    const { data: passData } = await api.get(`/passports/${id}`);
                    if (isMounted) setPassport(passData);
                } catch {
                    // Passport might only exist if published
                    if (isMounted && prodData.passport) {
                        setPassport(prodData.passport);
                    }
                }

            } catch (err: any) {
                console.error("Failed to load product detail", err);
                if (isMounted) {
                    setError(err.response?.data?.detail || "Product not found or unavailable.");
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        fetchProductDetails();

        return () => {
            isMounted = false;
        };
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center p-6">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-medium text-stone-500">{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center p-6">
                <div className="bg-surface p-8 rounded-3xl shadow-sm text-center max-w-sm w-full border border-outline-variant">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <h2 className="text-lg font-bold text-stone-800 mb-2">Unable to Load Product</h2>
                    <p className="text-stone-600 text-sm mb-6">{error || "Product not found"}</p>
                    <button
                        onClick={() => navigate('/artisan/products')}
                        className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl shadow hover:bg-primary/90 transition-colors"
                    >
                        Back to My Products
                    </button>
                </div>
            </div>
        );
    }

    const currentImage = images[activeImageIdx];
    const materialsList = Array.isArray(product.materials?.list) 
        ? product.materials.list 
        : Array.isArray(product.materials) 
            ? product.materials 
            : [];

    const isPublished = product.status === 'published';

    return (
        <div className="w-full min-h-screen bg-surface-container-lowest flex flex-col">
            {/* Top Navigation Bar */}
            <div className="sticky top-0 bg-surface/95 backdrop-blur-md border-b border-outline-variant z-20 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                    <button 
                        onClick={() => navigate('/artisan/products')}
                        className="flex items-center gap-2 text-stone-700 hover:text-stone-900 font-bold text-sm px-2.5 py-1.5 rounded-xl hover:bg-stone-100 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>My Products</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                            isPublished 
                                ? 'bg-green-100 text-green-700 border border-green-200' 
                                : 'bg-stone-100 text-stone-600 border border-stone-200'
                        }`}>
                            {isPublished ? '● Published' : '○ Draft'}
                        </span>
                        
                        <button
                            onClick={() => navigate(`/artisan/products/${product.id}/edit`)}
                            className="flex items-center gap-1.5 bg-primary text-on-primary px-3 py-1.5 rounded-xl font-bold text-xs shadow hover:bg-primary/90 transition-all"
                        >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="w-full p-4 space-y-4">
                {/* Facilitator Review Alert if applicable */}
                {product.review_status && product.review_status !== 'approved' && (
                    <div className={`p-4 rounded-2xl border ${
                        product.review_status === 'needs_changes' 
                            ? 'bg-red-50 border-red-200 text-red-800' 
                            : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}>
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-sm capitalize">
                                    Facilitator Review: {product.review_status.replace('_', ' ')}
                                </h4>
                                {product.review_notes && (
                                    <p className="text-xs mt-1 leading-relaxed">{product.review_notes}</p>
                                )}
                                {product.review_flags && product.review_flags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {product.review_flags.map((flag: string) => (
                                            <span key={flag} className="text-[10px] font-bold px-2 py-0.5 bg-white rounded border">
                                                {flag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Hero Product Card: Image Gallery & Core Info */}
                <div className="bg-surface rounded-3xl p-4 border border-outline-variant shadow-sm space-y-4">
                    {/* Image Gallery */}
                    <div className="space-y-3">
                        <div className="w-full aspect-[4/3] rounded-2xl bg-stone-100 overflow-hidden relative border border-stone-200 flex items-center justify-center">
                            {currentImage && currentImage.image_url && !imageError[activeImageIdx] ? (
                                <img 
                                    src={currentImage.image_url} 
                                    alt={product.title || 'Product image'} 
                                    className="w-full h-full object-cover"
                                    onError={() => setImageError(prev => ({ ...prev, [activeImageIdx]: true }))}
                                />
                            ) : (
                                <div className="text-center p-6 text-stone-400">
                                    <Package className="w-12 h-12 mx-auto mb-2 opacity-40" />
                                    <p className="text-xs font-medium">No image available</p>
                                </div>
                            )}

                            {currentImage?.quality_score && (
                                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-amber-300" />
                                    <span>Quality: {currentImage.quality_score}/10</span>
                                </div>
                            )}
                        </div>

                        {/* Thumbnails if multiple images */}
                        {images.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                                {images.map((img, idx) => (
                                    <button
                                        key={img.id || idx}
                                        onClick={() => setActiveImageIdx(idx)}
                                        className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                                            activeImageIdx === idx 
                                                ? 'border-primary ring-2 ring-primary/20 scale-105' 
                                                : 'border-stone-200 opacity-70 hover:opacity-100'
                                        }`}
                                    >
                                        <img 
                                            src={img.image_url} 
                                            alt="" 
                                            className="w-full h-full object-cover"
                                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Primary Product Details */}
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wide mb-1">
                                <span>{product.category || 'Handicraft'}</span>
                                {product.craft_type && product.craft_type !== product.category && (
                                    <>
                                        <span>•</span>
                                        <span>{product.craft_type}</span>
                                    </>
                                )}
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 leading-tight">
                                {product.title || 'Untitled Product'}
                            </h1>
                            <p className="text-xs text-stone-400 mt-1 font-mono">
                                ID: {product.id}
                            </p>
                        </div>

                        {/* Price & Readiness Score */}
                        <div className="bg-surface-container-low/80 rounded-2xl p-4 border border-outline-variant/60 shadow-xs flex flex-col gap-2.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                                    Selling Price
                                </span>
                                {product.readiness_score !== undefined && (
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-surface border border-outline-variant/60 shadow-2xs shrink-0">
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                                            product.readiness_score >= 80 ? 'bg-emerald-500 ring-2 ring-emerald-100' :
                                            product.readiness_score >= 50 ? 'bg-amber-500 ring-2 ring-amber-100' : 'bg-rose-500 ring-2 ring-rose-100'
                                        }`} />
                                        <span className="text-stone-700">Readiness {product.readiness_score}%</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
                                    ₹{Number(product.price || 0).toLocaleString()}
                                </span>
                                <span className="text-xs font-semibold text-stone-400">
                                    per unit
                                </span>
                            </div>
                        </div>

                        {/* Full Description */}
                        <div>
                            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Description</h3>
                            {product.description ? (
                                <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-wrap">
                                    {product.description}
                                </p>
                            ) : (
                                <p className="text-stone-400 text-sm italic">No description provided.</p>
                            )}
                        </div>

                        {/* Tags */}
                        {Array.isArray(product.tags) && product.tags.length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Tags</h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {product.tags.map((t: string, idx: number) => (
                                        <span key={idx} className="text-xs font-medium px-2.5 py-1 bg-stone-100 text-stone-600 rounded-lg">
                                            #{t}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Specifications & Inventory Grid */}
                <div className="space-y-4">
                    {/* Inventory Details */}
                    <div className="bg-surface rounded-2xl p-5 border border-outline-variant shadow-sm space-y-3">
                        <h3 className="text-sm font-bold text-stone-800 flex items-center gap-2 border-b border-stone-100 pb-2">
                            <Package className="w-4 h-4 text-primary" />
                            <span>Inventory & Fulfillment</span>
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <span className="text-stone-500 block">Stock Status</span>
                                <span className="font-bold text-stone-800">
                                    {product.is_made_to_order ? 'Made to Order' : `${product.stock_quantity ?? 0} units available`}
                                </span>
                            </div>
                            <div>
                                <span className="text-stone-500 block">Min. Order Qty (MOQ)</span>
                                <span className="font-bold text-stone-800">{product.moq || 1} units</span>
                            </div>
                            <div>
                                <span className="text-stone-500 block">Lead Time</span>
                                <span className="font-bold text-stone-800">{product.lead_time_days ?? 0} days</span>
                            </div>
                            {product.reserved_stock > 0 && (
                                <div>
                                    <span className="text-stone-500 block">Reserved Stock</span>
                                    <span className="font-bold text-stone-800">{product.reserved_stock} units</span>
                                </div>
                            )}
                            {product.monthly_capacity && (
                                <div>
                                    <span className="text-stone-500 block">Monthly Capacity</span>
                                    <span className="font-bold text-stone-800">{product.monthly_capacity} units</span>
                                </div>
                            )}
                            <div>
                                <span className="text-stone-500 block">Customisation</span>
                                <span className="font-bold text-stone-800">
                                    {product.customisation_available ? 'Available' : 'Standard only'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Dimensions & Specifications */}
                    <div className="bg-surface rounded-2xl p-5 border border-outline-variant shadow-sm space-y-3">
                        <h3 className="text-sm font-bold text-stone-800 flex items-center gap-2 border-b border-stone-100 pb-2">
                            <Ruler className="w-4 h-4 text-primary" />
                            <span>Dimensions & Specifications</span>
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <span className="text-stone-500 block">Dimensions</span>
                                <span className="font-bold text-stone-800">{product.dimensions || 'Not specified'}</span>
                            </div>
                            <div>
                                <span className="text-stone-500 block">Weight</span>
                                <span className="font-bold text-stone-800">{product.weight || 'Not specified'}</span>
                            </div>
                            <div>
                                <span className="text-stone-500 block">Craft Type</span>
                                <span className="font-bold text-stone-800">{product.craft_type || product.category || 'Handcrafted'}</span>
                            </div>
                            <div>
                                <span className="text-stone-500 block">Location</span>
                                <span className="font-bold text-stone-800">{product.location || 'India'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Materials & Care Instructions */}
                {(materialsList.length > 0 || product.care_instructions) && (
                    <div className="bg-surface rounded-2xl p-5 border border-outline-variant shadow-sm space-y-4">
                        {materialsList.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-stone-800 flex items-center gap-2 mb-3">
                                    <Layers className="w-4 h-4 text-primary" />
                                    <span>Materials Used</span>
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {materialsList.map((m: any, idx: number) => {
                                        const name = typeof m === 'string' ? m : m?.name;
                                        const qty = m?.quantity ? ` (${m.quantity} ${m.unit || ''})` : '';
                                        return (
                                            <span key={idx} className="px-3 py-1.5 bg-stone-100 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700">
                                                {name}{qty}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {product.care_instructions && (
                            <div className="border-t border-stone-100 pt-3">
                                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Care Instructions</h4>
                                <p className="text-xs text-stone-700 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100">
                                    {product.care_instructions}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Pricing & Cost Breakdown (Artisan Only) */}
                {(pricing || product.min_safe_price || product.suggested_price) && (
                    <div className="bg-surface rounded-2xl p-5 border border-outline-variant shadow-sm space-y-3">
                        <h3 className="text-sm font-bold text-stone-800 flex items-center gap-2 border-b border-stone-100 pb-2">
                            <Scale className="w-4 h-4 text-primary" />
                            <span>Fair Price & Cost Analysis</span>
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            {product.min_safe_price !== undefined && (
                                <div className="p-3 bg-stone-50 rounded-xl">
                                    <span className="text-stone-500 block">Min Safe Price</span>
                                    <span className="font-bold text-stone-800 text-sm">₹{Number(product.min_safe_price).toFixed(2)}</span>
                                </div>
                            )}
                            {product.suggested_price !== undefined && (
                                <div className="p-3 bg-stone-50 rounded-xl">
                                    <span className="text-stone-500 block">Suggested Price</span>
                                    <span className="font-bold text-stone-800 text-sm">₹{Number(product.suggested_price).toFixed(2)}</span>
                                </div>
                            )}
                            {pricing?.labor_hours !== undefined && (
                                <div className="p-3 bg-stone-50 rounded-xl">
                                    <span className="text-stone-500 block">Labor Time</span>
                                    <span className="font-bold text-stone-800 text-sm">{pricing.labor_hours} hrs</span>
                                </div>
                            )}
                            {pricing?.profit_margin_percent !== undefined && (
                                <div className="p-3 bg-stone-50 rounded-xl">
                                    <span className="text-stone-500 block">Profit Margin</span>
                                    <span className="font-bold text-stone-800 text-sm">{pricing.profit_margin_percent}%</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Product Variants if any */}
                {variants.length > 0 && (
                    <div className="bg-surface rounded-2xl p-5 border border-outline-variant shadow-sm space-y-3">
                        <h3 className="text-sm font-bold text-stone-800 flex items-center gap-2 border-b border-stone-100 pb-2">
                            <Tag className="w-4 h-4 text-primary" />
                            <span>Product Variants ({variants.length})</span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {variants.map((v, i) => (
                                <div key={i} className="flex justify-between items-center p-3 bg-stone-50 rounded-xl text-xs">
                                    <span className="font-bold text-stone-700 capitalize">{v.type}: {v.value}</span>
                                    <span className="text-stone-500">
                                        Stock: {v.stock_quantity ?? '—'} | Adj: {v.price_adjustment >= 0 ? `+₹${v.price_adjustment}` : `-₹${Math.abs(v.price_adjustment)}`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Digital Product Passport (When Available) */}
                {passport && passport.passport_data && (
                    <div className="bg-surface rounded-2xl p-5 border border-outline-variant shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-stone-800 flex items-center gap-2 border-b border-stone-100 pb-2">
                            <QrCode className="w-4 h-4 text-primary" />
                            <span>Digital Product Passport</span>
                        </h3>
                        <ProductPassport 
                            passportData={passport.passport_data} 
                            qrCodeUrl={passport.qr_code_url} 
                            shareableUrl={passport.shareable_url} 
                            isArtisanView={true}
                        />
                    </div>
                )}

                {/* Artisan Information */}
                {(product.artisan_name || product.business_name || product.craft_story) && (
                    <div className="bg-surface rounded-2xl p-5 border border-outline-variant shadow-sm space-y-3">
                        <h3 className="text-sm font-bold text-stone-800 flex items-center gap-2 border-b border-stone-100 pb-2">
                            <ShieldCheck className="w-4 h-4 text-primary" />
                            <span>Artisan & Workshop</span>
                        </h3>
                        <div className="text-xs space-y-2">
                            <div className="flex justify-between">
                                <span className="text-stone-500">Artisan Name:</span>
                                <span className="font-bold text-stone-800">{product.artisan_name || 'Artisan'}</span>
                            </div>
                            {product.business_name && (
                                <div className="flex justify-between">
                                    <span className="text-stone-500">Business / Studio:</span>
                                    <span className="font-bold text-stone-800">{product.business_name}</span>
                                </div>
                            )}
                            {product.craft_story && (
                                <div className="pt-2 border-t border-stone-100">
                                    <span className="text-stone-500 block mb-1">Craft Tradition & Story:</span>
                                    <p className="text-stone-700 italic bg-stone-50 p-3 rounded-xl border border-stone-100">
                                        "{product.craft_story}"
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Sticky Action Footer */}
            <div className="sticky bottom-0 bg-surface/95 backdrop-blur-md border-t border-outline-variant z-20 p-4 mt-auto">
                <div className="flex items-center justify-between gap-3">
                    <button
                        onClick={() => navigate('/artisan/products')}
                        className="px-4 py-2.5 rounded-xl border border-outline-variant font-bold text-sm text-stone-700 hover:bg-stone-100 transition-colors shrink-0"
                    >
                        Back
                    </button>
                    
                    <button
                        onClick={() => navigate(`/artisan/products/${product.id}/edit`)}
                        className="flex-1 py-2.5 px-4 bg-primary text-on-primary font-bold text-sm rounded-xl shadow hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                    >
                        <Edit2 className="w-4 h-4" />
                        <span>Edit Product</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
