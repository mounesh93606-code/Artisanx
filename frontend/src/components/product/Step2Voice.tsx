import { useState, useRef, useEffect } from 'react';
import { Mic, Square, RotateCcw, CheckCircle, Keyboard, Type, AlertCircle } from 'lucide-react';
import { useProductStore } from '../../stores/productStore';
import api from '../../lib/api';
import { Button } from '../ui/Button';

const REGIONAL_LANGUAGES = [
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

const Step2Voice = ({ t, lang }: { t: any, lang: string }) => {
    const { voiceData, setVoiceData, setStep, saveDraft, draftId, catalogueData } = useProductStore();
    const [selectedLang, setSelectedLang] = useState(lang || 'en');
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [timer, setTimer] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [inputMode, setInputMode] = useState<'voice'|'type'>('voice');
    const [descriptionText, setDescriptionText] = useState('');

    useEffect(() => {
        if (voiceData?.translated_text) {
            setDescriptionText(voiceData.translated_text);
        } else if (catalogueData?.full_description || catalogueData?.description) {
            setDescriptionText(catalogueData.full_description || catalogueData.description || '');
        }
    }, [voiceData, catalogueData]);

    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const timerRef = useRef<number | null>(null);

    const startRecording = async () => {
        try {
            setErrorMsg('');
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            let mimeType = 'audio/webm';
            if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
                if (!MediaRecorder.isTypeSupported('audio/webm')) {
                    if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
                    else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
                    else mimeType = '';
                }
            }

            const options = mimeType ? { mimeType } : undefined;
            const recorder = new MediaRecorder(stream, options);
            mediaRecorder.current = recorder;
            
            const chunks: BlobPart[] = [];
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunks.push(e.data);
            };
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
            };
            
            recorder.start(250);
            setIsRecording(true);
            setTimer(0);
            timerRef.current = window.setInterval(() => setTimer(t => t + 1), 1000);
        } catch (err: any) {
            console.error("Microphone access denied", err);
            const isPerm = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
            setErrorMsg(isPerm 
                ? "Microphone permission denied. Please allow microphone access in device Settings -> Apps -> ArtisanX." 
                : "Could not access microphone. You can type your description manually using the 'Type' tab above.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current && isRecording) {
            mediaRecorder.current.stop();
            mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const handleProcessVoice = async () => {
        if (!audioBlob) return;
        setIsProcessing(true);
        setErrorMsg('');
        
        try {
            const ext = audioBlob.type.includes('mp4') ? 'mp4' : audioBlob.type.includes('ogg') ? 'ogg' : audioBlob.type.includes('wav') ? 'wav' : 'webm';
            const formData = new FormData();
            formData.append('file', audioBlob, `recording.${ext}`);
            if (draftId) formData.append('product_id', draftId);
            formData.append('language', selectedLang);
            
            const transcribeRes = await api.post('/voice/process', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (transcribeRes.data.is_valid === false) {
                setErrorMsg(transcribeRes.data.validation_error || "Audio was unclear or silent. Please speak clearly into the microphone and record again.");
                setIsProcessing(false);
                return;
            }
            
            const rawText = transcribeRes.data.translated_text || transcribeRes.data.original_text || '';
            const cleanText = rawText.trim();
            const noiseArtifacts = ['dii', 'di', 'umm', 'the', 'um', 'ah', 'oh', 'you', 'dee', 'தி', 'दी', 'd'];

            if (!cleanText || noiseArtifacts.includes(cleanText.toLowerCase()) || cleanText.length <= 2) {
                setErrorMsg(t.noSpeechDetected || "No clear speech detected. Please speak closer to your microphone or type your description.");
                setIsProcessing(false);
                return;
            }

            setDescriptionText(cleanText);
            setVoiceData({
                record_id: transcribeRes.data.voice_record_id,
                original_text: transcribeRes.data.original_text || cleanText,
                translated_text: cleanText,
                detected_language: transcribeRes.data.original_language || selectedLang,
                is_valid: true
            });
        } catch (err: any) {
            console.error("Voice process error:", err);
            let msg = err.response?.data?.detail || err.message || "Voice processing failed. You can type manually.";
            if (err.message && err.message.toLowerCase().includes('network')) {
                msg = "Cannot reach server. Please check backend connection via USB / Wi-Fi, or switch to Type mode.";
            } else if (typeof msg === 'string' && (msg.includes('Bucket not found') || msg.includes('{'))) {
                msg = "Voice processing is temporarily unavailable. You can type your craft description manually.";
            } else if (typeof msg === 'object') {
                msg = "Voice processing error. You can type your craft description manually.";
            }
            setErrorMsg(msg);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col gap-6" data-guide-id="product_create">
            
            {/* Input Mode Toggle */}
            <div className="flex gap-2 bg-surface-container-low p-1 rounded-full w-fit mx-auto mb-1">
                <button 
                    onClick={() => setInputMode('voice')}
                    className={`px-5 py-2 rounded-full font-bold flex items-center gap-2 transition-all text-sm ${inputMode === 'voice' ? 'bg-surface-container-lowest shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                    <Mic className="w-4 h-4" /> Speak
                </button>
                <button 
                    onClick={() => setInputMode('type')}
                    className={`px-5 py-2 rounded-full font-bold flex items-center gap-2 transition-all text-sm ${inputMode === 'type' ? 'bg-surface-container-lowest shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                    <Keyboard className="w-4 h-4" /> Type
                </button>
            </div>

            {/* Regional Language Selector */}
            {inputMode === 'voice' && (
                <div className="bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant/30 shadow-sm">
                    <div className="text-[11px] font-bold text-outline uppercase tracking-wider mb-2 flex items-center gap-1.5 px-1">
                        <span className="material-symbols-outlined text-[16px]">translate</span>
                        <span>Spoken Language:</span>
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
                        {REGIONAL_LANGUAGES.map((l) => (
                            <button
                                key={l.code}
                                type="button"
                                onClick={() => setSelectedLang(l.code)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                                    selectedLang === l.code
                                        ? 'bg-primary text-on-primary shadow-sm ring-2 ring-primary/30'
                                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                                }`}
                            >
                                {l.native} <span className="opacity-75 font-normal">({l.label})</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {inputMode === 'voice' && !audioBlob && (
                <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden mb-2 border border-outline-variant/30">
                    {/* Subtle Artisan Pattern Accent Background SVG */}
                    <svg className="absolute -right-8 -top-8 w-36 h-36 opacity-5 pointer-events-none text-primary" fill="currentColor" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" fill="none" r="45" stroke="currentColor" strokeDasharray="6,6" strokeWidth="4"></circle>
                        <circle cx="50" cy="50" fill="none" r="28" stroke="currentColor" strokeWidth="2"></circle>
                        <path d="M50 10 L50 90 M10 50 L90 50 M22 22 L78 78 M22 78 L78 22"></path>
                    </svg>

                    <h2 className="text-2xl font-bold text-on-surface mb-2">
                        {t.voiceTitle || "Tell us about your craft"}
                    </h2>
                    <p className="text-sm text-on-surface-variant max-w-xs mb-6">
                        Speak naturally in your own language. Mention product name, materials, how it was made, and care.
                    </p>

                    {/* Glowing Interactive Mic Button */}
                    <div className="relative flex items-center justify-center my-4">
                        {isRecording && (
                            <>
                                <div className="absolute w-28 h-28 rounded-full bg-error-container opacity-40 animate-ping"></div>
                                <div className="absolute w-24 h-24 rounded-full bg-error opacity-70"></div>
                            </>
                        )}
                        <button 
                            data-help="voice-input"
                            aria-label="Tap to speak or record voice" 
                            className={`relative z-10 w-[88px] h-[88px] rounded-full flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all ${isRecording ? 'bg-error text-on-error' : 'bg-gradient-to-br from-primary via-primary-container to-surface-tint text-on-primary'}`} 
                            onClick={isRecording ? stopRecording : startRecording}
                            type="button"
                        >
                            {isRecording ? <Square className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                            <span className="text-[10px] tracking-wider uppercase font-bold opacity-90 mt-1">{isRecording ? 'Stop' : 'Record'}</span>
                        </button>
                    </div>
                    
                    {isRecording ? (
                        <div className="w-full mt-4 pt-2 flex flex-col items-center">
                            <div className="flex items-center justify-between w-full max-w-[260px] mb-2 px-1">
                                <span className="flex items-center gap-1 text-sm text-error font-bold tracking-wider">
                                    <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
                                    {Math.floor(timer / 60).toString().padStart(2, '0')}:{(timer % 60).toString().padStart(2, '0')}
                                </span>
                                <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-bold">Voice active</span>
                            </div>
                            <div className="flex items-center justify-center gap-1 h-12 w-full px-4 bg-surface-container-low rounded-xl py-2">
                                {[3, 7, 10, 6, 11, 8, 4, 9, 12, 7, 4, 10, 5, 3].map((h, idx) => (
                                    <span key={idx} className={`w-1.5 rounded-full animate-pulse ${idx % 2 === 0 ? 'bg-primary' : (idx % 3 === 0 ? 'bg-secondary' : 'bg-primary-container')}`} style={{ height: `${h * 4}px`, animationDelay: `${idx * 0.1}s` }}></span>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-primary mt-2 font-bold uppercase tracking-wider">
                            Tap to start recording
                        </p>
                    )}
                </div>
            )}

            {inputMode === 'voice' && audioBlob && !voiceData && (
                <div className="flex flex-col gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/30 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-sm text-tertiary font-bold">
                            <span className="material-symbols-outlined text-[18px]">mic_double</span>
                            Voice captured ({REGIONAL_LANGUAGES.find(l => l.code === selectedLang)?.native})
                        </span>
                        <span className="text-[11px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-md uppercase tracking-wider font-bold">Ready</span>
                    </div>

                    <audio src={audioUrl!} controls className="w-full h-12 rounded-full overflow-hidden" />
                    
                    <div className="flex gap-4 mt-2">
                        <Button 
                            variant="secondary"
                            onClick={() => { setAudioBlob(null); setAudioUrl(null); setErrorMsg(''); }}
                            disabled={isProcessing}
                            className="flex-1"
                        >
                            <RotateCcw className="w-4 h-4 mr-2" /> {t.reRecord}
                        </Button>
                        <Button 
                            onClick={handleProcessVoice}
                            disabled={isProcessing}
                            className="flex-1"
                        >
                            {isProcessing ? (
                                <span className="flex items-center justify-center gap-2" data-guide-id="ai-processing-loader">
                                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                    {t.processing}
                                </span>
                            ) : (
                                <><CheckCircle className="w-4 h-4 mr-2" /> AI Transcribe</>
                            )}
                        </Button>
                    </div>

                    {errorMsg && (
                        <div className="bg-error-container text-on-error-container p-4 rounded-2xl flex items-start gap-3 border border-error/20">
                            <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-bold">{errorMsg}</p>
                                <p className="text-xs text-on-error-container/80 mt-1">
                                    Tip: Speak clearly near the microphone, or use the "Type" option to enter description directly.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => { setAudioBlob(null); setAudioUrl(null); setErrorMsg(''); }}
                                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-error text-on-error text-xs font-bold shadow-sm"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" /> Record Again
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {((inputMode === 'type') || (inputMode === 'voice' && voiceData)) && (
                <div className="bg-surface-container-lowest border border-outline-variant/30 shadow-sm rounded-3xl p-6">
                    {inputMode === 'voice' && voiceData && (
                        <div className="flex items-center justify-between mb-4 border-b border-surface-container pb-4">
                            <span className="inline-flex items-center gap-1 text-sm text-tertiary font-bold">
                                <span className="material-symbols-outlined text-[18px]">verified</span>
                                AI Processed ({REGIONAL_LANGUAGES.find(l => l.code === (voiceData.detected_language || selectedLang))?.native})
                            </span>
                            <button
                                type="button"
                                onClick={() => { setVoiceData(null); setAudioBlob(null); setAudioUrl(null); }}
                                className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                            >
                                <RotateCcw className="w-3.5 h-3.5" /> Re-record
                            </button>
                        </div>
                    )}
                    
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-on-surface flex items-center gap-2">
                            <Type className="w-5 h-5 text-primary" /> Product Description
                        </h4>
                    </div>
                    
                    <textarea 
                        dir="auto"
                        data-guide-id="product-description"
                        data-help="product-description"
                        id="product-description"
                        placeholder={t.productGuidanceTypePlaceholder || "Example: Terracotta clay water pot handmade on traditional wheel with natural burnished red clay finish..."}
                        className="w-full p-4 rounded-2xl border-2 border-surface-container-high bg-surface-container-lowest focus:border-primary focus:ring-0 text-on-surface font-medium leading-relaxed resize-y shadow-inner transition-colors" 
                        value={descriptionText} 
                        onChange={(e) => setDescriptionText(e.target.value)}
                        rows={5} 
                    />

                    {inputMode === 'voice' && voiceData && voiceData.original_text && voiceData.original_text !== descriptionText && (
                        <div className="mt-4 pt-4 border-t border-surface-container">
                            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Original Spoken Audio</p>
                            <blockquote className="bg-surface-container-low rounded-xl p-4 text-on-surface italic text-sm border-l-4 border-secondary/50">
                                "{voiceData.original_text}"
                            </blockquote>
                        </div>
                    )}
                </div>
            )}

            <div className="bg-secondary-fixed/50 rounded-2xl p-4 mt-2 flex items-start gap-4">
                <span className="material-symbols-outlined text-secondary text-[22px] mt-0.5">auto_awesome</span>
                <div className="min-w-0">
                    <h4 className="font-bold text-on-secondary-fixed text-sm">Next: Multilingual AI Catalogue & SEO</h4>
                    <p className="text-sm text-on-secondary-fixed-variant mt-1">
                        In Step 3, AI formats this description into a professional product catalogue, generates cultural story & SEO tags, and translates into 9 Indian languages.
                    </p>
                </div>
            </div>

            <div className="mt-4 flex gap-3">
                <Button variant="ghost" onClick={() => setStep(1)} className="px-4">
                    {t.back || "Back"}
                </Button>
                <Button 
                    variant="outline" 
                    onClick={async () => {
                        await saveDraft();
                        setStep(3);
                    }}
                    className="px-5 border-outline-variant/60 text-on-surface hover:bg-surface-container"
                >
                    {t.skip || "Skip"}
                </Button>
                <Button 
                    onClick={async () => { 
                        setVoiceData({ 
                            ...voiceData, 
                            translated_text: descriptionText, 
                            original_text: voiceData?.original_text || descriptionText,
                            detected_language: voiceData?.detected_language || selectedLang
                        });
                        await saveDraft(); 
                        setStep(3); 
                    }}
                    disabled={!descriptionText.trim()}
                    className="flex-1"
                >
                    {t.next} <span className="material-symbols-outlined text-[18px] ml-1">arrow_forward</span>
                </Button>
            </div>
        </div>
    );
};
export default Step2Voice;
