import { create } from 'zustand';

export interface CartItem {
    id: string; // unique item id (e.g. productId or `${productId}_${variantId}`)
    productId: string;
    title: string;
    price: number;
    image: string;
    artisanId: string;
    artisanName: string;
    quantity: number;
    moq: number;
    stockQuantity?: number;
    isMadeToOrder?: boolean;
    enquiryId?: string;
    enquiryConfirmed?: boolean;
    variant?: any;
    customization?: string;
}

interface CartState {
    items: CartItem[];
    directItem: CartItem | null;
    addItem: (item: CartItem) => void;
    updateQuantity: (id: string, quantity: number) => void;
    removeItem: (id: string) => void;
    clearCart: () => void;
    setDirectItem: (item: CartItem | null) => void;
    validateCart: () => Promise<void>;
    getItemCount: () => number;
    getSubtotal: () => number;
    getTotal: () => { subtotal: number; delivery: number; total: number };
}

const STORAGE_KEY = 'artisanx_buyer_cart';

function loadInitialItems(): CartItem[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to parse cart storage', e);
    }
    return [];
}

function persistItems(items: CartItem[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
        console.error('Failed to save cart storage', e);
    }
}

export const useCartStore = create<CartState>((set, get) => ({
    items: loadInitialItems(),
    directItem: null,

    addItem: (item: CartItem) => {
        const currentItems = get().items;
        const existingIdx = currentItems.findIndex(i => i.id === item.id || (i.productId === item.productId && (!i.variant || i.variant.id === item.variant?.id)));
        
        let updatedItems: CartItem[];
        if (existingIdx >= 0) {
            updatedItems = [...currentItems];
            const existing = updatedItems[existingIdx];
            const newQty = existing.quantity + item.quantity;
            const maxStock = existing.stockQuantity;
            const finalQty = (!existing.isMadeToOrder && maxStock && maxStock > 0) ? Math.min(newQty, maxStock) : newQty;
            updatedItems[existingIdx] = { ...existing, quantity: finalQty };
        } else {
            updatedItems = [...currentItems, item];
        }

        persistItems(updatedItems);
        set({ items: updatedItems });
    },

    updateQuantity: (id: string, quantity: number) => {
        const currentItems = get().items;
        const updatedItems = currentItems.map(item => {
            if (item.id === id || item.productId === id) {
                const min = item.moq || 1;
                const max = (!item.isMadeToOrder && item.stockQuantity && item.stockQuantity > 0) ? item.stockQuantity : 9999;
                const clamped = Math.max(min, Math.min(quantity, max));
                return { ...item, quantity: clamped };
            }
            return item;
        });

        persistItems(updatedItems);
        set({ items: updatedItems });
    },

    removeItem: (id: string) => {
        const updatedItems = get().items.filter(item => item.id !== id && item.productId !== id);
        persistItems(updatedItems);
        set({ items: updatedItems });
    },

    clearCart: () => {
        persistItems([]);
        set({ items: [] });
    },

    setDirectItem: (item: CartItem | null) => {
        set({ directItem: item });
    },
    validateCart: async () => {
        try {
            const api = (await import('../lib/api')).default;
            const res = await api.get('/products/catalogue/list', { params: { per_page: 100 } });
            const activeIds = new Set((res.data?.items || []).map((p: any) => p.id));
            const valid = get().items.filter(i => activeIds.has(i.productId));
            persistItems(valid);
            set({ items: valid });
        } catch {
            // keep current on error
        }
    },

    getItemCount: () => {
        return get().items.reduce((count, i) => count + i.quantity, 0);
    },

    getSubtotal: () => {
        return get().items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    },

    getTotal: () => {
        const subtotal = get().getSubtotal();
        const delivery = 0; // Free delivery
        return {
            subtotal,
            delivery,
            total: subtotal + delivery
        };
    }
}));
