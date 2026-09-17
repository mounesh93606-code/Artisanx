import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../lib/api';
import { ArrowLeft, Search, Filter, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ArtisanDirectory() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [artisans, setArtisans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchArtisans() {
      try {
        const res = await api.get('/facilitator/artisans');
        setArtisans(res.data.artisans || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchArtisans();
  }, []);

  const filteredArtisans = artisans.filter(a => {
    const matchesSearch = !searchTerm.trim() || 
      (a.name && a.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.craft && a.craft.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.business_name && a.business_name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchesSearch) return false;
    if (filter === 'All') return true;
    if (filter === 'Verified') return a.status === 'cooperative_verified' || a.status === 'facilitator_reviewed';
    if (filter === 'Needs Review') return a.status === 'self_declared' || a.status === 'documentation_pending';
    return true;
  });

  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface pb-24">
      <div className="sticky top-0 z-10 bg-surface px-6 pt-12 pb-4 flex flex-col gap-4 shadow-sm border-b border-outline-variant/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-stone-500 hover:text-stone-800 rounded-full hover:bg-stone-100 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold">{t('facilitator.artisans') || 'Artisans'}</h1>
          </div>
          <div className="flex items-center gap-4 text-stone-500">
            <Search className="w-5 h-5 cursor-pointer hover:text-primary" />
            <Filter className="w-5 h-5 cursor-pointer hover:text-primary" />
          </div>
        </div>
        
        {/* Search Bar matching design */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search artisans..." 
            className="w-full bg-surface-container pl-12 pr-4 py-3 rounded-full border border-outline-variant/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {['All', 'Verified', 'Needs Review'].map(tab => (
            <button 
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-5 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all ${filter === tab ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      
      <div className="p-6 space-y-4">
        {loading ? (
           <div className="flex justify-center p-8"><div className="animate-pulse w-8 h-8 rounded-full bg-stone-300"></div></div>
        ) : filteredArtisans.length === 0 ? (
          <div className="text-center text-stone-500 p-8">No artisans found.</div>
        ) : (
          filteredArtisans.map((artisan, i) => (
            <div 
              key={artisan.id || i}
              onClick={() => navigate(`/facilitator/artisans/${artisan.id}`)}
              className="bg-surface rounded-3xl p-4 flex items-center gap-4 shadow-sm border border-outline-variant/50 cursor-pointer hover:shadow-md transition-all group"
            >
              <div className="w-16 h-16 rounded-full overflow-hidden bg-primary-container shrink-0 border-2 border-surface shadow-sm">
                {artisan.photo ? (
                  <img src={artisan.photo} alt={artisan.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-primary text-xl font-bold">
                    {artisan.name?.charAt(0) || '?'}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base truncate text-stone-800">{artisan.name}</h3>
                <p className="text-xs text-stone-500 truncate mb-2">{artisan.business_name || artisan.craft || 'General Craft'} • {artisan.location || 'Local'}</p>
                <div className="flex items-center gap-2">
                  {artisan.status === 'cooperative_verified' || artisan.status === 'facilitator_reviewed' ? (
                     <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-bold tracking-wide uppercase">
                        Verified
                     </span>
                  ) : artisan.status === 'self_declared' ? (
                     <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold tracking-wide uppercase">
                        Under Review
                     </span>
                  ) : (
                     <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-bold tracking-wide uppercase">
                        Documentation Pending
                     </span>
                  )}
                </div>
              </div>
              <div className="text-stone-300 group-hover:text-primary transition-colors">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
