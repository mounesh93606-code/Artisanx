import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, HeartOff } from 'lucide-react';
import { useBuyerStore } from '../../stores/buyerStore';

export default function SavedProductsPage() {
    const navigate = useNavigate();
    const { savedProducts, fetchSavedProducts, toggleSavedProduct } = useBuyerStore();

    useEffect(() => {
        fetchSavedProducts();
    }, [fetchSavedProducts]);

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-24">
            <div className="flex items-center mb-6">
                <button onClick={() => navigate(-1)} className="mr-4 w-10 h-10 bg-surface rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors shadow-sm border border-outline-variant">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
                    <Heart className="w-6 h-6 text-red-500 fill-red-500" />
                    Saved Products
                </h1>
            </div>

            {savedProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {savedProducts.map((product) => (
                        <div key={product.id} className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden group cursor-pointer" onClick={() => navigate(`/buyer/product/${product.id}`)}>
                            <div className="relative aspect-[4/5] bg-stone-100 overflow-hidden">
                                {product.image_url ? (
                                    <img src={product.image_url} alt={product.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">No Image</div>
                                )}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); toggleSavedProduct(product); }}
                                    className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                                >
                                    <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                                </button>
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold text-on-surface line-clamp-1">{product.title}</h3>
                                <div className="text-primary font-bold mt-1">₹{product.price}</div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-surface rounded-3xl border border-outline-variant mt-8">
                    <HeartOff className="w-16 h-16 text-on-surface-variant/30 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-on-surface mb-2">No saved products yet</h2>
                    <p className="text-on-surface-variant mb-6 max-w-md mx-auto">Explore our catalogue and tap the heart icon to save products you love for later.</p>
                    <button onClick={() => navigate('/buyer/catalogue')} className="px-6 py-3 bg-primary text-on-primary font-bold rounded-full hover:bg-primary/90 transition-colors">
                        Browse Catalogue
                    </button>
                </div>
            )}
        </div>
    );
}
