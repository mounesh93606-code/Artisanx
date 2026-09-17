import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, ChevronRight, Clock, Heart, Star, Sparkles, ShoppingBag } from 'lucide-react';
import api from '../../lib/api';
import { useBuyerStore } from '../../stores/buyerStore';
import { useCartStore } from '../../stores/cartStore';
import ProductCard from '../../components/buyer/ProductCard';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import { LanguageSwitcher } from '../../components/layout/LanguageSwitcher';

export default function BuyerHome() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { loadRecentlyViewed, recentlyViewed, savedProducts, fetchSavedProducts } = useBuyerStore();
    const { getItemCount } = useCartStore();
    const [featured, setFeatured] = useState([]);
    const [newProducts, setNewProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const categories = ['All', 'Weaving', 'Pottery', 'Woodwork', 'Textile', 'Jewelry', 'Metalwork', 'Leather'];

    useEffect(() => {
        loadRecentlyViewed();
        fetchSavedProducts();
        
        Promise.all([
            api.get('/products/catalogue/list?sort_by=newest&per_page=6'), // Featured (mocked by newest)
            api.get('/products/catalogue/list?sort_by=newest&per_page=6')  // Newest
        ]).then(([resFeatured, resNew]) => {
            setFeatured(resFeatured.data.items || []);
            setNewProducts(resNew.data.items || []);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, [loadRecentlyViewed, fetchSavedProducts]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/buyer/catalogue?search=${encodeURIComponent(searchQuery)}`);
        }
    };

    const handleCategory = (cat: string) => {
        if (cat === 'All') navigate('/buyer/catalogue');
        else navigate(`/buyer/catalogue?category=${encodeURIComponent(cat)}`);
    };

    const cartCount = getItemCount();

    return (
        <div className="w-full relative pb-24">
            {/* Header / Search Area */}
            <div className="bg-primary px-6 py-8 rounded-b-[2rem] text-on-primary shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-white text-2xl">handshake</span>
                        <span className="font-bold tracking-tight text-lg text-white">ArtisanX</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <LanguageSwitcher />
                        <Link to="/buyer/cart" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors relative" aria-label="Cart">
                            <ShoppingBag size={18} className="text-on-primary" />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-secondary text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow">
                                    {cartCount}
                                </span>
                            )}
                        </Link>
                        <Link to="/buyer/profile" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors relative" aria-label="Saved">
                            <Heart size={18} className="text-on-primary" />
                            {savedProducts.length > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-primary"></span>
                            )}
                        </Link>
                        <NotificationBell />
                    </div>
                </div>

                <div className="mb-4">
                    <h1 className="text-3xl font-bold">{t('buyer.discover')}</h1>
                    <p className="text-primary-container mt-1">{t('buyer.authentic')}</p>
                </div>
                
                <form onSubmit={handleSearch} className="relative">
                    <input 
                        data-help="search-input"
                        type="text" 
                        placeholder={t('buyer.search_ph')} 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 text-on-primary placeholder-white/50 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-white transition-all"
                    />
                    <Search className="absolute left-4 top-3.5 text-white/50 w-5 h-5" />
                </form>
            </div>

            {/* Categories */}
            <div className="mt-8 px-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-stone-800">{t('buyer.categories')}</h2>
                </div>
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
                    {categories.map(cat => (
                        <button 
                            key={cat} 
                            onClick={() => handleCategory(cat)}
                            className="px-4 py-2 bg-surface border border-outline-variant rounded-full whitespace-nowrap text-sm font-bold text-on-surface-variant hover:border-primary hover:text-primary transition-all shadow-sm"
                        >
                            {t('categories.' + cat.toLowerCase()) || cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Recently Viewed */}
            {recentlyViewed.length > 0 && (
                <div className="mt-8">
                    <div className="px-6 flex justify-between items-end mb-4">
                        <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-stone-400" /> {t('buyer.recently_viewed')}
                        </h2>
                    </div>
                    <div className="flex overflow-x-auto hide-scrollbar px-6 pb-4 gap-4 snap-x">
                        {recentlyViewed.map(product => (
                            <Link key={product.id} to={`/buyer/product/${product.id}`} className="snap-start shrink-0 w-32 relative bg-surface rounded-xl shadow-sm border border-stone-100 overflow-hidden">
                                <div className="aspect-square bg-stone-100">
                                    {product.image_url ? (
                                        <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-stone-300 text-xs">No image</div>
                                    )}
                                </div>
                                <div className="p-2">
                                    <div className="text-xs font-bold text-stone-800 truncate">{product.title}</div>
                                    <div className="text-[10px] text-stone-500 truncate">{product.artisan_name}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Featured Artisans / Products */}
            <div className="mt-6 px-6">
                <div className="flex justify-between items-end mb-4">
                    <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-500" /> {t('buyer.featured')}
                    </h2>
                    <Link to="/buyer/catalogue" className="text-sm font-bold text-primary flex items-center hover:underline">
                        {t('buyer.see_all')} <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                </div>
                
                {loading ? (
                    <div className="flex justify-center p-8"><div className="animate-pulse w-8 h-8 bg-stone-300 rounded-full"></div></div>
                ) : featured.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                        {featured.slice(0, 4).map((product: any) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 text-stone-500">{t('buyer.no_products')}</div>
                )}
            </div>
            
            {/* New Arrivals */}
            <div className="mt-8 px-6">
                <div className="flex justify-between items-end mb-4">
                    <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2">
                        <Star className="w-5 h-5 text-blue-500" /> {t('buyer.new_arrivals')}
                    </h2>
                    <Link to="/buyer/catalogue?sort_by=newest" className="text-sm font-bold text-primary flex items-center hover:underline">
                        {t('buyer.see_all')} <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                </div>
                
                {loading ? (
                    <div className="flex justify-center p-8"><div className="animate-pulse w-8 h-8 bg-stone-300 rounded-full"></div></div>
                ) : newProducts.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                        {newProducts.slice(0, 4).map((product: any) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
