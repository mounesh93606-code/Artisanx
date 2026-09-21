import { useState, useEffect } from 'react';
import { Sparkles, X, Plus, Edit2, Volume2, VolumeX, RotateCcw, Globe, Check, BookOpen, Tag, Search, Award } from 'lucide-react';
import { useProductStore } from '../../stores/productStore';
import api from '../../lib/api';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const LANGUAGES = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
    { code: 'te', label: 'Telugu', native: 'తెలుగు' },
    { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
    { code: 'bn', label: 'Bengali', native: 'বাংলা' },
    { code: 'mr', label: 'Marathi', native: 'मराठी' },
    { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
];

const Step3ReviewAI = ({ t }: { t: any }) => {
    const { t: tGlobal } = useTranslation();
    const { voiceData, catalogueData, setCatalogueData, setStep, saveDraft } = useProductStore();
    const [isLoading, setIsLoading] = useState(false);
    const [newTag, setNewTag] = useState('');
    const [editingField, setEditingField] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [activeLang, setActiveLang] = useState<string>('en');
    const [isPlayingSpeech, setIsPlayingSpeech] = useState(false);

    useEffect(() => {
        return () => {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const handleManualEntry = () => {
        setCatalogueData({
            title: '',
            description: voiceData?.translated_text || voiceData?.original_text || '',
            category: '',
            tags: [],
            materials: [],
            care_instructions: '',
            estimated_production_time: '3-5 days',
            dimensions: '',
            stock_quantity: '',
            reserved_stock: 0,
            is_made_to_order: false,
            monthly_capacity: '',
            low_stock_threshold: 5,
            moq: '',
            lead_time_days: '',
            short_description: '',
            full_description: voiceData?.translated_text || voiceData?.original_text || '',
            key_highlights: [],
            product_story: '',
            craft_type: '',
            manufacturing_technique: '',
            handmade_status: '100% Handcrafted',
            seo: null,
            translations: null
        });
    };

    const handleQuickDraft = () => {
        const text = (voiceData?.translated_text || voiceData?.original_text || '').trim();
        const words = text.toLowerCase().split(/\s+/);
        
        // Smart category detection
        let category = 'Handicrafts & Decor';
        if (words.some(w => ['pottery', 'terracotta', 'clay', 'ceramic'].includes(w))) category = 'Pottery & Terracotta';
        else if (words.some(w => ['saree', 'silk', 'cotton', 'fabric', 'shawl', 'dupatta', 'cloth', 'loom', 'weave'].includes(w))) category = 'Textiles & Handloom';
        else if (words.some(w => ['wood', 'wooden', 'carving', 'sheesham', 'teak', 'sandalwood'].includes(w))) category = 'Woodwork & Carving';
        else if (words.some(w => ['brass', 'copper', 'metal', 'dhokra', 'bronze', 'bell'].includes(w))) category = 'Metalwork & Dhokra';
        else if (words.some(w => ['jewelry', 'necklace', 'earring', 'bangle', 'silver', 'pendant'].includes(w))) category = 'Jewelry & Ornaments';
        else if (words.some(w => ['painting', 'art', 'madhubani', 'warli', 'pattachitra'].includes(w))) category = 'Folk Art & Painting';
        else if (words.some(w => ['leather', 'bag', 'wallet', 'chappal', 'mojari'].includes(w))) category = 'Leathercraft';

        // Title from first sentence or words
        const firstSentence = text.split(/[.!?]/)[0]?.trim();
        let title = `Handcrafted ${category}`;
        if (firstSentence && firstSentence.length >= 5 && firstSentence.length <= 60) {
            title = firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1);
        } else if (text) {
            title = text.slice(0, 50).trim();
        }

        const tags = ['handmade', 'artisanal', 'authentic', category.toLowerCase().split(' ')[0]];

        setCatalogueData({
            title,
            description: text || `Handcrafted ${category} made by skilled Indian artisans.`,
            category,
            tags,
            materials: ['Natural Traditional Material'],
            care_instructions: 'Handle with care. Wipe gently with a clean dry cloth.',
            estimated_production_time: '3-5 days',
            dimensions: 'Standard artisanal dimensions',
            stock_quantity: '',
            reserved_stock: 0,
            is_made_to_order: false,
            monthly_capacity: '',
            low_stock_threshold: 5,
            moq: '',
            lead_time_days: '',
            short_description: text ? text.slice(0, 120) : `Handcrafted ${category} made by skilled Indian artisans.`,
            full_description: text || `Handcrafted ${category} made by skilled Indian artisans using time-honored traditional techniques.`,
            key_highlights: [
                '100% Handcrafted by skilled Indian artisans',
                'Authentic traditional craftsmanship',
                'Production time: 3-5 business days'
            ],
            product_story: 'Rooted in generations of Indian artisanal tradition, each piece represents the dedication, heritage, and mastery of traditional craft makers.',
            craft_type: category,
            manufacturing_technique: 'Traditional Handcrafting',
            handmade_status: '100% Handcrafted',
            seo: {
                seo_title: `${title} | Handcrafted Indian Art`,
                meta_description: `Buy authentic ${title}. Handcrafted by Indian master artisans.`,
                keywords: [category.toLowerCase(), 'handmade', 'artisan', 'indian craft'],
                search_tags: tags
            },
            translations: null
        });
    };

    const generateCatalogue = async () => {
        setIsLoading(true);
        setErrorMsg(null);
        try {
            const { data } = await api.post('/ai/generate-catalogue', {
                transcript: voiceData?.translated_text || voiceData?.original_text || '',
                source_language: voiceData?.detected_language || 'en',
                target_languages: ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'bn', 'mr', 'gu']
            }, {
                timeout: 90000 // 90-second timeout to handle Render cold-starts & AI generation
            });
            setCatalogueData({
                ...data,
                stock_quantity: catalogueData?.stock_quantity ?? '',
                moq: catalogueData?.moq ?? '',
                lead_time_days: catalogueData?.lead_time_days ?? ''
            });
            if (voiceData?.detected_language && LANGUAGES.some(l => l.code === voiceData.detected_language)) {
                setActiveLang(voiceData.detected_language);
            }
        } catch (error: any) {
            console.error("AI catalogue generation failed:", error);
            const isTimeout = error.code === 'ECONNABORTED' || (error.message && error.message.toLowerCase().includes('timeout'));
            const isNetwork = error.message && error.message.toLowerCase().includes('network');

            if (isTimeout) {
                setErrorMsg("AI service took too long to respond (server may be waking up). You can retry or use a quick draft from your voice description.");
            } else if (isNetwork) {
                setErrorMsg("Cannot reach server. Please check your internet connection or use a quick draft from your voice description.");
            } else {
                const msg = error.response?.data?.detail || error.message || "AI catalog formatting failed.";
                setErrorMsg(`${msg} You can retry or use a quick draft.`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSpeak = () => {
        if (!('speechSynthesis' in window)) {
            alert("Voice playback is not supported on this browser.");
            return;
        }

        if (isPlayingSpeech) {
            window.speechSynthesis.cancel();
            setIsPlayingSpeech(false);
            return;
        }

        const activeTranslation = catalogueData?.translations?.[activeLang];
        const textToRead = activeTranslation?.full_description 
            || activeTranslation?.short_description 
            || catalogueData?.description 
            || catalogueData?.title 
            || '';

        if (!textToRead) return;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToRead);
        
        const bcp47Map: Record<string, string> = {
            'en': 'en-IN',
            'hi': 'hi-IN',
            'ta': 'ta-IN',
            'te': 'te-IN',
            'kn': 'kn-IN',
            'ml': 'ml-IN',
            'bn': 'bn-IN',
            'mr': 'mr-IN',
            'gu': 'gu-IN'
        };
        utterance.lang = bcp47Map[activeLang] || 'en-IN';
        utterance.rate = 0.9;
        
        utterance.onend = () => setIsPlayingSpeech(false);
        utterance.onerror = () => setIsPlayingSpeech(false);

        setIsPlayingSpeech(true);
        window.speechSynthesis.speak(utterance);
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
            <div className="flex flex-col items-center justify-center p-8 text-center h-[65vh] bg-surface-container-lowest rounded-3xl border border-outline-variant/30 mt-4 shadow-sm">
                <div className="w-20 h-20 bg-primary-container rounded-full flex items-center justify-center mb-5 relative">
                    <div className="absolute inset-0 bg-primary-container opacity-40 animate-ping rounded-full"></div>
                    <Sparkles className="w-10 h-10 text-primary relative z-10" />
                </div>
                <h3 className="text-2xl font-bold text-on-surface mb-2">Multilingual AI Cataloger</h3>
                <p className="text-sm text-on-surface-variant mb-6 max-w-[320px] leading-relaxed">
                    AI will transcribe your craft, generate evocative e-commerce copy, and translate it across 9 regional languages.
                </p>
                {errorMsg && (
                    <div className="mb-4 p-3.5 bg-error-container text-on-error-container rounded-2xl text-xs font-semibold text-center max-w-sm border border-error/20 leading-relaxed shadow-xs">
                        {errorMsg}
                    </div>
                )}
                <div className="w-full max-w-xs flex flex-col gap-3">
                    <Button 
                        onClick={generateCatalogue}
                        disabled={isLoading}
                        fullWidth
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                Generating 9-Language Catalogue...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> {errorMsg ? "Retry AI Catalogue" : "Generate AI Catalogue"}
                            </span>
                        )}
                    </Button>
                    {(voiceData?.translated_text || voiceData?.original_text) && (
                        <Button 
                            variant="secondary"
                            onClick={handleQuickDraft}
                            disabled={isLoading}
                            fullWidth
                        >
                            <span className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[18px]">bolt</span>
                                Use Quick Draft from Voice
                            </span>
                        </Button>
                    )}
                    <Button 
                        variant="ghost"
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

    const currentTranslation = catalogueData.translations?.[activeLang];
    const displayTitle = (activeLang !== 'en' && currentTranslation?.title) ? currentTranslation.title : catalogueData.title;
    const displayShortDesc = (activeLang !== 'en' && currentTranslation?.short_description) ? currentTranslation.short_description : (catalogueData.short_description || '');
    const displayFullDesc = (activeLang !== 'en' && currentTranslation?.full_description) ? currentTranslation.full_description : (catalogueData.full_description || catalogueData.description);
    const displayHighlights = (activeLang !== 'en' && currentTranslation?.key_highlights?.length) ? currentTranslation.key_highlights : (catalogueData.key_highlights || []);

    return (
        <div className="flex flex-col gap-5" data-guide-id="product-description" data-help="product-description" id="product-description">
            
            {/* Header with Regenerate & Re-record controls */}
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[24px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                        <h2 className="text-xl font-bold text-on-surface">Artisan Catalogue & SEO</h2>
                    </div>
                    <span className="text-[11px] text-on-tertiary-container bg-tertiary-container px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        {catalogueData.handmade_status || "100% Handcrafted"}
                    </span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
                    Craft copy synthesized faithfully from your voice. Switch languages below to review translations.
                </p>

                {/* Multilingual Tab Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar border-t border-surface-container pt-3">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-outline uppercase tracking-wider mr-1 shrink-0">
                        <Globe className="w-3.5 h-3.5" /> Language:
                    </div>
                    {LANGUAGES.map((l) => {
                        const hasTrans = l.code === 'en' || !!catalogueData.translations?.[l.code];
                        return (
                            <button
                                key={l.code}
                                type="button"
                                onClick={() => {
                                    if (isPlayingSpeech) {
                                        window.speechSynthesis.cancel();
                                        setIsPlayingSpeech(false);
                                    }
                                    setActiveLang(l.code);
                                }}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all flex items-center gap-1 ${
                                    activeLang === l.code
                                        ? 'bg-primary text-on-primary shadow-sm ring-2 ring-primary/30'
                                        : hasTrans
                                        ? 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                                        : 'bg-surface-container-low/50 text-outline'
                                }`}
                            >
                                <span>{l.native}</span>
                                {hasTrans && <Check className="w-3 h-3 text-primary-fixed" />}
                            </button>
                        );
                    })}
                </div>

                {/* Action Bar: Listen (TTS), Regenerate, Re-record */}
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-surface-container">
                    <button
                        type="button"
                        onClick={handleSpeak}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                            isPlayingSpeech 
                                ? 'bg-error text-on-error animate-pulse' 
                                : 'bg-primary-container text-on-primary-container hover:bg-primary-container/80'
                        }`}
                    >
                        {isPlayingSpeech ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        <span>{isPlayingSpeech ? 'Stop Listening' : `Listen (${LANGUAGES.find(l => l.code === activeLang)?.label})`}</span>
                    </button>

                    <button
                        type="button"
                        onClick={generateCatalogue}
                        disabled={isLoading}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-surface-container text-on-surface-variant hover:text-primary flex items-center gap-1.5 transition-colors ml-auto"
                    >
                        <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>Regenerate Copy</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-surface-container text-on-surface-variant hover:text-primary flex items-center gap-1.5 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[15px]">mic</span>
                        <span>Re-record</span>
                    </button>
                </div>
            </div>
            
            <div className="space-y-4">
                {/* Title Card */}
                <div data-help="product-title" className="bg-surface-container-lowest rounded-3xl p-5 shadow-sm flex flex-col group border border-outline-variant/30">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider text-outline font-bold flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5" /> Product Title ({LANGUAGES.find(l => l.code === activeLang)?.label})
                        </span>
                        <button 
                            onClick={() => setEditingField(editingField === 'title' ? null : 'title')} 
                            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                        >
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
                        <p className="text-lg text-on-surface font-bold mt-2 leading-snug">{displayTitle}</p>
                    )}
                </div>

                {/* Short Description Card */}
                {displayShortDesc && (
                    <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-sm flex flex-col group border border-outline-variant/30">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] uppercase tracking-wider text-outline font-bold">
                                Quick Summary (For Mobile Cards)
                            </span>
                            <button 
                                onClick={() => setEditingField(editingField === 'short_description' ? null : 'short_description')} 
                                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        </div>
                        {editingField === 'short_description' ? (
                            <textarea 
                                value={catalogueData.short_description || ''}
                                onChange={(e) => setCatalogueData({...catalogueData, short_description: e.target.value})}
                                rows={3}
                                className="w-full mt-2 p-3 rounded-2xl border-2 border-surface-container-high bg-surface-container-lowest focus:border-primary focus:ring-0 text-on-surface font-medium leading-relaxed resize-y"
                                autoFocus
                            />
                        ) : (
                            <p className="text-sm text-on-surface font-medium mt-2 leading-relaxed">{displayShortDesc}</p>
                        )}
                    </div>
                )}

                {/* Full Description Card */}
                <div data-help="description" className="bg-surface-container-lowest rounded-3xl p-5 shadow-sm flex flex-col group border border-outline-variant/30">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider text-outline font-bold">
                            Full E-Commerce Description
                        </span>
                        <button 
                            onClick={() => setEditingField(editingField === 'description' ? null : 'description')} 
                            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                    </div>
                    {editingField === 'description' ? (
                        <textarea 
                            value={catalogueData.description}
                            onChange={(e) => setCatalogueData({...catalogueData, description: e.target.value, full_description: e.target.value})}
                            rows={4}
                            className="w-full mt-2 p-3 rounded-2xl border-2 border-surface-container-high bg-surface-container-lowest focus:border-primary focus:ring-0 text-on-surface font-medium leading-relaxed resize-y"
                            autoFocus
                        />
                    ) : (
                        <p className="text-sm text-on-surface-variant font-medium mt-2 leading-relaxed">{displayFullDesc}</p>
                    )}
                </div>

                {/* Key Highlights Card */}
                {displayHighlights && displayHighlights.length > 0 && (
                    <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-sm flex flex-col group border border-outline-variant/30">
                        <span className="text-[11px] uppercase tracking-wider text-outline font-bold mb-3 flex items-center gap-1.5">
                            <Check className="w-4 h-4 text-primary" /> Key Craft Highlights
                        </span>
                        <ul className="space-y-2">
                            {displayHighlights.map((hl: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-2.5 text-sm text-on-surface">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0"></span>
                                    <span>{hl}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Cultural Craft Story Card */}
                {catalogueData.product_story && (
                    <div className="bg-gradient-to-br from-secondary-container/20 to-surface-container-lowest rounded-3xl p-5 shadow-sm border border-secondary/20">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] uppercase tracking-wider text-secondary font-bold flex items-center gap-1.5">
                                <BookOpen className="w-4 h-4 text-secondary" /> Cultural Craft Story
                            </span>
                            <button 
                                onClick={() => setEditingField(editingField === 'product_story' ? null : 'product_story')} 
                                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-secondary transition-colors"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        </div>
                        {editingField === 'product_story' ? (
                            <textarea 
                                value={catalogueData.product_story}
                                onChange={(e) => setCatalogueData({...catalogueData, product_story: e.target.value})}
                                rows={4}
                                className="w-full mt-2 p-3 rounded-2xl border-2 border-secondary/40 bg-surface-container-lowest focus:border-secondary focus:ring-0 text-on-surface font-medium leading-relaxed resize-y"
                                autoFocus
                            />
                        ) : (
                            <p className="text-sm text-on-surface italic leading-relaxed mt-1">{catalogueData.product_story}</p>
                        )}
                        {catalogueData.craft_type && (
                            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-secondary/10">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 bg-surface-container-lowest rounded-full text-secondary shadow-xs border border-secondary/20">
                                    <Award className="w-3 h-3" /> Craft: {catalogueData.craft_type}
                                </span>
                                {catalogueData.manufacturing_technique && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 bg-surface-container-lowest rounded-full text-outline shadow-xs border border-outline-variant/30">
                                        Technique: {catalogueData.manufacturing_technique}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Category Card */}
                <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-sm flex flex-col group border border-outline-variant/30">
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
                        <div className="flex items-center gap-1.5 mt-2">
                            <span className="material-symbols-outlined text-[20px] text-secondary">category</span>
                            <p className="text-on-surface font-bold text-base">{catalogueData.category}</p>
                        </div>
                    )}
                </div>

                {/* SEO Metadata Card */}
                {catalogueData.seo && (
                    <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-sm border border-outline-variant/30">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] uppercase tracking-wider text-outline font-bold flex items-center gap-1.5">
                                <Search className="w-3.5 h-3.5 text-primary" /> SEO Search Metadata
                            </span>
                            <span className="text-[10px] text-primary bg-primary-container/40 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                Buyer Discoverability
                            </span>
                        </div>
                        <div className="space-y-2 bg-surface-container-low/60 p-3.5 rounded-2xl border border-outline-variant/20">
                            <div>
                                <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Search Title:</span>
                                <p className="text-xs font-bold text-on-surface">{catalogueData.seo.seo_title}</p>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Meta Description:</span>
                                <p className="text-xs text-on-surface-variant font-medium leading-relaxed">{catalogueData.seo.meta_description}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tags Card */}
                <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-sm flex flex-col group border border-outline-variant/30">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] uppercase tracking-wider text-outline font-bold">{tGlobal('products.tags')}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {catalogueData.tags.map((tag, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 bg-surface-container-low px-3 py-1.5 rounded-xl text-xs font-bold text-on-surface border border-outline-variant/20">
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
                            placeholder={t.addTag || "Add custom tag..."}
                        />
                        <Button variant="secondary" onClick={handleAddTag} className="px-4">
                            <Plus className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </div>
            
            {/* Production & Logistics */}
            <div className="pt-2">
                <h3 className="text-lg font-bold text-on-surface mb-3 px-1">Production & Logistics</h3>
                
                <div className="space-y-4 bg-surface-container-lowest rounded-3xl p-5 shadow-sm border border-outline-variant/30">
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

            <div className="bg-secondary-fixed/50 rounded-2xl p-4 flex items-start gap-3 mt-1">
                <span className="material-symbols-outlined text-secondary text-[22px] mt-0.5">volunteer_activism</span>
                <div className="min-w-0">
                    <h4 className="text-sm font-bold text-on-secondary-fixed">Next: Accurate Craft Pricing</h4>
                    <p className="text-xs text-on-secondary-fixed-variant mt-1 leading-relaxed">
                        In Step 4 & 5, we calculate materials, labor, and fair cost floor so you never underprice your craftsmanship.
                    </p>
                </div>
            </div>

            <div className="mt-4 flex gap-4">
                <Button variant="ghost" onClick={() => setStep(2)} className="px-6">{t.back}</Button>
                <Button 
                    onClick={async () => { await saveDraft(); setStep(4); }}
                    fullWidth
                >
                    <span>Approve & Continue</span>
                    <span className="material-symbols-outlined text-[18px] ml-1">arrow_forward</span>
                </Button>
            </div>
        </div>
    );
};
export default Step3ReviewAI;
