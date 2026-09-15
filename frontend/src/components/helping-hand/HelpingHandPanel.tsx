import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useHelpingHandStore } from './helpingHandStore';
import { usePageContext } from './usePageContext';
import { useVoiceAssistant } from './useVoiceAssistant';
import { useAuthStore } from '../../stores/authStore';
import { ScrollControls } from './ScrollControls';
import {
  X,
  Compass,
  HelpCircle,
  Lightbulb,
  MousePointerClick,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Mic,
  ArrowUpDown,
  Home,
  ArrowLeft,
  Languages,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';

export function HelpingHandPanel() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const pageContext = usePageContext();
  const { setLanguage } = useAuthStore();

  const {
    isPanelOpen,
    closePanel,
    activeTab,
    setActiveTab,
    statusMessage,
    setStatusMessage,
    clearStatusMessage,
    setHighlightTarget,
    startGuideMode,
    isListening,
    voiceTranscript,
    voiceError,
  } = useHelpingHandStore();

  const {
    speak,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    isSpeaking,
    isTtsPaused,
    startListening,
    stopListening,
  } = useVoiceAssistant();

  const isTamil = (i18n.language || 'en').startsWith('ta');

  // Handle escape key to close panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPanelOpen) {
        closePanel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPanelOpen, closePanel]);

  if (!isPanelOpen) return null;

  // 1. Guide Me
  const handleGuideMe = () => {
    if (pageContext.steps.length === 0) {
      const msg = isTamil
        ? 'இந்தப் பக்கத்தில் குறிப்பிட்ட வழிகாட்டுதல் படிகள் இல்லை. நீங்கள் தளத்தை சுதந்திரமாகப் பார்க்கலாம்.'
        : 'This page has no specific steps. You can explore or ask Where am I?';
      setStatusMessage(msg);
      speak(msg);
      return;
    }

    const firstStep = pageContext.steps[0];
    const label = isTamil ? firstStep.fallbackLabelTa : firstStep.fallbackLabel;

    startGuideMode();
    setHighlightTarget({
      selector: firstStep.selector,
      label: firstStep.fallbackLabel,
      labelTa: firstStep.fallbackLabelTa,
    });

    const introMsg = t('helping_hand.guide_intro', {
      defaultValue: 'I will guide you through this page step by step.',
    });
    speak(`${introMsg} ${label}`);
  };

  // 2. Where am I?
  const handleWhereAmI = () => {
    const speechText = `${pageContext.pageName}. ${pageContext.pageDesc}`;
    setStatusMessage(speechText);
    speak(speechText);
  };

  // 3. What should I do?
  const handleWhatShouldIDo = () => {
    const speechText = pageContext.nextAction;
    setStatusMessage(speechText);
    speak(speechText);
  };

  // 4. Point to next button
  const handlePointNext = () => {
    if (pageContext.steps.length === 0) {
      const msg = isTamil
        ? 'தற்போது சுட்டிக்காட்ட தேவையான பட்டன்கள் எதுவும் இல்லை.'
        : 'There are no specific buttons to point to right now.';
      setStatusMessage(msg);
      speak(msg);
      return;
    }

    const nextStep = pageContext.steps[0];
    closePanel();
    setHighlightTarget({
      selector: nextStep.selector,
      label: nextStep.fallbackLabel,
      labelTa: nextStep.fallbackLabelTa,
    });

    const feedback = isTamil ? 'அடுத்த பட்டனைக் காட்டுகிறேன்' : 'Showing the next button';
    speak(feedback);
  };

  // 5. Read this page
  const handleReadPage = () => {
    if (isSpeaking) {
      stopSpeaking();
      clearStatusMessage();
    } else {
      const textToRead = pageContext.readableContent;
      setStatusMessage(textToRead);
      speak(textToRead);
    }
  };

  // 8. Go to Dashboard
  const handleGoDashboard = () => {
    const feedback = isTamil ? 'டேஷ்போர்டுக்கு செல்கிறது' : 'Opening your dashboard';
    speak(feedback, () => {
      navigate('/artisan');
      closePanel();
    });
  };

  // 9. Go Back
  const handleGoBack = () => {
    const feedback = isTamil ? 'முந்தைய பக்கத்திற்கு செல்கிறது' : 'Going back';
    speak(feedback, () => {
      navigate(-1);
      closePanel();
    });
  };

  // 10. Toggle Language between English and Tamil
  const handleToggleLanguage = () => {
    const nextLang = isTamil ? 'en' : 'ta';
    setLanguage(nextLang);
    i18n.changeLanguage(nextLang);
    const feedback = nextLang === 'ta' ? 'மொழி தமிழுக்கு மாற்றப்பட்டது' : 'Language changed to English';
    speak(feedback);
    setStatusMessage(feedback);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Background click to dismiss */}
      <div className="absolute inset-0" onClick={closePanel} aria-hidden="true" />

      {/* Main Bottom Sheet / Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="helping-hand-title"
        className="relative z-10 w-full sm:max-w-md max-h-[90vh] flex flex-col bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border-2 border-amber-300 dark:border-amber-600/50 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shadow-inner">
              🤝
            </div>
            <div>
              <h2 id="helping-hand-title" className="text-lg font-black tracking-wide leading-tight">
                {t('helping_hand.panel_title', { defaultValue: 'Helping Hand' })}
              </h2>
              <p className="text-xs text-amber-100 font-medium">
                {t('helping_hand.panel_subtitle', { defaultValue: 'I am here to help you' })}
              </p>
            </div>
          </div>

          <button
            onClick={closePanel}
            className="p-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white transition-all"
            aria-label={t('helping_hand.close', { defaultValue: 'Close' })}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Status / Speech Feedback Bar */}
        {(statusMessage || isSpeaking || isListening || voiceTranscript || voiceError) && (
          <div className="px-4 py-2.5 bg-amber-50 dark:bg-stone-800/90 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 overflow-hidden">
              {isListening ? (
                <div className="w-3 h-3 rounded-full bg-red-500 animate-ping shrink-0" />
              ) : isSpeaking ? (
                <Volume2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
                {isListening
                  ? t('helping_hand.listening', { defaultValue: 'Listening...' })
                  : voiceTranscript
                  ? `"${voiceTranscript}"`
                  : voiceError
                  ? voiceError
                  : statusMessage || t('helping_hand.speaking', { defaultValue: 'Speaking...' })}
              </p>
            </div>

            {/* Audio Controls */}
            {isSpeaking && (
              <div className="flex items-center gap-1.5 shrink-0">
                {isTtsPaused ? (
                  <button
                    onClick={resumeSpeaking}
                    className="p-1.5 rounded-lg bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200"
                    title={t('helping_hand.resume_reading', { defaultValue: 'Resume' })}
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={pauseSpeaking}
                    className="p-1.5 rounded-lg bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200"
                    title={t('helping_hand.pause_reading', { defaultValue: 'Pause' })}
                  >
                    <Pause className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={stopSpeaking}
                  className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300"
                  title={t('helping_hand.stop_reading', { defaultValue: 'Stop' })}
                >
                  <VolumeX className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Content Area */}
        <div className="p-4 overflow-y-auto max-h-[70vh] flex flex-col gap-2">
          {activeTab === 'scroll' ? (
            <ScrollControls />
          ) : activeTab === 'voice' ? (
            /* Voice Assistant Tab */
            <div className="flex flex-col items-center gap-4 py-2">
              <button
                onClick={() => setActiveTab('main')}
                className="self-start flex items-center gap-1.5 text-sm font-semibold text-amber-800 dark:text-amber-300 hover:underline"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{t('helping_hand.back_to_menu', { defaultValue: 'Back to Menu' })}</span>
              </button>

              <div className="text-center px-2">
                <p className="font-bold text-stone-800 dark:text-stone-100 text-base">
                  {t('helping_hand.voice_assistant', { defaultValue: 'Voice Assistant' })}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  {isTamil
                    ? 'கீழே உள்ள மைக்கை அழுத்தி தமிழில் அல்லது ஆங்கிலத்தில் பேசவும்'
                    : 'Tap the microphone below and speak your command'}
                </p>
              </div>

              {/* Big Mic Button */}
              <button
                onClick={isListening ? stopListening : startListening}
                className={`w-24 h-24 rounded-full flex flex-col items-center justify-center gap-1 transition-all duration-300 shadow-xl ${
                  isListening
                    ? 'bg-red-500 text-white ring-8 ring-red-300 dark:ring-red-900/60 animate-pulse scale-105'
                    : 'bg-gradient-to-tr from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white active:scale-95'
                }`}
                aria-label={isListening ? 'Stop listening' : 'Start listening'}
              >
                {isListening ? <Mic className="w-10 h-10 animate-bounce" /> : <Mic className="w-10 h-10" />}
                <span className="text-[10px] font-extrabold uppercase tracking-wider">
                  {isListening
                    ? t('helping_hand.tap_to_stop', { defaultValue: 'Tap to stop' })
                    : t('helping_hand.speak_now', { defaultValue: 'Speak now' })}
                </span>
              </button>

              {/* Transcript Display */}
              {voiceTranscript && (
                <div className="w-full p-3 rounded-2xl bg-amber-50 dark:bg-stone-800 border border-amber-200 dark:border-amber-700/50 text-center">
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                    {isTamil ? 'நீங்கள் பேசியது:' : 'You said:'}
                  </p>
                  <p className="text-base font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                    "{voiceTranscript}"
                  </p>
                </div>
              )}

              {/* Example Commands */}
              <div className="w-full pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-2">
                  {isTamil ? 'பேசக்கூடிய கட்டளைகள்:' : 'Try saying:'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    isTamil ? 'டேஷ்போர்டு' : 'Open dashboard',
                    isTamil ? 'என் பொருட்கள்' : 'Show my products',
                    isTamil ? 'பொருள் சேர்' : 'Add product',
                    isTamil ? 'ஆர்டர்கள்' : 'Show my orders',
                    isTamil ? 'படி' : 'Read this page',
                    isTamil ? 'கீழே செல்' : 'Scroll down',
                  ].map((phrase, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium border border-stone-200 dark:border-stone-700"
                    >
                      "{phrase}"
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Main 10 Options Menu */
            <div className="grid grid-cols-2 gap-2.5">
              {/* 1. Guide Me */}
              <button
                onClick={handleGuideMe}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-left shadow-md hover:from-amber-400 hover:to-amber-500 active:scale-98 transition-all min-h-[58px]"
              >
                <Compass className="w-6 h-6 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-sm font-black leading-tight">
                    {t('helping_hand.guide_me', { defaultValue: 'Guide Me' })}
                  </p>
                  <p className="text-[11px] text-amber-100 font-normal leading-tight truncate">
                    {t('helping_hand.guide_me_desc', { defaultValue: 'Step-by-step guidance' })}
                  </p>
                </div>
              </button>

              {/* 2. Where am I? */}
              <button
                onClick={handleWhereAmI}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800 border-2 border-amber-200 dark:border-amber-800/60 text-stone-900 dark:text-stone-100 font-bold text-left hover:bg-amber-50 dark:hover:bg-stone-750 active:scale-98 transition-all min-h-[58px]"
              >
                <HelpCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-sm font-black leading-tight">
                    {t('helping_hand.where_am_i', { defaultValue: 'Where am I?' })}
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 font-normal leading-tight truncate">
                    {t('helping_hand.where_am_i_desc', { defaultValue: 'Tell me this page' })}
                  </p>
                </div>
              </button>

              {/* 3. What should I do? */}
              <button
                onClick={handleWhatShouldIDo}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800 border-2 border-amber-200 dark:border-amber-800/60 text-stone-900 dark:text-stone-100 font-bold text-left hover:bg-amber-50 dark:hover:bg-stone-750 active:scale-98 transition-all min-h-[58px]"
              >
                <Lightbulb className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-sm font-black leading-tight">
                    {t('helping_hand.what_should_i_do', { defaultValue: 'What should I do?' })}
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 font-normal leading-tight truncate">
                    {t('helping_hand.what_should_i_do_desc', { defaultValue: 'Next suggested action' })}
                  </p>
                </div>
              </button>

              {/* 4. Point to the next button */}
              <button
                onClick={handlePointNext}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-400 dark:border-amber-600 text-stone-900 dark:text-stone-100 font-bold text-left hover:bg-amber-100 dark:hover:bg-amber-900/40 active:scale-98 transition-all min-h-[58px]"
              >
                <MousePointerClick className="w-6 h-6 text-amber-700 dark:text-amber-400 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-sm font-black leading-tight">
                    {t('helping_hand.point_next', { defaultValue: 'Point to next button' })}
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 font-normal leading-tight truncate">
                    {t('helping_hand.point_next_desc', { defaultValue: 'Show me what to press' })}
                  </p>
                </div>
              </button>

              {/* 5. Read this page */}
              <button
                onClick={handleReadPage}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 font-bold text-left active:scale-98 transition-all min-h-[58px] ${
                  isSpeaking
                    ? 'bg-amber-500 border-amber-600 text-white'
                    : 'bg-stone-50 dark:bg-stone-800 border-amber-200 dark:border-amber-800/60 text-stone-900 dark:text-stone-100 hover:bg-amber-50 dark:hover:bg-stone-750'
                }`}
              >
                <Volume2 className={`w-6 h-6 shrink-0 ${isSpeaking ? 'animate-bounce text-white' : 'text-amber-600 dark:text-amber-400'}`} />
                <div className="overflow-hidden">
                  <p className="text-sm font-black leading-tight">
                    {isSpeaking
                      ? t('helping_hand.stop_reading', { defaultValue: 'Stop Reading' })
                      : t('helping_hand.read_page', { defaultValue: 'Read this page' })}
                  </p>
                  <p className={`text-[11px] font-normal leading-tight truncate ${isSpeaking ? 'text-amber-100' : 'text-stone-500 dark:text-stone-400'}`}>
                    {t('helping_hand.read_page_desc', { defaultValue: 'Listen to the page' })}
                  </p>
                </div>
              </button>

              {/* 6. Voice Assistant */}
              <button
                onClick={() => setActiveTab('voice')}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800 border-2 border-amber-200 dark:border-amber-800/60 text-stone-900 dark:text-stone-100 font-bold text-left hover:bg-amber-50 dark:hover:bg-stone-750 active:scale-98 transition-all min-h-[58px]"
              >
                <Mic className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-sm font-black leading-tight">
                    {t('helping_hand.voice_assistant', { defaultValue: 'Voice Assistant' })}
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 font-normal leading-tight truncate">
                    {t('helping_hand.voice_assistant_desc', { defaultValue: 'Speak your command' })}
                  </p>
                </div>
              </button>

              {/* 7. Scroll for me */}
              <button
                onClick={() => setActiveTab('scroll')}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800 border-2 border-amber-200 dark:border-amber-800/60 text-stone-900 dark:text-stone-100 font-bold text-left hover:bg-amber-50 dark:hover:bg-stone-750 active:scale-98 transition-all min-h-[58px]"
              >
                <ArrowUpDown className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-sm font-black leading-tight">
                    {t('helping_hand.scroll_for_me', { defaultValue: 'Scroll for me' })}
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 font-normal leading-tight truncate">
                    {t('helping_hand.scroll_for_me_desc', { defaultValue: 'Move the page' })}
                  </p>
                </div>
              </button>

              {/* 8. Go to Dashboard */}
              <button
                onClick={handleGoDashboard}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800 border-2 border-amber-200 dark:border-amber-800/60 text-stone-900 dark:text-stone-100 font-bold text-left hover:bg-amber-50 dark:hover:bg-stone-750 active:scale-98 transition-all min-h-[58px]"
              >
                <Home className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-sm font-black leading-tight">
                    {t('helping_hand.go_dashboard', { defaultValue: 'Go to Dashboard' })}
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 font-normal leading-tight truncate">
                    {t('helping_hand.go_dashboard_desc', { defaultValue: 'Return to home' })}
                  </p>
                </div>
              </button>

              {/* 9. Go Back */}
              <button
                onClick={handleGoBack}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800 border-2 border-amber-200 dark:border-amber-800/60 text-stone-900 dark:text-stone-100 font-bold text-left hover:bg-amber-50 dark:hover:bg-stone-750 active:scale-98 transition-all min-h-[58px]"
              >
                <ArrowLeft className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-sm font-black leading-tight">
                    {t('helping_hand.go_back', { defaultValue: 'Go Back' })}
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 font-normal leading-tight truncate">
                    {t('helping_hand.go_back_desc', { defaultValue: 'Previous page' })}
                  </p>
                </div>
              </button>

              {/* 10. Change Language */}
              <button
                onClick={handleToggleLanguage}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-100/70 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100 font-bold text-left hover:bg-amber-200 dark:hover:bg-amber-900/50 active:scale-98 transition-all min-h-[58px]"
              >
                <Languages className="w-6 h-6 text-amber-700 dark:text-amber-400 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-sm font-black leading-tight">
                    {isTamil ? 'Switch to English' : 'தமிழுக்கு மாற்று'}
                  </p>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 font-normal leading-tight truncate">
                    {isTamil ? 'Change to English' : 'தமிழ் மொழி'}
                  </p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
