import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Package, Clock, ShieldCheck, Mail } from 'lucide-react';
import axios from 'axios';
import ProductPassport from '../components/product/ProductPassport';
import EnquiryForm from '../components/buyer/EnquiryForm';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function PublicProductPage() {
  const { t } = useTranslation();
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [showEnquiryForm, setShowEnquiryForm] = useState(false);

  useEffect(() => {
    async function fetchDetail() {
      try {
        const response = await axios.get(`${API_URL}/products/catalogue/detail/${productId}`);
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

  const handleEnquiry = () => {
      setShowEnquiryForm(true);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest"><div className="animate-pulse w-8 h-8 rounded-full bg-stone-300"></div></div>;
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest p-6">
        <div className="bg-surface p-8 rounded-3xl shadow-sm text-center w-full max-w-sm border border-outline-variant">
          <h2 className="text-xl font-bold text-red-600 mb-2">Unavailable</h2>
          <p className="text-stone-600">{error}</p>
          <button onClick={() => navigate('/buyer/catalogue')} className="mt-6 px-6 py-2 bg-stone-100 rounded-full font-bold text-stone-700">Back to Catalogue</button>
        </div>
      </div>
    );
  }

  const { product, artisan, images, passport } = detail;
  const mainImages = images.length > 0 ? images : [{ image_url: '' }];

  return (
    <div className="w-full relative pb-24">
      {/* Top Nav */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
          <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-stone-800 shadow-sm">
              <ArrowLeft className="w-5 h-5" />
          </button>
      </div>

      {/* Image Gallery */}
      <div className="w-full aspect-[4/5] bg-stone-200 relative overflow-hidden">
          {mainImages[currentImageIdx].image_url ? (
              <img src={mainImages[currentImageIdx].image_url} alt="Product" className="w-full h-full object-cover" />
          ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-400">No Image</div>
          )}
          {mainImages.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                  {mainImages.map((_: any, idx: number) => (
                      <button 
                          key={idx} 
                          onClick={() => setCurrentImageIdx(idx)}
                          className={`w-2 h-2 rounded-full transition-all ${currentImageIdx === idx ? 'bg-white w-4' : 'bg-white/50'}`}
                      />
                  ))}
              </div>
          )}
      </div>

      <div className="px-6 py-6 -mt-6 relative bg-surface-container-lowest rounded-t-3xl text-on-surface">
          <div className="flex justify-between items-start mb-2">
              <div>
                  <h1 className="text-2xl font-bold text-stone-800">{product.title}</h1>
                  <span className="text-xs font-bold text-primary uppercase tracking-wide">{product.category}</span>
              </div>
              <div className="text-2xl font-bold text-primary">₹{product.price}</div>
          </div>
          
          <p className="text-stone-600 mt-4 leading-relaxed whitespace-pre-wrap">{product.description}</p>
          
          <div className="grid grid-cols-2 gap-4 mt-6 border-y border-stone-200 py-6">
              <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-stone-400" />
                  <div>
                      <div className="text-xs text-stone-500">MOQ</div>
                      <div className="font-bold text-stone-800">{product.moq || 1} units</div>
                  </div>
              </div>
              <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-stone-400" />
                  <div>
                      <div className="text-xs text-stone-500">Lead Time</div>
                      <div className="font-bold text-stone-800">{product.lead_time_days || 0} days</div>
                  </div>
              </div>
          </div>

          {(product.materials || product.dimensions || product.care_instructions) && (
              <div className="mt-6 space-y-4">
                  <h3 className="font-bold text-stone-800 text-lg">Product Details</h3>
                  {product.materials && product.materials.list && product.materials.list.length > 0 && (
                      <div>
                          <div className="text-sm font-bold text-stone-700 mb-1">{t('products.materials')}</div>
                          <div className="flex flex-wrap gap-2">
                              {product.materials.list.map((m: any, i: number) => (
                                  <span key={i} className="px-3 py-1 bg-white border border-stone-200 rounded-full text-xs text-stone-600">{m.name}</span>
                              ))}
                          </div>
                      </div>
                  )}
                  {product.dimensions && (
                      <div>
                          <div className="text-sm font-bold text-stone-700">Dimensions</div>
                          <div className="text-sm text-stone-600">{product.dimensions}</div>
                      </div>
                  )}
                  {product.care_instructions && (
                      <div>
                          <div className="text-sm font-bold text-stone-700">Care Instructions</div>
                          <div className="text-sm text-stone-600">{product.care_instructions}</div>
                      </div>
                  )}
              </div>
          )}

          {artisan && (
              <div className="mt-8 bg-surface border border-outline-variant rounded-3xl p-5 shadow-sm">
                  <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-green-600" /> Artisan Profile</h3>
                  <div className="flex gap-4 items-center mb-4">
                      <div className="w-16 h-16 rounded-full bg-stone-200 overflow-hidden shrink-0 border border-stone-200">
                          {artisan.profile_photo_url ? (
                              <img src={artisan.profile_photo_url} alt={artisan.artisan_name} className="w-full h-full object-cover" />
                          ) : (
                              <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs text-center leading-tight">No Photo</div>
                          )}
                      </div>
                      <div>
                          <h4 className="font-bold text-stone-800">{artisan.artisan_name}</h4>
                          <div className="text-sm text-stone-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {artisan.location || 'Unknown Location'}</div>
                          <div className="text-xs text-on-secondary-container font-bold mt-1 bg-secondary-container px-2 py-0.5 rounded w-max">{artisan.craft_type || t('auth.artisan')}</div>
                      </div>
                  </div>
                  {artisan.craft_story && (
                      <p className="text-sm text-stone-600 leading-relaxed italic border-l-2 border-stone-200 pl-3">"{artisan.craft_story}"</p>
                  )}
              </div>
          )}

          {passport && (
              <div className="mt-8">
                  <h3 className="font-bold text-stone-800 text-lg mb-4">Product Passport</h3>
                  <ProductPassport 
                      passportData={passport.passport_data} 
                      qrCodeUrl={passport.qr_code_url} 
                      shareableUrl={passport.shareable_url} 
                      onEnquire={handleEnquiry}
                  />
              </div>
          )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 mobile-shell-width p-4 bg-surface/90 backdrop-blur-md border-t border-outline-variant flex gap-3 z-20">
          <button onClick={handleEnquiry} className="flex-1 py-3 bg-primary text-on-primary rounded-full font-bold shadow-lg hover:bg-primary/90 flex items-center justify-center gap-2 transition-all">
              <Mail className="w-5 h-5" /> Send Enquiry
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
