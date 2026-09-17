import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BottomNav from '../../components/BottomNav';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import { LanguageSwitcher } from '../../components/layout/LanguageSwitcher';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useGuidanceStore } from '../../stores/guidanceStore';
import { useProductStore } from '../../stores/productStore';
import api from '../../lib/api';

export default function ArtisanHome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<any>(null);
  
  const { metrics, fetchMetrics } = useDashboardStore();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/artisans/me');
        setProfile(res.data);
      } catch (err: any) {
        if (err.response?.status !== 404) {
          console.error("Profile fetch error:", err);
        }
      }
    };
    fetchProfile();
    fetchMetrics();
  }, [fetchMetrics]);

  const artisanName = profile?.artisan_name?.split(' ')[0] || t('auth.artisan');

  return (
    <div className="w-full min-h-screen bg-surface flex flex-col relative pb-24">
      <header className="fixed top-0 inset-x-0 mobile-shell-width z-40 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-safe">
        <div className="h-16 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">handshake</span>
            <div className="flex flex-col">
              <span className="font-bold text-on-surface tracking-tight leading-tight">{t('app.name')}</span>
              <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">{t('common.home')}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <NotificationBell />
            <button 
              onClick={() => navigate('/artisan/profile')}
              className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant shadow-sm hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined">person</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 pt-24 pb-8 w-full max-w-lg mx-auto space-y-6">
        
        <section className="flex flex-col">
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">
            {t('artisan_home.welcome')}, {artisanName} <span className="inline-block hover:rotate-12 transition-transform cursor-pointer">👋</span>
          </h1>
          <p className="text-sm font-medium text-on-surface-variant mt-1">
            {t('artisan_home.greeting_prefix')}
          </p>
        </section>

        <section className="w-full">
          <button 
            data-help="add-product"
            data-guide-id="add-product-button"
            id="add-product-button" 
            onClick={() => {
              useProductStore.getState().setStep(1);
              const guidance = useGuidanceStore.getState();
              if (guidance.isActive && guidance.currentWorkflow?.name === 'artisan_walkthrough') {
                guidance.nextStep();
              }
              navigate('/artisan/product/create');
            }}
            className="w-full relative overflow-hidden bg-primary hover:bg-primary-container text-on-primary rounded-2xl p-5 shadow-md active:scale-[0.98] transition-all flex flex-col justify-between text-left group"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-on-primary/15 flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold leading-tight">
                    + {t('artisan_home.add_product')}
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-on-primary text-primary flex items-center justify-center shadow-sm group-hover:translate-x-1 transition-transform">
                <span className="material-symbols-outlined">arrow_forward</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-on-primary/20 flex items-center justify-between text-on-primary/90 text-xs font-semibold">
              <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">photo_camera</span> {t('common.photos')}</span>
              <span className="w-1 h-1 rounded-full bg-on-primary/60"></span>
              <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">mic</span> {t('common.audio')}</span>
              <span className="w-1 h-1 rounded-full bg-on-primary/60"></span>
              <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">verified</span> {t('common.pricing')}</span>
            </div>
          </button>
        </section>

        {/* Dashboard Grid Upgrade */}
        <section className="grid grid-cols-2 gap-3">
          <div className="col-span-2 bg-primary-fixed/20 border border-primary/20 rounded-xl p-4 flex items-center justify-between shadow-sm cursor-pointer" onClick={() => navigate('/artisan/orders')}>
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Total Order Value</p>
              <p className="text-2xl font-black text-primary">₹{metrics.orders.total_value.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined">currency_rupee</span>
            </div>
          </div>
          
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 shadow-sm flex flex-col items-center text-center cursor-pointer" onClick={() => navigate('/artisan/products')}>
            <span className="text-xl font-black text-on-surface leading-none">{metrics.total_products}</span>
            <span className="text-[11px] font-semibold text-on-surface-variant mt-1.5 uppercase">Products</span>
          </div>
          
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 shadow-sm flex flex-col items-center text-center cursor-pointer" onClick={() => navigate('/artisan/products')}>
            <span className="text-xl font-black text-tertiary leading-none">{metrics.published_products}</span>
            <span className="text-[11px] font-semibold text-on-surface-variant mt-1.5 uppercase">Published</span>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 shadow-sm flex flex-col items-center text-center cursor-pointer relative" onClick={() => navigate('/artisan/enquiries')}>
            {metrics.new_enquiries > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-error ring-2 ring-surface-container-lowest animate-pulse"></span>}
            <span className="text-xl font-black text-secondary leading-none">{metrics.new_enquiries}</span>
            <span className="text-[11px] font-semibold text-on-surface mt-1.5 uppercase">New Enquiries</span>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 shadow-sm flex flex-col items-center text-center cursor-pointer" onClick={() => navigate('/artisan/quotations')}>
            <span className="text-xl font-black text-on-surface leading-none">{metrics.pending_quotations}</span>
            <span className="text-[11px] font-semibold text-on-surface-variant mt-1.5 uppercase">Pending Quotes</span>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 shadow-sm flex flex-col items-center text-center cursor-pointer" onClick={() => navigate('/artisan/orders')}>
            <span className="text-xl font-black text-primary leading-none">{metrics.orders.active}</span>
            <span className="text-[11px] font-semibold text-on-surface-variant mt-1.5 uppercase">Active Orders</span>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 shadow-sm flex flex-col items-center text-center cursor-pointer" onClick={() => navigate('/artisan/orders')}>
            <span className="text-xl font-black text-on-surface-variant leading-none">{metrics.orders.completed}</span>
            <span className="text-[11px] font-semibold text-on-surface-variant mt-1.5 uppercase">Completed</span>
          </div>
        </section>

        {/* Marketplace Tools (Phase 3) */}
        <section className="grid grid-cols-3 gap-3">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 shadow-sm flex flex-col items-center text-center cursor-pointer hover:bg-surface-container-low transition-colors" onClick={() => navigate('/artisan/conversations')}>
            <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center mb-2">
              <span className="material-symbols-outlined">forum</span>
            </div>
            <span className="text-[11px] font-bold text-on-surface uppercase tracking-tight">Messages</span>
          </div>
          
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 shadow-sm flex flex-col items-center text-center cursor-pointer hover:bg-surface-container-low transition-colors" onClick={() => navigate('/artisan/reviews')}>
            <div className="w-10 h-10 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center mb-2">
              <span className="material-symbols-outlined">star</span>
            </div>
            <span className="text-[11px] font-bold text-on-surface uppercase tracking-tight">Reviews</span>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 shadow-sm flex flex-col items-center text-center cursor-pointer hover:bg-surface-container-low transition-colors" onClick={() => navigate('/artisan/analytics')}>
            <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center mb-2">
              <span className="material-symbols-outlined">insights</span>
            </div>
            <span className="text-[11px] font-bold text-on-surface uppercase tracking-tight">Analytics</span>
          </div>
        </section>

        {/* Performance Rates Widget */}
        <section className="bg-surface rounded-xl border border-outline-variant p-4 shadow-sm">
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-4">Performance Insights</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center justify-center">
              <span className="text-lg font-black text-primary">{metrics.orders.completion_rate}%</span>
              <span className="text-[10px] font-semibold text-on-surface-variant mt-1 uppercase text-center leading-tight">Completion Rate</span>
            </div>
            <div className="flex flex-col items-center justify-center border-l border-outline-variant/50">
              <span className="text-lg font-black text-error">{metrics.orders.cancellation_rate}%</span>
              <span className="text-[10px] font-semibold text-on-surface-variant mt-1 uppercase text-center leading-tight">Cancellation Rate</span>
            </div>
            <div className="flex flex-col items-center justify-center border-l border-outline-variant/50">
              <span className="text-lg font-black text-tertiary">{metrics.orders.on_time_rate}%</span>
              <span className="text-[10px] font-semibold text-on-surface-variant mt-1 uppercase text-center leading-tight">On-Time Rate</span>
            </div>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="w-full flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-xl">history</span>
              <span className="font-bold text-on-surface">Recent Activity</span>
            </div>
            <button onClick={() => navigate('/artisan/orders')} className="text-xs font-bold text-primary hover:underline">
              See all
            </button>
          </div>
          
          <div className="flex flex-col gap-2">
            {metrics.recent_activity.length > 0 ? (
              metrics.recent_activity.map(activity => (
                <div key={activity.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant shrink-0">
                    <span className="material-symbols-outlined text-sm">notifications</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-on-surface text-sm truncate">
                      Order {activity.orders.display_id} updated
                    </p>
                    <p className="text-xs font-medium text-on-surface-variant truncate mt-0.5">
                      {activity.from_status ? `${activity.from_status} → ` : ''}{activity.to_status}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm flex items-center justify-center">
                <p className="text-xs font-medium text-on-surface-variant">No recent activity</p>
              </div>
            )}
          </div>
        </section>

      </main>

      <BottomNav />
    </div>
  );
}
