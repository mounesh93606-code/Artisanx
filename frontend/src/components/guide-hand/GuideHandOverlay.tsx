import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Check, Sparkles, Pointer } from 'lucide-react';
import { useGuidanceStore } from '../../stores/guidanceStore';
import { useProductStore } from '../../stores/productStore';
import { useAuthStore } from '../../stores/authStore';

export default function GuideHandOverlay() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, language: authLang } = useAuthStore();
  const currentProductStep = useProductStore((state) => state.currentStep);
  const setProductStep = useProductStore((state) => state.setStep);

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
  const [handPos, setHandPos] = useState<{ x: number; y: number; angle: number }>({ x: 0, y: 0, angle: 0 });
  const searchTimeoutRef = useRef<number | null>(null);

  const steps = currentWorkflow?.steps || [];
  const currentStep = steps[currentStepIndex] || null;
  const totalSteps = steps.length;
  const currentLang = i18n.language || authLang || user?.preferred_language || 'en';

  // Find target element in DOM with priority selectors
  const findTargetElement = useCallback((targetId: string): HTMLElement | null => {
    if (!targetId) return null;

    // 1. Primary: data-help attribute
    const byDataHelp = document.querySelector(`[data-help="${targetId}"]`) as HTMLElement;
    if (byDataHelp) return byDataHelp;

    // 2. Secondary: data-guide-id
    const byGuideId = document.querySelector(`[data-guide-id="${targetId}"]`) as HTMLElement;
    if (byGuideId) return byGuideId;

    // 3. Tertiary: element ID
    const byId = document.getElementById(targetId);
    if (byId) return byId;

    // 4. Quaternary: fuzzy matches for common elements
    if (targetId === 'add-product') {
      return (document.querySelector('#add-product-button') ||
        document.querySelector('[data-guide-id="add-product-button"]') ||
        document.querySelector('button[onClick*="product/create"]')) as HTMLElement;
    }
    if (targetId === 'product-image') {
      return (document.querySelector('input[type="file"]') ||
        document.querySelector('[data-help="product-image"]')) as HTMLElement;
    }
    if (targetId === 'voice-input') {
      return (document.querySelector('button[aria-label*="mic" i]') ||
        document.querySelector('[data-help="voice-input"]')) as HTMLElement;
    }
    if (targetId === 'cart') {
      return document.querySelector('[data-help="cart"]') as HTMLElement;
    }
    if (targetId === 'buy-now') {
      return document.querySelector('[data-help="buy-now"]') as HTMLElement;
    }
    if (targetId === 'enquiry') {
      return document.querySelector('[data-help="enquiry"]') as HTMLElement;
    }

    return null;
  }, []);

  // Update rect and calculate non-obstructive positioning
  const updatePositions = useCallback(() => {
    if (!currentStep) return;

    const el = findTargetElement(currentStep.target_id);
    if (!el) {
      setTargetRect(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    setTargetRect(rect);

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardWidth = Math.min(320, vw - 24);
    const cardHeight = 150;
    const margin = 16;

    // Calculate smart tooltip coordinates (Never covers the target!)
    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;

    let cardTop = 0;
    let cardLeft = Math.max(12, Math.min(vw - cardWidth - 12, rect.left + rect.width / 2 - cardWidth / 2));
    let placement: 'top' | 'bottom' | 'side' = 'bottom';

    if (spaceBelow >= cardHeight + margin) {
      // Position BELOW target
      cardTop = rect.bottom + margin;
      placement = 'bottom';
    } else if (spaceAbove >= cardHeight + margin) {
      // Position ABOVE target
      cardTop = rect.top - cardHeight - margin;
      placement = 'top';
    } else {
      // If cramped vertically, dock to bottom safe area
      cardTop = vh - cardHeight - margin - 20;
      placement = 'side';
    }

    setTooltipPos({ top: cardTop, left: cardLeft, placement });

    // Calculate animated hand position:
    // Hand points toward center of target from the outside!
    const targetCenterX = rect.left + rect.width / 2;
    const targetCenterY = rect.top + rect.height / 2;

    if (placement === 'bottom') {
      // Hand points UP from below the target
      setHandPos({
        x: targetCenterX - 18,
        y: rect.bottom + 6,
        angle: 0 // pointing upward
      });
    } else if (placement === 'top') {
      // Hand points DOWN from above the target
      setHandPos({
        x: targetCenterX - 18,
        y: Math.max(8, rect.top - 42),
        angle: 180 // pointing downward
      });
    } else {
      // Point from left or right
      if (targetCenterX > vw / 2) {
        setHandPos({
          x: Math.max(10, rect.left - 42),
          y: targetCenterY - 18,
          angle: 90 // pointing right
        });
      } else {
        setHandPos({
          x: Math.min(vw - 50, rect.right + 8),
          y: targetCenterY - 18,
          angle: 270 // pointing left
        });
      }
    }
  }, [currentStep, findTargetElement]);

  // Handle route and product step synchronization when step changes
  useEffect(() => {
    if (!isActive || !currentStep || guidanceLevel === 'off') return;

    let attempts = 0;
    const maxAttempts = 15;

    // 1. Check if we need route navigation
    if (currentStep.route && location.pathname !== currentStep.route) {
      navigate(currentStep.route);
    }

    // 2. Check if we are on /artisan/product/create and need to switch product wizard step
    if (currentStep.productStep && currentProductStep !== currentStep.productStep) {
      setProductStep(currentStep.productStep);
    }

    const tryFindAndScroll = () => {
      const el = findTargetElement(currentStep.target_id);
      if (el) {
        // Scroll element into view smoothly if not visible
        const r = el.getBoundingClientRect();
        if (r.top < 60 || r.bottom > window.innerHeight - 60) {
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
  }, [
    isActive,
    currentStepIndex,
    currentStep,
    guidanceLevel,
    location.pathname,
    currentProductStep,
    navigate,
    setProductStep,
    findTargetElement,
    updatePositions
  ]);

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

  if (!isActive || !currentStep || guidanceLevel === 'off') {
    return null;
  }

  // Get localized instruction
  const getInstruction = () => {
    const key = `instruction_${currentLang}` as keyof typeof currentStep;
    return (currentStep[key] as string) || currentStep.instruction_en || 'Follow the highlighted step.';
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {/* Target Highlight Ring (Non-blocking: clicks pass straight through to the button!) */}
      {targetRect && (
        <div
          className="absolute pointer-events-none transition-all duration-300 rounded-2xl"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: '0 0 0 3px #d97706, 0 0 24px rgba(217, 119, 6, 0.45)',
            border: '2px solid rgba(255, 255, 255, 0.9)',
            zIndex: 99990
          }}
        >
          <span className="absolute -top-2 -right-2 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
          </span>
        </div>
      )}

      {/* Animated Hand Pointer */}
      {targetRect && (
        <motion.div
          animate={{
            y: [handPos.y, handPos.y - 8, handPos.y],
            scale: [1, 1.08, 1]
          }}
          transition={{
            repeat: Infinity,
            duration: 1.4,
            ease: 'easeInOut'
          }}
          className="absolute pointer-events-none z-[99995] drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)]"
          style={{
            left: handPos.x,
            top: handPos.y,
            transform: `rotate(${handPos.angle}deg)`
          }}
        >
          <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg border-2 border-white">
            <Pointer size={22} className="fill-white stroke-amber-700" />
          </div>
        </motion.div>
      )}

      {/* Movable Non-Obstructive Tooltip Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="absolute pointer-events-auto z-[99998] bg-surface text-on-surface rounded-2xl shadow-2xl border border-amber-500/30 p-4 max-w-[320px] w-[calc(100vw-24px)] sm:w-[320px]"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left
          }}
        >
          {/* Header & Step Indicator */}
          <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-outline-variant/40">
            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center font-black text-xs">
                <Sparkles size={14} />
              </span>
              <span className="text-xs font-black tracking-wide text-amber-600 uppercase">
                {currentWorkflow?.name === 'buyer_walkthrough' ? 'Buyer Guide' : 'Helping Hand'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                {currentStepIndex + 1} of {totalSteps}
              </span>
              <button
                onClick={skip}
                className="w-6 h-6 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                aria-label="Close Guide"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Instruction Text */}
          <p className="text-sm font-semibold text-stone-800 leading-snug mb-3">
            {getInstruction()}
          </p>

          {/* Progress bar */}
          <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden mb-3">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              onClick={previousStep}
              disabled={currentStepIndex === 0}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors ${
                currentStepIndex === 0
                  ? 'text-stone-300 cursor-not-allowed'
                  : 'text-stone-600 bg-stone-100 hover:bg-stone-200'
              }`}
            >
              <ChevronLeft size={14} /> Back
            </button>

            <button
              onClick={currentStepIndex === totalSteps - 1 ? complete : nextStep}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md flex items-center gap-1 transition-all active:scale-95 ml-auto"
            >
              {currentStepIndex === totalSteps - 1 ? (
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
