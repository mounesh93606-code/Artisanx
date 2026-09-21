import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import RoleSelect from '../components/auth/RoleSelect';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import OtpInput from '../components/auth/OtpInput';
import { getApiUrl, setApiUrl } from '../lib/api';

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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regSuccessMessage, setRegSuccessMessage] = useState('');
  const [currentServerUrl, setCurrentServerUrl] = useState(getApiUrl());

  const handleSwitchServer = (url: string) => {
    setApiUrl(url);
    setCurrentServerUrl(url);
    clearError();
  };

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

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    clearError();
    const cleanPhone = phone.replace('+91', '').trim();
    if (!cleanPhone) return;
    const fullPhone = `+91${cleanPhone}`;

    await sendOtp(fullPhone);
    const storeError = useAuthStore.getState().error;
    if (!storeError) {
      setOtpSent(true);
      setTimer(60);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent, customOtp?: string) => {
    if (e) e.preventDefault();
    clearError();
    const tokenToVerify = customOtp || otp;
    if (!tokenToVerify || tokenToVerify.length !== 6) return;
    const cleanPhone = phone.replace('+91', '').trim();
    if (!cleanPhone) return;
    const fullPhone = `+91${cleanPhone}`;

    await verifyOtp(fullPhone, tokenToVerify);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setRegSuccessMessage('');
    if (!email || !password) return;
    if (isRegistering) {
      if (password !== confirmPassword) {
        useAuthStore.setState({ error: 'Passwords do not match.' });
        return;
      }
      if (password.length < 6) {
        useAuthStore.setState({ error: 'Password must be at least 6 characters.' });
        return;
      }
      const fullRegPhone = regPhone.trim() ? (regPhone.startsWith('+91') ? regPhone : `+91${regPhone.trim()}`) : undefined;
      await registerWithEmail(email, password, undefined, fullRegPhone);
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
                <div className="flex-1">{error}</div>
              </div>
            )}
            {regSuccessMessage && (
              <div className="mb-6 p-4 bg-tertiary-fixed text-on-tertiary-fixed rounded-xl text-sm font-semibold flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                {regSuccessMessage}
              </div>
            )}


            {tab === 'phone' && (
              <div className="space-y-5">
                {/* Phone Number Input */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-on-surface">
                      {t('auth.phone')}
                    </label>
                    {otpSent && (
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setOtp('');
                        }}
                        className="text-xs text-primary font-bold hover:underline"
                      >
                        Change Number
                      </button>
                    )}
                  </div>
                  <div className="flex rounded-xl overflow-hidden border border-outline-variant bg-surface-container-lowest focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <span className="inline-flex items-center px-4 bg-surface-container-low text-on-surface-variant text-sm font-bold border-r border-outline-variant select-none">
                      +91
                    </span>
                    <input 
                      type="tel" 
                      value={phone.replace('+91', '')} 
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      disabled={isLoading || (otpSent && timer > 0)}
                      className="flex-1 block w-full min-w-0 sm:text-base p-3.5 border-0 focus:ring-0 bg-transparent text-on-surface font-semibold placeholder:text-stone-400"
                      placeholder={t('auth.enter_phone')}
                    />
                    <button
                      type="button"
                      disabled={isLoading || phone.replace('+91', '').trim().length < 10 || (otpSent && timer > 0)}
                      onClick={() => handleSendOtp()}
                      className={`px-4 py-2 text-xs font-bold transition-all border-l border-outline-variant/60 flex items-center gap-1.5 whitespace-nowrap
                        ${(otpSent && timer > 0)
                          ? 'bg-surface-container-low text-on-surface-variant cursor-not-allowed'
                          : phone.replace('+91', '').trim().length >= 10
                            ? 'bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer'
                            : 'bg-surface-container-low text-stone-400 cursor-not-allowed'
                        }`}
                    >
                      {isLoading && !otpSent ? (
                        <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined text-sm">sms</span>
                      )}
                      {otpSent ? (timer > 0 ? `${timer}s` : t('auth.resend_otp')) : t('auth.send_otp')}
                    </button>
                  </div>
                </div>

                {/* OTP Box */}
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-bold text-on-surface">
                      {t('auth.enter_otp')}
                    </label>
                    {otpSent && (
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        OTP Sent
                      </span>
                    )}
                  </div>
                  
                  <OtpInput
                    value={otp}
                    onChange={setOtp}
                    length={6}
                    disabled={isLoading}
                    autoFocus={otpSent}
                    onComplete={(completedOtp) => handleVerifyOtp(undefined, completedOtp)}
                    error={!!error && otp.length === 6}
                  />

                  <div className="flex items-center justify-between mt-2 text-xs">
                    {timer > 0 ? (
                      <span className="text-on-surface-variant font-medium">
                        {t('auth.resend_otp')} in <span className="font-bold text-primary">{timer}s</span>
                      </span>
                    ) : otpSent ? (
                      <button 
                        type="button" 
                        onClick={() => handleSendOtp()} 
                        disabled={isLoading}
                        className="text-primary font-bold hover:underline"
                      >
                        {t('auth.resend_otp')}
                      </button>
                    ) : (
                      <span className="text-stone-400 font-medium">
                        Enter 10-digit number & tap Send OTP
                      </span>
                    )}

                    {otp.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setOtp('')}
                        className="text-stone-400 hover:text-stone-600 font-medium"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <Button 
                    type="button" 
                    onClick={() => handleVerifyOtp()} 
                    disabled={isLoading || otp.length !== 6 || phone.replace('+91', '').trim().length < 10} 
                    fullWidth
                  >
                    {isLoading ? t('common.loading') : t('auth.verify')}
                  </Button>
                </div>
              </div>
            )}

            {tab === 'email' && (
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-on-surface mb-2">{t('auth.email')}</label>
                  <Input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.email')}
                  />
                </div>

                {isRegistering && (
                  <div>
                    <label className="block text-sm font-bold text-on-surface mb-2">
                      {t('auth.phone')} <span className="text-xs font-normal text-stone-400">(Optional)</span>
                    </label>
                    <div className="flex rounded-xl overflow-hidden border border-outline-variant bg-surface-container-lowest focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                      <span className="inline-flex items-center px-3.5 bg-surface-container-low text-on-surface-variant text-sm font-bold border-r border-outline-variant select-none">
                        +91
                      </span>
                      <input 
                        type="tel" 
                        value={regPhone} 
                        onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="flex-1 block w-full min-w-0 text-sm p-3.5 border-0 focus:ring-0 bg-transparent text-on-surface font-semibold placeholder:text-stone-400"
                        placeholder={t('auth.enter_phone')}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-on-surface mb-2">{t('auth.password')}</label>
                  <div className="relative flex items-center">
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('auth.password')}
                      className="w-full pr-12 text-sm p-3.5 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 text-on-surface font-medium"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-stone-400 hover:text-on-surface transition-colors focus:outline-none"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <span className="material-symbols-outlined text-xl select-none">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {isRegistering && (
                  <div>
                    <label className="block text-sm font-bold text-on-surface mb-2">Confirm Password</label>
                    <div className="relative flex items-center">
                      <input 
                        type={showConfirmPassword ? 'text' : 'password'} 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        className="w-full pr-12 text-sm p-3.5 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 text-on-surface font-medium"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 text-stone-400 hover:text-on-surface transition-colors focus:outline-none"
                        tabIndex={-1}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        <span className="material-symbols-outlined text-xl select-none">
                          {showConfirmPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <Button type="submit" disabled={isLoading || !email || !password || (isRegistering && !confirmPassword)} fullWidth>
                    {isLoading ? t('common.loading') : (isRegistering ? t('auth.register') : t('auth.login'))}
                  </Button>
                </div>
                <div className="text-center mt-6">
                  <button 
                    type="button" 
                    onClick={() => {
                      clearError();
                      setIsRegistering(!isRegistering);
                    }}
                    className="text-sm text-primary font-bold hover:underline"
                  >
                    {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </Card>
        
        <div className="flex flex-col justify-center items-center gap-2 mt-4 text-xs font-semibold text-on-surface-variant">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-tertiary">lock</span>
            Secure & Government Compliant
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={() => handleSwitchServer('http://localhost:8000')}
              className={`px-3 py-1 text-[11px] font-bold rounded-full transition-all border ${
                currentServerUrl.includes('localhost')
                  ? 'bg-primary text-on-primary border-primary shadow-xs'
                  : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:bg-surface-container'
              }`}
            >
              USB: localhost:8000
            </button>
            <button
              type="button"
              onClick={() => handleSwitchServer('http://192.168.40.172:8000')}
              className={`px-3 py-1 text-[11px] font-bold rounded-full transition-all border ${
                currentServerUrl.includes('192.168.40.172')
                  ? 'bg-primary text-on-primary border-primary shadow-xs'
                  : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:bg-surface-container'
              }`}
            >
              Wi-Fi: 192.168.40.172:8000
            </button>
          </div>
        </div>

      </main>
    </div>
  );
};

export default LoginPage;
