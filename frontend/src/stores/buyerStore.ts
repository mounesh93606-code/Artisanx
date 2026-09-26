import { create } from 'zustand';
import api from '../lib/api';

interface BuyerState {
    savedProducts: any[];
    recentlyViewed: any[];
    fetchSavedProducts: () => Promise<void>;
    toggleSavedProduct: (product: any) => Promise<void>;
    addRecentlyViewed: (product: any) => void;
    loadRecentlyViewed: () => Promise<void>;
    clearRecentlyViewed: () => void;
}

export const useBuyerStore = create<BuyerState>((set, get) => ({
    savedProducts: [],
    recentlyViewed: [],
    
    fetchSavedProducts: async () => {
        try {
            const res = await api.get('/buyer/wishlist');
            set({ savedProducts: res.data.items || [] });
        } catch (error) {
            console.error('Failed to fetch wishlist', error);
        }
    },
    
    toggleSavedProduct: async (product) => {
        const { savedProducts } = get();
        const isSaved = savedProducts.some(p => p.id === product.id);
        
        if (isSaved) {
            // Optimistic update
            set({ savedProducts: savedProducts.filter(p => p.id !== product.id) });
            try {
                await api.delete(`/buyer/wishlist/${product.id}`);
            } catch (error) {
                // Revert
                set({ savedProducts });
                console.error('Failed to remove from wishlist', error);
            }
        } else {
            // Optimistic update
            const newItem = {
                id: product.id,
                title: product.title,
                price: product.price,
                image_url: product.main_image || product.image_url,
                status: product.status,
                saved_at: new Date().toISOString()
            };
            set({ savedProducts: [newItem, ...savedProducts] });
            try {
                await api.post('/buyer/wishlist', { product_id: product.id });
            } catch (error) {
                // Revert
                set({ savedProducts });
                console.error('Failed to add to wishlist', error);
            }
        }
    },
    
    addRecentlyViewed: (product) => {
        const { recentlyViewed } = get();
        const filtered = recentlyViewed.filter(p => p.id !== product.id);
        const newItem = {
            id: product.id,
            title: product.title,
            price: product.price,
            image_url: product.main_image || product.image_url,
            artisan_name: product.artisan_name,
            viewed_at: new Date().toISOString()
        };
        const updated = [newItem, ...filtered].slice(0, 10); // Keep last 10
        
        set({ recentlyViewed: updated });
        try {
            localStorage.setItem('buyer_recently_viewed', JSON.stringify(updated));
        } catch (e) {
            console.error('Local storage error', e);
        }
    },
    
    loadRecentlyViewed: async () => {
        try {
            const stored = localStorage.getItem('buyer_recently_viewed');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    try {
                        const res = await api.get('/products/catalogue/list', { params: { per_page: 50 } });
                        const activeIds = new Set((res.data?.items || []).map((p: any) => p.id));
                        const valid = parsed.filter((p: any) => activeIds.has(p.id));
                        set({ recentlyViewed: valid });
                        localStorage.setItem('buyer_recently_viewed', JSON.stringify(valid));
                    } catch {
                        set({ recentlyViewed: [] });
                    }
                } else {
                    set({ recentlyViewed: [] });
                }
            } else {
                set({ recentlyViewed: [] });
            }
        } catch (e) {
            console.error('Local storage parse error', e);
            set({ recentlyViewed: [] });
        }
    },
    clearRecentlyViewed: () => {
        set({ recentlyViewed: [] });
        try {
            localStorage.removeItem('buyer_recently_viewed');
        } catch (e) {
            console.error(e);
        }
    }
}));
