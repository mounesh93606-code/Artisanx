import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  ShieldCheck, Mail, Sparkles, MapPin, 
  CheckCircle2, Share2, Check 
} from 'lucide-react';
import api from '../lib/api';
import ProductPassport from '../components/product/ProductPassport';
import EnquiryForm from '../components/buyer/EnquiryForm';
import { LanguageSwitcher } from '../components/layout/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { getTranslatedProduct, type TranslatedProductFields } from '../lib/productTranslation';

export default function PublicProductPage() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'en';
  const { productId } = useParams<{ productId: string }>();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [showEnquiryForm, setShowEnquiryForm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<TranslatedProductFields | null>(null);

  useEffect(() => {
    async function fetchDetail() {
      try {
        const response = await api.get(`/products/catalogue/detail/${productId}`);
        setDetail(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Product not found or unavailable.');
      } finally {
        setLoading(false);
      }
    }
    
    if (productId) {
      fetchDetail();
    }
  }, [productId]);

  // Dynamic translation effect when language changes
  useEffect(() => {
    if (!detail?.product) return;
    const prod = detail.product;
    const art = detail.artisan;

    if (currentLang === 'en') {
      setTranslatedContent(null);
      return;
    }

    if (prod.translations?.[currentLang]?.title && prod.translations?.[currentLang]?.description) {
      setTranslatedContent(prod.translations[currentLang]);
      return;
    }

    let isMounted = true;
    getTranslatedProduct(prod.id, {
      title: prod.title || '',
      description: prod.description || '',
      craft_story: art?.craft_story || '',
      care_instructions: prod.care_instructions || ''
    }, currentLang).then(res => {
      if (isMounted) {
        setTranslatedContent(res);
      }
    });

    return () => { isMounted = false; };
  }, [detail, currentLang]);

  const handleEnquiry = () => {
    setShowEnquiryForm(true);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: displayTitle,
        text: `Verified Digital Craft Passport for ${displayTitle}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-container-lowest gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-stone-500 font-medium">Verifying Product Authenticity Passport...</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest p-6">
        <div className="bg-surface p-8 rounded-3xl shadow-sm text-center w-full max-w-sm border border-outline-variant">
          <ShieldCheck className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-stone-800 mb-2">Product Unavailable</h2>
          <p className="text-stone-600 text-xs leading-relaxed">{error || 'This product passport could not be found or has been retired.'}</p>
        </div>
      </div>
    );
  }

  const { product, artisan, images, passport } = detail;
  const mainImages = images.length > 0 ? images : [{ image_url: '' }];
  const displayTitle = translatedContent?.title || product?.translations?.[currentLang]?.title || product?.title || 'Product';
  const displayDescription = translatedContent?.description || product?.translations?.[currentLang]?.description || product?.description || '';
  const displayCraftStory = translatedContent?.craft_story || artisan?.craft_story;

  return (
    <div className="w-full relative pb-28 bg-surface-container-lowest min-h-screen">
      {/* Official Verified Passport Top Banner */}
      <div className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-outline-variant/60 px-4 py-3 shadow-xs">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-stone-900 text-xs sm:text-sm tracking-tight">ArtisanX</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                  Verified Passport
                </span>
              </div>
              <p className="text-[10px] text-stone-500 hidden sm:block">Direct Artisan Heritage Certification</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleShare}
              className="p-2 rounded-full bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
              title="Share Passport"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            </button>
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        {/* Image Gallery */}
        <div className="w-full aspect-[4/5] sm:aspect-[16/10] bg-stone-200 relative overflow-hidden">
          {mainImages[currentImageIdx]?.image_url ? (
            <img 
              src={mainImages[currentImageIdx].image_url} 
              alt={displayTitle} 
              className="w-full h-full object-cover" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-400">No Image Available</div>
          )}
          
          {mainImages.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
              {mainImages.map((_: any, idx: number) => (
                <button 
                  key={idx} 
                  onClick={() => setCurrentImageIdx(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${currentImageIdx === idx ? 'bg-white w-5 shadow-sm' : 'bg-white/60'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Product Details Card */}
        <div className="px-5 py-6 -mt-6 relative bg-surface-container-lowest rounded-t-3xl text-on-surface shadow-xs space-y-6">
          <div className="flex justify-between items-start gap-4">
            <div>
              <span className="inline-block text-[11px] font-bold text-primary uppercase tracking-wider mb-1">
                {product.category || 'Handicraft'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 leading-tight">{displayTitle}</h1>
              <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5">
                <span>Crafted by:</span>
                <span className="font-semibold text-stone-800">{artisan?.artisan_name || 'Verified Indian Artisan'}</span>
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs text-stone-400 block font-medium">Catalog Price</span>
              <span className="text-2xl sm:text-3xl font-black text-primary">₹{product.price}</span>
            </div>
          </div>

          {/* Verification Callout Box */}
          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="text-xs">
              <h4 className="font-bold text-emerald-950">Authentic Indian Craftsmanship Certified</h4>
              <p className="text-emerald-800 mt-0.5 leading-relaxed">
                This item is verified directly with the artisan producer. Handcrafted using traditional heritage techniques.
              </p>
            </div>
          </div>

          {/* Description */}
          {displayDescription && (
            <div className="space-y-2">
              <h3 className="font-bold text-stone-900 text-sm">About This Craft</h3>
              <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-wrap">{displayDescription}</p>
            </div>
          )}

          {/* Specifications Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-stone-200/80 text-xs">
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/60">
              <span className="text-stone-500 block mb-0.5">MOQ</span>
              <span className="font-bold text-stone-900">{product.moq || 1} units</span>
            </div>
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/60">
              <span className="text-stone-500 block mb-0.5">Production Time</span>
              <span className="font-bold text-stone-900">{product.lead_time_days || 7} days</span>
            </div>
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/60">
              <span className="text-stone-500 block mb-0.5">Availability</span>
              <span className="font-bold text-stone-900">{product.is_made_to_order ? 'Made to Order' : `${product.stock_quantity || 0} In Stock`}</span>
            </div>
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/60">
              <span className="text-stone-500 block mb-0.5">Customization</span>
              <span className="font-bold text-stone-900">{product.customisation_available ? 'Available' : 'Standard'}</span>
            </div>
          </div>

          {/* Materials & Care */}
          {(product.materials || product.dimensions || product.care_instructions) && (
            <div className="space-y-3.5 bg-stone-50/70 p-4 rounded-2xl border border-stone-200/70 text-xs">
              <h3 className="font-bold text-stone-900 text-sm">Material & Care Specifications</h3>
              {product.materials && product.materials.list && product.materials.list.length > 0 && (
                <div>
                  <span className="font-bold text-stone-700 block mb-1">Authentic Materials:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {product.materials.list.map((m: any, i: number) => (
                      <span key={i} className="px-2.5 py-1 bg-white border border-stone-200 rounded-lg text-stone-700 font-medium">{m.name}</span>
                    ))}
                  </div>
                </div>
              )}
              {product.dimensions && (
                <div>
                  <span className="font-bold text-stone-700">Dimensions: </span>
                  <span className="text-stone-600">{product.dimensions}</span>
                </div>
              )}
              {product.care_instructions && (
                <div>
                  <span className="font-bold text-stone-700">Care Instructions: </span>
                  <span className="text-stone-600">{translatedContent?.care_instructions || product.care_instructions}</span>
                </div>
              )}
            </div>
          )}

          {/* Artisan Profile Card */}
          {artisan && (
            <div className="bg-surface border border-outline-variant rounded-3xl p-5 shadow-xs space-y-3">
              <h3 className="font-bold text-on-surface text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>About the Artisan</span>
              </h3>
              <div className="flex gap-3.5 items-center">
                <div className="w-14 h-14 rounded-2xl bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
                  {artisan.profile_photo_url ? (
                    <img src={artisan.profile_photo_url} alt={artisan.artisan_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs font-bold">
                      {(artisan.artisan_name || 'A').charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-base">{artisan.artisan_name || 'Master Artisan'}</h4>
                  {artisan.location && (
                    <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{artisan.location}</span>
                    </p>
                  )}
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary-container text-on-secondary-container">
                    {artisan.craft_type || product.category || 'Handicrafts'}
                  </span>
                </div>
              </div>
              {displayCraftStory && (
                <p className="text-xs text-stone-600 leading-relaxed italic border-l-2 border-primary/40 pl-3 mt-2">
                  "{displayCraftStory}"
                </p>
              )}
            </div>
          )}

          {/* Embedded Digital Authenticity Passport */}
          {passport && (
            <div className="mt-6">
              <h3 className="font-bold text-stone-900 text-base mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Official Digital Product Passport</span>
              </h3>
              <ProductPassport 
                productId={productId || product.id}
                passportData={{
                  ...passport.passport_data,
                  title: displayTitle,
                  artisan_story: displayCraftStory || passport.passport_data?.artisan_story,
                  care_instructions: translatedContent?.care_instructions || passport.passport_data?.care_instructions
                }} 
                qrCodeUrl={passport.qr_code_url} 
                shareableUrl={passport.shareable_url} 
                onEnquire={handleEnquiry}
              />
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Action Bar for Guests */}
      <div className="fixed bottom-0 left-0 right-0 max-w-3xl mx-auto p-3.5 bg-surface/95 backdrop-blur-md border-t border-outline-variant flex items-center gap-3 z-40 shadow-lg">
        <button 
          onClick={handleEnquiry} 
          className="w-full py-3.5 px-6 bg-primary hover:bg-primary/90 text-on-primary rounded-2xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-[0.98] shadow-md shadow-primary/20 text-sm"
        >
          <Mail className="w-4 h-4" />
          <span>Send Purchase Enquiry to Artisan</span>
        </button>
      </div>

      {showEnquiryForm && (
        <EnquiryForm 
          productId={product.id} 
          moq={product.moq || 1} 
          onClose={() => setShowEnquiryForm(false)} 
        />
      )}
    </div>
  );
}

