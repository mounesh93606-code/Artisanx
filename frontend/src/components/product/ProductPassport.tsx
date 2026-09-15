import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share2, MessageCircle, MapPin, CheckCircle, Package, ShieldCheck, Clock, Settings, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductImage {
  image_url: string;
  is_main: boolean;
}

interface PassportData {
  title: string;
  images: ProductImage[];
  artisan_name: string;
  artisan_story?: string;
  craft_location?: string;
  materials?: any;
  care_instructions?: string;
  price: number;
  moq?: number;
  lead_time?: number;
  stock?: number;
  customisation_available: boolean;
  verification_status?: string;
}

interface Props {
  passportData: PassportData;
  qrCodeUrl: string;
  shareableUrl: string;
  onEnquire?: () => void;
  isArtisanView?: boolean;
}

export default function ProductPassport({ passportData, qrCodeUrl, shareableUrl, onEnquire, isArtisanView = false }: Props) {
  const { t } = useTranslation();
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [shareSuccess, setShareSuccess] = useState(false);

  const images = passportData.images?.length > 0 ? passportData.images : [{ image_url: 'https://via.placeholder.com/400x400?text=No+Image', is_main: true }];

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: passportData.title,
          text: `Check out ${passportData.title} by ${passportData.artisan_name}`,
          url: shareableUrl,
        });
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      navigator.clipboard.writeText(shareableUrl);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    }
  };

  const verificationMap: Record<string, string> = {
    'self_declared': t('verification.self_declared', 'Self Declared'),
    'facilitator_reviewed': t('verification.facilitator_reviewed', 'Reviewed by Facilitator'),
    'cooperative_verified': t('verification.cooperative_verified', 'Cooperative Verified'),
    'documentation_pending': t('verification.documentation_pending', 'Documentation Pending')
  };

  return (
    <div className="w-full relative pb-20 font-sans">
      {/* Header / Gallery */}
      <div className="relative bg-surface shadow-sm text-on-surface">
        <div className="relative h-80 w-full overflow-hidden bg-surface-container">
          <AnimatePresence initial={false}>
            <motion.img
              key={currentImageIdx}
              src={images[currentImageIdx].image_url}
              alt={passportData.title}
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, { offset, velocity }) => {
                const swipe = swipePower(offset.x, velocity.x);
                if (swipe < -swipeConfidenceThreshold) {
                  setCurrentImageIdx((prev) => (prev + 1) % images.length);
                } else if (swipe > swipeConfidenceThreshold) {
                  setCurrentImageIdx((prev) => (prev - 1 + images.length) % images.length);
                }
              }}
            />
          </AnimatePresence>
          {images.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
              {images.map((_, idx) => (
                <div key={idx} className={`w-2 h-2 rounded-full ${idx === currentImageIdx ? 'bg-white' : 'bg-white/50'}`} />
              ))}
            </div>
          )}
        </div>
        
        <div className="p-5">
          <h1 className="text-2xl font-bold text-on-surface">{passportData.title}</h1>
          <p className="text-xl font-medium text-primary mt-2">₹{passportData.price.toFixed(2)}</p>
          
          <div className="flex gap-3 mt-4">
            <button onClick={handleShare} className={`${!isArtisanView && onEnquire ? 'flex-1' : 'w-full'} bg-surface-container hover:bg-surface-container-high text-on-surface py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors`}>
              <Share2 size={18} />
              {shareSuccess ? t('passport.copied', 'Copied!') : t('passport.share', 'Share')}
            </button>
            {!isArtisanView && onEnquire && (
              <button 
                onClick={onEnquire}
                className="flex-1 bg-primary hover:bg-primary/90 text-on-primary py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors shadow-md active:scale-95"
              >
                <MessageCircle size={18} />
                {t('passport.enquire', 'Send Enquiry')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Artisan Section */}
      <div className="mt-4 bg-surface p-5 shadow-sm text-on-surface">
        <h2 className="text-sm font-bold tracking-wider text-on-surface-variant uppercase mb-4">{t('passport.artisan_story', 'Artisan Story')}</h2>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-secondary-container rounded-full flex items-center justify-center text-on-secondary-container font-bold text-xl">
            {passportData.artisan_name.charAt(0)}
          </div>
          <div>
            <h3 className="font-bold text-on-surface text-lg">{passportData.artisan_name}</h3>
            {passportData.craft_location && (
              <p className="text-on-surface-variant flex items-center gap-1 text-sm mt-0.5">
                <MapPin size={14} /> {passportData.craft_location}
              </p>
            )}
          </div>
        </div>
        {passportData.artisan_story && (
          <p className="text-on-surface-variant text-sm leading-relaxed">
            {passportData.artisan_story}
          </p>
        )}
        
        {passportData.verification_status && (
          <div className="mt-4 inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-medium border border-green-100">
            <ShieldCheck size={14} />
            {verificationMap[passportData.verification_status] || passportData.verification_status}
          </div>
        )}
      </div>

      {/* Details Section */}
      <div className="mt-4 bg-surface p-5 shadow-sm text-on-surface">
        <h2 className="text-sm font-bold tracking-wider text-on-surface-variant uppercase mb-4">{t('passport.product_details', 'Product Details')}</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <DetailItem icon={<Package size={16}/>} label={t('passport.moq', 'Min. Order')} value={passportData.moq ? `${passportData.moq} units` : '-'} />
          <DetailItem icon={<Clock size={16}/>} label={t('passport.lead_time', 'Lead Time')} value={passportData.lead_time ? `${passportData.lead_time} days` : '-'} />
          <DetailItem icon={<CheckCircle size={16}/>} label={t('passport.stock', 'In Stock')} value={passportData.stock ? `${passportData.stock} units` : '-'} />
          <DetailItem icon={<Settings size={16}/>} label={t('passport.customisation', 'Customisation')} value={passportData.customisation_available ? t('passport.yes', 'Available') : t('passport.no', 'No')} />
        </div>

        {passportData.materials && (
          <div className="mt-5 pt-5 border-t border-outline-variant">
            <h3 className="font-medium text-on-surface mb-2 flex items-center gap-2"><Info size={16} className="text-on-surface-variant"/> {t('passport.materials', 'Materials')}</h3>
            <div className="text-on-surface-variant text-sm flex flex-col gap-1">
              {typeof passportData.materials === 'string' 
                ? <p>{passportData.materials}</p> 
                : passportData.materials?.list 
                  ? passportData.materials.list.map((m: any, i: number) => (
                      <span key={i}>• {m.name}</span>
                    ))
                  : null}
            </div>
          </div>
        )}

        {passportData.care_instructions && (
          <div className="mt-4">
            <h3 className="font-medium text-on-surface mb-2">{t('passport.care', 'Care Instructions')}</h3>
            <p className="text-on-surface-variant text-sm">{passportData.care_instructions}</p>
          </div>
        )}
      </div>

      {/* QR Code Section */}
      <div className="mt-4 bg-surface p-5 shadow-sm text-center text-on-surface">
        <h2 className="text-sm font-bold tracking-wider text-on-surface-variant uppercase mb-4">{t('passport.authenticity', 'Authenticity Passport')}</h2>
        <div className="inline-block p-4 bg-surface border-2 border-outline-variant rounded-2xl shadow-sm mb-3">
          <img src={qrCodeUrl} alt="Product QR Code" className="w-40 h-40" />
        </div>
        <p className="text-xs text-on-surface-variant max-w-[250px] mx-auto">
          {t('passport.scan_desc', 'Scan this QR code to verify the authenticity and origin of this handcrafted product.')}
        </p>
      </div>
    </div>
  );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-on-surface-variant text-xs font-medium">
        {icon}
        {label}
      </div>
      <div className="text-on-surface text-sm font-semibold">{value}</div>
    </div>
  );
}

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};
