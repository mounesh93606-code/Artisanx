import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HelpingHandFab } from './HelpingHandFab';
import { HelpingHandPanel } from './HelpingHandPanel';
import { ElementHighlighter } from './ElementHighlighter';
import { useHelpingHandStore } from './helpingHandStore';
import { usePageContext } from './usePageContext';
import { useVoiceAssistant } from './useVoiceAssistant';

export function HelpingHandRoot() {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const pageContext = usePageContext();
  const { speak } = useVoiceAssistant();

  const {
    isGuideModeActive,
    currentGuideStepIndex,
    stopGuideMode,
    setHighlightTarget,
  } = useHelpingHandStore();

  const isTamil = (i18n.language || 'en').startsWith('ta');

  // Reset or adapt guide mode on route change
  useEffect(() => {
    if (isGuideModeActive) {
      stopGuideMode();
    }
  }, [location.pathname, stopGuideMode]);

  // Synchronize guide mode steps
  useEffect(() => {
    if (!isGuideModeActive) return;

    if (pageContext.steps.length === 0) {
      stopGuideMode();
      return;
    }

    if (currentGuideStepIndex >= pageContext.steps.length) {
      // Finished all steps
      const doneMsg = t('helping_hand.guide_done', {
        defaultValue: 'All done! Great job.',
      });
      speak(doneMsg);
      stopGuideMode();
      return;
    }

    const currentStep = pageContext.steps[currentGuideStepIndex];
    setHighlightTarget({
      selector: currentStep.selector,
      label: currentStep.fallbackLabel,
      labelTa: currentStep.fallbackLabelTa,
    });

    const stepLabel = isTamil ? currentStep.fallbackLabelTa : currentStep.fallbackLabel;
    speak(stepLabel);
  }, [
    isGuideModeActive,
    currentGuideStepIndex,
    pageContext.steps,
    isTamil,
    speak,
    setHighlightTarget,
    stopGuideMode,
    t,
  ]);

  return (
    <>
      <HelpingHandFab />
      <HelpingHandPanel />
      <ElementHighlighter />
    </>
  );
}

export default HelpingHandRoot;
