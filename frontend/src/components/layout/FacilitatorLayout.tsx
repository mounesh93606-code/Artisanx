import { Outlet, NavLink } from 'react-router-dom';
import { MobileShell } from './MobileShell';
import { Home, Users, Star, AlertTriangle, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function FacilitatorLayout() {
  const { t } = useTranslation();
  return (
    <MobileShell>
      <div className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </div>
      <div className="fixed bottom-0 left-0 right-0 mobile-shell-width mx-auto bg-surface border-t border-outline-variant px-6 py-3 flex justify-between items-center z-50 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <NavLink to="/facilitator" end className={({isActive}) => `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-stone-400 hover:text-stone-600'}`}>
              <Home className="w-6 h-6" />
              <span className="text-[10px] font-bold tracking-wide">{t('nav.home')}</span>
          </NavLink>
          <NavLink to="/facilitator/artisans" end className={({isActive}) => `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-stone-400 hover:text-stone-600'}`}>
              <Users className="w-6 h-6" />
              <span className="text-[10px] font-bold tracking-wide">{t('nav.artisans')}</span>
          </NavLink>
          <NavLink to="/facilitator/reviews" className={({isActive}) => `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-stone-400 hover:text-stone-600'}`}>
              <Star className="w-6 h-6" />
              <span className="text-[10px] font-bold tracking-wide">{t('nav.reviews')}</span>
          </NavLink>
          <NavLink to="/facilitator/disputes" className={({isActive}) => `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-stone-400 hover:text-stone-600'}`}>
              <AlertTriangle className="w-6 h-6" />
              <span className="text-[10px] font-bold tracking-wide">{t('nav.disputes')}</span>
          </NavLink>
          <NavLink to="/facilitator/profile" className={({isActive}) => `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-stone-400 hover:text-stone-600'}`}>
              <User className="w-6 h-6" />
              <span className="text-[10px] font-bold tracking-wide">{t('nav.profile')}</span>
          </NavLink>
      </div>
    </MobileShell>
  );
}
