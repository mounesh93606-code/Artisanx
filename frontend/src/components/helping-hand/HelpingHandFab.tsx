import { useTranslation } from 'react-i18next';
import { useHelpingHandStore } from './helpingHandStore';

export function HelpingHandFab() {
  const { i18n } = useTranslation();
  const { isPanelOpen, openPanel, closePanel, isGuideModeActive, isSpeaking, isListening } =
    useHelpingHandStore();

  const isTamil = (i18n.language || 'en').startsWith('ta');
  const labelText = isTamil ? 'உதவி கை' : 'Helping Hand';

  const handleClick = () => {
    if (isPanelOpen) {
      closePanel();
    } else {
      openPanel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div className="fixed bottom-20 sm:bottom-24 right-4 sm:right-6 z-40 flex items-center select-none pointer-events-auto">
      <button
        id="helping-hand-fab-button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        aria-label={
          isTamil
            ? 'உதவி கை அணுகல் மெனுவை திறக்கவும்'
            : 'Open Helping Hand accessibility assistant'
        }
        aria-expanded={isPanelOpen}
        className={`group flex items-center gap-2.5 px-3.5 py-3 sm:px-4 sm:py-3.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.22)] border-2 border-amber-300 dark:border-amber-500/80 transition-all duration-300 active:scale-95 focus:outline-none focus:ring-4 focus:ring-amber-400/60 ${
          isPanelOpen || isGuideModeActive
            ? 'bg-amber-600 text-white ring-4 ring-amber-300'
            : isSpeaking
            ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white animate-pulse'
            : isListening
            ? 'bg-red-600 text-white animate-bounce'
            : 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-white'
        }`}
      >
        {/* Animated Hand / Icon */}
        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl shadow-inner group-hover:rotate-12 transition-transform">
          {isListening ? '🎤' : isSpeaking ? '🔊' : '🤝'}
        </div>

        {/* Text Label */}
        <div className="flex flex-col text-left pr-1">
          <span className="text-xs sm:text-sm font-black tracking-wide uppercase leading-tight drop-shadow-xs">
            {labelText}
          </span>
          <span className="text-[10px] text-amber-100 font-medium leading-none hidden sm:inline">
            {isTamil ? 'உதவிக்கு தொடவும்' : 'Tap for help'}
          </span>
        </div>

        {/* Pulsing indicator badge if speaking or guiding */}
        {(isGuideModeActive || isSpeaking || isListening) && (
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-200"></span>
          </span>
        )}
      </button>
    </div>
  );
}
