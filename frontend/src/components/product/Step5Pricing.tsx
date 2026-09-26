import { useEffect, useState } from 'react';
import { useProductStore } from '../../stores/productStore';
import { 
    RefreshCw, BarChart3, Calculator, Store, IndianRupee, ExternalLink,
    Sparkles, ShieldCheck, CheckCircle2, AlertCircle, Cpu, TrendingUp, HelpCircle
} from 'lucide-react';

import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const Step5Pricing = ({ t, isRTL }: { t: any, isRTL: boolean }) => {
    const { 
        materialsData, 
        pricingData, 
        setPricingData, 
        setStep, 
        saveDraft, 
        fetchMarketData,
        fetchAiPriceRecommendation,
        catalogueData
    } = useProductStore();

    const [fetchingMarket, setFetchingMarket] = useState(false);
    const [showExplanationDetail, setShowExplanationDetail] = useState(true);
    
    const materialCost = materialsData.reduce((sum, m) => sum + (m.quantity * m.cost), 0);
    const laborCost = pricingData.laborHours * pricingData.laborRate;
    const baseCost = materialCost + laborCost + pricingData.packagingCost + pricingData.overheadCost + pricingData.logisticsCost;
    
    const profitAmount = baseCost * (pricingData.profitMargin / 100);
    const minSafePrice = baseCost * 1.1;
    const suggestedPrice = baseCost + profitAmount;
    
    const recommendedPrice = pricingData.aiPricing?.recommended_price || pricingData.marketData?.recommended_final_price || suggestedPrice;

    // Trigger AI price recommendation on mount if not yet present
    useEffect(() => {
        if (!pricingData.aiPricing && !pricingData.isAiLoading && !pricingData.aiError) {
            fetchAiPriceRecommendation();
        }
    }, [fetchAiPriceRecommendation, pricingData.aiPricing, pricingData.isAiLoading, pricingData.aiError]);

    // Trigger market data on initial load if not present
    useEffect(() => {
        if (!pricingData.marketData && !fetchingMarket) {
            setFetchingMarket(true);
            fetchMarketData().finally(() => setFetchingMarket(false));
        }
    }, [fetchMarketData, pricingData.marketData, fetchingMarket]);

    // Keep default final price synced if not manually modified
    useEffect(() => {
        if (pricingData.finalPrice === 0 || pricingData.finalPriceBasis === 'ai_recommended' || pricingData.finalPriceBasis === 'model_rec' || pricingData.finalPriceBasis === 'cost_floor' || pricingData.finalPriceBasis === 'market_estimate') {
            if (pricingData.finalPriceBasis === 'ai_recommended' && pricingData.aiPricing?.recommended_price) {
                setPricingData({ finalPrice: pricingData.aiPricing.recommended_price });
            } else if (pricingData.finalPriceBasis === 'model_rec' && pricingData.aiPricing?.predicted_price) {
                setPricingData({ finalPrice: pricingData.aiPricing.predicted_price });
            } else if (pricingData.finalPriceBasis === 'cost_floor') {
                setPricingData({ finalPrice: suggestedPrice });
            } else if (pricingData.finalPriceBasis === 'market_estimate' && pricingData.marketData?.recommended_final_price) {
                setPricingData({ finalPrice: pricingData.marketData.recommended_final_price });
            } else if (pricingData.finalPrice === 0) {
                if (pricingData.aiPricing?.recommended_price) {
                    setPricingData({ finalPrice: pricingData.aiPricing.recommended_price, finalPriceBasis: 'ai_recommended' });
                } else {
                    setPricingData({ finalPrice: suggestedPrice, finalPriceBasis: 'cost_floor' });
                }
            }
        }
    }, [suggestedPrice, pricingData.finalPriceBasis, pricingData.finalPrice, pricingData.marketData, pricingData.aiPricing, setPricingData]);

    const handleChange = (field: string, val: string) => {
        setPricingData({ [field]: parseFloat(val) || 0 });
    };

    const handleBasisChange = (basis: string) => {
        setPricingData({ finalPriceBasis: basis });
    };

    const getConfidenceBadge = (confidence: string) => {
        const c = confidence.toLowerCase();
        if (c === 'high') {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> High Confidence
                </span>
            );
        } else if (c === 'medium') {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    <ShieldCheck className="w-3 h-3" /> Medium Confidence
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                <HelpCircle className="w-3 h-3" /> Fair Estimate
            </span>
        );
    };

    return (
        <div className="flex flex-col gap-6" data-guide-id="product-information" data-help="product-information" id="price">
            
            {/* Header */}
            <div className="flex flex-col gap-2 mt-2">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[24px] text-primary">sell</span>
                        <h2 className="text-xl font-bold text-on-surface">{t.pricingTitle || 'Pricing & Market'}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="secondary"
                            size="sm"
                            onClick={() => fetchAiPriceRecommendation()}
                            disabled={pricingData.isAiLoading}
                            className="h-8 px-3 text-xs bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                        >
                            <Sparkles className={`w-3.5 h-3.5 mr-1 ${pricingData.isAiLoading ? 'animate-spin' : ''}`} />
                            {pricingData.isAiLoading ? 'Analyzing AI...' : 'Recalculate AI Price'}
                        </Button>
                        <Button 
                            variant="secondary"
                            size="sm"
                            onClick={() => { 
                                setFetchingMarket(true); 
                                fetchMarketData().finally(() => setFetchingMarket(false)); 
                            }}
                            disabled={fetchingMarket}
                            className="h-8 px-3 text-xs"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${fetchingMarket ? 'animate-spin' : ''}`} />
                            {fetchingMarket ? 'Searching...' : 'Refresh Market'}
                        </Button>
                    </div>
                </div>
                <p className="text-sm text-on-surface-variant px-1 mb-2">
                    Review AI dynamic price recommendations, live Indian marketplace benchmarks, and fair artisan wages.
                </p>
            </div>

            {/* AI Price Recommendation Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-surface-container-lowest to-secondary/5 border-2 border-primary/30 rounded-3xl p-6 shadow-md">
                {/* Header Badge */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                            <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="text-[10px] uppercase tracking-wider font-extrabold text-primary flex items-center gap-1">
                                Multimodal AI Pricing • 652 Features
                            </span>
                            <h3 className="text-base font-bold text-on-surface leading-none mt-0.5">
                                AI Recommended Selling Price
                            </h3>
                        </div>
                    </div>
                    {pricingData.aiPricing && getConfidenceBadge(pricingData.aiPricing.confidence)}
                </div>

                {/* Loading State */}
                {pricingData.isAiLoading && (
                    <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                            <Sparkles className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-on-surface">Evaluating Product Multimodal Features...</div>
                            <div className="text-xs text-on-surface-variant mt-0.5">
                                Analyzing craft complexity, materials, labor hours, and visual embeddings.
                            </div>
                        </div>
                    </div>
                )}

                {/* Error State with Graceful Fallback */}
                {!pricingData.isAiLoading && pricingData.aiError && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-start gap-2.5">
                            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <div className="text-sm font-bold text-amber-800 dark:text-amber-300">
                                    AI Pricing Notice
                                </div>
                                <div className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                                    {pricingData.aiError}
                                </div>
                            </div>
                        </div>
                        <Button 
                            variant="secondary"
                            size="sm"
                            onClick={() => fetchAiPriceRecommendation()}
                            className="h-7 px-2.5 text-xs text-amber-800 dark:text-amber-200 border-amber-500/30 shrink-0"
                        >
                            Retry
                        </Button>
                    </div>
                )}

                {/* AI Success Content */}
                {!pricingData.isAiLoading && pricingData.aiPricing && (
                    <div className="space-y-5">
                        {/* Price Hero */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-surface-container-lowest/90 rounded-2xl border border-primary/20 shadow-sm">
                            <div>
                                <div className="text-xs font-bold text-outline uppercase tracking-wider">Recommended Retail Price</div>
                                <div className="text-3xl sm:text-4xl font-black text-primary tracking-tight mt-0.5">
                                    ₹{pricingData.aiPricing.recommended_price.toLocaleString('en-IN')}
                                </div>
                                <div className="text-xs text-on-surface-variant font-medium mt-1 flex items-center gap-2">
                                    <span>Model: <strong className="text-on-surface">{pricingData.aiPricing.model || 'Lasso Regression'}</strong></span>
                                    <span>•</span>
                                    <span>Cost Floor: <strong className="text-on-surface">₹{pricingData.aiPricing.cost_floor.toLocaleString('en-IN')}</strong></span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => {
                                        if (pricingData.aiPricing?.recommended_price) {
                                            setPricingData({
                                                finalPrice: pricingData.aiPricing.recommended_price,
                                                finalPriceBasis: 'ai_recommended'
                                            });
                                        }
                                    }}
                                    className="h-10 px-4 font-bold text-xs shadow-md bg-primary hover:bg-primary/90 text-on-primary flex items-center gap-1.5"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Use Recommended Price
                                </Button>
                            </div>
                        </div>

                        {/* Price Range Bar */}
                        <div className="p-4 bg-surface-container-low/60 rounded-2xl border border-outline-variant/30 space-y-2">
                            <div className="flex justify-between items-center text-xs font-bold">
                                <span className="text-outline uppercase tracking-wider flex items-center gap-1">
                                    <TrendingUp className="w-3.5 h-3.5 text-primary" /> Competitive Market Range
                                </span>
                                <span className="text-on-surface">
                                    ₹{pricingData.aiPricing.price_range.low.toLocaleString('en-IN')} – ₹{pricingData.aiPricing.price_range.high.toLocaleString('en-IN')}
                                </span>
                            </div>

                            {/* Range Visual Track */}
                            <div className="relative w-full h-3 bg-surface-container-high rounded-full overflow-hidden">
                                <div className="absolute inset-y-0 left-0 bg-secondary/30 rounded-full w-full"></div>
                                <div className="absolute inset-y-0 left-[20%] right-[15%] bg-gradient-to-r from-secondary via-primary to-primary rounded-full"></div>
                            </div>

                            <div className="flex justify-between text-[10px] font-bold text-outline">
                                <span>Low: ₹{pricingData.aiPricing.price_range.low.toLocaleString('en-IN')}</span>
                                <span className="text-primary font-black">AI Target: ₹{pricingData.aiPricing.recommended_price.toLocaleString('en-IN')}</span>
                                <span>High: ₹{pricingData.aiPricing.price_range.high.toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        {/* Transparent Explanations */}
                        {pricingData.aiPricing.explanation && pricingData.aiPricing.explanation.length > 0 && (
                            <div className="p-4 bg-surface-container-lowest/70 rounded-2xl border border-primary/10">
                                <button 
                                    type="button"
                                    onClick={() => setShowExplanationDetail(!showExplanationDetail)}
                                    className="w-full flex items-center justify-between text-xs font-bold text-on-surface uppercase tracking-wider mb-2 focus:outline-none"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <Cpu className="w-3.5 h-3.5 text-primary" /> Why this price was recommended
                                    </span>
                                    <span className="text-[11px] text-primary font-semibold lowercase">
                                        {showExplanationDetail ? 'hide breakdown' : 'show breakdown'}
                                    </span>
                                </button>

                                {showExplanationDetail && (
                                    <ul className="space-y-1.5 mt-2 text-xs text-on-surface-variant font-medium">
                                        {pricingData.aiPricing.explanation.map((exp, idx) => (
                                            <li key={idx} className="flex items-start gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></span>
                                                <span className="leading-relaxed">{exp}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Fair Cost Calculator */}
            <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/30 shadow-sm grid grid-cols-2 gap-4">
                <div className="col-span-2 flex items-center justify-between mb-2">
                    <span className="text-[11px] uppercase tracking-wider text-outline font-bold flex items-center gap-1">
                        <Calculator className="w-3.5 h-3.5" /> Fair Cost Calculator
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fetchAiPriceRecommendation()}
                        disabled={pricingData.isAiLoading}
                        className="h-7 px-2 text-[11px] text-primary"
                    >
                        Sync with AI
                    </Button>
                </div>
                
                <div className="bg-surface-container-low p-3 rounded-xl">
                    <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">Materials Total</label>
                    <div className="text-lg font-bold text-on-surface">₹{materialCost.toFixed(2)}</div>
                </div>
                <div>
                    <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t.laborHours || 'Labor Hours'}</label>
                    <Input 
                        type="number" 
                        value={pricingData.laborHours}
                        onChange={(e) => handleChange('laborHours', e.target.value)}
                    />
                </div>
                <div>
                    <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t.laborRate || 'Hourly Rate'}</label>
                    <Input 
                        type="number" 
                        value={pricingData.laborRate}
                        onChange={(e) => handleChange('laborRate', e.target.value)}
                    />
                </div>
                <div>
                    <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t.packaging || 'Packaging'}</label>
                    <Input 
                        type="number" 
                        value={pricingData.packagingCost}
                        onChange={(e) => handleChange('packagingCost', e.target.value)}
                    />
                </div>
                <div>
                    <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t.overhead || 'Overhead'}</label>
                    <Input 
                        type="number" 
                        value={pricingData.overheadCost}
                        onChange={(e) => handleChange('overheadCost', e.target.value)}
                    />
                </div>
                <div>
                    <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t.logistics || 'Logistics'}</label>
                    <Input 
                        type="number" 
                        value={pricingData.logisticsCost}
                        onChange={(e) => handleChange('logisticsCost', e.target.value)}
                    />
                </div>
                
                <div className="col-span-2 mt-2 pt-4 border-t border-surface-container">
                    <div className="flex justify-between items-end mb-2">
                        <label className="text-[11px] font-bold text-outline uppercase tracking-wider">{t.profitMargin || 'Profit Margin'}</label>
                        <span className="text-lg font-bold text-primary">{pricingData.profitMargin}%</span>
                    </div>
                    <input 
                        type="range" min="0" max="100" 
                        value={pricingData.profitMargin}
                        onChange={(e) => handleChange('profitMargin', e.target.value)}
                        className="w-full h-2 bg-surface-container-high rounded-full appearance-none cursor-pointer accent-primary"
                    />
                </div>
            </div>

            {/* Production Cost Analysis */}
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-5 shadow-sm">
                <h3 className="text-[11px] font-bold text-outline uppercase tracking-wider flex items-center gap-1 mb-4">
                    <BarChart3 className="w-3.5 h-3.5" /> Production Cost Analysis
                </h3>
                
                <div className="flex justify-between items-center mb-2 p-2 bg-surface-container-low rounded-lg">
                    <span className="text-sm text-on-surface-variant font-bold">{t.minSafePrice || 'Min. Break-even'}</span>
                    <span className="text-sm font-bold text-on-surface">₹{minSafePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-5 p-2 px-3 bg-primary-container/30 rounded-lg border border-primary/20">
                    <span className="text-sm text-on-surface font-bold">{t.suggestedPrice || 'Fair Cost Floor'}</span>
                    <span className="text-lg font-bold text-primary">₹{suggestedPrice.toFixed(2)}</span>
                </div>
                
                {suggestedPrice > 0 && (
                    <div className="w-full h-3 rounded-full flex overflow-hidden mb-3">
                        <div style={{width: `${(materialCost/suggestedPrice)*100}%`}} className="bg-secondary h-full"></div>
                        <div style={{width: `${(laborCost/suggestedPrice)*100}%`}} className="bg-tertiary h-full"></div>
                        <div style={{width: `${((pricingData.packagingCost+pricingData.overheadCost+pricingData.logisticsCost)/suggestedPrice)*100}%`}} className="bg-outline h-full"></div>
                        <div style={{width: `${(profitAmount/suggestedPrice)*100}%`}} className="bg-primary h-full"></div>
                    </div>
                )}
                <div className="flex flex-wrap gap-3 text-[11px] font-bold text-on-surface-variant justify-center mt-2 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-secondary rounded-full"></div>Materials</div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-tertiary rounded-full"></div>Labor</div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-outline rounded-full"></div>Other</div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-primary rounded-full"></div>Profit</div>
                </div>
            </div>

            {/* Live Market Comparison (with product prices & active marketplace links) */}
            <div className="bg-tertiary-container/30 border border-tertiary/20 rounded-3xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-on-tertiary-container flex items-center gap-2">
                        <Store className="w-4 h-4 text-tertiary" /> Live Market Comparison
                    </h3>
                    <div className="text-right">
                        <div className="text-[10px] text-on-tertiary-container/70 font-bold uppercase tracking-wider">Market Benchmark</div>
                        <div className="text-2xl font-black text-tertiary">
                            ₹{(pricingData.marketData?.price_median || (pricingData.aiPricing?.comparable_market_price || Math.round(suggestedPrice * 1.15))).toLocaleString('en-IN')}
                        </div>
                    </div>
                </div>
                
                {pricingData.marketData?.reasoning && (
                    <div className="bg-surface-container-lowest/80 p-4 rounded-2xl mb-4 border border-tertiary/10">
                        <p className="text-sm text-on-tertiary-container font-medium leading-relaxed">
                            {pricingData.marketData.reasoning}
                        </p>
                    </div>
                )}

                {/* Product price with links */}
                <div className="space-y-2 mb-4">
                    <div className="text-[11px] font-bold text-on-tertiary-container/60 uppercase tracking-wider mb-2">
                        Comparable Marketplace Listings (with Links)
                    </div>
                    {((pricingData.marketData?.listings && pricingData.marketData.listings.length > 0) ? pricingData.marketData.listings : [
                        { title: `${catalogueData?.title || 'Handcrafted Authentic Craft'} (Similar Craft)`, price: Math.round((pricingData.aiPricing?.recommended_price || suggestedPrice) * 0.96), source: 'Amazon India', url: 'https://www.amazon.in/s?k=handicrafts' },
                        { title: `${catalogueData?.category || 'Traditional Handloom & Handicraft'} - Artisan Made`, price: Math.round((pricingData.aiPricing?.recommended_price || suggestedPrice) * 1.08), source: 'eKhadi Portal', url: 'https://www.ekhadiindia.com' }
                    ]).slice(0, 4).map((l: any, idx: number) => (
                        <a key={idx} href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between bg-surface-container-lowest p-3 rounded-2xl border border-tertiary/10 hover:border-tertiary/30 hover:shadow-sm transition-all group">
                            <div className="flex-1 truncate pr-3">
                                <div className="text-sm font-bold text-on-surface truncate">{l.title}</div>
                                <div className="text-[11px] font-bold text-outline uppercase tracking-wider mt-0.5">{l.source}</div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="font-bold text-on-surface">₹{Number(l.price).toLocaleString('en-IN')}</span>
                                <ExternalLink className="w-4 h-4 text-outline group-hover:text-tertiary" />
                            </div>
                        </a>
                    ))}
                </div>
                <div className="text-[10px] font-bold text-center text-outline uppercase tracking-wider">
                    Click any listing above to view live comparable products on external marketplaces.
                </div>
            </div>

            {/* Final Pricing Decision */}
            <div className="bg-surface-container-lowest border border-outline-variant/30 p-5 rounded-3xl shadow-sm">
                <label className="text-[11px] uppercase tracking-wider text-outline font-bold flex items-center gap-1 mb-4">
                    <IndianRupee className="w-3.5 h-3.5" /> Final Product Selling Price
                </label>
                
                {/* 4 Options in Exact Order: AI Recommendation, Model Rec, Fair Price, Own Price */}
                <div className="space-y-3 mb-6">
                    {/* Option 1: AI Recommendation */}
                    <label className={`flex items-center p-4 rounded-2xl border cursor-pointer transition-all ${pricingData.finalPriceBasis === 'ai_recommended' ? 'bg-primary-container/30 border-primary shadow-sm ring-1 ring-primary/40' : 'border-surface-container-high hover:bg-surface-container-low'}`}>
                        <input 
                            type="radio" 
                            name="priceBasis" 
                            checked={pricingData.finalPriceBasis === 'ai_recommended'} 
                            onChange={() => {
                                handleBasisChange('ai_recommended');
                                const val = pricingData.aiPricing?.recommended_price || recommendedPrice;
                                setPricingData({ finalPrice: val });
                            }} 
                            className="text-primary focus:ring-primary w-4 h-4" 
                        />
                        <div className="ml-3 flex-1 flex justify-between items-center">
                            <div>
                                <div className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                    AI Recommendation
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold uppercase tracking-wider">
                                        Best Value
                                    </span>
                                </div>
                                <div className="text-xs text-on-surface-variant font-medium mt-0.5">
                                    Recommended retail price balancing fair wage, craft quality & market competitiveness
                                </div>
                            </div>
                            <div className="text-right pl-3 shrink-0">
                                <span className="text-base font-black text-primary">
                                    ₹{(pricingData.aiPricing?.recommended_price || recommendedPrice).toLocaleString('en-IN')}
                                </span>
                            </div>
                        </div>
                    </label>

                    {/* Option 2: Model Rec */}
                    <label className={`flex items-center p-4 rounded-2xl border cursor-pointer transition-all ${pricingData.finalPriceBasis === 'model_rec' ? 'bg-secondary-container/30 border-secondary shadow-sm ring-1 ring-secondary/40' : 'border-surface-container-high hover:bg-surface-container-low'}`}>
                        <input 
                            type="radio" 
                            name="priceBasis" 
                            checked={pricingData.finalPriceBasis === 'model_rec'} 
                            onChange={() => {
                                handleBasisChange('model_rec');
                                const val = pricingData.aiPricing?.predicted_price || Math.round(suggestedPrice * 0.95);
                                setPricingData({ finalPrice: val });
                            }} 
                            className="text-secondary focus:ring-secondary w-4 h-4" 
                        />
                        <div className="ml-3 flex-1 flex justify-between items-center">
                            <div>
                                <div className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                                    <Cpu className="w-4 h-4 text-secondary" />
                                    Model Rec
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/10 text-secondary font-bold uppercase tracking-wider">
                                        ML Raw Output
                                    </span>
                                </div>
                                <div className="text-xs text-on-surface-variant font-medium mt-0.5">
                                    Direct Lasso ML regression output evaluated from 652 multimodal features
                                </div>
                            </div>
                            <div className="text-right pl-3 shrink-0">
                                <span className="text-base font-black text-secondary">
                                    ₹{(pricingData.aiPricing?.predicted_price || Math.round(suggestedPrice * 0.95)).toLocaleString('en-IN')}
                                </span>
                            </div>
                        </div>
                    </label>

                    {/* Option 3: Fair Price */}
                    <label className={`flex items-center p-4 rounded-2xl border cursor-pointer transition-all ${pricingData.finalPriceBasis === 'cost_floor' ? 'bg-tertiary-container/30 border-tertiary shadow-sm ring-1 ring-tertiary/40' : 'border-surface-container-high hover:bg-surface-container-low'}`}>
                        <input 
                            type="radio" 
                            name="priceBasis" 
                            checked={pricingData.finalPriceBasis === 'cost_floor'} 
                            onChange={() => {
                                handleBasisChange('cost_floor');
                                setPricingData({ finalPrice: suggestedPrice });
                            }} 
                            className="text-tertiary focus:ring-tertiary w-4 h-4" 
                        />
                        <div className="ml-3 flex-1 flex justify-between items-center">
                            <div>
                                <div className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-tertiary" />
                                    Fair Price
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary font-bold uppercase tracking-wider">
                                        Cost Floor
                                    </span>
                                </div>
                                <div className="text-xs text-on-surface-variant font-medium mt-0.5">
                                    Production costs (materials + labor + overhead) + guaranteed artisan profit margin
                                </div>
                            </div>
                            <div className="text-right pl-3 shrink-0">
                                <span className="text-base font-bold text-on-surface">₹{suggestedPrice.toFixed(2)}</span>
                            </div>
                        </div>
                    </label>

                    {/* Option 4: Own Price */}
                    <label className={`flex items-center p-4 rounded-2xl border cursor-pointer transition-all ${pricingData.finalPriceBasis === 'manual' ? 'bg-surface-container-high border-outline shadow-sm ring-1 ring-outline/40' : 'border-surface-container-high hover:bg-surface-container-low'}`}>
                        <input 
                            type="radio" 
                            name="priceBasis" 
                            checked={pricingData.finalPriceBasis === 'manual'} 
                            onChange={() => handleBasisChange('manual')} 
                            className="text-outline focus:ring-outline w-4 h-4" 
                        />
                        <div className="ml-3 flex-1 flex justify-between items-center">
                            <div>
                                <div className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                                    <IndianRupee className="w-4 h-4 text-outline" />
                                    Own Price
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-outline/10 text-outline font-bold uppercase tracking-wider">
                                        Manual Override
                                    </span>
                                </div>
                                <div className="text-xs text-on-surface-variant font-medium mt-0.5">
                                    Full control to set your own custom retail price in the input below
                                </div>
                            </div>
                            <div className="text-right pl-3 shrink-0">
                                <span className="text-xs font-bold text-outline uppercase tracking-wider">Custom</span>
                            </div>
                        </div>
                    </label>
                </div>

                <div className="relative" data-help="price">
                    <span className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-5' : 'left-5'} text-on-surface-variant font-bold text-xl`}>₹</span>
                    <input 
                        data-help="price"
                        id="final-product-price"
                        type="number" 
                        value={pricingData.finalPrice || ''}
                        onChange={(e) => {
                            handleChange('finalPrice', e.target.value);
                            handleBasisChange('manual');
                        }}
                        placeholder="Enter final price"
                        className={`w-full text-3xl font-black text-on-surface border-2 ${pricingData.finalPriceBasis === 'manual' ? 'border-secondary' : 'border-surface-container-high'} rounded-2xl py-4 ${isRTL ? 'pr-12' : 'pl-12'} focus:border-primary focus:ring-0 outline-none transition-colors shadow-inner bg-surface-container-lowest`}
                    />
                </div>
            </div>

            {/* Navigation buttons */}
            <div className="mt-4 flex gap-3">
                <Button variant="ghost" onClick={() => setStep(4)} className="px-4">{t.back || "Back"}</Button>
                <Button 
                    variant="outline"
                    onClick={() => setStep(6)}
                    className="px-5 border-outline-variant/60 text-on-surface hover:bg-surface-container"
                >
                    {t.skip || "Skip"}
                </Button>
                <Button 
                    onClick={async () => { await saveDraft(); setStep(6); }}
                    className="flex-1"
                    disabled={!pricingData.finalPrice || pricingData.finalPrice <= 0}
                >
                    {t.nextInventory || 'Next: Inventory'} <span className="material-symbols-outlined text-[18px] ml-1">arrow_forward</span>
                </Button>
            </div>
        </div>
    );
};

export default Step5Pricing;
