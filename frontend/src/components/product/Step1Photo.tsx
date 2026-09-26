import React, { useRef, useState } from 'react';
import { 
    Camera, Image as ImageIcon, Sparkles, CheckCircle2, AlertTriangle, 
    X, Trash2, Sliders, RotateCw, Eye, RefreshCw, Check, Undo2, Wand2
} from 'lucide-react';
import { useProductStore } from '../../stores/productStore';
import api from '../../lib/api';
import { Button } from '../ui/Button';

const optimizeImageForUpload = async (file: File): Promise<File> => {
    if (!file.type.startsWith('image/')) return file;
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const maxDim = 2048;
                let { width, height } = img;
                
                if (width <= maxDim && height <= maxDim && file.size <= 3 * 1024 * 1024) {
                    resolve(file);
                    return;
                }
                
                if (width > height) {
                    if (width > maxDim) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    }
                } else {
                    if (height > maxDim) {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }
                
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(file);
                    return;
                }
                
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(
                    (blob) => {
                        if (blob && blob.size < file.size) {
                            const cleanName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
                            const optimizedFile = new File([blob], cleanName, {
                                type: 'image/jpeg',
                                lastModified: Date.now()
                            });
                            resolve(optimizedFile);
                        } else {
                            resolve(file);
                        }
                    },
                    'image/jpeg',
                    0.92
                );
            };
            img.onerror = () => resolve(file);
            img.src = e.target?.result as string;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
};

type StudioBackgroundType = 'pure_white' | 'studio' | 'warm' | 'transparent' | 'original';

interface StudioEditorState {
    photoId: string;
    backgroundType: StudioBackgroundType;
    brightness: number;  // -50 to 50
    contrast: number;    // -50 to 50
    rotate: number;      // 0, 90, 180, 270
    splitPosition: number; // 0 to 100 for before/after slider
    isComparing: boolean;
}

const Step1Photo = ({ t }: { t: any }) => {
    const { photos, addPhoto, deletePhoto, setPhotos, setStep } = useProductStore();
    const [isLoading, setIsLoading] = useState(false);
    const [enhancingPhotoId, setEnhancingPhotoId] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [uploadPreview, setUploadPreview] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    
    // Interactive Studio Editor Modal State
    const [studioState, setStudioState] = useState<StudioEditorState | null>(null);
    const [studioReprocessing, setStudioReprocessing] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const activeStudioPhoto = studioState ? photos.find(p => p.id === studioState.photoId) : null;

    const getScoreBadge = (score?: number) => {
        const s = score ?? 70;
        if (s >= 85) {
            return {
                label: 'Marketplace Ready',
                bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
                dot: 'bg-emerald-500'
            };
        }
        if (s >= 65) {
            return {
                label: 'Good Quality',
                bg: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                dot: 'bg-blue-500'
            };
        }
        if (s >= 45) {
            return {
                label: 'Enhance Recommended',
                bg: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                dot: 'bg-amber-500'
            };
        }
        return {
            label: 'Retake Suggested',
            bg: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
            dot: 'bg-rose-500'
        };
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawFile = e.target.files?.[0];
        if (!rawFile) return;
        
        setIsLoading(true);
        setErrorMsg('');
        const localUrl = URL.createObjectURL(rawFile);
        setUploadPreview(localUrl);
        
        try {
            const file = await optimizeImageForUpload(rawFile);
            let currentDraftId = useProductStore.getState().draftId;
            if (!currentDraftId) {
                await useProductStore.getState().saveDraft();
                currentDraftId = useProductStore.getState().draftId;
            }
            if (!currentDraftId) throw new Error("Failed to create product draft");

            const formData = new FormData();
            formData.append('file', file);
            formData.append('product_id', currentDraftId);
            formData.append('is_main', photos.length === 0 ? 'true' : 'false');
            
            const { data } = await api.post('/images/upload', formData);
            
            addPhoto({
                id: data.id,
                image_url: data.image_url,
                original_url: data.original_url,
                is_main: photos.length === 0,
                quality_score: data.quality_score,
                overall_score_100: data.overall_score_100 || 75,
                quality_breakdown: data.quality_breakdown,
                actionable_feedback: data.actionable_feedback,
                suggestions: data.suggestions
            });
        } catch (error: any) {
            console.error("Upload error:", error);
            const detail = error?.response?.data?.detail;
            const message = typeof detail === 'string' ? detail : (error?.message || "Photo upload failed. Please check backend connection.");
            setErrorMsg(message);
        } finally {
            setIsLoading(false);
            setUploadPreview(null);
            URL.revokeObjectURL(localUrl);
            if (e.target) e.target.value = '';
        }
    };

    const enhancePhoto = async (
        id: string, 
        bgType: StudioBackgroundType = 'studio',
        brightness = 0,
        contrast = 0,
        rotate = 0
    ) => {
        setEnhancingPhotoId(id);
        setErrorMsg('');
        try {
            const params = new URLSearchParams({
                background_type: bgType,
                brightness: (brightness / 100).toFixed(2),
                contrast: (contrast / 100).toFixed(2),
                rotate: rotate.toString(),
                add_shadow: 'true',
                use_rembg: 'true'
            });
            
            const { data } = await api.post(`/images/enhance/${id}?${params.toString()}`);
            
            const newPhotos = photos.map(p => p.id === id ? { 
                ...p, 
                enhanced_url: data.enhanced_url, 
                image_url: data.enhanced_url, 
                enhanced_quality: true, 
                enhanced_quality_score: data.enhanced_quality_score,
                overall_score_100: data.overall_score_100 || 92,
                quality_breakdown: data.quality_breakdown,
                actionable_feedback: data.actionable_feedback,
                background_type: bgType
            } : p);
            setPhotos(newPhotos);
            
            // If studio editor is open for this photo, update its background type
            if (studioState && studioState.photoId === id) {
                setStudioState(prev => prev ? { ...prev, backgroundType: bgType } : null);
            }
        } catch (error: any) {
            console.error("Enhancement error:", error);
            const detail = error?.response?.data?.detail;
            const message = typeof detail === 'string' ? detail : (error?.message || "AI Studio enhancement failed. Please retry.");
            setErrorMsg(message);
        } finally {
            setEnhancingPhotoId(null);
            setStudioReprocessing(false);
        }
    };

    const toggleEnhancedQuality = async (id: string, useEnhanced: boolean) => {
        setErrorMsg('');
        try {
            const { data } = await api.patch(`/images/${id}/use-enhanced?use_enhanced=${useEnhanced}`);
            const newPhotos = photos.map(p => p.id === id ? { 
                ...p, 
                enhanced_quality: useEnhanced, 
                image_url: data.image_url 
            } : p);
            setPhotos(newPhotos);
        } catch (error: any) {
            console.error(error);
            const detail = error?.response?.data?.detail;
            const message = typeof detail === 'string' ? detail : (error?.message || "Failed to switch photo version.");
            setErrorMsg(message);
        }
    };

    const openStudioEditor = (photoId: string) => {
        const photo = photos.find(p => p.id === photoId);
        if (!photo) return;
        
        setStudioState({
            photoId: photo.id,
            backgroundType: (photo.background_type as StudioBackgroundType) || 'studio',
            brightness: 0,
            contrast: 0,
            rotate: 0,
            splitPosition: 50,
            isComparing: true
        });
        
        // If not yet enhanced, auto-trigger enhancement
        if (!photo.enhanced_url) {
            enhancePhoto(photo.id, 'studio');
        }
    };

    const handleReprocessStudio = () => {
        if (!studioState) return;
        setStudioReprocessing(true);
        enhancePhoto(
            studioState.photoId,
            studioState.backgroundType,
            studioState.brightness,
            studioState.contrast,
            studioState.rotate
        );
    };

    return (
        <div className="flex flex-col gap-5 max-w-full overflow-hidden" data-guide-id="product_create">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-on-surface flex items-center gap-2">
                        <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
                        <span>{t.photoTitle || "Product Photography"}</span>
                    </h2>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                        Simple 1-click AI enhancement or keep your original photo.
                    </p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant shrink-0">
                    {photos.length}/5
                </span>
            </div>
            
            {/* Upload Buttons */}
            {photos.length < 5 && (
                <div className="grid grid-cols-2 gap-3" data-help="product-image" data-guide-id="product-image" id="product-image">
                    <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={handleUpload} />
                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleUpload} />
                    
                    <button 
                        type="button"
                        data-guide-id="add-photo-button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex flex-col items-center justify-center gap-2 p-4 sm:p-5 border-2 border-dashed border-primary/40 hover:border-primary rounded-2xl bg-surface-container-lowest hover:bg-primary/5 transition-all group shadow-sm active:scale-98"
                        disabled={isLoading}
                    >
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="text-center">
                            <span className="text-xs sm:text-sm font-bold text-on-surface block">{t.takePhoto || "Take Photo"}</span>
                            <span className="text-[10px] sm:text-[11px] text-on-surface-variant">Camera Capture</span>
                        </div>
                    </button>
                    
                    <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center gap-2 p-4 sm:p-5 border-2 border-dashed border-secondary/40 hover:border-secondary rounded-2xl bg-surface-container-lowest hover:bg-secondary/5 transition-all group shadow-sm active:scale-98"
                        disabled={isLoading}
                    >
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                            <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="text-center">
                            <span className="text-xs sm:text-sm font-bold text-on-surface block">{t.chooseGallery || "Choose Gallery"}</span>
                            <span className="text-[10px] sm:text-[11px] text-on-surface-variant">Select from Phone</span>
                        </div>
                    </button>
                </div>
            )}

            {/* Enhancing Global Banner */}
            {enhancingPhotoId && !studioState && (
                <div className="flex items-center gap-3 p-3.5 bg-primary/10 border border-primary/30 text-on-surface rounded-2xl text-xs sm:text-sm font-semibold shadow-sm animate-pulse" data-guide-id="image-processing-loader">
                    <Sparkles className="w-5 h-5 animate-spin text-primary shrink-0" />
                    <div>
                        <span className="font-bold text-primary block">✨ 1-Click Auto Enhancing...</span>
                        <span className="text-[11px] text-on-surface-variant">Cleaning background, balancing lighting & boosting colors</span>
                    </div>
                </div>
            )}

            {/* Uploading Banner */}
            {uploadPreview && (
                <div className="p-3.5 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-surface-container relative shrink-0">
                        <img src={uploadPreview} alt="Uploading..." className="w-full h-full object-cover opacity-60" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    </div>
                    <div>
                        <div className="text-xs sm:text-sm font-bold text-on-surface">Uploading & Analyzing...</div>
                        <div className="text-[11px] text-on-surface-variant">Checking resolution, blur & lighting</div>
                    </div>
                </div>
            )}
            
            {errorMsg && (
                <div className="p-3.5 bg-error-container text-on-error-container rounded-2xl text-xs sm:text-sm font-semibold flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5" />
                    <div className="flex-1">{errorMsg}</div>
                </div>
            )}

            {/* Photo Cards List */}
            <div className="space-y-4">
                {photos.map((photo, i) => {
                    const score = photo.overall_score_100 ?? (photo.quality_score ? photo.quality_score * 10 : 75);
                    const badge = getScoreBadge(score);
                    const isEnhanced = !!photo.enhanced_url;
                    const isCurrentlyEnhanced = isEnhanced && photo.enhanced_quality;
                    const isThisPhotoEnhancing = enhancingPhotoId === photo.id;
                    
                    return (
                        <div key={photo.id} className="bg-surface-container-lowest rounded-3xl border border-outline-variant/40 overflow-hidden shadow-sm p-4 flex flex-col gap-3.5">
                            
                            {/* Card Header: Title, Main Badge, Quality Pill & Delete */}
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-bold text-on-surface text-sm sm:text-base">Photo {i+1}</h4>
                                    {photo.is_main && (
                                        <span className="text-[10px] uppercase tracking-wider bg-primary-fixed text-on-primary-fixed px-2 py-0.5 rounded-full font-extrabold">
                                            Cover
                                        </span>
                                    )}
                                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${badge.bg}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                        <span>Quality: {score}/100</span>
                                    </span>
                                </div>
                                
                                <button
                                    onClick={() => deletePhoto(photo.id)}
                                    className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container rounded-full transition-colors active:scale-95 shrink-0"
                                    disabled={isLoading || isThisPhotoEnhancing}
                                    title="Delete photo"
                                    aria-label="Delete photo"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Main Photo Display */}
                            <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-outline-variant/30 bg-surface-container-low flex items-center justify-center shadow-inner">
                                <img 
                                    src={photo.image_url} 
                                    alt={`Product ${i+1}`} 
                                    className="w-full h-full object-contain p-2 transition-transform duration-300"
                                />

                                {/* Fullscreen preview button */}
                                <button 
                                    className="absolute top-2.5 right-2.5 p-2 bg-surface-container/90 backdrop-blur-md rounded-full shadow-sm hover:bg-surface-container transition-colors text-on-surface z-10"
                                    onClick={() => setPreviewImage(photo.image_url)}
                                    title="Full Screen Preview"
                                >
                                    <Eye className="w-4 h-4" />
                                </button>

                                {/* Top Left Status Tag */}
                                <div className="absolute top-2.5 left-2.5 z-10">
                                    {isCurrentlyEnhanced ? (
                                        <span className="bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-sm shadow flex items-center gap-1">
                                            <Sparkles className="w-3 h-3" /> AI Enhanced
                                        </span>
                                    ) : (
                                        <span className="bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-sm shadow flex items-center gap-1">
                                            <ImageIcon className="w-3 h-3" /> Original Photo
                                        </span>
                                    )}
                                </div>

                                {/* Enhancement Loading Overlay */}
                                {isThisPhotoEnhancing && (
                                    <div className="absolute inset-0 bg-surface/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-20">
                                        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                                        <span className="text-sm font-bold text-primary">✨ Auto Enhancing...</span>
                                        <span className="text-xs text-on-surface-variant mt-1">Creating studio background & lighting</span>
                                    </div>
                                )}
                            </div>

                            {/* ======================================================== */}
                            {/* TWO EXPLICIT OPTIONS FOR RURAL ARTISANS (1-CLICK & EXISTING) */}
                            {/* ======================================================== */}
                            <div className="bg-surface-container-low/80 p-3 rounded-2xl border border-outline-variant/30 space-y-2.5">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center justify-between">
                                    <span>Choose Image Version:</span>
                                    {isEnhanced && (
                                        <span className="text-[10px] text-primary font-bold">1-Click Switch</span>
                                    )}
                                </div>

                                {/* Option 1: Auto Enhance (1-Click) */}
                                {!isEnhanced ? (
                                    <button
                                        type="button"
                                        onClick={() => enhancePhoto(photo.id, 'studio')}
                                        disabled={isThisPhotoEnhancing || isLoading}
                                        className="w-full py-3 px-4 bg-gradient-to-r from-primary to-secondary text-on-primary rounded-xl font-bold text-xs sm:text-sm flex items-center justify-between shadow-md hover:opacity-95 active:scale-98 transition-all disabled:opacity-50"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                                            <div className="text-left">
                                                <span className="block leading-tight font-extrabold">✨ 1-Click Auto Enhance</span>
                                                <span className="text-[10px] text-on-primary/90 font-normal">Clean background & brighten automatically</span>
                                            </div>
                                        </div>
                                        <span className="text-[11px] font-bold bg-white/20 px-2 py-1 rounded-lg">Auto Fix</span>
                                    </button>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        {/* Select Option 1: AI Enhanced */}
                                        <button
                                            type="button"
                                            onClick={() => toggleEnhancedQuality(photo.id, true)}
                                            className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                                                isCurrentlyEnhanced 
                                                    ? 'border-primary bg-primary/10 shadow-sm ring-2 ring-primary/30' 
                                                    : 'border-outline-variant/40 bg-surface-container-lowest hover:bg-surface-container-low'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-on-surface flex items-center gap-1 text-primary">
                                                    <Sparkles className="w-3.5 h-3.5" />
                                                    Auto Enhanced
                                                </span>
                                                {isCurrentlyEnhanced && (
                                                    <CheckCircle2 className="w-4 h-4 text-primary fill-primary/20" />
                                                )}
                                            </div>
                                            <span className="text-[10px] text-on-surface-variant leading-tight">
                                                Studio background & clear lighting
                                            </span>
                                        </button>

                                        {/* Select Option 2: Original Existing Photo */}
                                        <button
                                            type="button"
                                            onClick={() => toggleEnhancedQuality(photo.id, false)}
                                            className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                                                !isCurrentlyEnhanced 
                                                    ? 'border-secondary bg-secondary/10 shadow-sm ring-2 ring-secondary/30' 
                                                    : 'border-outline-variant/40 bg-surface-container-lowest hover:bg-surface-container-low'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-on-surface flex items-center gap-1">
                                                    <ImageIcon className="w-3.5 h-3.5 text-on-surface-variant" />
                                                    Original Photo
                                                </span>
                                                {!isCurrentlyEnhanced && (
                                                    <CheckCircle2 className="w-4 h-4 text-secondary fill-secondary/20" />
                                                )}
                                            </div>
                                            <span className="text-[10px] text-on-surface-variant leading-tight">
                                                Keep as taken on camera
                                            </span>
                                        </button>
                                    </div>
                                )}

                                {/* Advanced Fine-Tuning Studio Option (Does not disturb 1-click flow) */}
                                <div className="pt-1 flex items-center justify-between border-t border-outline-variant/20">
                                    <span className="text-[11px] text-on-surface-variant">
                                        Need custom background or rotation?
                                    </span>
                                    <button 
                                        type="button"
                                        onClick={() => openStudioEditor(photo.id)}
                                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-primary/10 transition-colors"
                                    >
                                        <Sliders className="w-3.5 h-3.5" />
                                        <span>Fine-tune Studio &rarr;</span>
                                    </button>
                                </div>
                            </div>

                            {/* Quality Feedback checklist */}
                            {photo.actionable_feedback && photo.actionable_feedback.length > 0 && (
                                <div className="bg-surface-container-low/40 rounded-xl p-2.5 text-[11px] space-y-1">
                                    {photo.actionable_feedback.slice(0, 2).map((item, idx) => (
                                        <div key={idx} className={`flex items-start gap-1 font-medium ${item.startsWith('✓') ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                                            <span>{item}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Next / Skip Actions */}
            <div className="mt-2 flex gap-3">
                <Button 
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="px-5 border-outline-variant/60 text-on-surface hover:bg-surface-container"
                >
                    <span>{t.skip || "Skip"}</span>
                </Button>
                <Button 
                    onClick={() => setStep(2)}
                    disabled={photos.length === 0}
                    className="flex-1"
                >
                    <span>{t.next || "Next: Voice Description"}</span>
                    <span className="material-symbols-outlined text-[18px] ml-1">arrow_forward</span>
                </Button>
            </div>

            {/* ======================================================== */}
            {/* INTERACTIVE AI PRODUCT STUDIO MODAL (BEFORE/AFTER SLIDER) */}
            {/* ======================================================== */}
            {studioState && activeStudioPhoto && (
                <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
                    <div className="w-full max-w-lg max-h-[92vh] sm:rounded-3xl rounded-t-3xl bg-surface text-on-surface flex flex-col shadow-2xl overflow-hidden border border-outline-variant/30">
                        
                        {/* Studio Header */}
                        <div className="p-4 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-lowest shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <Sparkles className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm sm:text-base text-on-surface">AI Product Studio</h3>
                                    <span className="text-[10px] sm:text-[11px] text-on-surface-variant">Fine-tune lighting, background & angles</span>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => setStudioState(null)}
                                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            
                            {/* 1-Click Quick Auto Enhance Inside Modal */}
                            <div className="flex items-center justify-between p-2.5 bg-primary/10 rounded-2xl border border-primary/20">
                                <div className="flex items-center gap-2">
                                    <Wand2 className="w-4 h-4 text-primary" />
                                    <span className="text-xs font-bold text-on-surface">Auto Mode</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStudioState(prev => prev ? { ...prev, backgroundType: 'studio', brightness: 0, contrast: 0 } : null);
                                        enhancePhoto(studioState.photoId, 'studio', 0, 0, studioState.rotate);
                                    }}
                                    disabled={studioReprocessing || enhancingPhotoId !== null}
                                    className="px-3 py-1.5 bg-primary text-on-primary rounded-xl text-xs font-bold shadow-sm hover:bg-primary/90 flex items-center gap-1 active:scale-95"
                                >
                                    <Sparkles className="w-3 h-3" />
                                    <span>Reset to 1-Click Auto</span>
                                </button>
                            </div>

                            {/* Interactive Before / After Split Slider */}
                            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-surface-container-low border border-outline-variant/30 select-none touch-none">
                                {activeStudioPhoto.original_url && activeStudioPhoto.enhanced_url ? (
                                    <>
                                        {/* After Image (Background Layer) */}
                                        <img 
                                            src={activeStudioPhoto.enhanced_url} 
                                            alt="Enhanced" 
                                            className="absolute inset-0 w-full h-full object-contain p-2 pointer-events-none"
                                        />
                                        
                                        {/* Before Image (Foreground Layer with Clip Path) */}
                                        <div 
                                            className="absolute inset-0 overflow-hidden pointer-events-none"
                                            style={{ width: `${studioState.splitPosition}%` }}
                                        >
                                            <img 
                                                src={activeStudioPhoto.original_url} 
                                                alt="Original" 
                                                className="absolute inset-0 w-full h-full object-contain p-2 max-w-none pointer-events-none"
                                                style={{ width: `${100 / (Math.max(studioState.splitPosition, 1) / 100)}%` }}
                                            />
                                        </div>

                                        {/* Vertical Divider Line */}
                                        <div 
                                            className="absolute top-0 bottom-0 w-1 bg-white shadow-xl flex items-center justify-center pointer-events-none"
                                            style={{ left: `${studioState.splitPosition}%`, transform: 'translateX(-50%)' }}
                                        >
                                            <div className="w-7 h-7 rounded-full bg-white shadow-lg flex items-center justify-center text-stone-800 text-[10px] font-black border border-stone-200">
                                                ↔
                                            </div>
                                        </div>

                                        {/* Floating Labels */}
                                        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-bold text-white uppercase tracking-wider pointer-events-none">
                                            Original
                                        </div>
                                        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-primary/90 backdrop-blur-md rounded-lg text-[10px] font-bold text-white uppercase tracking-wider pointer-events-none">
                                            AI Studio
                                        </div>

                                        {/* Slider Range Controller */}
                                        <input 
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={studioState.splitPosition}
                                            onChange={(e) => setStudioState({ ...studioState, splitPosition: Number(e.target.value) })}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                                            aria-label="Before After Slider"
                                        />
                                    </>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                                        <img 
                                            src={activeStudioPhoto.image_url} 
                                            alt="Product" 
                                            className="w-full h-full object-contain p-4" 
                                        />
                                        {enhancingPhotoId && (
                                            <div className="absolute inset-0 bg-surface/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                                                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                                                <span className="text-sm font-bold text-primary">Generating AI Studio Cutout...</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <p className="text-[11px] text-center text-on-surface-variant font-medium">
                                Drag slider left/right to compare Original vs AI Studio.
                            </p>

                            {/* Background Type Selector */}
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block mb-2">
                                    Background Style
                                </label>
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                    {[
                                        { id: 'pure_white', label: 'White', icon: '⚪' },
                                        { id: 'studio', label: 'Studio', icon: '🔘' },
                                        { id: 'warm', label: 'Craft Warm', icon: '🪵' },
                                        { id: 'transparent', label: 'Cutout', icon: '🔲' },
                                        { id: 'original', label: 'Keep BG', icon: '🖼' },
                                    ].map((bg) => (
                                        <button
                                            key={bg.id}
                                            type="button"
                                            onClick={() => {
                                                setStudioState({ ...studioState, backgroundType: bg.id as StudioBackgroundType });
                                                enhancePhoto(studioState.photoId, bg.id as StudioBackgroundType, studioState.brightness, studioState.contrast, studioState.rotate);
                                            }}
                                            disabled={studioReprocessing || enhancingPhotoId !== null}
                                            className={`p-2.5 rounded-2xl border text-center flex flex-col items-center gap-1 transition-all ${
                                                studioState.backgroundType === bg.id 
                                                    ? 'border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20' 
                                                    : 'border-outline-variant/40 bg-surface-container-lowest hover:bg-surface-container-low'
                                            }`}
                                        >
                                            <span className="text-base">{bg.icon}</span>
                                            <span className="text-xs font-bold text-on-surface truncate w-full">{bg.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Fine-Tuning Sliders */}
                            <div className="bg-surface-container-low/70 rounded-2xl p-3.5 border border-outline-variant/30 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-1.5">
                                        <Sliders className="w-3.5 h-3.5 text-primary" />
                                        Manual Adjustments
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={() => setStudioState({ ...studioState, brightness: 0, contrast: 0, rotate: 0 })}
                                        className="text-[11px] text-primary font-bold hover:underline"
                                    >
                                        Reset
                                    </button>
                                </div>

                                {/* Brightness Slider */}
                                <div>
                                    <div className="flex justify-between text-xs font-semibold mb-1 text-on-surface">
                                        <span>Brightness</span>
                                        <span className="text-primary font-mono">{studioState.brightness > 0 ? `+${studioState.brightness}` : studioState.brightness}</span>
                                    </div>
                                    <input 
                                        type="range"
                                        min="-50"
                                        max="50"
                                        value={studioState.brightness}
                                        onChange={(e) => setStudioState({ ...studioState, brightness: Number(e.target.value) })}
                                        className="w-full h-2 bg-surface-container-high rounded-full appearance-none accent-primary cursor-pointer"
                                    />
                                </div>

                                {/* Contrast Slider */}
                                <div>
                                    <div className="flex justify-between text-xs font-semibold mb-1 text-on-surface">
                                        <span>Contrast</span>
                                        <span className="text-primary font-mono">{studioState.contrast > 0 ? `+${studioState.contrast}` : studioState.contrast}</span>
                                    </div>
                                    <input 
                                        type="range"
                                        min="-50"
                                        max="50"
                                        value={studioState.contrast}
                                        onChange={(e) => setStudioState({ ...studioState, contrast: Number(e.target.value) })}
                                        className="w-full h-2 bg-surface-container-high rounded-full appearance-none accent-primary cursor-pointer"
                                    />
                                </div>

                                {/* Rotate & Re-process Controls */}
                                <div className="flex gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const nextRotate = (studioState.rotate + 90) % 360;
                                            setStudioState({ ...studioState, rotate: nextRotate });
                                        }}
                                        className="flex-1 py-2.5 px-3 bg-surface-container-lowest border border-outline-variant/40 rounded-xl text-xs font-bold text-on-surface flex items-center justify-center gap-1.5 hover:bg-surface-container transition-colors"
                                    >
                                        <RotateCw className="w-3.5 h-3.5 text-secondary" />
                                        <span>Rotate {studioState.rotate > 0 ? `(${studioState.rotate}°)` : ''}</span>
                                    </button>
                                    
                                    <button
                                        type="button"
                                        onClick={handleReprocessStudio}
                                        disabled={studioReprocessing || enhancingPhotoId !== null}
                                        className="flex-1 py-2.5 px-3 bg-primary text-on-primary rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 active:scale-98"
                                    >
                                        {studioReprocessing || enhancingPhotoId ? (
                                            <>
                                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                <span>Applying...</span>
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className="w-3.5 h-3.5" />
                                                <span>Apply Changes</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Studio Footer Actions */}
                        <div className="p-3.5 border-t border-outline-variant/30 bg-surface-container-lowest flex items-center justify-between gap-2.5 shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    toggleEnhancedQuality(studioState.photoId, false);
                                    setStudioState(null);
                                }}
                                className="py-2.5 px-3 rounded-xl border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-container transition-colors flex items-center gap-1"
                            >
                                <Undo2 className="w-3.5 h-3.5" />
                                <span>Use Original</span>
                            </button>
                            
                            <button
                                type="button"
                                onClick={() => {
                                    toggleEnhancedQuality(studioState.photoId, true);
                                    setStudioState(null);
                                }}
                                className="flex-1 py-2.5 px-4 bg-primary text-on-primary rounded-xl text-xs font-bold shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 active:scale-98"
                            >
                                <Check className="w-4 h-4" />
                                <span>Save & Use Enhanced</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Screen Image Preview Modal */}
            {previewImage && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in" onClick={() => setPreviewImage(null)}>
                    <div className="relative max-w-2xl w-full max-h-[90vh] flex flex-col items-center">
                        <button 
                            className="absolute top-2 right-2 text-white bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors z-10"
                            onClick={() => setPreviewImage(null)}
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <img 
                            src={previewImage} 
                            alt="Full Preview" 
                            className="max-h-[85vh] w-auto object-contain rounded-2xl shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Step1Photo;

