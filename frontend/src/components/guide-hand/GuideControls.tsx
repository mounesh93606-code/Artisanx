import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Pause, Play, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface GuideControlsProps {
  onPrevious: () => void;
  onNext: () => void;
  onPause: () => void;
  onSkip: () => void;
  onReplay: () => void;
  onDontShowAgain: (checked: boolean) => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  isPaused?: boolean;
}

export default function GuideControls({
  onPrevious,
  onNext,
  onPause,
  onSkip,
  onReplay,
  onDontShowAgain,
  canGoPrevious,
  canGoNext,
  isPaused = false
}: GuideControlsProps) {
  const { t } = useTranslation();

  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none"
    >
      <div className="bg-surface/95 backdrop-blur-md rounded-2xl shadow-2xl border border-outline-variant p-4 w-[calc(100%-24px)] max-w-[406px] mx-auto pointer-events-auto">
        
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={onSkip}
            className="text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-1"
          >
            <X className="w-4 h-4" /> {t('guide.skip') || 'Skip Guide'}
          </button>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={onReplay}
              className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary-container/20 rounded-full transition-all"
              aria-label={t('guide.replay')}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button 
              onClick={onPause}
              className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary-container/20 rounded-full transition-all"
              aria-label={isPaused ? t('guide.play') : t('guide.pause')}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onPrevious}
            disabled={!canGoPrevious}
            className="flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-surface-container text-on-surface hover:bg-surface-container-high"
          >
            <ChevronLeft className="w-5 h-5" /> {t('guide.prev') || 'Previous'}
          </button>
          
          <button
            onClick={onNext}
            disabled={!canGoNext}
            className="flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-primary text-on-primary hover:bg-primary/90 shadow-md"
          >
            {t('guide.next') || 'Next'} <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input 
            type="checkbox" 
            id="dont-show" 
            className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
            onChange={(e) => onDontShowAgain(e.target.checked)}
          />
          <label htmlFor="dont-show" className="text-xs text-on-surface-variant select-none cursor-pointer">
            {t('guide.dont_show_again') || "Don't show this guide again"}
          </label>
        </div>

      </div>
    </motion.div>
  );
}
