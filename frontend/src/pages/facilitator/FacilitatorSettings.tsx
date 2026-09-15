import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { ArrowLeft, Save, Camera, Check, AlertCircle } from 'lucide-react';
import api from '../../lib/api';

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'kn', label: 'Kannada' },
  { value: 'ml', label: 'Malayalam' },
  { value: 'bn', label: 'Bengali' },
  { value: 'mr', label: 'Marathi' },
  { value: 'ur', label: 'Urdu' }
];

const EXPERTISE_OPTIONS = [
  'Digital Assistance',
  'Catalogue Support',
  'Pricing Guidance',
  'Documentation',
  'Product Review',
  'B2B/Business Support',
  'Logistics Support'
];

interface FacilitatorSettingsProps {
  onBack: () => void;
}

export default function FacilitatorSettings({ onBack }: FacilitatorSettingsProps) {
  const { user, updateProfile } = useAuthStore();
  
  const [formData, setFormData] = useState({
    display_name: user?.display_name || '',
    organization_name: user?.organization_name || '',
    region_served: user?.region_served || '',
    short_bio: user?.short_bio || '',
    languages_spoken: user?.languages_spoken || [],
    areas_of_expertise: user?.areas_of_expertise || []
  });
  
  const [photoPreview, setPhotoPreview] = useState<string | null>(user?.profile_photo_url || null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleLanguage = (lang: string) => {
    setFormData(prev => {
      const isSelected = prev.languages_spoken.includes(lang);
      if (isSelected) {
        return { ...prev, languages_spoken: prev.languages_spoken.filter((l: string) => l !== lang) };
      } else {
        return { ...prev, languages_spoken: [...prev.languages_spoken, lang] };
      }
    });
  };

  const toggleExpertise = (exp: string) => {
    setFormData(prev => {
      const isSelected = prev.areas_of_expertise.includes(exp);
      if (isSelected) {
        return { ...prev, areas_of_expertise: prev.areas_of_expertise.filter((e: string) => e !== exp) };
      } else {
        return { ...prev, areas_of_expertise: [...prev.areas_of_expertise, exp] };
      }
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      let finalPhotoUrl = user?.profile_photo_url;
      
      if (photoFile) {
        const formDataObj = new FormData();
        formDataObj.append('file', photoFile);
        const res = await api.post('/auth/me/photo', formDataObj, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        finalPhotoUrl = res.data.profile_photo_url;
      }
      
      await updateProfile({
        ...formData,
        profile_photo_url: finalPhotoUrl
      });
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest pb-24">
      {/* Header */}
      <div className="bg-surface px-4 py-4 flex items-center border-b border-outline-variant/30 sticky top-0 z-10">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-stone-100 transition-colors">
          <ArrowLeft className="w-6 h-6 text-stone-700" />
        </button>
        <h1 className="text-xl font-bold text-stone-800 ml-2">Profile Settings</h1>
      </div>

      <div className="p-6 space-y-6 max-w-md mx-auto">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="p-4 bg-green-50 text-green-700 rounded-xl flex items-start gap-3">
            <Check className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">Profile updated successfully!</p>
          </div>
        )}

        {/* Photo Upload */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-primary-container border-4 border-surface shadow-sm overflow-hidden flex items-center justify-center">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-4xl text-primary">person</span>
              )}
            </div>
            <label className="absolute bottom-0 right-0 p-2 bg-primary text-on-primary rounded-full shadow-md cursor-pointer hover:bg-primary/90 transition-colors">
              <Camera className="w-5 h-5" />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>
          </div>
          <p className="text-stone-500 text-sm mt-3">Tap to change photo</p>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Full Name</label>
            <input 
              type="text"
              name="display_name"
              value={formData.display_name}
              onChange={handleChange}
              className="w-full p-3 rounded-xl border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              placeholder="e.g. Ramesh Kumar"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Email / Phone (Read Only)</label>
            <input 
              type="text"
              value={user?.email || user?.phone || 'Not provided'}
              disabled
              className="w-full p-3 rounded-xl border border-outline-variant bg-stone-50 text-stone-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Organization / NGO / SHG Name <span className="text-stone-400 font-normal">(Optional)</span></label>
            <input 
              type="text"
              name="organization_name"
              value={formData.organization_name}
              onChange={handleChange}
              className="w-full p-3 rounded-xl border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              placeholder="e.g. Artisan Uplift Trust"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Region / District Served</label>
            <input 
              type="text"
              name="region_served"
              value={formData.region_served}
              onChange={handleChange}
              className="w-full p-3 rounded-xl border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              placeholder="e.g. Jaipur, Rajasthan"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Languages Spoken</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map(lang => {
                const isSelected = formData.languages_spoken.includes(lang.value);
                return (
                  <button
                    key={lang.value}
                    onClick={() => toggleLanguage(lang.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                      isSelected 
                        ? 'bg-primary text-on-primary border-primary shadow-sm' 
                        : 'bg-surface text-stone-600 border-outline-variant hover:bg-stone-50'
                    }`}
                  >
                    {lang.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Areas of Expertise</label>
            <div className="flex flex-wrap gap-2">
              {EXPERTISE_OPTIONS.map(exp => {
                const isSelected = formData.areas_of_expertise.includes(exp);
                return (
                  <button
                    key={exp}
                    onClick={() => toggleExpertise(exp)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                      isSelected 
                        ? 'bg-primary-container text-on-primary-container border-primary-container shadow-sm' 
                        : 'bg-surface text-stone-600 border-outline-variant hover:bg-stone-50'
                    }`}
                  >
                    {exp}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Short Bio / About <span className="text-stone-400 font-normal">(Optional)</span></label>
            <textarea 
              name="short_bio"
              value={formData.short_bio}
              onChange={handleChange}
              rows={3}
              className="w-full p-3 rounded-xl border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
              placeholder="Tell artisans how you can help them..."
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className={`w-full p-4 rounded-full font-bold flex items-center justify-center gap-2 transition-all ${
              isLoading 
                ? 'bg-stone-200 text-stone-400 cursor-not-allowed' 
                : 'bg-primary text-on-primary hover:bg-primary/90 shadow-md hover:shadow-lg active:scale-[0.98]'
            }`}
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
