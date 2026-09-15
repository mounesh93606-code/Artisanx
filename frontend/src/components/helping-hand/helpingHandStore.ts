import { create } from 'zustand';

export type HelpingHandTab = 'main' | 'scroll' | 'voice';

export interface HighlightTarget {
  selector: string;       // CSS selector or data-guide-id value
  label: string;          // Short explanation shown near the element
  labelTa?: string;       // Tamil label
}

export interface PageStep {
  selector: string;
  label: string;
  labelTa: string;
}

interface HelpingHandState {
  // Panel visibility
  isPanelOpen: boolean;
  activeTab: HelpingHandTab;

  // Guide Me mode
  isGuideModeActive: boolean;
  currentGuideStepIndex: number;

  // Element highlighting
  highlightTarget: HighlightTarget | null;

  // TTS
  isSpeaking: boolean;
  isTtsPaused: boolean;

  // Voice assistant
  isListening: boolean;
  voiceTranscript: string;
  voiceError: string | null;

  // Status message shown in panel
  statusMessage: string;

  // Actions
  openPanel: () => void;
  closePanel: () => void;
  setActiveTab: (tab: HelpingHandTab) => void;

  setHighlightTarget: (target: HighlightTarget | null) => void;

  startGuideMode: () => void;
  stopGuideMode: () => void;
  setGuideStep: (index: number) => void;
  nextGuideStep: (totalSteps: number) => void;

  setIsSpeaking: (v: boolean) => void;
  setIsTtsPaused: (v: boolean) => void;

  setIsListening: (v: boolean) => void;
  setVoiceTranscript: (t: string) => void;
  setVoiceError: (e: string | null) => void;

  setStatusMessage: (msg: string) => void;
  clearStatusMessage: () => void;
}

export const useHelpingHandStore = create<HelpingHandState>((set, get) => ({
  isPanelOpen: false,
  activeTab: 'main',

  isGuideModeActive: false,
  currentGuideStepIndex: 0,

  highlightTarget: null,

  isSpeaking: false,
  isTtsPaused: false,

  isListening: false,
  voiceTranscript: '',
  voiceError: null,

  statusMessage: '',

  openPanel: () => set({ isPanelOpen: true, activeTab: 'main' }),
  closePanel: () => {
    // Stop TTS when closing
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    set({ isPanelOpen: false, isSpeaking: false, isTtsPaused: false });
  },
  setActiveTab: (tab) => set({ activeTab: tab }),

  setHighlightTarget: (target) => set({ highlightTarget: target }),

  startGuideMode: () => set({ isGuideModeActive: true, currentGuideStepIndex: 0, isPanelOpen: false }),
  stopGuideMode: () => set({ isGuideModeActive: false, currentGuideStepIndex: 0, highlightTarget: null }),
  setGuideStep: (index) => set({ currentGuideStepIndex: index }),
  nextGuideStep: (totalSteps: number) => {
    const { currentGuideStepIndex } = get();
    if (currentGuideStepIndex < totalSteps - 1) {
      set({ currentGuideStepIndex: currentGuideStepIndex + 1 });
    } else {
      set({ isGuideModeActive: false, highlightTarget: null });
    }
  },

  setIsSpeaking: (v) => set({ isSpeaking: v }),
  setIsTtsPaused: (v) => set({ isTtsPaused: v }),

  setIsListening: (v) => set({ isListening: v }),
  setVoiceTranscript: (t) => set({ voiceTranscript: t }),
  setVoiceError: (e) => set({ voiceError: e }),

  setStatusMessage: (msg) => set({ statusMessage: msg }),
  clearStatusMessage: () => set({ statusMessage: '' }),
}));
