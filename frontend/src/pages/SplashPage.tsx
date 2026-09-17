import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { LanguageSwitcher } from '../components/layout/LanguageSwitcher';

const SplashPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated, user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role) {
      navigate(`/${user.role}`, { replace: true });
    }
  }, [isAuthenticated, user, isLoading, navigate]);

  const handleGetStarted = () => {
    navigate('/language', { state: { from: '/login' } });
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-surface text-on-surface mobile-shell-width px-6 py-8 relative overflow-hidden">
      {/* Background Decorative Elements using Brand Colors */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-primary-container opacity-20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-72 h-72 bg-secondary-fixed opacity-40 rounded-full blur-3xl pointer-events-none"></div>
      
      {/* Top bar with Language Switcher */}
      <div className="w-full flex justify-end z-20">
        <LanguageSwitcher />
      </div>

      <div className="z-10 flex flex-col items-center justify-center text-center space-y-8 my-auto">
        {/* Logo / App Name */}
        <div className="animate-fade-in">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-primary/20 shadow-sm">
            <span className="material-symbols-outlined text-primary text-4xl">handshake</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-primary tracking-tight mb-2">{t('app.name', { defaultValue: 'ArtisanX' })}</h1>
          <div className="h-1.5 w-16 bg-primary mx-auto rounded-full"></div>
        </div>

        {/* Localized Welcome & Tagline */}
        <div className="space-y-3 animate-slide-up max-w-sm mx-auto" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
          <h2 className="text-2xl font-bold text-on-surface">{t('app.welcome', { defaultValue: 'Welcome to ArtisanX' })}</h2>
          <p className="text-sm text-on-surface-variant font-medium leading-relaxed">{t('app.tagline', { defaultValue: 'Empowering Artisans, Connecting Markets' })}</p>
        </div>
      </div>

      {/* Call to Action */}
      <div className="w-full pb-4 z-10 animate-slide-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
        <button 
          onClick={handleGetStarted}
          className="w-full bg-primary hover:bg-primary/90 text-on-primary font-bold py-4 px-8 rounded-2xl shadow-lg hover:shadow-primary/30 transition-all duration-300 flex items-center justify-center space-x-2 active:scale-[0.98]"
        >
          <span className="text-base uppercase tracking-wider">{t('app.get_started', { defaultValue: 'Get Started' })}</span>
        </button>
      </div>
    </div>
  );
};

export default SplashPage;

