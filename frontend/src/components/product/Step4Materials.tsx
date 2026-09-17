import { useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useProductStore } from '../../stores/productStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const Step4Materials = ({ t }: { t: any }) => {
    const { materialsData, setMaterialsData, catalogueData, setStep, saveDraft } = useProductStore();
    
    // Auto-populate from AI if empty
    useEffect(() => {
        if (materialsData.length === 0 && catalogueData?.materials) {
            const aiMaterials = catalogueData.materials.map((m: string, i: number) => ({
                id: `ai-${i}`,
                name: m,
                quantity: 1,
                unit: 'piece',
                cost: 0
            }));
            setMaterialsData(aiMaterials);
        }
    }, [catalogueData, materialsData.length, setMaterialsData]);

    const addMaterial = () => {
        setMaterialsData([...materialsData, { id: `custom-${Date.now()}`, name: '', quantity: 1, unit: 'piece', cost: 0 }]);
    };

    const updateMaterial = (id: string, field: string, value: any) => {
        setMaterialsData(materialsData.map(m => m.id === id ? { ...m, [field]: value } : m));
    };

    const removeMaterial = (id: string) => {
        setMaterialsData(materialsData.filter(m => m.id !== id));
    };

    const total = materialsData.reduce((sum, m) => sum + (m.quantity * m.cost), 0);

    return (
        <div className="flex flex-col gap-6" data-guide-id="material-checklist" data-help="materials-section">
            
            <div className="flex flex-col gap-2 mt-2">
                <div className="flex items-center gap-2 px-1">
                    <span className="material-symbols-outlined text-[24px] text-primary">receipt_long</span>
                    <h2 className="text-xl font-bold text-on-surface">{t.materialsTitle || 'Production Costs'}</h2>
                </div>
                <p className="text-sm text-on-surface-variant px-1 mb-2">
                    Log your raw materials and labor to ensure your final price is profitable.
                </p>
            </div>
            
            <div className="space-y-4">
                {materialsData.map((mat, index) => (
                    <div key={mat.id} className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 shadow-sm relative group">
                        <div className="flex items-center justify-between mb-3 border-b border-surface-container pb-2">
                            <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Item {index + 1}</span>
                            <button 
                                onClick={() => removeMaterial(mat.id)} 
                                className="w-7 h-7 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t.name}</label>
                                <Input 
                                    type="text" 
                                    value={mat.name}
                                    onChange={(e) => updateMaterial(mat.id, 'name', e.target.value)}
                                    placeholder="e.g. Organic Cotton"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t.quantity}</label>
                                <Input 
                                    type="number" 
                                    value={mat.quantity}
                                    onChange={(e) => updateMaterial(mat.id, 'quantity', parseFloat(e.target.value) || 0)}
                                    placeholder="1"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t.unit}</label>
                                <Input 
                                    type="text" 
                                    value={mat.unit}
                                    onChange={(e) => updateMaterial(mat.id, 'unit', e.target.value)}
                                    placeholder="kg, piece, etc."
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t.cost} (₹)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold">₹</span>
                                    <Input 
                                        type="number" 
                                        value={mat.cost}
                                        onChange={(e) => updateMaterial(mat.id, 'cost', parseFloat(e.target.value) || 0)}
                                        className="pl-8 font-bold"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Button 
                variant="outline"
                onClick={addMaterial}
                className="w-full border-dashed border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low"
            >
                <Plus className="w-5 h-5 mr-2" /> {t.addCustomMaterial}
            </Button>

            <div className="bg-surface-container rounded-2xl p-4 flex items-center justify-between mt-2 shadow-inner">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-primary">calculate</span>
                    <span className="font-bold text-on-surface">{t.runningTotal || 'Total Out-of-Pocket Cost'}</span>
                </div>
                <span className="text-xl font-bold text-primary">₹{total.toFixed(2)}</span>
            </div>

            <div className="mt-6 flex gap-4">
                <Button variant="ghost" onClick={() => setStep(3)} className="px-6">{t.back}</Button>
                <Button 
                    onClick={async () => { await saveDraft(); setStep(5); }}
                    fullWidth
                >
                    {t.next} <span className="material-symbols-outlined text-[18px] ml-1">arrow_forward</span>
                </Button>
            </div>
        </div>
    );
};
export default Step4Materials;
