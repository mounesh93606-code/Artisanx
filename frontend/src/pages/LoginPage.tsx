import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import RoleSelect from '../components/auth/RoleSelect';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

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

const LoginPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, isLoading, error, clearError, sendOtp, verifyOtp, loginWithEmail, registerWithEmail, language, setLanguage } = useAuthStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'phone' | 'email'>('phone');
  
  // Phone state
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(0);

  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [regSuccessMessage, setRegSuccessMessage] = useState('');

  const handleLangChange = (newLang: string) => {
    setLanguage(newLang);
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Navigate if already authenticated and has a role
  useEffect(() => {
    if (isAuthenticated && user?.role) {
      navigate(`/${user.role}`);
    }
  }, [isAuthenticated, user, navigate]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!phone) return;
    const fullPhone = phone.startsWith('+91') ? phone : `+91${phone}`;
    await sendOtp(fullPhone);
    setOtpSent(true);
    setTimer(60);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!otp || otp.length !== 6) return;
    const fullPhone = phone.startsWith('+91') ? phone : `+91${phone}`;
    await verifyOtp(fullPhone, otp);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setRegSuccessMessage('');
    if (!email || !password) return;
    if (isRegistering) {
      await registerWithEmail(email, password);
      const state = useAuthStore.getState();
      if (!state.error && !state.isAuthenticated && state.user) {
        setRegSuccessMessage('Registration successful! Please check your email to verify your account.');
      }
    } else {
      await loginWithEmail(email, password);
    }
  };

  if (isAuthenticated && !user?.role) {
    return (
      <div className="flex flex-col min-h-screen bg-surface">
        <header className="px-6 pt-12 pb-6 flex justify-between items-center relative overflow-hidden">
          <div className="absolute -right-8 -top-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex items-center gap-3 bg-surface-container-lowest shadow-sm px-4 py-2.5 rounded-full relative z-10">
            <span className="material-symbols-outlined text-primary text-2xl">handshake</span>
            <span className="font-bold text-on-surface tracking-tight text-lg">ArtisanX</span>
          </div>
        </header>
        <main className="flex-1 px-6 pb-12 w-full max-w-md mx-auto">
          <RoleSelect lang={language} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface relative overflow-x-hidden">
      {/* Background Ambience */}
      <div className="absolute -right-8 -top-12 w-64 h-64 bg-primary/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -left-12 top-32 w-48 h-48 bg-secondary/15 rounded-full blur-3xl pointer-events-none"></div>

      <header className="px-6 pt-12 pb-6 relative z-10 w-full max-w-md mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3 bg-surface-container-lowest shadow-sm px-4 py-2.5 rounded-full border border-outline-variant/30">
            <span className="material-symbols-outlined text-primary text-2xl">handshake</span>
            <span className="font-bold text-on-surface tracking-tight text-lg">ArtisanX</span>
          </div>
          <select 
            value={language}
            onChange={(e) => handleLangChange(e.target.value)}
            className="bg-surface-container-lowest shadow-sm border border-outline-variant/30 text-on-surface text-sm rounded-full focus:ring-1 focus:ring-primary focus:border-primary py-2.5 px-4 font-semibold appearance-none cursor-pointer"
            aria-label="Select Language"
          >
            {languages.map(l => (
              <option key={l.code} value={l.code}>{l.native}</option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary-fixed text-on-secondary-fixed">
            <span className="material-symbols-outlined text-sm">auto_awesome</span>
            <span className="text-xs font-bold uppercase tracking-wider">{t('auth.rural_craft_platform')}</span>
          </div>
          <h1 className="text-4xl font-extrabold text-on-surface tracking-tight leading-[1.1]">
            {t('auth.your_craft')} <br />
            <span className="text-primary">{t('auth.your_story')}</span> <br />
            {t('auth.your_market')}
          </h1>
        </div>
      </header>

      <main className="flex-1 px-6 pb-12 w-full max-w-md mx-auto relative z-10">
        <Card className="p-2 w-full overflow-hidden mb-6">
          <div className="flex w-full bg-surface-container-low p-1.5 rounded-xl mb-6">
            <button 
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${tab === 'phone' ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
              onClick={() => setTab('phone')}
            >
              {t('auth.phone')}
            </button>
            <button 
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${tab === 'email' ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
              onClick={() => setTab('email')}
            >
              {t('auth.email')}
            </button>
          </div>

          <div className="px-4 pb-4">
            {error && (
              <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-xl text-sm font-semibold flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}
            {regSuccessMessage && (
              <div className="mb-6 p-4 bg-tertiary-fixed text-on-tertiary-fixed rounded-xl text-sm font-semibold flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                {regSuccessMessage}
              </div>
            )}

            {tab === 'phone' && (
              <>
                {!otpSent ? (
                  <form onSubmit={handleSendOtp} className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-on-surface mb-2">{t('auth.phone')}</label>
                      <div className="flex rounded-xl overflow-hidden border border-outline-variant bg-surface-container-lowest focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors">
                        <span className="inline-flex items-center px-4 bg-surface-container-low text-on-surface-variant text-sm font-bold border-r border-outline-variant">
                          +91
                        </span>
                        <input 
                          type="tel" 
                          value={phone.replace('+91', '')} 
                          onChange={(e) => setPhone(e.target.value)}
                          className="flex-1 block w-full min-w-0 sm:text-sm p-4 border-0 focus:ring-0 bg-transparent text-on-surface font-medium"
                          placeholder={t('auth.enter_phone')}
                        />
                      </div>
                    </div>
                    <Button type="submit" disabled={isLoading || !phone} fullWidth>
                      {isLoading ? t('common.loading') : t('auth.send_otp')}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-on-surface mb-2">{t('auth.enter_otp')}</label>
                      <Input 
                        type="text" 
                        maxLength={6}
                        value={otp} 
                        onChange={(e) => setOtp(e.target.value)}
                        className="text-center text-2xl font-bold tracking-[0.5em]"
                        placeholder="------"
                      />
                    </div>
                    <Button type="submit" disabled={isLoading || otp.length !== 6} fullWidth>
                      {isLoading ? t('common.loading') : t('auth.verify')}
                    </Button>
                    <div className="text-center mt-6">
                      {timer > 0 ? (
                        <p className="text-sm font-medium text-on-surface-variant">{t('auth.resend_otp')} in {timer}s</p>
                      ) : (
                        <button type="button" onClick={handleSendOtp} className="text-sm text-primary font-bold hover:underline">
                          {t('auth.resend_otp')}
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </>
            )}

            {tab === 'email' && (
              <form onSubmit={handleEmailAuth} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-on-surface mb-2">{t('auth.email')}</label>
                  <Input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.email')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface mb-2">{t('auth.password')}</label>
                  <Input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.password')}
                  />
                </div>
                <div className="pt-2">
                  <Button type="submit" disabled={isLoading || !email || !password} fullWidth>
                    {isLoading ? t('common.loading') : (isRegistering ? t('auth.register') : t('auth.login'))}
                  </Button>
                </div>
                <div className="text-center mt-6">
                  <button 
                    type="button" 
                    onClick={() => setIsRegistering(!isRegistering)}
                    className="text-sm text-primary font-bold hover:underline"
                  >
                    {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </Card>
        
        <div className="flex justify-center items-center gap-2 mt-4 text-xs font-semibold text-on-surface-variant">
          <span className="material-symbols-outlined text-[16px] text-tertiary">lock</span>
          Secure & Government Compliant
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
