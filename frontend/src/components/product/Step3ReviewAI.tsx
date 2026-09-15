import { useState } from 'react';
import { Sparkles, X, Plus, Edit2 } from 'lucide-react';
import { useProductStore } from '../../stores/productStore';
import api from '../../lib/api';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const Step3ReviewAI = ({ t }: { t: any }) => {
    const { t: tGlobal } = useTranslation();
    const { voiceData, catalogueData, setCatalogueData, setStep, saveDraft } = useProductStore();
    const [isLoading, setIsLoading] = useState(false);
    const [newTag, setNewTag] = useState('');
    const [editingField, setEditingField] = useState<string | null>(null);

    const handleManualEntry = () => {
        setCatalogueData({
            title: '',
            description: voiceData?.translated_text || voiceData?.original_text || '',
            category: '',
            tags: [],
            materials: [],
            care_instructions: '',
            estimated_production_time: '',
            dimensions: '',
            stock_quantity: '',
            reserved_stock: 0,
            is_made_to_order: false,
            monthly_capacity: '',
            low_stock_threshold: 5,
            moq: '',
            lead_time_days: ''
        });
    };

    const generateCatalogue = async () => {
        setIsLoading(true);
        try {
            const { data } = await api.post('/ai/generate-catalogue', {
                transcript: voiceData?.translated_text || voiceData?.original_text || ''
            });
            setCatalogueData({
                ...data,
                stock_quantity: catalogueData?.stock_quantity ?? '',
                moq: catalogueData?.moq ?? '',
                lead_time_days: catalogueData?.lead_time_days ?? ''
            });
        } catch (error) {
            console.error("AI catalogue generation failed:", error);
            handleManualEntry();
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddTag = () => {
        if (newTag.trim() && catalogueData) {
            setCatalogueData({ ...catalogueData, tags: [...catalogueData.tags, newTag.trim()] });
            setNewTag('');
        }
    };
    
    const removeTag = (idx: number) => {
        if (catalogueData) {
            const nt = [...catalogueData.tags];
            nt.splice(idx, 1);
            setCatalogueData({ ...catalogueData, tags: nt });
        }
    };

    if (!catalogueData) {
        return (
            <div className="flex flex-col items-center justify-center p-10 text-center h-[60vh] bg-surface-container-lowest rounded-3xl border border-outline-variant/30 mt-4 shadow-sm">
                <div className="w-20 h-20 bg-primary-container rounded-full flex items-center justify-center mb-6 relative">
                    <div className="absolute inset-0 bg-primary-container opacity-40 animate-ping rounded-full"></div>
                    <Sparkles className="w-10 h-10 text-primary relative z-10" />
                </div>
                <h3 className="text-2xl font-bold text-on-surface mb-3">AI Catalog Formatter</h3>
                <p className="text-on-surface-variant mb-6 max-w-[280px]">
                    We will use your spoken description to automatically generate buyer-ready details.
                </p>
                <div className="w-full flex flex-col gap-3">
                    <Button 
                        onClick={generateCatalogue}
                        disabled={isLoading}
                        fullWidth
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                Formatting Details...
                            </span>
                        ) : "Generate Details"}
                    </Button>
                    <Button 
                        variant="secondary"
                        onClick={handleManualEntry}
                        disabled={isLoading}
                        fullWidth
                    >
                        Enter Details Manually
                    </Button>
                </div>
                <div className="mt-4">
                    <Button variant="ghost" onClick={() => setStep(2)}>{t.back}</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6" data-guide-id="review-section">
            
            <div className="flex flex-col gap-2 mt-2">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[24px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                        <h2 className="text-xl font-bold text-on-surface">Catalog Details Formed</h2>
                    </div>
                    <span className="text-[11px] text-on-tertiary-container bg-tertiary-container px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        AI Formatted
                    </span>
                </div>
                <p className="text-sm text-on-surface-variant px-1 mb-2">
                    Synthesized automatically from your voice and verified against global buyer standards.
                </p>
            </div>
            
            <div className="space-y-3">
                {/* Title Card */}
                <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm flex flex-col group border border-outline-variant/30">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider text-outline font-bold">{tGlobal('products.title')}</span>
                        <button onClick={() => setEditingField(editingField === 'title' ? null : 'title')} className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
                            <Edit2 className="w-4 h-4" />
                        </button>
                    </div>
                    {editingField === 'title' ? (
                        <Input 
                            value={catalogueData.title}
                            onChange={(e) => setCatalogueData({...catalogueData, title: e.target.value})}
                            className="mt-2"
                            autoFocus
                        />
                    ) : (
                        <p className="text-lg text-on-surface font-bold mt-1 line-clamp-2">{catalogueData.title}</p>
                    )}
                </div>

                {/* Description Card */}
                <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm flex flex-col group border border-outline-variant/30">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider text-outline font-bold">{tGlobal('products.description')}</span>
                        <button onClick={() => setEditingField(editingField === 'description' ? null : 'description')} className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
                            <Edit2 className="w-4 h-4" />
                        </button>
                    </div>
                    {editingField === 'description' ? (
                        <textarea 
                            value={catalogueData.description}
                            onChange={(e) => setCatalogueData({...catalogueData, description: e.target.value})}
                            rows={4}
                            className="w-full mt-2 p-3 rounded-xl border-2 border-surface-container-high bg-surface-container-lowest focus:border-primary focus:ring-0 text-on-surface font-medium leading-relaxed resize-y"
                            autoFocus
                        />
                    ) : (
                        <p className="text-sm text-on-surface-variant font-medium mt-1 leading-relaxed">{catalogueData.description}</p>
                    )}
                </div>

                {/* Category Card */}
                <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm flex flex-col group border border-outline-variant/30">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider text-outline font-bold">{tGlobal('products.category')}</span>
                        <button onClick={() => setEditingField(editingField === 'category' ? null : 'category')} className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
                            <Edit2 className="w-4 h-4" />
                        </button>
                    </div>
                    {editingField === 'category' ? (
                        <Input 
                            value={catalogueData.category}
                            onChange={(e) => setCatalogueData({...catalogueData, category: e.target.value})}
                            className="mt-2"
                            autoFocus
                        />
                    ) : (
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className="material-symbols-outlined text-[18px] text-secondary">category</span>
                            <p className="text-on-surface font-bold">{catalogueData.category}</p>
                        </div>
                    )}
                </div>

                {/* Tags Card */}
                <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm flex flex-col group border border-outline-variant/30">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] uppercase tracking-wider text-outline font-bold">{tGlobal('products.tags')}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {catalogueData.tags.map((tag, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 bg-surface-container-low px-3 py-1.5 rounded-lg text-sm font-bold text-on-surface">
                                {tag}
                                <button onClick={() => removeTag(idx)} className="text-on-surface-variant hover:text-error transition-colors"><X className="w-3.5 h-3.5" /></button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 mt-3">
                        <Input 
                            type="text" 
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                            placeholder={t.addTag}
                        />
                        <Button variant="secondary" onClick={handleAddTag} className="px-4">
                            <Plus className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </div>
            
            <div className="pt-6">
                <h3 className="text-lg font-bold text-on-surface mb-4 px-1">Production & Logistics</h3>
                
                <div className="space-y-4 bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant/30">
                    <div>
                        <label className="text-[11px] uppercase tracking-wider text-outline font-bold block mb-1">Dimensions & Weight</label>
                        <Input 
                            type="text" 
                            value={catalogueData.dimensions || ''}
                            onChange={(e) => setCatalogueData({...catalogueData, dimensions: e.target.value})}
                            placeholder="e.g. 30x10cm, 600g"
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="text-[11px] uppercase tracking-wider text-outline font-bold block mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">inventory_2</span>Stock</label>
                            <Input 
                                type="number" 
                                min="0"
                                value={catalogueData.stock_quantity === '' ? '' : catalogueData.stock_quantity}
                                onChange={(e) => setCatalogueData({...catalogueData, stock_quantity: e.target.value === '' ? '' : parseInt(e.target.value)})}
                                className="px-2"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] uppercase tracking-wider text-outline font-bold block mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">shopping_cart</span>MOQ</label>
                            <Input 
                                type="number" 
                                min="1"
                                value={catalogueData.moq === '' ? '' : catalogueData.moq}
                                onChange={(e) => setCatalogueData({...catalogueData, moq: e.target.value === '' ? '' : parseInt(e.target.value)})}
                                className="px-2"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] uppercase tracking-wider text-outline font-bold block mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span>Days</label>
                            <Input 
                                type="number" 
                                min="0"
                                value={catalogueData.lead_time_days === '' ? '' : catalogueData.lead_time_days}
                                onChange={(e) => setCatalogueData({...catalogueData, lead_time_days: e.target.value === '' ? '' : parseInt(e.target.value)})}
                                className="px-2"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-secondary-fixed/50 rounded-xl p-4 flex items-start gap-3 mt-2">
                <span className="material-symbols-outlined text-secondary text-[22px] mt-0.5">volunteer_activism</span>
                <div className="min-w-0">
                    <h4 className="text-sm font-bold text-on-secondary-fixed">Next: Accurate Craft Pricing</h4>
                    <p className="text-[13px] text-on-secondary-fixed-variant mt-1 leading-relaxed">
                        In Step 4 & 5, we help calculate costs so you never underprice your labor.
                    </p>
                </div>
            </div>

            <div className="mt-4 flex gap-4">
                <Button variant="ghost" onClick={() => setStep(2)} className="px-6">{t.back}</Button>
                <Button 
                    onClick={async () => { await saveDraft(); setStep(4); }}
                    fullWidth
                >
                    <span>Looks Good! Next</span>
                    <span className="material-symbols-outlined text-[18px] ml-1">arrow_forward</span>
                </Button>
            </div>
        </div>
    );
};
export default Step3ReviewAI;
