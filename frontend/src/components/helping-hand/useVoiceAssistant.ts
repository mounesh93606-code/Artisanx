import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useHelpingHandStore } from './helpingHandStore';
import { usePageContext } from './usePageContext';

interface VoiceCommand {
  patterns: (string | RegExp)[];
  action: () => void;
  feedbackEn: string;
  feedbackTa: string;
}

export function useVoiceAssistant() {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const pageContext = usePageContext();

  const {
    isListening,
    setIsListening,
    setVoiceTranscript,
    setVoiceError,
    isSpeaking,
    setIsSpeaking,
    isTtsPaused,
    setIsTtsPaused,
    setStatusMessage,
    openPanel,
    closePanel,
    startGuideMode,
    stopGuideMode,
  } = useHelpingHandStore();

  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Stop speech helper
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsTtsPaused(false);
  }, [setIsSpeaking, setIsTtsPaused]);

  // Pause speech
  const pauseSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause();
      setIsTtsPaused(true);
    }
  }, [setIsTtsPaused]);

  // Resume speech
  const resumeSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.resume();
      setIsTtsPaused(false);
    }
  }, [setIsTtsPaused]);

  // Text-To-Speech function
  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        console.warn('SpeechSynthesis is not supported in this browser.');
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      const lang = i18n.language || 'en';
      const isTamil = lang.startsWith('ta');
      utterance.lang = isTamil ? 'ta-IN' : 'en-IN';
      utterance.rate = isTamil ? 0.9 : 0.95; // Slightly slower for clarity
      utterance.pitch = 1.0;

      // Select matching voice if available
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        if (isTamil) {
          const tamilVoice = voices.find((v) => v.lang.includes('ta') || v.name.toLowerCase().includes('tamil'));
          if (tamilVoice) utterance.voice = tamilVoice;
        } else {
          const indianVoice = voices.find((v) => v.lang === 'en-IN' || v.lang.includes('en'));
          if (indianVoice) utterance.voice = indianVoice;
        }
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsTtsPaused(false);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsTtsPaused(false);
        if (onEnd) onEnd();
      };

      utterance.onerror = (e) => {
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          console.error('TTS Error:', e);
        }
        setIsSpeaking(false);
        setIsTtsPaused(false);
      };

      window.speechSynthesis.speak(utterance);
    },
    [i18n.language, setIsSpeaking, setIsTtsPaused]
  );

  // Define voice commands
  const getCommands = useCallback((): VoiceCommand[] => {
    return [
      {
        patterns: [
          'open dashboard',
          'go to dashboard',
          'dashboard',
          'home',
          'go home',
          'முகப்பு',
          'டேஷ்போர்டு',
          'dashboard திற',
        ],
        action: () => {
          navigate('/artisan');
          closePanel();
        },
        feedbackEn: 'Opening dashboard',
        feedbackTa: 'முகப்புப் பக்கம் திறக்கப்படுகிறது',
      },
      {
        patterns: [
          'my products',
          'show my products',
          'show products',
          'products',
          'என் பொருட்கள்',
          'பொருட்கள்',
          'பொருட்கள் காட்டு',
          'products காட்டு',
        ],
        action: () => {
          navigate('/artisan/products');
          closePanel();
        },
        feedbackEn: 'Opening your products',
        feedbackTa: 'உங்கள் பொருட்கள் பக்கம் திறக்கப்படுகிறது',
      },
      {
        patterns: [
          'add product',
          'create product',
          'new product',
          'பொருள் சேர்',
          'புதிய பொருள்',
          'product சேர்',
        ],
        action: () => {
          navigate('/artisan/product/create');
          closePanel();
        },
        feedbackEn: 'Opening add product page',
        feedbackTa: 'பொருள் சேர்க்கும் பக்கம் திறக்கப்படுகிறது',
      },
      {
        patterns: [
          'show orders',
          'my orders',
          'orders',
          'என் ஆர்டர்கள்',
          'ஆர்டர்கள்',
          'orders காட்டு',
        ],
        action: () => {
          navigate('/artisan/orders');
          closePanel();
        },
        feedbackEn: 'Opening your orders',
        feedbackTa: 'உங்கள் ஆர்டர்கள் பக்கம் திறக்கப்படுகிறது',
      },
      {
        patterns: [
          'show enquiries',
          'my enquiries',
          'enquiries',
          'messages',
          'விசாரணைகள்',
          'செய்திகள்',
          'enquiries காட்டு',
        ],
        action: () => {
          navigate('/artisan/enquiries');
          closePanel();
        },
        feedbackEn: 'Opening enquiries',
        feedbackTa: 'விசாரணைகள் திறக்கப்படுகிறது',
      },
      {
        patterns: [
          'open profile',
          'my profile',
          'profile',
          'சுயவிவரம்',
          'சுயவிவரம் திற',
          'profile திற',
        ],
        action: () => {
          navigate('/artisan/profile');
          closePanel();
        },
        feedbackEn: 'Opening your profile',
        feedbackTa: 'உங்கள் சுயவிவரம் திறக்கப்படுகிறது',
      },
      {
        patterns: [
          'go back',
          'back',
          'previous',
          'பின்செல்',
          'பின்னால் போ',
          'பின்னே',
        ],
        action: () => {
          navigate(-1);
          closePanel();
        },
        feedbackEn: 'Going back',
        feedbackTa: 'முந்தைய பக்கத்திற்கு செல்கிறது',
      },
      {
        patterns: [
          'scroll down',
          'down',
          'கீழே செல்',
          'கீழே',
        ],
        action: () => {
          window.scrollBy({ top: 350, behavior: 'smooth' });
        },
        feedbackEn: 'Scrolling down',
        feedbackTa: 'கீழே நகர்த்தப்படுகிறது',
      },
      {
        patterns: [
          'scroll up',
          'up',
          'மேலே செல்',
          'மேலே',
        ],
        action: () => {
          window.scrollBy({ top: -350, behavior: 'smooth' });
        },
        feedbackEn: 'Scrolling up',
        feedbackTa: 'மேலே நகர்த்தப்படுகிறது',
      },
      {
        patterns: [
          'scroll top',
          'go to top',
          'top',
          'முழுதும் மேலே',
          'உச்சிக்கு செல்',
        ],
        action: () => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        feedbackEn: 'Going to top',
        feedbackTa: 'பக்கத்தின் உச்சிக்கு செல்கிறது',
      },
      {
        patterns: [
          'scroll bottom',
          'go to bottom',
          'bottom',
          'முழுதும் கீழே',
          'அடிக்கு செல்',
        ],
        action: () => {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        },
        feedbackEn: 'Going to bottom',
        feedbackTa: 'பக்கத்தின் அடிக்கு செல்கிறது',
      },
      {
        patterns: [
          'help me',
          'help',
          'open help',
          'helping hand',
          'உதவி',
          'உதவி வேண்டும்',
          'உதவி செய்',
        ],
        action: () => {
          openPanel();
        },
        feedbackEn: 'Opening Helping Hand',
        feedbackTa: 'உதவி கை திறக்கப்படுகிறது',
      },
      {
        patterns: [
          'where am i',
          'what is this page',
          'எங்கே இருக்கிறேன்',
          'நான் எங்கே',
          'இது என்ன பக்கம்',
        ],
        action: () => {
          speak(pageContext.pageDesc);
          setStatusMessage(pageContext.pageDesc);
        },
        feedbackEn: '',
        feedbackTa: '',
      },
      {
        patterns: [
          'what should i do',
          'what to do',
          'what next',
          'நான் என்ன செய்ய வேண்டும்',
          'அடுத்து என்ன',
        ],
        action: () => {
          speak(pageContext.nextAction);
          setStatusMessage(pageContext.nextAction);
        },
        feedbackEn: '',
        feedbackTa: '',
      },
      {
        patterns: [
          'read this page',
          'read page',
          'read aloud',
          'இந்தப் பக்கத்தைப் படி',
          'படி',
          'பக்கத்தை படி',
        ],
        action: () => {
          speak(pageContext.readableContent);
          setStatusMessage(pageContext.readableContent);
        },
        feedbackEn: '',
        feedbackTa: '',
      },
      {
        patterns: [
          'guide me',
          'start guide',
          'வழிகாட்டு',
          'வழிகாட்டல் தொடங்கு',
        ],
        action: () => {
          startGuideMode();
        },
        feedbackEn: 'Starting guidance mode',
        feedbackTa: 'வழிகாட்டல் தொடங்குகிறது',
      },
      {
        patterns: [
          'stop',
          'pause',
          'cancel',
          'நிறுத்து',
          'போதும்',
        ],
        action: () => {
          stopSpeaking();
          stopGuideMode();
        },
        feedbackEn: 'Stopped',
        feedbackTa: 'நிறுத்தப்பட்டது',
      },
    ];
  }, [
    i18n.language,
    navigate,
    closePanel,
    openPanel,
    pageContext,
    speak,
    setStatusMessage,
    startGuideMode,
    stopSpeaking,
    stopGuideMode,
  ]);

  // Execute recognized text against commands
  const handleCommandMatch = useCallback(
    (spokenText: string) => {
      const normalized = spokenText.toLowerCase().trim();
      const commands = getCommands();
      const isTa = (i18n.language || 'en').startsWith('ta');

      let matched = false;
      for (const cmd of commands) {
        for (const pat of cmd.patterns) {
          if (typeof pat === 'string') {
            if (normalized.includes(pat.toLowerCase())) {
              matched = true;
              const feedback = isTa ? cmd.feedbackTa : cmd.feedbackEn;
              if (feedback) {
                speak(feedback, () => {
                  cmd.action();
                });
              } else {
                cmd.action();
              }
              return;
            }
          } else if (pat instanceof RegExp && pat.test(normalized)) {
            matched = true;
            const feedback = isTa ? cmd.feedbackTa : cmd.feedbackEn;
            if (feedback) {
              speak(feedback, () => {
                cmd.action();
              });
            } else {
              cmd.action();
            }
            return;
          }
        }
      }

      if (!matched) {
        const notUnderstoodMsg = t('helping_hand.command_not_understood', {
          defaultValue: 'I did not understand. Please try again.',
        });
        setVoiceError(notUnderstoodMsg);
        speak(notUnderstoodMsg);
      }
    },
    [getCommands, i18n.language, speak, t, setVoiceError]
  );

  // Start speech recognition
  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const errMsg = t('helping_hand.voice_not_supported', {
        defaultValue: 'Voice is not supported on this device.',
      });
      setVoiceError(errMsg);
      speak(errMsg);
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      const lang = i18n.language || 'en';
      recognition.lang = lang.startsWith('ta') ? 'ta-IN' : 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceError(null);
        setVoiceTranscript('');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceTranscript(transcript);
        setIsListening(false);
        handleCommandMatch(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Voice recognition error:', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          const errMsg = t('helping_hand.voice_error', {
            defaultValue: 'Could not hear clearly. Please try again.',
          });
          setVoiceError(errMsg);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e: any) {
      console.error('Error starting recognition:', e);
      setIsListening(false);
      setVoiceError(e.message || 'Error starting microphone');
    }
  }, [i18n.language, t, setVoiceError, speak, setIsListening, setVoiceTranscript, handleCommandMatch]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    setIsListening(false);
  }, [setIsListening]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    isListening,
    isSpeaking,
    isTtsPaused,
    startListening,
    stopListening,
    speak,
    pauseSpeaking,
    resumeSpeaking,
    stopSpeaking,
  };
}
