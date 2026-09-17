import { useEffect, useState } from 'react';
import { useProductStore } from '../../stores/productStore';
import { ExternalLink, RefreshCw, BarChart3, Calculator, Store, IndianRupee } from 'lucide-react';

import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const Step5Pricing = ({ t, isRTL }: { t: any, isRTL: boolean }) => {
    const { materialsData, pricingData, setPricingData, setStep, saveDraft, fetchMarketData } = useProductStore();
    const [fetchingMarket, setFetchingMarket] = useState(false);
    
    const materialCost = materialsData.reduce((sum, m) => sum + (m.quantity * m.cost), 0);
    const laborCost = pricingData.laborHours * pricingData.laborRate;
    const baseCost = materialCost + laborCost + pricingData.packagingCost + pricingData.overheadCost + pricingData.logisticsCost;
    
    const profitAmount = baseCost * (pricingData.profitMargin / 100);
    const minSafePrice = baseCost * 1.1;
    const suggestedPrice = baseCost + profitAmount;
    
    const recommendedPrice = pricingData.marketData?.recommended_final_price || suggestedPrice;

    useEffect(() => {
        // Only fetch if not already present or unavailable
        if (!pricingData.marketData) {
            setFetchingMarket(true);
            fetchMarketData().finally(() => setFetchingMarket(false));
        }
    }, [fetchMarketData, pricingData.marketData]);

    useEffect(() => {
        if (pricingData.finalPrice === 0 || pricingData.finalPriceBasis === 'cost_floor' || pricingData.finalPriceBasis === 'market_estimate') {
            if (pricingData.finalPriceBasis === 'cost_floor') {
                setPricingData({ finalPrice: suggestedPrice });
            } else if (pricingData.finalPriceBasis === 'market_estimate' && pricingData.marketData?.source === 'live_search') {
                setPricingData({ finalPrice: recommendedPrice });
            } else if (pricingData.finalPrice === 0) {
                 setPricingData({ finalPrice: suggestedPrice });
            }
        }
    }, [suggestedPrice, recommendedPrice, pricingData.finalPriceBasis, pricingData.finalPrice, pricingData.marketData, setPricingData]);

    const handleChange = (field: string, val: string) => {
        setPricingData({ [field]: parseFloat(val) || 0 });
    };

    const handleBasisChange = (basis: string) => {
        setPricingData({ finalPriceBasis: basis });
    };

    return (
        <div className="flex flex-col gap-6" data-guide-id="fair-price-section">
            <div className="flex flex-col gap-2 mt-2">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[24px] text-primary">sell</span>
                        <h2 className="text-xl font-bold text-on-surface">{t.pricingTitle || 'Pricing & Market'}</h2>
                    </div>
                    <Button 
                        variant="secondary"
                        size="sm"
                        onClick={() => { setFetchingMarket(true); fetchMarketData().finally(() => setFetchingMarket(false)); }}
                        disabled={fetchingMarket}
                        className="h-8 px-3 text-xs"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1 ${fetchingMarket ? 'animate-spin' : ''}`} />
                        {fetchingMarket ? 'Analyzing...' : 'Refresh Market'}
                    </Button>
                </div>
                <p className="text-sm text-on-surface-variant px-1 mb-2">
                    Calculate fair wages and compare with current market prices.
                </p>
            </div>
            
            <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/30 shadow-sm grid grid-cols-2 gap-4">
                <div className="col-span-2 flex items-center justify-between mb-2">
                    <span className="text-[11px] uppercase tracking-wider text-outline font-bold flex items-center gap-1">
                        <Calculator className="w-3.5 h-3.5" /> Fair Cost Calculator
                    </span>
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

            {/* Market Comparison Card */}
            {pricingData.marketData?.source === 'live_search' && (
                <div className="bg-tertiary-container/30 border border-tertiary/20 rounded-3xl p-5 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-on-tertiary-container flex items-center gap-2">
                            <Store className="w-4 h-4 text-tertiary" /> Market Comparison
                        </h3>
                        <div className="text-right">
                            <div className="text-[10px] text-on-tertiary-container/70 font-bold uppercase tracking-wider">Median Price</div>
                            <div className="text-2xl font-black text-tertiary">₹{pricingData.marketData.price_median?.toFixed(2)}</div>
                        </div>
                    </div>
                    
                    <div className="bg-surface-container-lowest/80 p-4 rounded-2xl mb-4 border border-tertiary/10">
                        <p className="text-sm text-on-tertiary-container font-medium leading-relaxed">
                            {pricingData.marketData.reasoning}
                        </p>
                    </div>

                    <div className="space-y-2 mb-4">
                        <div className="text-[11px] font-bold text-on-tertiary-container/60 uppercase tracking-wider mb-2">Real Sample Listings</div>
                        {(pricingData.marketData.listings || []).slice(0, 3).map((l: any, idx: number) => (
                            <a key={idx} href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between bg-surface-container-lowest p-3 rounded-2xl border border-tertiary/10 hover:border-tertiary/30 hover:shadow-sm transition-all group">
                                <div className="flex-1 truncate pr-3">
                                    <div className="text-sm font-bold text-on-surface truncate">{l.title}</div>
                                    <div className="text-[11px] font-bold text-outline uppercase tracking-wider mt-0.5">{l.source}</div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="font-bold text-on-surface">₹{l.price}</span>
                                    <ExternalLink className="w-4 h-4 text-outline group-hover:text-tertiary" />
                                </div>
                            </a>
                        ))}
                    </div>
                    <div className="text-[10px] font-bold text-center text-outline uppercase tracking-wider">
                        Based on live marketplace listings found on Amazon India, Flipkart and Amazon Karigar.
                    </div>
                </div>
            )}

            <div className="bg-surface-container-lowest border border-outline-variant/30 p-5 rounded-3xl shadow-sm">
                <label className="text-[11px] uppercase tracking-wider text-outline font-bold flex items-center gap-1 mb-4">
                    <IndianRupee className="w-3.5 h-3.5" /> Final Pricing Decision
                </label>
                
                <div className="space-y-3 mb-6">
                    <label className={`flex items-center p-4 rounded-2xl border cursor-pointer transition-all ${pricingData.finalPriceBasis === 'cost_floor' ? 'bg-primary-container/20 border-primary shadow-sm' : 'border-surface-container-high hover:bg-surface-container-low'}`}>
                        <input type="radio" name="priceBasis" checked={pricingData.finalPriceBasis === 'cost_floor'} onChange={() => handleBasisChange('cost_floor')} className="text-primary focus:ring-primary w-4 h-4" />
                        <div className="ml-3">
                            <div className="text-sm font-bold text-on-surface">Use Fair Cost Floor</div>
                            <div className="text-xs text-on-surface-variant font-medium mt-0.5">Costs + margin (₹{suggestedPrice.toFixed(2)})</div>
                        </div>
                    </label>

                    {pricingData.marketData?.source === 'live_search' && (
                        <label className={`flex items-center p-4 rounded-2xl border cursor-pointer transition-all ${pricingData.finalPriceBasis === 'market_estimate' ? 'bg-tertiary-container/20 border-tertiary shadow-sm' : 'border-surface-container-high hover:bg-surface-container-low'}`}>
                            <input type="radio" name="priceBasis" checked={pricingData.finalPriceBasis === 'market_estimate'} onChange={() => handleBasisChange('market_estimate')} className="text-tertiary focus:ring-tertiary w-4 h-4" />
                            <div className="ml-3">
                                <div className="text-sm font-bold text-on-surface">Use Market Estimate</div>
                                <div className="text-xs text-on-surface-variant font-medium mt-0.5">Market median or cost floor (₹{recommendedPrice.toFixed(2)})</div>
                            </div>
                        </label>
                    )}

                    <label className={`flex items-center p-4 rounded-2xl border cursor-pointer transition-all ${pricingData.finalPriceBasis === 'manual' ? 'bg-secondary-container/20 border-secondary shadow-sm' : 'border-surface-container-high hover:bg-surface-container-low'}`}>
                        <input type="radio" name="priceBasis" checked={pricingData.finalPriceBasis === 'manual'} onChange={() => handleBasisChange('manual')} className="text-secondary focus:ring-secondary w-4 h-4" />
                        <div className="ml-3">
                            <div className="text-sm font-bold text-on-surface">Set my own price</div>
                            <div className="text-xs text-on-surface-variant font-medium mt-0.5">Manually override retail price</div>
                        </div>
                    </label>
                </div>

                <div className="relative" data-help="price">
                    <span className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-5' : 'left-5'} text-on-surface-variant font-bold text-xl`}>₹</span>
                    <input 
                        data-help="price"
                        type="number" 
                        value={pricingData.finalPrice}
                        onChange={(e) => {
                            handleChange('finalPrice', e.target.value);
                            handleBasisChange('manual');
                        }}
                        className={`w-full text-3xl font-black text-on-surface border-2 ${pricingData.finalPriceBasis === 'manual' ? 'border-secondary' : 'border-surface-container-high'} rounded-2xl py-4 ${isRTL ? 'pr-12' : 'pl-12'} focus:border-primary focus:ring-0 outline-none transition-colors shadow-inner bg-surface-container-lowest`}
                    />
                </div>
            </div>

            <div className="mt-4 flex gap-4">
                <Button variant="ghost" onClick={() => setStep(4)} className="px-6">{t.back}</Button>
                <Button 
                    onClick={async () => { await saveDraft(); setStep(6); }}
                    fullWidth
                >
                    {t.nextInventory || 'Next: Inventory'} <span className="material-symbols-outlined text-[18px] ml-1">arrow_forward</span>
                </Button>
            </div>
        </div>
    );
};
export default Step5Pricing;
