import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Sparkles, CheckCircle, AlertTriangle, X, Trash2 } from 'lucide-react';
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
                
                // If within bounds and not overly massive, preserve original
                if (width <= maxDim && height <= maxDim && file.size <= 2.5 * 1024 * 1024) {
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

const Step1Photo = ({ t }: { t: any }) => {
    const { photos, addPhoto, deletePhoto, setPhotos, setStep } = useProductStore();
    const [isLoading, setIsLoading] = useState(false);
    const [enhancingPhotoId, setEnhancingPhotoId] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [uploadPreview, setUploadPreview] = useState<string | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const [errorMsg, setErrorMsg] = useState('');

    const getQualityLabel = (score: number) => {
        if (score >= 8) return t.qualityGood;
        if (score >= 6) return t.qualityAcceptable;
        if (score >= 4) return t.qualityNeedsImprovement;
        return t.qualityRetake;
    };

    const getQualityColor = (score: number) => {
        if (score >= 8) return 'text-tertiary';
        if (score >= 6) return 'text-secondary';
        if (score >= 4) return 'text-primary';
        return 'text-error';
    };

    const getQualityBg = (score: number) => {
        if (score >= 8) return 'bg-tertiary-container text-on-tertiary-container';
        if (score >= 6) return 'bg-secondary-container text-on-secondary-container';
        if (score >= 4) return 'bg-primary-container text-on-primary-container';
        return 'bg-error-container text-on-error-container';
    };

    const getQualityIcon = (score: number) => {
        if (score >= 8) return <CheckCircle className="w-4 h-4 text-tertiary" />;
        return <AlertTriangle className={`w-4 h-4 ${getQualityColor(score)}`} />;
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
            if (!currentDraftId) throw new Error("Failed to create draft");

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
                suggestions: data.suggestions
            });
        } catch (error: any) {
            console.error("Upload error:", error);
            const detail = error?.response?.data?.detail;
            const message = typeof detail === 'string' ? detail : (error?.message || "Photo upload failed. Please try again.");
            setErrorMsg(message);
        } finally {
            setIsLoading(false);
            setUploadPreview(null);
            URL.revokeObjectURL(localUrl);
            if (e.target) {
                e.target.value = '';
            }
        }
    };

    const enhancePhoto = async (id: string) => {
        setEnhancingPhotoId(id);
        setErrorMsg('');
        try {
            const { data } = await api.post(`/images/enhance/${id}`);
            const newPhotos = photos.map(p => p.id === id ? { 
                ...p, 
                enhanced_url: data.enhanced_url, 
                image_url: data.enhanced_url, 
                enhanced_quality: true, 
                enhanced_quality_score: data.enhanced_quality_score 
            } : p);
            setPhotos(newPhotos);
        } catch (error: any) {
            console.error("Enhancement error:", error);
            const detail = error?.response?.data?.detail;
            const message = typeof detail === 'string' ? detail : (detail?.message || error?.message || "Enhancement failed. Please try again.");
            setErrorMsg(message);
        } finally {
            setEnhancingPhotoId(null);
        }
    };

    const toggleEnhancedQuality = async (id: string, useEnhanced: boolean) => {
        setErrorMsg('');
        try {
            const { data } = await api.patch(`/images/${id}/use-enhanced?use_enhanced=${useEnhanced}`);
            const newPhotos = photos.map(p => p.id === id ? { ...p, enhanced_quality: useEnhanced, image_url: data.image_url } : p);
            setPhotos(newPhotos);
        } catch (error: any) {
            console.error(error);
            const detail = error?.response?.data?.detail;
            const message = typeof detail === 'string' ? detail : (error?.message || "Failed to switch photo version.");
            setErrorMsg(message);
        }
    };

    return (
        <div className="flex flex-col gap-6" data-guide-id="product_create">
            <h2 className="text-2xl font-bold text-on-surface">{t.photoTitle}</h2>
            
            {photos.length < 5 && (
                <div className="flex gap-4">
                    <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={handleUpload} />
                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleUpload} />
                    
                    <button 
                        type="button"
                        data-guide-id="add-photo-button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex-1 flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-outline-variant rounded-2xl bg-surface-container-lowest hover:bg-surface-container-low transition-colors"
                        disabled={isLoading}
                    >
                        <Camera className="w-8 h-8 text-primary" />
                        <span className="text-sm font-semibold text-on-surface">{t.takePhoto}</span>
                    </button>
                    
                    <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-outline-variant rounded-2xl bg-surface-container-lowest hover:bg-surface-container-low transition-colors"
                        disabled={isLoading}
                    >
                        <ImageIcon className="w-8 h-8 text-secondary" />
                        <span className="text-sm font-semibold text-on-surface">{t.chooseGallery}</span>
                    </button>
                </div>
            )}

            {enhancingPhotoId && (
                <div className="flex items-center justify-center gap-2 p-3 bg-secondary-container/50 border border-secondary/20 text-on-secondary-container rounded-xl text-sm font-semibold animate-pulse shadow-sm" data-guide-id="image-processing-loader">
                    <Sparkles className="w-4 h-4 animate-spin text-secondary" />
                    <span>Enhancing photo with AI studio cutout & lighting...</span>
                </div>
            )}

            {isLoading && !uploadPreview && !enhancingPhotoId && (
                <div className="text-center text-primary font-semibold animate-pulse" data-guide-id="image-processing-loader">
                    Uploading & Analyzing...
                </div>
            )}
            
            {uploadPreview && (
                <div className="relative bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm p-4 flex flex-col items-center">
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden opacity-50">
                        <img src={uploadPreview} alt="Uploading..." className="w-full h-full object-contain p-4" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-surface/80 text-primary px-4 py-2 rounded-full font-bold shadow-lg animate-pulse">
                                Uploading...
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {errorMsg && (
                <div className="p-4 bg-error-container text-on-error-container rounded-xl text-sm font-medium flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    {errorMsg}
                </div>
            )}

            <div className="space-y-4">
                {photos.map((photo, i) => (
                    <div key={photo.id} className="relative bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm p-4 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-on-surface">
                                    Photo {i+1} 
                                    {photo.is_main && <span className="text-[10px] uppercase bg-primary-fixed text-on-primary-fixed px-2 py-0.5 rounded-full font-bold ml-2">Main</span>}
                                </h4>
                                {photo.quality_score !== undefined && (!photo.original_url || !photo.enhanced_url || photo.original_url === photo.enhanced_url) && (
                                    <div className="flex flex-col gap-1 mt-1.5 text-sm">
                                        <div className="flex items-center gap-1.5 font-semibold text-on-surface-variant">
                                            {getQualityIcon(photo.quality_score)}
                                            <span className={getQualityColor(photo.quality_score)}>
                                                {t.imageQuality}: {photo.quality_score}/10
                                            </span>
                                        </div>
                                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full w-fit ${getQualityBg(photo.quality_score)}`}>
                                            {getQualityLabel(photo.quality_score)}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {!photo.enhanced_url && (
                                    <button 
                                        onClick={() => enhancePhoto(photo.id)}
                                        className="text-xs flex items-center gap-1.5 bg-secondary-container text-on-secondary-container px-3 py-1.5 rounded-full font-bold hover:bg-secondary-fixed transition-colors active:scale-95 disabled:opacity-60"
                                        disabled={isLoading || enhancingPhotoId !== null}
                                    >
                                        {enhancingPhotoId === photo.id ? (
                                            <>
                                                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                <span>Enhancing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-3 h-3" />
                                                {t.enhance}
                                            </>
                                        )}
                                    </button>
                                )}
                                <button
                                    onClick={() => deletePhoto(photo.id)}
                                    className="p-1.5 text-error hover:bg-error-container rounded-full transition-colors active:scale-95"
                                    disabled={isLoading}
                                    title="Delete photo"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {photo.original_url && photo.enhanced_url && photo.original_url !== photo.enhanced_url ? (
                            <div className="grid grid-cols-2 gap-4 w-full">
                                <div className="flex flex-col items-center gap-2.5">
                                    <div 
                                        className={`relative w-full aspect-square cursor-pointer group rounded-xl overflow-hidden border-2 bg-surface-container-lowest shadow-sm transition-colors ${photo.enhanced_quality === false ? 'border-primary' : 'border-outline-variant/30'}`} 
                                        onClick={() => toggleEnhancedQuality(photo.id, false)}
                                    >
                                        <img src={photo.original_url} alt="Original" className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300" />
                                        <button 
                                            className="absolute top-2 right-2 p-1.5 bg-surface-container/80 backdrop-blur-sm rounded-full shadow-sm hover:bg-surface-container transition-colors"
                                            onClick={(e) => { e.stopPropagation(); setPreviewImage(photo.original_url!); }}
                                        >
                                            <ImageIcon className="w-4 h-4 text-on-surface" />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="radio" checked={photo.enhanced_quality === false} readOnly className="w-4 h-4 text-primary accent-primary" />
                                        <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Original</span>
                                    </div>
                                    {photo.quality_score !== undefined && (
                                        <div className="flex flex-col items-center text-center mt-1">
                                            <span className={`text-xs font-bold ${getQualityColor(photo.quality_score)}`}>
                                                {photo.quality_score}/10
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${getQualityBg(photo.quality_score)}`}>
                                                {getQualityLabel(photo.quality_score)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col items-center gap-2.5">
                                    <div 
                                        className={`relative w-full aspect-square cursor-pointer group rounded-xl overflow-hidden border-2 bg-surface-container-lowest shadow-sm transition-colors ${photo.enhanced_quality !== false ? 'border-primary' : 'border-outline-variant/30'}`} 
                                        onClick={() => toggleEnhancedQuality(photo.id, true)}
                                    >
                                        <img src={photo.enhanced_url} alt="Enhanced" className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300" />
                                        <button 
                                            className="absolute top-2 right-2 p-1.5 bg-surface-container/80 backdrop-blur-sm rounded-full shadow-sm hover:bg-surface-container transition-colors"
                                            onClick={(e) => { e.stopPropagation(); setPreviewImage(photo.enhanced_url!); }}
                                        >
                                            <ImageIcon className="w-4 h-4 text-on-surface" />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="radio" checked={photo.enhanced_quality !== false} readOnly className="w-4 h-4 text-primary accent-primary" />
                                        <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Enhanced</span>
                                    </div>
                                    {photo.enhanced_quality_score !== undefined && (
                                        <div className="flex flex-col items-center text-center mt-1">
                                            <span className={`text-xs font-bold ${getQualityColor(photo.enhanced_quality_score)}`}>
                                                {photo.enhanced_quality_score}/10
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${getQualityBg(photo.enhanced_quality_score)}`}>
                                                {t.qualityEnhanced || "Enhanced"}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center w-full">
                                <div className="relative w-full aspect-square cursor-pointer group rounded-xl overflow-hidden border border-outline-variant bg-surface-container-lowest shadow-sm" onClick={() => setPreviewImage(photo.original_url || photo.image_url)}>
                                    <img src={photo.original_url || photo.image_url} alt="Original" className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300" />
                                </div>
                            </div>
                        )}

                        {photo.suggestions && photo.suggestions.length > 0 && (
                            <div className="mt-2 bg-surface-container-low p-3 rounded-xl">
                                <h5 className="text-xs font-bold text-on-surface-variant mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3"/> Suggestions</h5>
                                <ul className="text-xs text-on-surface-variant list-disc list-inside">
                                    {photo.suggestions.map((s, idx) => <li key={idx}>{t[s] || s}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-8">
                <Button 
                    onClick={() => setStep(2)}
                    disabled={photos.length === 0}
                    fullWidth
                >
                    {t.next}
                </Button>
            </div>

            {previewImage && (
                <div className="fixed inset-0 z-[100] flex justify-center pointer-events-none">
                    <div className="pointer-events-auto w-full max-w-lg h-full bg-surface/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 relative shadow-2xl">
                        <button 
                            className="absolute top-6 right-6 text-on-surface bg-surface-container-highest rounded-full p-2 hover:bg-surface-variant transition-colors"
                            onClick={() => setPreviewImage(null)}
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <img 
                            src={previewImage} 
                            alt="Preview" 
                            className="w-full max-h-[80vh] object-contain rounded-xl"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Step1Photo;
