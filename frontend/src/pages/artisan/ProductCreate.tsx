import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useProductStore } from '../../stores/productStore';
import { pcTranslations } from '../../i18n/productCreate';

import Step1Photo from '../../components/product/Step1Photo';
import Step2Voice from '../../components/product/Step2Voice';
import Step3ReviewAI from '../../components/product/Step3ReviewAI';
import Step4Materials from '../../components/product/Step4Materials';
import Step5Pricing from '../../components/product/Step5Pricing';
import Step6Inventory from '../../components/product/Step6Inventory';
import Step7Publish from '../../components/product/Step7Publish';

const STEPS = [
  { id: 1, label: 'Photo' },
  { id: 2, label: 'Voice' },
  { id: 3, label: 'Details' },
  { id: 4, label: 'Costs' },
  { id: 5, label: 'Price' },
  { id: 6, label: 'Inventory' },
  { id: 7, label: 'Publish' }
];

const ProductCreate = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const lang = user?.preferred_language || 'en';
    const t = pcTranslations[lang] || pcTranslations['en'];
    const { currentStep, reset } = useProductStore();
    const isRTL = lang === 'ur';

    useEffect(() => {
        return () => reset();
    }, [reset]);

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

    return (
        <div className="w-full min-h-screen bg-surface flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
            <header className="fixed top-0 inset-x-0 mobile-shell-width mx-auto z-50 pt-safe bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
                <div className="h-16 px-6 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                        <button 
                            onClick={() => navigate('/artisan')}
                            className="min-w-[44px] min-h-[44px] -ml-2 flex items-center justify-center text-on-surface rounded-full hover:bg-surface-container transition-colors"
                        >
                            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                        </button>
                        <h1 className="font-bold text-lg text-on-surface tracking-tight truncate ml-1">
                            Add Craft Product
                        </h1>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col relative w-full max-w-lg mx-auto pt-16 pb-safe bg-surface px-6">
                <div className="flex flex-col w-full pb-10 pt-2">
                    
                    {/* Visual Step Progress Track */}
                    <section className="w-full pb-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-primary font-bold">Step {currentStep} of 7</span>
                            <span className="text-sm text-on-surface-variant font-semibold">{STEPS[currentStep - 1]?.label}</span>
                        </div>
                        
                        <div className="grid grid-cols-7 gap-1.5 items-center w-full">
                            {STEPS.map((step) => {
                                const isCompleted = step.id < currentStep;
                                const isActive = step.id === currentStep;
                                
                                return (
                                    <div key={step.id} className="flex flex-col items-center gap-1">
                                        <div className={`h-2 w-full rounded-full relative overflow-hidden ${
                                            isCompleted ? 'bg-tertiary' : 
                                            isActive ? 'bg-primary' : 'bg-surface-container-high'
                                        }`}>
                                            {isActive && <div className="absolute inset-0 bg-primary-fixed opacity-40 animate-pulse"></div>}
                                        </div>
                                        {isCompleted && (
                                            <span className="text-[10px] text-tertiary flex items-center gap-0.5 leading-none font-bold">
                                                <span className="material-symbols-outlined text-[12px]">check</span> {step.label}
                                            </span>
                                        )}
                                        {isActive && (
                                            <span className="text-[10px] text-primary font-bold leading-none">{step.label}</span>
                                        )}
                                        {!isCompleted && !isActive && (
                                            <span className="text-[10px] text-outline leading-none font-medium">{step.label}</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <div data-guide-id={`product-create-step-${currentStep}`}>
                        {renderStep()}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ProductCreate;
