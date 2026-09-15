import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { LogOut, User, Settings, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FacilitatorSettings from './FacilitatorSettings';

export default function FacilitatorProfile() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isSettingsOpen) {
    return <FacilitatorSettings onBack={() => setIsSettingsOpen(false)} />;
  }

  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface pb-24">
      <div className="bg-surface px-6 pt-12 pb-6 border-b border-outline-variant/30 text-center">
        <div className="w-24 h-24 rounded-full bg-primary-container mx-auto mb-4 border-4 border-surface shadow-sm overflow-hidden flex items-center justify-center">
          {user?.profile_photo_url ? (
            <img src={user.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <User className="w-10 h-10 text-primary" />
          )}
        </div>
        <h1 className="text-2xl font-bold">{user?.display_name || 'Facilitator'}</h1>
        <p className="text-stone-500 text-sm mt-1 flex items-center justify-center gap-1">
           <Shield className="w-3 h-3 text-primary" /> ArtisanX Facilitator
        </p>
      </div>
      
      <div className="p-6 space-y-4">
        <div className="bg-surface rounded-3xl overflow-hidden shadow-sm border border-outline-variant/50">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-full p-4 flex items-center gap-4 text-left hover:bg-stone-50 transition-colors border-b border-outline-variant/30"
          >
            <Settings className="w-5 h-5 text-stone-400" />
            <span className="font-bold text-stone-700">{t('common.settings') || 'Settings'}</span>
          </button>
          
          <button onClick={handleLogout} className="w-full p-4 flex items-center gap-4 text-left hover:bg-red-50 transition-colors text-red-600">
            <LogOut className="w-5 h-5" />
            <span className="font-bold">{t('auth.logout')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
