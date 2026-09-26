import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import ta from './ta.json';
import hi from './hi.json';
import te from './te.json';
import kn from './kn.json';
import bn from './bn.json';
import mr from './mr.json';
import ur from './ur.json';

import ml from './ml.json';

const initialLng = localStorage.getItem('language') || 'en';
if (typeof document !== 'undefined') {
  document.documentElement.dir = initialLng === 'ur' ? 'rtl' : 'ltr';
  document.documentElement.lang = initialLng;
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ta: { translation: ta },
    hi: { translation: hi },
    te: { translation: te },
    kn: { translation: kn },
    ml: { translation: ml },
    bn: { translation: bn },
    mr: { translation: mr },
    ur: { translation: ur }
  },
  lng: initialLng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
});

export default i18n;
