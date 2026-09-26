import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const SplashPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();

  const handleGetStarted = () => {
    if (isAuthenticated && user?.role) {
      navigate(`/${user.role}`);
    } else {
      navigate('/language', { state: { from: '/login' } });
    }
  };

  const handleSwitchAccount = () => {
    logout();
    navigate('/language', { state: { from: '/login' } });
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-surface text-on-surface mobile-shell-width px-6 py-8 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-72 h-72 bg-primary-container opacity-25 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-secondary-fixed opacity-40 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>

      {/* Top Header Badge */}
      <div className="w-full flex justify-between items-center z-20 pt-2">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-md shadow-xs">
          <span className="text-xs font-semibold text-primary tracking-wide">English • हिन्दी</span>
        </div>
        {isAuthenticated && (
          <button 
            onClick={handleSwitchAccount}
            className="text-xs font-semibold text-stone-500 hover:text-stone-800 bg-surface/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-outline-variant/50 transition-colors"
          >
            Switch Account
          </button>
        )}
      </div>

      {/* Main Content Area with Bilingual Elements */}
      <div className="z-10 flex flex-col items-center justify-center text-center space-y-6 my-auto max-w-md mx-auto">
        {/* Logo / App Name */}
        <div className="animate-fade-in flex flex-col items-center">
          <div className="w-20 h-20 bg-gradient-to-tr from-primary to-primary-container/80 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary/20 border border-white/20">
            <span className="material-symbols-outlined text-white text-4xl">handshake</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-primary tracking-tight">ArtisanX</h1>
          <p className="text-sm font-bold text-primary/80 mt-0.5 tracking-wide">कारीगरएक्स</p>
          <div className="h-1.5 w-16 bg-primary mx-auto rounded-full mt-2.5"></div>
        </div>

        {/* Welcome Headlines in Both Languages */}
        <div className="space-y-4 animate-slide-up w-full" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
          <div className="bg-surface-container-lowest/80 backdrop-blur-sm p-4 rounded-2xl border border-outline-variant/30 shadow-xs space-y-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-on-surface">Welcome to ArtisanX</h2>
              <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5">Empowering Artisans, Connecting Markets</p>
            </div>
            
            <div className="h-px w-full bg-outline-variant/30"></div>

            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-primary">कारीगरएक्स में आपका स्वागत है</h2>
              <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5">कारीगरों को सशक्त बनाना, बाज़ारों को जोड़ना</p>
            </div>
          </div>

          {/* Feature Highlights in Both English and Hindi */}
          <div className="grid grid-cols-2 gap-2.5 text-left pt-1">
            <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/10 flex flex-col justify-center">
              <div className="flex items-center space-x-1.5 text-primary mb-1">
                <span className="material-symbols-outlined text-base">storefront</span>
                <span className="text-xs font-bold">Direct Market</span>
              </div>
              <span className="text-[11px] text-on-surface-variant leading-tight">सीधा कारीगर बाज़ार</span>
            </div>

            <div className="p-2.5 rounded-xl bg-secondary/5 border border-secondary/10 flex flex-col justify-center">
              <div className="flex items-center space-x-1.5 text-secondary mb-1">
                <span className="material-symbols-outlined text-base">psychology</span>
                <span className="text-xs font-bold">AI Support</span>
              </div>
              <span className="text-[11px] text-on-surface-variant leading-tight">एआई मार्गदर्शन और मूल्य</span>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action with Bilingual Label */}
      <div className="w-full pb-4 z-10 animate-slide-up space-y-2" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
        <button 
          onClick={handleGetStarted}
          className="w-full bg-primary hover:bg-primary/90 text-on-primary font-bold py-3.5 px-8 rounded-2xl shadow-lg hover:shadow-primary/30 transition-all duration-300 flex flex-col items-center justify-center active:scale-[0.98] group cursor-pointer"
        >
          <span className="text-base font-bold tracking-wider flex items-center space-x-1">
            <span>{isAuthenticated && user?.role ? `Continue to ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}` : 'Get Started'}</span>
            <span className="opacity-75">•</span>
            <span>{isAuthenticated ? 'आगे बढ़ें' : 'शुरू करें'}</span>
            <span className="material-symbols-outlined text-lg ml-1 group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </span>
        </button>
      </div>
    </div>
  );
};

export default SplashPage;

