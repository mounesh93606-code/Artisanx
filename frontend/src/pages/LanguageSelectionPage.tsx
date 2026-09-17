import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'ur', label: 'Urdu', native: 'اردو' }
];

const LanguageSelectionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setLanguage, isAuthenticated, user } = useAuthStore();
  const { i18n } = useTranslation();

  const handleSelectLanguage = (code: string) => {
    setLanguage(code);
    i18n.changeLanguage(code);
    document.documentElement.dir = code === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.lang = code;

    const from = (location.state as any)?.from;
    if (from) {
      navigate(from);
    } else if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else if (isAuthenticated && user) {
      navigate(`/${user.role}`);
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-surface text-on-surface mobile-shell-width px-6 py-12 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-primary-container opacity-20 rounded-full blur-3xl"></div>
      
      <div className="z-10 w-full max-w-md mt-4 animate-fade-in">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-primary mb-3">Choose Language</h1>
          <h2 className="text-xl font-medium text-on-surface-variant font-tamil">மொழியைத் தேர்ந்தெடுக்கவும்</h2>
          <h2 className="text-xl font-medium text-on-surface-variant mt-2" style={{ fontFamily: 'system-ui' }}>भाषा चुनें</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 animate-slide-up" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelectLanguage(lang.code)}
              className="w-full bg-surface-container-lowest border border-outline-variant hover:border-primary text-on-surface font-medium py-4 px-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex justify-between items-center group"
            >
              <span className="text-lg" style={{ fontFamily: 'system-ui' }}>{lang.native}</span>
              <span className="text-sm text-on-surface-variant group-hover:text-primary transition-colors">{lang.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LanguageSelectionPage;
