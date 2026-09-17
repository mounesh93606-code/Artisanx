import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../ui/Button';
import { useTranslation } from 'react-i18next';

const translations: Record<string, any> = {
  en: {
    artisan: "Artisan", artisanDesc: "Create and showcase your products with voice & photos.",
    buyer: "Buyer", buyerDesc: "Discover authentic verified crafts directly from rural clusters.",
    facilitator: "Facilitator", facilitatorDesc: "Support, onboard, train and verify artisan clusters."
  },
  ta: {
    artisan: "கைவினைஞர்", artisanDesc: "உங்கள் கைவினைப் பொருட்களை விற்கவும்",
    buyer: "வாங்குபவர்", buyerDesc: "தனித்துவமான பொருட்களை வாங்கவும்",
    facilitator: "ஒருங்கிணைப்பாளர்", facilitatorDesc: "கைவினைஞர்களுக்கு உதவவும்"
  },
  hi: {
    artisan: "कारीगर", artisanDesc: "अपने हस्तशिल्प उत्पाद बेचें",
    buyer: "खरीदार", buyerDesc: "अद्वितीय शिल्प खोजें और खरीदें",
    facilitator: "सुविधादाता", facilitatorDesc: "कारीगरों की मदद करें"
  },
  te: {
    artisan: "చేతివృత్తులవారు", artisanDesc: "మీ చేతిపనులను విక్రయించండి",
    buyer: "కొనుగోలుదారు", buyerDesc: "ప్రత్యేకమైన వస్తువులను కొనుగోలు చేయండి",
    facilitator: "సహాయకుడు", facilitatorDesc: "చేతివృత్తులవారికి సహాయం చేయండి"
  },
  kn: {
    artisan: "ಕುಶಲಕರ್ಮಿ", artisanDesc: "ನಿಮ್ಮ ಕರಕುಶಲ ಉತ್ಪನ್ನಗಳನ್ನು ಮಾರಿ",
    buyer: "ಖರೀದಿದಾರ", buyerDesc: "ವಿಶಿಷ್ಟ ಕರಕುಶಲ ವಸ್ತುಗಳನ್ನು ಖರೀದಿಸಿ",
    facilitator: "ಸಹಾಯಕಾರ", facilitatorDesc: "ಕುಶಲಕರ್ಮಿಗಳಿಗೆ ಸಹಾಯ ಮಾಡಿ"
  },
  ml: {
    artisan: "കരകൗശലവിദഗ്ദ്ധൻ", artisanDesc: "നിങ്ങളുടെ കരകൗശല ഉൽപ്പന്നങ്ങൾ വിൽക്കുക",
    buyer: "വാങ്ങുന്നയാൾ", buyerDesc: "അതുല്യമായ കരകൗശല വസ്തുക്കൾ വാങ്ങുക",
    facilitator: "സഹായി", facilitatorDesc: "കരകൗശലവിദഗ്ദ്ധരെ സഹായിക്കുക"
  },
  bn: {
    artisan: "কারিগর", artisanDesc: "আপনার হস্তশিল্প বিক্রি করুন",
    buyer: "ক্রেতা", buyerDesc: "অনন্য হস্তশিল্প কিনুন",
    facilitator: "সহায়তাকারী", facilitatorDesc: "কারিগরদের সাহায্য করুন"
  },
  mr: {
    artisan: "कारागीर", artisanDesc: "तुमची हस्तकला उत्पादने विका",
    buyer: "खरेदीदार", buyerDesc: "अद्वितीय हस्तकला खरेदी करा",
    facilitator: "सुविधा देणारा", facilitatorDesc: "कारागिरांना मदत करा"
  },
  ur: {
    artisan: "کاریگر", artisanDesc: "اپنی دستکاری کی مصنوعات بیچیں",
    buyer: "خریدار", buyerDesc: "منفرد دستکاری خریدیں",
    facilitator: "سہولت کار", facilitatorDesc: "کاریگروں کی مدد کریں"
  }
};

interface RoleSelectProps {
  lang: string;
}

const RoleSelect: React.FC<RoleSelectProps> = ({ lang }) => {
  const { setRole, isLoading } = useAuthStore();
  const { t: tI18n } = useTranslation();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<'artisan' | 'buyer' | 'facilitator' | null>('artisan');

  const t = translations[lang] || translations.en;

  const handleRoleSelect = async () => {
    if (!selectedRole) return;
    await setRole(selectedRole);
    navigate(`/${selectedRole}`);
  };

  const currentRoleLabel = selectedRole === 'artisan' ? t.artisan : selectedRole === 'buyer' ? t.buyer : t.facilitator;

  return (
    <div className="w-full space-y-6">
      <div className="mb-4 text-center">
        <h2 className="text-2xl font-bold text-on-surface flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-primary">badge</span>
          {tI18n('auth.select_role')}
        </h2>
        <p className="text-on-surface-variant mt-2 text-sm">
          {t.artisanDesc ? `${t.artisan} • ${t.buyer} • ${t.facilitator}` : ''}
        </p>
      </div>
      
      <div className="space-y-3.5">
        <div 
          onClick={() => setSelectedRole('artisan')}
          className={`relative p-4 rounded-2xl cursor-pointer transition-all ${selectedRole === 'artisan' ? 'bg-surface-container-lowest ring-2 ring-primary shadow-md' : 'bg-surface-container-lowest shadow-sm'}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-2xl">handshake</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-on-surface">{t.artisan}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-primary text-on-primary text-[10px] font-semibold uppercase">✓</span>
                </div>
                <p className="text-sm text-on-surface-variant mt-1 leading-snug">{t.artisanDesc}</p>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${selectedRole === 'artisan' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
              {selectedRole === 'artisan' ? <span className="material-symbols-outlined text-sm">check</span> : <div className="w-2.5 h-2.5 rounded-full bg-transparent"></div>}
            </div>
          </div>
        </div>

        <div 
          onClick={() => setSelectedRole('buyer')}
          className={`relative p-4 rounded-2xl cursor-pointer transition-all ${selectedRole === 'buyer' ? 'bg-surface-container-lowest ring-2 ring-primary shadow-md' : 'bg-surface-container-lowest shadow-sm'}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-2xl">storefront</span>
              </div>
              <div>
                <h3 className="font-bold text-on-surface">{t.buyer}</h3>
                <p className="text-sm text-on-surface-variant mt-1 leading-snug">{t.buyerDesc}</p>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${selectedRole === 'buyer' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
              {selectedRole === 'buyer' ? <span className="material-symbols-outlined text-sm">check</span> : <div className="w-2.5 h-2.5 rounded-full bg-transparent"></div>}
            </div>
          </div>
        </div>

        <div 
          onClick={() => setSelectedRole('facilitator')}
          className={`relative p-4 rounded-2xl cursor-pointer transition-all ${selectedRole === 'facilitator' ? 'bg-surface-container-lowest ring-2 ring-primary shadow-md' : 'bg-surface-container-lowest shadow-sm'}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-2xl">groups</span>
              </div>
              <div>
                <h3 className="font-bold text-on-surface">{t.facilitator}</h3>
                <p className="text-sm text-on-surface-variant mt-1 leading-snug">{t.facilitatorDesc}</p>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${selectedRole === 'facilitator' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
              {selectedRole === 'facilitator' ? <span className="material-symbols-outlined text-sm">check</span> : <div className="w-2.5 h-2.5 rounded-full bg-transparent"></div>}
            </div>
          </div>
        </div>
      </div>
      
      <div className="pt-4">
        <Button onClick={handleRoleSelect} disabled={isLoading || !selectedRole} fullWidth>
          {isLoading ? tI18n('common.loading') : `${tI18n('common.continue')} (${currentRoleLabel})`}
        </Button>
      </div>
    </div>
  );
};

export default RoleSelect;
