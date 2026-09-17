import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { MobileShell } from './MobileShell';
import { Home, Compass, MessageSquare, Package, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function BuyerLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  // Check if current route is a detail screen (product, specific order, quotation, enquiry thread, artisan profile, cart, or checkout)
  const isDetailRoute = /^\/buyer\/(product\/|orders\/[^/]+|quotations\/|enquiry\/|artisan\/|cart|checkout)/.test(location.pathname);

  return (
    <MobileShell>
      <div className={`flex-1 overflow-y-auto ${isDetailRoute ? '' : 'pb-24'}`}>
        <Outlet />
      </div>
      {!isDetailRoute && (
        <div className="fixed bottom-0 left-0 right-0 mobile-shell-width mx-auto bg-surface border-t border-outline-variant px-6 py-3 flex justify-between items-center z-50 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <NavLink to="/buyer" end className={({isActive}) => `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-stone-400 hover:text-stone-600'}`}>
                <Home className="w-6 h-6" />
                <span className="text-[10px] font-bold tracking-wide">{t('nav.home')}</span>
            </NavLink>
            <NavLink to="/buyer/catalogue" className={({isActive}) => `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-stone-400 hover:text-stone-600'}`}>
                <Compass className="w-6 h-6" />
                <span className="text-[10px] font-bold tracking-wide">{t('nav.explore')}</span>
            </NavLink>
            <NavLink to="/buyer/enquiries" className={({isActive}) => `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-stone-400 hover:text-stone-600'}`}>
                <MessageSquare className="w-6 h-6" />
                <span className="text-[10px] font-bold tracking-wide">{t('nav.enquiries')}</span>
            </NavLink>
            <NavLink to="/buyer/orders" className={({isActive}) => `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-stone-400 hover:text-stone-600'}`}>
                <Package className="w-6 h-6" />
                <span className="text-[10px] font-bold tracking-wide">{t('nav.orders')}</span>
            </NavLink>
            <NavLink to="/buyer/profile" className={({isActive}) => `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-stone-400 hover:text-stone-600'}`}>
                <User className="w-6 h-6" />
                <span className="text-[10px] font-bold tracking-wide">{t('nav.profile')}</span>
            </NavLink>
        </div>
      )}
    </MobileShell>
  );
}
