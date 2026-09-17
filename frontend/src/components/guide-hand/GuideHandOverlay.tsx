import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Check, Sparkles, AlertCircle } from 'lucide-react';
import { useGuidanceStore } from '../../stores/guidanceStore';
import { useProductStore } from '../../stores/productStore';
import { useAuthStore } from '../../stores/authStore';

export default function GuideHandOverlay() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, language: authLang } = useAuthStore();

  const {
    currentStep: currentProductStep,
    setStep: setProductStep,
    photos,
    voiceData
  } = useProductStore();

  const {
    isActive,
    currentWorkflow,
    currentStepIndex,
    guidanceLevel,
    nextStep,
    previousStep,
    skip,
    complete
  } = useGuidanceStore();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; placement: 'top' | 'bottom' | 'side' }>({
    top: 100,
    left: 20,
    placement: 'bottom'
  });
  const [handPos, setHandPos] = useState<{ x: number; y: number; direction: 'up' | 'down' | 'left' | 'right' }>({
    x: 0,
    y: 0,
    direction: 'up'
  });
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const searchTimeoutRef = useRef<number | null>(null);

  const currentLang = i18n.language || authLang || user?.preferred_language || 'en';
  const isArtisanCreateRoute = location.pathname === '/artisan/product/create';

  // Dynamic step configuration when in product creation wizard
  const getActiveStepDetails = useCallback(() => {
    if (isArtisanCreateRoute && currentWorkflow?.name === 'artisan_walkthrough') {
      switch (currentProductStep) {
        case 1:
          return {
            title: 'Step 1 of 7: Product Photo',
            targetId: 'product-image',
            instruction: {
              en: 'Take or upload a photo of your craft. You need at least 1 photo before proceeding.',
              hi: 'अपने शिल्प की एक तस्वीर लें या अपलोड करें। आगे बढ़ने से पहले कम से कम 1 फ़ोटो आवश्यक है।',
              ta: 'உங்கள் கைவினைப்பொருளின் புகைப்படத்தை எடுக்கவும். தொடர்வதற்கு முன் குறைந்தது 1 புகைப்படம் தேவை.',
              te: 'మీ చేతిపని ఫోటో తీయండి లేదా అప్‌లోడ్ చేయండి. కొనసాగడానికి కనీసం 1 ఫోటో అవసరం.',
              kn: 'ನಿಮ್ಮ ಕಲೆಯ ಫೋಟೋ ತೆಗೆಯಿರಿ ಅಥವಾ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ. ಮುಂದುವರಿಯಲು ಕನಿಷ್ಠ 1 ಫೋಟೋ ಅಗತ್ಯವಿದೆ.',
              ml: 'നിങ്ങളുടെ കരകൗശല വസ്തുവിന്റെ ഫോട്ടോ എടുക്കുക. തുടരുന്നതിന് കുറഞ്ഞത് 1 ഫോട്ടോ ആവശ്യമാണ്.'
            }
          };
        case 2:
          return {
            title: 'Step 2 of 7: Voice Description',
            targetId: 'voice-input',
            instruction: {
              en: 'Tap the mic and describe your craft in your native language, or type your description.',
              hi: 'माइक पर टैप करें और अपनी भाषा में अपने शिल्प का वर्णन करें, या नीचे लिखें।',
              ta: 'மைக்கைத் தட்டி உங்கள் தாய்மொழியில் கைவினைப்பொருளை விவரிக்கவும், அல்லது தட்டச்சு செய்யவும்.',
              te: 'మైక్ నొక్కండి మరియు మీ స్వంత భాషలో మీ చేతిపనిని వివరించండి, లేదా టైప్ చేయండి.',
              kn: 'ಮೈಕ್ ಟ್ಯಾಪ್ ಮಾಡಿ ಮತ್ತು ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ವಿವರಿಸಿ, ಅಥವಾ ಕೆಳಗೆ ಟೈಪ್ ಮಾಡಿ.',
              ml: 'മൈക്ക് ടാപ്പ് ചെയ്ത് നിങ്ങളുടെ സ്വന്തം ഭാഷയിൽ ഉൽപ്പന്നം വിവരിക്കുക, അല്ലെങ്കിൽ ടൈപ്പ് ചെയ്യുക.'
            }
          };
        case 3:
          return {
            title: 'Step 3 of 7: AI Catalogue Details',
            targetId: 'product-title',
            instruction: {
              en: 'Review the AI-generated catalogue details. Tap the edit icon to customize any detail.',
              hi: 'AI द्वारा बनाए गए कैटलॉग विवरण की समीक्षा करें। किसी भी विवरण को संपादित करने के लिए टैप करें।',
              ta: 'AI உருவாக்கிய விவரங்களைச் சரிபார்க்கவும். திருத்த விரும்பினால் பென்சில் ஐகானைத் தட்டவும்.',
              te: 'AI రూపొందించిన కేటలాగ్ వివరాలను సమీక్షించండి. దేనినైనా సవరించడానికి ఎడిట్ నొక్కండి.',
              kn: 'AI ರಚಿಸಿದ ಕ್ಯಾಟಲಾಗ್ ಪರಿಶೀಲಿಸಿ. ಅಗತ್ಯವಿದ್ದರೆ ಸಂಪಾದಿಸಿ.',
              ml: 'AI തയ്യാറാക്കിയ കാറ്റലോഗ് വിവരങ്ങൾ പരിശോധിക്കുക. ആവശ്യമെങ്കിൽ തിരുത്തുക.'
            }
          };
        case 4:
          return {
            title: 'Step 4 of 7: Raw Materials',
            targetId: 'materials-section',
            instruction: {
              en: 'List raw materials and craft time to ensure your price covers fair artisan wages.',
              hi: 'कच्चे माल और श्रम समय जोड़ें ताकि उचित मजदूरी और न्यूनतम लागत तय हो सके।',
              ta: 'நியாயமான கூலி மற்றும் செலவைக் கணக்கிட மூலப்பொருட்களைப் பட்டியலிடுங்கள்.',
              te: 'సరైన ధరను లెక్కించడానికి ముడి పదార్థాలు మరియు శ్రమ సమయాన్ని నమోదు చేయండి.',
              kn: 'ನ್ಯಾಯಯುತ ಬೆಲೆಯನ್ನು ಲೆಕ್ಕಹಾಕಲು ಕಚ್ಚಾ ವಸ್ತುಗಳನ್ನು ಸೇರಿಸಿ.',
              ml: 'ന്യായമായ കൂലി ഉറപ്പാക്കാൻ അസംസ്കൃത വസ്തുക്കളുടെ വിവരങ്ങൾ നൽകുക.'
            }
          };
        case 5:
          return {
            title: 'Step 5 of 7: Dynamic Fair Pricing',
            targetId: 'price',
            instruction: {
              en: 'Check the AI suggested price and market comparison, then enter your final selling price.',
              hi: 'AI द्वारा सुझाए गए मूल्य और बाज़ार तुलना को देखें, फिर अपना विक्रय मूल्य दर्ज करें।',
              ta: 'AI பரிந்துரைத்த விலை மற்றும் சந்தை ஒப்பீட்டைப் பார்த்து, உங்கள் இறுதி விலையை உள்ளிடவும்.',
              te: 'AI సూచించిన ధరను పరిశీలించి, మీ తుది అమ్మకపు ధరను నమోదు చేయండి.',
              kn: 'AI ಸೂಚಿಸಿದ ಬೆಲೆಯನ್ನು ಪರಿಶೀಲಿಸಿ, ನಿಮ್ಮ ಅಂತಿಮ ಮಾರಾಟ ಬೆಲೆಯನ್ನು ನಮೂದಿಸಿ.',
              ml: 'AI നിർദ്ദേശിച്ച വില പരിശോധിച്ച് നിങ്ങളുടെ വിൽപന വില നിശ്ചയിക്കുക.'
            }
          };
        case 6:
          return {
            title: 'Step 6 of 7: Inventory & Stock',
            targetId: 'inventory-section',
            instruction: {
              en: 'Specify your available stock quantity and minimum order requirements.',
              hi: 'अपनी उपलब्ध स्टॉक मात्रा और न्यूनतम ऑर्डर आवश्यकता दर्ज करें।',
              ta: 'உங்கள் தயாரிப்பு கையிருப்பு மற்றும் குறைந்தபட்ச ஆர்டர் அளவைக் குறிப்பிடவும்.',
              te: 'మీ వద్ద ఉన్న స్టాక్ పరిమాణాన్ని నమోదు చేయండి.',
              kn: 'ಲಭ್ಯವಿರುವ ಸ್ಟಾಕ್ ಪ್ರಮಾಣವನ್ನು ನಮೂದಿಸಿ.',
              ml: 'ലഭ്യമായ സ്റ്റോക്ക് അളവ് രേഖപ്പെടുത്തുക.'
            }
          };
        case 7:
          return {
            title: 'Step 7 of 7: Quality & Publish',
            targetId: 'publish-product',
            instruction: {
              en: 'Verify your readiness score (must be 70%+). Tap Publish to launch your product live!',
              hi: 'तत्परता स्कोर जांचें (70%+ होना चाहिए) और बाज़ार में लाइव करने के लिए प्रकाशित करें पर टैप करें!',
              ta: 'தயார்நிலை மதிப்பெண்ணைச் சரிபார்த்து (70%+), சந்தையில் வெளியிட தட்டவும்!',
              te: 'సంసిద్ధత స్కోర్‌ను తనిఖీ చేసి, మార్కెట్‌ప్లేస్‌లో విడుదల చేయడానికి ప్రచురించు నొక్కండి!',
              kn: 'ಸಿದ್ಧತೆ ಸ್ಕೋರ್ ಪರಿಶೀಲಿಸಿ (70%+) ಮತ್ತು ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ಪ್ರಕಟಿಸಲು ಟ್ಯಾಪ್ ಮಾಡಿ!',
              ml: 'തയ്യാറെടുപ്പ് സ്കോർ പരിശോധിച്ച് പ്രസിദ്ധീകരിക്കുക!'
            }
          };
        default:
          return null;
      }
    }

    // Default: use workflow step from guidanceStore
    const steps = currentWorkflow?.steps || [];
    const step = steps[currentStepIndex] || null;
    if (!step) return null;

    return {
      title: currentWorkflow?.name === 'buyer_walkthrough' ? 'Buyer Guide' : 'Helping Hand',
      targetId: step.target_id,
      instruction: {
        en: step.instruction_en,
        hi: step.instruction_hi || step.instruction_en,
        ta: step.instruction_ta || step.instruction_en,
        te: step.instruction_te || step.instruction_en,
        kn: step.instruction_kn || step.instruction_en,
        ml: step.instruction_ml || step.instruction_en
      }
    };
  }, [isArtisanCreateRoute, currentWorkflow, currentProductStep, currentStepIndex]);

  const activeStep = getActiveStepDetails();

  // Find target element in DOM
  const findTargetElement = useCallback((targetId?: string): HTMLElement | null => {
    if (!targetId) return null;

    // 1. Data-help selector
    const byHelp = document.querySelector(`[data-help="${targetId}"]`) as HTMLElement;
    if (byHelp) return byHelp;

    // 2. Data-guide-id selector
    const byGuide = document.querySelector(`[data-guide-id="${targetId}"]`) as HTMLElement;
    if (byGuide) return byGuide;

    // 3. ID selector
    const byId = document.getElementById(targetId);
    if (byId) return byId;

    // 4. Fuzzy fallback matches
    if (targetId === 'add-product') {
      return (document.querySelector('#add-product-button') ||
        document.querySelector('[data-guide-id="add-product-button"]') ||
        document.querySelector('button[onClick*="product/create"]')) as HTMLElement;
    }
    if (targetId === 'product-image') {
      return (document.querySelector('[data-help="product-image"]') ||
        document.querySelector('input[type="file"]') ||
        document.querySelector('[data-guide-id="add-photo-button"]')) as HTMLElement;
    }
    if (targetId === 'voice-input') {
      return (document.querySelector('[data-help="voice-input"]') ||
        document.querySelector('button[aria-label*="speak" i]') ||
        document.querySelector('button[aria-label*="mic" i]')) as HTMLElement;
    }
    if (targetId === 'publish-product') {
      return (document.querySelector('[data-help="publish-product"]') ||
        document.querySelector('[data-guide-id="publish-button"]')) as HTMLElement;
    }

    return null;
  }, []);

  // Update positions with guaranteed pointing direction
  const updatePositions = useCallback(() => {
    if (!activeStep) return;

    const el = findTargetElement(activeStep.targetId);
    if (!el) {
      setTargetRect(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    setTargetRect(rect);

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardWidth = Math.min(340, vw - 24);
    const cardHeight = 160;
    const margin = 16;

    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;

    let cardTop = 0;
    let cardLeft = Math.max(12, Math.min(vw - cardWidth - 12, rect.left + rect.width / 2 - cardWidth / 2));
    let placement: 'top' | 'bottom' | 'side' = 'bottom';

    if (spaceBelow >= cardHeight + margin + 40) {
      // Tooltip sits BELOW target
      cardTop = rect.bottom + margin + 12;
      placement = 'bottom';
    } else if (spaceAbove >= cardHeight + margin + 40) {
      // Tooltip sits ABOVE target
      cardTop = Math.max(12, rect.top - cardHeight - margin);
      placement = 'top';
    } else {
      // Dock near bottom safe area
      cardTop = Math.max(12, vh - cardHeight - 80);
      placement = 'side';
    }

    setTooltipPos({ top: cardTop, left: cardLeft, placement });

    // Target center coordinates
    const targetCenterX = rect.left + rect.width / 2;

    // Precise hand positioning right at the target border:
    if (placement === 'bottom') {
      // Hand points straight UP into the lower edge of the target box
      setHandPos({
        x: Math.max(16, Math.min(vw - 56, targetCenterX - 24)),
        y: rect.bottom - 16,
        direction: 'up'
      });
    } else if (placement === 'top') {
      // Hand points straight DOWN into the upper edge of the target box
      setHandPos({
        x: Math.max(16, Math.min(vw - 56, targetCenterX - 24)),
        y: Math.max(8, rect.top - 32),
        direction: 'down'
      });
    } else {
      // Point horizontally towards target center
      if (targetCenterX > vw / 2) {
        setHandPos({
          x: Math.max(12, rect.left - 48),
          y: rect.top + rect.height / 2 - 24,
          direction: 'right'
        });
      } else {
        setHandPos({
          x: Math.min(vw - 56, rect.right + 4),
          y: rect.top + rect.height / 2 - 24,
          direction: 'left'
        });
      }
    }
  }, [activeStep, findTargetElement]);

  // Handle route / step synchronization
  useEffect(() => {
    if (!isActive || !activeStep || guidanceLevel === 'off') return;

    let attempts = 0;
    const maxAttempts = 15;

    const tryFindAndScroll = () => {
      const el = findTargetElement(activeStep.targetId);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.top < 60 || r.bottom > window.innerHeight - 80) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        updatePositions();
      } else if (attempts < maxAttempts) {
        attempts++;
        searchTimeoutRef.current = window.setTimeout(tryFindAndScroll, 200);
      } else {
        setTargetRect(null);
      }
    };

    tryFindAndScroll();

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [isActive, activeStep, guidanceLevel, location.pathname, currentProductStep, findTargetElement, updatePositions]);

  // Keep positions updated during scrolling and window resizing
  useEffect(() => {
    if (!isActive) return;

    const handleScrollOrResize = () => {
      requestAnimationFrame(updatePositions);
    };

    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isActive, updatePositions]);

  if (!isActive || !activeStep || guidanceLevel === 'off') {
    return null;
  }

  // Handle Next button click with strict validation
  const handleNextClick = () => {
    setWarningMsg(null);

    // If on Dashboard, navigate to create page
    if (!isArtisanCreateRoute && location.pathname === '/artisan') {
      navigate('/artisan/product/create');
      return;
    }

    // If in product creation wizard, enforce required data
    if (isArtisanCreateRoute && currentWorkflow?.name === 'artisan_walkthrough') {
      if (currentProductStep === 1) {
        if (photos.length === 0) {
          setWarningMsg(
            currentLang === 'hi'
              ? 'कृपया पहले कम से कम 1 फ़ोटो लें या अपलोड करें।'
              : currentLang === 'ta'
              ? 'தொடர்வதற்கு முன் குறைந்தது 1 புகைப்படத்தைப் பதிவேற்றவும்.'
              : 'Please take or upload at least 1 photo first. Photos cannot be skipped.'
          );
          return;
        }
        setProductStep(2);
        return;
      }

      if (currentProductStep === 2) {
        const hasVoiceOrText = voiceData?.translated_text || voiceData?.original_text;
        if (!hasVoiceOrText) {
          setWarningMsg(
            currentLang === 'hi'
              ? 'कृपया पहले माइक्रोफ़ोन पर बोलें या अपना विवरण लिखें।'
              : currentLang === 'ta'
              ? 'தயவுசெய்து மைக்கில் பேசவும் அல்லது விளக்கத்தைத் தட்டச்சு செய்யவும்.'
              : 'Please speak into the mic or type a description to continue.'
          );
          return;
        }
        setProductStep(3);
        return;
      }

      if (currentProductStep === 3) {
        setProductStep(4);
        return;
      }

      if (currentProductStep === 4) {
        setProductStep(5);
        return;
      }

      if (currentProductStep === 5) {
        setProductStep(6);
        return;
      }

      if (currentProductStep === 6) {
        setProductStep(7);
        return;
      }

      if (currentProductStep === 7) {
        complete();
        return;
      }
    }

    // Default walkthrough step progression
    nextStep();
  };

  const handlePreviousClick = () => {
    setWarningMsg(null);
    if (isArtisanCreateRoute && currentWorkflow?.name === 'artisan_walkthrough') {
      if (currentProductStep > 1) {
        setProductStep(currentProductStep - 1);
        return;
      }
      navigate('/artisan');
      return;
    }
    previousStep();
  };

  const instructionText =
    activeStep.instruction[currentLang as keyof typeof activeStep.instruction] ||
    activeStep.instruction.en;

  const rotationDeg =
    handPos.direction === 'up'
      ? 0
      : handPos.direction === 'down'
      ? 180
      : handPos.direction === 'right'
      ? 90
      : 270;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {/* Target Highlight Outline (Clicks pass straight through!) */}
      {targetRect && (
        <div
          className="absolute pointer-events-none transition-all duration-300 rounded-2xl"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: '0 0 0 3px #d97706, 0 0 25px rgba(217, 119, 6, 0.5)',
            border: '2px solid rgba(255, 255, 255, 0.95)',
            zIndex: 99990
          }}
        >
          <span className="absolute -top-2 -right-2 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
          </span>
        </div>
      )}

      {/* Animated Pointing Hand */}
      {targetRect && (
        <motion.div
          animate={
            handPos.direction === 'up'
              ? { y: [0, -10, 0], scale: [1, 1.08, 1] }
              : handPos.direction === 'down'
              ? { y: [0, 10, 0], scale: [1, 1.08, 1] }
              : { x: handPos.direction === 'left' ? [0, -10, 0] : [0, 10, 0], scale: [1, 1.08, 1] }
          }
          transition={{
            repeat: Infinity,
            duration: 1.2,
            ease: 'easeInOut'
          }}
          className="absolute pointer-events-none z-[99995] drop-shadow-[0_6px_16px_rgba(217,119,6,0.6)]"
          style={{
            left: handPos.x,
            top: handPos.y
          }}
        >
          <div
            className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-2xl border-2 border-white"
            style={{ transform: `rotate(${rotationDeg}deg)` }}
          >
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white text-white">
              <path d="M12 2C11.17 2 10.5 2.67 10.5 3.5V11H9.75C8.78 11 8 11.78 8 12.75V14.5L5.73 12.23C5.14 11.64 4.19 11.64 3.6 12.23C3.01 12.82 3.01 13.77 3.6 14.36L8.46 19.22C9.5 20.26 10.9 20.85 12.38 20.85H16C18.21 20.85 20 19.06 20 16.85V10C20 9.17 19.33 8.5 18.5 8.5C18.3 8.5 18.11 8.54 17.94 8.62C17.69 7.82 16.94 7.25 16.05 7.25C15.82 7.25 15.6 7.3 15.4 7.4C15.13 6.72 14.47 6.25 13.7 6.25C13.52 6.25 13.35 6.28 13.19 6.34V3.5C13.19 2.67 12.52 2 11.69 2H12Z" />
            </svg>
          </div>
        </motion.div>
      )}

      {/* Movable Non-Obstructive Tooltip Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeStep.targetId}-${currentProductStep}`}
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="absolute pointer-events-auto z-[99998] bg-surface text-on-surface rounded-2xl shadow-2xl border border-amber-500/30 p-4 max-w-[340px] w-[calc(100vw-24px)] sm:w-[340px]"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left
          }}
        >
          {/* Header & Title */}
          <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-outline-variant/40">
            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center font-black text-xs">
                <Sparkles size={14} />
              </span>
              <span className="text-xs font-black tracking-wide text-amber-600 uppercase">
                {activeStep.title}
              </span>
            </div>
            <button
              onClick={skip}
              className="w-6 h-6 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              aria-label="Close Guide"
            >
              <X size={15} />
            </button>
          </div>

          {/* Instruction Text */}
          <p className="text-sm font-semibold text-stone-800 leading-snug mb-3">
            {instructionText}
          </p>

          {/* Warning Banner if user tries to skip required steps */}
          {warningMsg && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold flex items-start gap-1.5 shadow-sm"
            >
              <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <span>{warningMsg}</span>
            </motion.div>
          )}

          {/* Progress bar */}
          <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden mb-3">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-300"
              style={{
                width: isArtisanCreateRoute
                  ? `${(currentProductStep / 7) * 100}%`
                  : `${((currentStepIndex + 1) / (currentWorkflow?.steps?.length || 1)) * 100}%`
              }}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              onClick={handlePreviousClick}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 flex items-center gap-1 transition-colors"
            >
              <ChevronLeft size={14} /> Back
            </button>

            <button
              onClick={handleNextClick}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md flex items-center gap-1 transition-all active:scale-95 ml-auto"
            >
              {isArtisanCreateRoute && currentProductStep === 7 ? (
                <>
                  <Check size={14} /> Done
                </>
              ) : (
                <>
                  Next <ChevronRight size={14} />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
