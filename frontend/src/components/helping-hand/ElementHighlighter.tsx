import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useHelpingHandStore } from './helpingHandStore';
import { X, ArrowRight } from 'lucide-react';

interface ElementRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function ElementHighlighter() {
  const { i18n, t } = useTranslation();
  const {
    highlightTarget,
    setHighlightTarget,
    isGuideModeActive,
    currentGuideStepIndex,
    nextGuideStep,
    stopGuideMode,
  } = useHelpingHandStore();

  const [rect, setRect] = useState<ElementRect | null>(null);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  const isTamil = (i18n.language || 'en').startsWith('ta');

  // Find the target element in DOM using various strategies
  const findElement = useCallback((selector: string): HTMLElement | null => {
    if (!selector) return null;

    // 1. Try data-guide-id
    let el = document.querySelector(`[data-guide-id="${selector}"]`) as HTMLElement;
    if (el) return el;

    // 2. Try id
    el = document.getElementById(selector) as HTMLElement;
    if (el) return el;

    // 3. Try name
    el = document.querySelector(`[name="${selector}"]`) as HTMLElement;
    if (el) return el;

    // 4. Try standard CSS selector
    try {
      el = document.querySelector(selector) as HTMLElement;
      if (el) return el;
    } catch (_) {}

    // 5. Fallback: try finding button/input by partial text or role
    const buttons = Array.from(document.querySelectorAll('button, a, input, select, textarea')) as HTMLElement[];
    const match = buttons.find(
      (b) =>
        b.getAttribute('aria-label')?.toLowerCase().includes(selector.toLowerCase()) ||
        b.innerText?.toLowerCase().includes(selector.toLowerCase()) ||
        b.getAttribute('placeholder')?.toLowerCase().includes(selector.toLowerCase())
    );

    return match || null;
  }, []);

  // Update rect and scroll into view if needed
  const updatePosition = useCallback(() => {
    if (!highlightTarget) {
      setRect(null);
      setTargetElement(null);
      return;
    }

    const el = findElement(highlightTarget.selector);
    if (!el) {
      setRect(null);
      setTargetElement(null);
      return;
    }

    setTargetElement(el);

    const clientRect = el.getBoundingClientRect();
    const isVisibleInViewport =
      clientRect.top >= 80 &&
      clientRect.bottom <= (window.innerHeight || document.documentElement.clientHeight) - 40;

    // Intelligent scrolling: only scroll if outside viewport
    if (!isVisibleInViewport) {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }

    // After potential scroll or immediately, update bounding box
    const updateBoundingRect = () => {
      const r = el.getBoundingClientRect();
      setRect({
        top: r.top + window.scrollY,
        left: r.left + window.scrollX,
        width: r.width,
        height: r.height,
      });
    };

    updateBoundingRect();
    // Re-check shortly in case smooth scrolling is happening
    const timer = setTimeout(updateBoundingRect, 400);
    return () => clearTimeout(timer);
  }, [highlightTarget, findElement]);

  useEffect(() => {
    updatePosition();

    const handleResizeOrScroll = () => {
      if (targetElement) {
        const r = targetElement.getBoundingClientRect();
        setRect({
          top: r.top + window.scrollY,
          left: r.left + window.scrollX,
          width: r.width,
          height: r.height,
        });
      }
    };

    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll);
    };
  }, [updatePosition, targetElement]);

  // Listen for interaction on the target element to automatically advance or dismiss
  useEffect(() => {
    if (!targetElement) return;

    const handleInteract = () => {
      if (isGuideModeActive) {
        // slight delay so user action completes
        setTimeout(() => {
          nextGuideStep(10);
        }, 500);
      } else {
        setHighlightTarget(null);
      }
    };

    targetElement.addEventListener('click', handleInteract, { once: true });
    targetElement.addEventListener('change', handleInteract, { once: true });

    return () => {
      targetElement.removeEventListener('click', handleInteract);
      targetElement.removeEventListener('change', handleInteract);
    };
  }, [targetElement, isGuideModeActive, nextGuideStep, setHighlightTarget]);

  if (!highlightTarget || !rect) return null;

  const labelText = isTamil && highlightTarget.labelTa ? highlightTarget.labelTa : highlightTarget.label;

  // Tooltip position calculation (above if space allows, otherwise below)
  const tooltipAbove = rect.top - window.scrollY > 120;
  const tooltipTop = tooltipAbove ? rect.top - 80 : rect.top + rect.height + 16;
  const tooltipLeft = Math.max(16, Math.min(rect.left, window.innerWidth - 320));

  const portalContent = (
    <div className="fixed inset-0 z-50 pointer-events-none transition-all duration-300">
      {/* Semi-transparent backdrop with click to dismiss */}
      <div
        className="absolute inset-0 bg-black/25 pointer-events-auto backdrop-blur-[1px]"
        onClick={() => {
          if (isGuideModeActive) {
            stopGuideMode();
          } else {
            setHighlightTarget(null);
          }
        }}
        aria-hidden="true"
      />

      {/* Glowing spotlight box on the element */}
      <div
        style={{
          top: `${rect.top}px`,
          left: `${rect.left}px`,
          width: `${Math.max(rect.width, 36)}px`,
          height: `${Math.max(rect.height, 36)}px`,
        }}
        className="absolute pointer-events-none rounded-xl border-4 border-amber-400 bg-amber-400/10 shadow-[0_0_25px_rgba(245,158,11,0.7)] animate-pulse transition-all duration-300"
      >
        {/* Pulsating Hand Icon indicator */}
        <div
          className={`absolute ${
            tooltipAbove ? '-bottom-10 left-1/2 -translate-x-1/2' : '-top-10 left-1/2 -translate-x-1/2'
          } flex items-center justify-center text-3xl animate-bounce filter drop-shadow-md select-none`}
        >
          {tooltipAbove ? '👇' : '👉'}
        </div>
      </div>

      {/* Floating Tooltip / Instructions card */}
      <div
        style={{
          top: `${tooltipTop}px`,
          left: `${tooltipLeft}px`,
        }}
        className="absolute pointer-events-auto w-[calc(100vw-32px)] max-w-sm rounded-2xl bg-amber-950/95 text-amber-50 p-4 shadow-2xl border-2 border-amber-400/80 backdrop-blur-md transition-all duration-300"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="text-2xl select-none">👉</span>
            <div>
              <p className="text-sm font-semibold tracking-wide text-amber-200 uppercase">
                {isGuideModeActive ? (
                  <span>
                    {t('helping_hand.guide_step_label', { defaultValue: 'Step' })}{' '}
                    {currentGuideStepIndex + 1}
                  </span>
                ) : (
                  t('helping_hand.highlight_label', { defaultValue: 'Tap here' })
                )}
              </p>
              <p className="text-base font-medium text-white mt-1 leading-snug">
                {labelText}
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={() => {
              if (isGuideModeActive) {
                stopGuideMode();
              } else {
                setHighlightTarget(null);
              }
            }}
            className="p-1.5 rounded-lg bg-amber-900/60 hover:bg-amber-800 text-amber-200 hover:text-white transition-colors"
            title={t('helping_hand.close', { defaultValue: 'Close' })}
            aria-label={t('helping_hand.close', { defaultValue: 'Close' })}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Guide controls footer if in guide mode */}
        {isGuideModeActive && (
          <div className="mt-3.5 pt-3 border-t border-amber-800/80 flex items-center justify-between gap-2">
            <button
              onClick={stopGuideMode}
              className="text-xs text-amber-300/80 hover:text-amber-200 px-2 py-1 rounded transition-colors"
            >
              {t('helping_hand.guide_exit', { defaultValue: 'Stop Guide' })}
            </button>
            <button
              onClick={() => nextGuideStep(10)}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold px-3 py-1.5 rounded-lg text-sm transition-transform active:scale-95 shadow-md"
            >
              <span>{t('helping_hand.guide_next', { defaultValue: 'Next Step' })}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(portalContent, document.body);
}
