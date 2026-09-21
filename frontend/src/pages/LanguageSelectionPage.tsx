import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from 'react-i18next';
import { Check, Globe } from 'lucide-react';

const languages = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'ur', label: 'Urdu', native: 'اردو' }
];

const LanguageSelectionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setLanguage, isAuthenticated, user, language } = useAuthStore();
  const { t, i18n } = useTranslation();

  const handleSelectLanguage = (code: string) => {
    setLanguage(code);
    i18n.changeLanguage(code);
    localStorage.setItem('language', code);
    document.documentElement.dir = code === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.lang = code;

    const from = (location.state as any)?.from;
    if (from && from !== '/' && from !== '/language') {
      navigate(from, { replace: true });
    } else if (isAuthenticated && user?.role) {
      navigate(`/${user.role}`, { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-surface text-on-surface mobile-shell-width px-6 py-10 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-primary-container opacity-20 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="z-10 w-full max-w-md mt-2 animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3 text-primary">
            <Globe className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-1">{t('app.choose_language', { defaultValue: 'Choose Language' })}</h1>
          <p className="text-sm text-on-surface-variant font-medium">Select your preferred language</p>
        </div>

        <div className="grid grid-cols-1 gap-3 animate-slide-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
          {languages.map((lang) => {
            const isSelected = language === lang.code || i18n.language === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => handleSelectLanguage(lang.code)}
                className={`w-full bg-surface-container-lowest border font-medium py-3.5 px-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex justify-between items-center group active:scale-[0.99] ${
                  isSelected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-outline-variant hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-on-surface" style={{ fontFamily: 'system-ui' }}>{lang.native}</span>
                  <span className="text-xs text-on-surface-variant/80">({lang.label})</span>
                </div>
                {isSelected && <Check className="w-5 h-5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LanguageSelectionPage;

