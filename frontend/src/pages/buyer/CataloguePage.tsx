import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, X, ShoppingBag } from 'lucide-react';
import api from '../../lib/api';
import ProductCard from '../../components/buyer/ProductCard';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '../../stores/cartStore';

export default function CataloguePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { getItemCount } = useCartStore();
    const [searchParams, setSearchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    
    // Filters state
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        search: searchParams.get('search') || '',
        category: searchParams.get('category') || '',
        material: searchParams.get('material') || '',
        state: searchParams.get('state') || '',
        max_moq: searchParams.get('max_moq') || '',
        max_lead_time: searchParams.get('max_lead_time') || '',
        in_stock: searchParams.get('in_stock') === 'true',
        made_to_order: searchParams.get('made_to_order') === 'true',
        sort_by: searchParams.get('sort_by') || 'newest',
    });

    const categories = ['All', 'Weaving', 'Pottery', 'Woodwork', 'Textile', 'Jewelry', 'Metalwork', 'Leather'];

    useEffect(() => {
        fetchProducts(1, true);
    }, [
        filters.category, filters.sort_by, filters.material, filters.state, 
        filters.max_moq, filters.max_lead_time, filters.in_stock, filters.made_to_order, 
        searchParams.get('search')
    ]); 

    const fetchProducts = async (pageNumber: number, reset: boolean = false) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.category && filters.category !== 'All') params.append('category', filters.category);
            if (filters.material) params.append('material', filters.material);
            if (filters.state) params.append('state', filters.state);
            if (filters.max_moq) params.append('max_moq', filters.max_moq);
            if (filters.max_lead_time) params.append('max_lead_time', filters.max_lead_time);
            if (filters.in_stock) params.append('in_stock', 'true');
            if (filters.made_to_order) params.append('made_to_order', 'true');
            params.append('sort_by', filters.sort_by);
            params.append('page', pageNumber.toString());
            params.append('per_page', '12');

            const res = await api.get(`/products/catalogue/list?${params.toString()}`);
            if (reset) {
                setProducts(res.data.items);
            } else {
                setProducts(prev => [...prev, ...res.data.items] as any);
            }
            setHasMore(res.data.items.length === 12);
            setPage(pageNumber);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchProducts(1, true);
        
        const newParams: any = { ...filters };
        // Clean up empty params
        Object.keys(newParams).forEach(k => {
            if (newParams[k] === '' || newParams[k] === false) delete newParams[k];
        });
        setSearchParams(newParams);
    };

    return (
        <div className="w-full relative pb-20 bg-surface-container-lowest min-h-screen">
            <div className="bg-surface px-6 py-4 sticky top-0 z-10 shadow-sm flex flex-col gap-4">
                <div className="flex gap-2 items-center">
                    <form onSubmit={handleSearchSubmit} className="relative flex-1">
                        <input 
                            type="text" 
                            placeholder={t('buyer.search_ph')}
                            value={filters.search}
                            onChange={(e) => setFilters({...filters, search: e.target.value})}
                            className="w-full pl-10 pr-4 py-3 bg-surface-container rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                        />
                        <Search className="absolute left-3 top-3 text-stone-400 w-5 h-5" />
                    </form>
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-3 rounded-xl border flex-shrink-0 transition-all ${showFilters ? 'bg-primary border-primary text-on-primary' : 'bg-surface border-outline-variant text-on-surface-variant hover:border-primary'}`}
                        aria-label="Filter"
                    >
                        <SlidersHorizontal className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => navigate('/buyer/cart')}
                        className="p-3 rounded-xl border border-outline-variant bg-surface text-stone-700 hover:border-primary flex-shrink-0 relative transition-all active:scale-95"
                        aria-label="Shopping Cart"
                    >
                        <ShoppingBag className="w-5 h-5" />
                        {getItemCount() > 0 && (
                            <span className="absolute -top-1 -right-1 bg-primary text-on-primary text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow">
                                {getItemCount()}
                            </span>
                        )}
                    </button>
                </div>
            </div>
            
            {showFilters && (
                <div className="bg-surface px-6 py-4 border-b border-outline-variant shadow-lg absolute w-full z-20 top-20 left-0">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-stone-800">{t('buyer.filters')}</h3>
                        <button onClick={() => setShowFilters(false)}><X className="w-5 h-5 text-stone-400" /></button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="mb-4">
                            <label className="text-xs font-bold text-stone-500 uppercase block mb-2">{t('products.category')}</label>
                            <select 
                                value={filters.category}
                                onChange={(e) => setFilters({...filters, category: e.target.value})}
                                className="w-full p-2 border border-outline-variant/50 rounded-xl text-sm bg-surface-container-lowest"
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        
                        <div className="mb-4">
                            <label className="text-xs font-bold text-stone-500 uppercase block mb-2">State / Region</label>
                            <input 
                                type="text"
                                placeholder="e.g. Rajasthan"
                                value={filters.state}
                                onChange={(e) => setFilters({...filters, state: e.target.value})}
                                className="w-full p-2 border border-outline-variant/50 rounded-xl text-sm bg-surface-container-lowest"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="text-xs font-bold text-stone-500 uppercase block mb-2">Material</label>
                            <input 
                                type="text"
                                placeholder="e.g. Cotton, Wood"
                                value={filters.material}
                                onChange={(e) => setFilters({...filters, material: e.target.value})}
                                className="w-full p-2 border border-outline-variant/50 rounded-xl text-sm bg-surface-container-lowest"
                            />
                        </div>
                        
                        <div className="mb-4">
                            <label className="text-xs font-bold text-stone-500 uppercase block mb-2">{t('buyer.sort_by')}</label>
                            <select 
                                value={filters.sort_by}
                                onChange={(e) => setFilters({...filters, sort_by: e.target.value})}
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2 focus:outline-none focus:border-primary text-sm font-medium"
                            >
                                <option value="newest">{t('buyer.newest_first')}</option>
                                <option value="price_low">Price: Low to High</option>
                                <option value="price_high">Price: High to Low</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                            <label className="text-xs font-bold text-stone-500 uppercase block mb-2">Max MOQ</label>
                            <input 
                                type="number"
                                placeholder="Any"
                                value={filters.max_moq}
                                onChange={(e) => setFilters({...filters, max_moq: e.target.value})}
                                className="w-full p-2 border border-outline-variant/50 rounded-xl text-sm bg-surface-container-lowest"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-stone-500 uppercase block mb-2">Max Lead Time (Days)</label>
                            <input 
                                type="number"
                                placeholder="Any"
                                value={filters.max_lead_time}
                                onChange={(e) => setFilters({...filters, max_lead_time: e.target.value})}
                                className="w-full p-2 border border-outline-variant/50 rounded-xl text-sm bg-surface-container-lowest"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 mt-4">
                        <label className="flex items-center gap-2 text-sm text-stone-700">
                            <input 
                                type="checkbox" 
                                checked={filters.in_stock}
                                onChange={(e) => setFilters({...filters, in_stock: e.target.checked})}
                                className="rounded text-primary focus:ring-primary w-4 h-4"
                            />
                            In Stock
                        </label>
                        <label className="flex items-center gap-2 text-sm text-stone-700">
                            <input 
                                type="checkbox" 
                                checked={filters.made_to_order}
                                onChange={(e) => setFilters({...filters, made_to_order: e.target.checked})}
                                className="rounded text-primary focus:ring-primary w-4 h-4"
                            />
                            Made to Order
                        </label>
                    </div>

                    <div className="mt-6 flex justify-end gap-2">
                        <button 
                            onClick={() => {
                                setFilters({
                                    search: '', category: '', material: '', state: '', max_moq: '', max_lead_time: '', in_stock: false, made_to_order: false, sort_by: 'newest'
                                });
                            }}
                            className="px-4 py-2 text-sm font-bold text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50"
                        >
                            Reset
                        </button>
                        <button 
                            onClick={() => { setShowFilters(false); handleSearchSubmit({preventDefault: () => {}} as any); }}
                            className="px-6 py-2 text-sm font-bold bg-primary text-on-primary rounded-lg"
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>
            )}

            <div className="p-6">
                {products.length > 0 ? (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {products.map((p: any) => <ProductCard key={p.id} product={p} />)}
                        </div>
                        {hasMore && (
                            <div className="mt-8 flex justify-center">
                                <button 
                                    onClick={() => fetchProducts(page + 1)}
                                    disabled={loading}
                                    className="px-6 py-2 border border-primary text-primary rounded-full font-bold hover:bg-primary hover:text-on-primary transition-colors"
                                >
                                    {loading ? t('common.loading') : 'Load More'}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    !loading && (
                        <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-stone-100">
                            <p className="text-stone-500 font-medium">{t('buyer.no_products_found')}</p>
                        </div>
                    )
                )}
                {loading && products.length === 0 && (
                    <div className="grid grid-cols-2 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="bg-stone-200 animate-pulse aspect-[3/4] rounded-2xl"></div>)}
                    </div>
                )}
            </div>
        </div>
    );
}
