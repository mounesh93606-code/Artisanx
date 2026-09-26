import { useState, useEffect } from 'react';
import { useProductStore } from '../../stores/productStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Package, Plus, Trash2, Settings } from 'lucide-react';
import api from '../../lib/api';

const Step6Inventory = ({ t }: { t: any }) => {
    const { catalogueData, setCatalogueData, setStep, saveDraft, draftId } = useProductStore();
    const [variants, setVariants] = useState<any[]>([]);
    const [loadingVariants, setLoadingVariants] = useState(false);
    
    // Fetch variants if product exists
    useEffect(() => {
        if (draftId) {
            setLoadingVariants(true);
            api.get(`/products/variants/${draftId}`)
                .then(res => setVariants(res.data.variants || []))
                .catch(err => console.error(err))
                .finally(() => setLoadingVariants(false));
        }
    }, [draftId]);

    const handleDataChange = (field: string, val: any) => {
        setCatalogueData({ ...(catalogueData || {}), [field]: val });
    };

    const addVariant = () => {
        setVariants([...variants, { id: `temp_${Date.now()}`, type: 'colour', value: '', stock_quantity: null, price_adjustment: 0, is_new: true }]);
    };

    const updateVariant = (index: number, field: string, value: any) => {
        const newVariants = [...variants];
        newVariants[index][field] = value;
        setVariants(newVariants);
    };

    const removeVariant = async (index: number) => {
        const variant = variants[index];
        if (!variant.is_new && draftId) {
            try {
                await api.delete(`/products/variants/${variant.id}`);
            } catch (err) {
                console.error("Failed to delete variant", err);
            }
        }
        const newVariants = [...variants];
        newVariants.splice(index, 1);
        setVariants(newVariants);
    };

    const handleSaveAndNext = async () => {
        await saveDraft();
        
        // Save variants
        if (draftId && variants.length > 0) {
            try {
                const variantsToSave = variants.map(v => ({
                    type: v.type,
                    value: v.value,
                    stock_quantity: v.stock_quantity === '' ? null : v.stock_quantity,
                    price_adjustment: v.price_adjustment || 0
                }));
                // We'll replace all variants for simplicity, assuming a PUT replaces them
                await api.put(`/products/variants/${draftId}`, { variants: variantsToSave });
            } catch (err) {
                console.error("Failed to save variants", err);
            }
        } else if (draftId && variants.length === 0) {
            try {
                await api.put(`/products/variants/${draftId}`, { variants: [] });
            } catch (err) {
                console.error(err);
            }
        }

        setStep(7);
    };

    return (
        <div className="flex flex-col gap-6" data-guide-id="inventory-section" data-help="inventory-section">
            <div className="flex flex-col gap-2 mt-2">
                <div className="flex items-center gap-2 px-1">
                    <Package className="w-6 h-6 text-primary" />
                    <h2 className="text-xl font-bold text-on-surface">Inventory & Variants</h2>
                </div>
                <p className="text-sm text-on-surface-variant px-1 mb-2">
                    Manage your stock, capacities, and product options like colors or sizes.
                </p>
            </div>
            
            {/* Base Inventory */}
            <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/30 shadow-sm grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="flex items-center gap-3 p-4 border border-outline-variant rounded-2xl cursor-pointer hover:bg-surface-container-low transition-colors">
                        <input 
                            type="checkbox" 
                            checked={catalogueData?.is_made_to_order || false}
                            onChange={(e) => handleDataChange('is_made_to_order', e.target.checked)}
                            className="w-5 h-5 rounded text-primary focus:ring-primary"
                        />
                        <div>
                            <span className="block font-bold text-on-surface">Made to Order</span>
                            <span className="block text-xs text-on-surface-variant">Check this if you craft this item only after receiving an order.</span>
                        </div>
                    </label>
                </div>

                {!catalogueData?.is_made_to_order ? (
                    <>
                        <div>
                            <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">Available Stock</label>
                            <Input 
                                data-help="stock-input"
                                type="number" 
                                value={catalogueData?.stock_quantity ?? ''}
                                onChange={(e) => handleDataChange('stock_quantity', e.target.value === '' ? '' : parseInt(e.target.value))}
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">Low Stock Warning</label>
                            <Input 
                                type="number" 
                                value={catalogueData?.low_stock_threshold ?? 5}
                                onChange={(e) => handleDataChange('low_stock_threshold', e.target.value === '' ? '' : parseInt(e.target.value))}
                            />
                        </div>
                    </>
                ) : (
                    <>
                        <div>
                            <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">Monthly Capacity</label>
                            <Input 
                                type="number" 
                                value={catalogueData?.monthly_capacity ?? ''}
                                onChange={(e) => handleDataChange('monthly_capacity', e.target.value === '' ? '' : parseInt(e.target.value))}
                                placeholder="e.g. 50"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">Lead Time (Days)</label>
                            <Input 
                                type="number" 
                                value={catalogueData?.lead_time_days ?? ''}
                                onChange={(e) => handleDataChange('lead_time_days', e.target.value === '' ? '' : parseInt(e.target.value))}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Variants */}
            <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/30 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-on-surface flex items-center gap-2">
                        <Settings className="w-5 h-5 text-secondary" /> Product Variants
                    </h3>
                    <Button variant="secondary" size="sm" onClick={addVariant} className="h-8">
                        <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                </div>
                <p className="text-xs text-on-surface-variant mb-4">Add options like colors, sizes, or patterns if your product comes in different variations.</p>
                
                {loadingVariants ? (
                    <div className="py-4 text-center text-sm text-stone-500 animate-pulse">Loading variants...</div>
                ) : variants.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-outline-variant/50 rounded-2xl bg-surface-container-low text-on-surface-variant text-sm font-medium">
                        No variants added yet.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {variants.map((v, i) => (
                            <div key={v.id || i} className="bg-surface border border-outline-variant/50 rounded-2xl p-4 flex flex-col gap-3 relative">
                                <button onClick={() => removeVariant(i)} className="absolute top-4 right-4 text-stone-400 hover:text-error transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="grid grid-cols-2 gap-3 pr-8">
                                    <div>
                                        <label className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">Type</label>
                                        <select 
                                            value={v.type} 
                                            onChange={(e) => updateVariant(i, 'type', e.target.value)}
                                            className="w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                                        >
                                            <option value="colour">Colour</option>
                                            <option value="size">Size</option>
                                            <option value="pattern">Pattern</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">Value (e.g. Red)</label>
                                        <Input 
                                            value={v.value} 
                                            onChange={(e) => updateVariant(i, 'value', e.target.value)}
                                            className="py-2"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 pr-8">
                                    <div>
                                        <label className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">Stock (Optional)</label>
                                        <Input 
                                            type="number"
                                            value={v.stock_quantity ?? ''} 
                                            onChange={(e) => updateVariant(i, 'stock_quantity', e.target.value === '' ? '' : parseInt(e.target.value))}
                                            placeholder="Auto"
                                            className="py-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">Price Adjust (₹)</label>
                                        <Input 
                                            type="number"
                                            value={v.price_adjustment ?? 0} 
                                            onChange={(e) => updateVariant(i, 'price_adjustment', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                            className="py-2"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-4 flex gap-3">
                <Button variant="ghost" onClick={() => setStep(5)} className="px-4">{t.back || 'Back'}</Button>
                <Button 
                    variant="outline" 
                    onClick={() => setStep(7)}
                    className="px-5 border-outline-variant/60 text-on-surface hover:bg-surface-container"
                >
                    {t.skip || 'Skip'}
                </Button>
                <Button onClick={handleSaveAndNext} className="flex-1">
                    Review & Publish <span className="material-symbols-outlined text-[18px] ml-1">arrow_forward</span>
                </Button>
            </div>
        </div>
    );
};
export default Step6Inventory;
