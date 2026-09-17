import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '../../stores/cartStore';

export default function CartPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { items, updateQuantity, removeItem, clearCart, getTotal } = useCartStore();
    const { subtotal, delivery, total } = getTotal();

    return (
        <div className="w-full relative pb-32 bg-surface-container-lowest min-h-screen">
            {/* Top Bar */}
            <div className="bg-surface px-6 pt-6 pb-4 sticky top-0 z-10 border-b border-outline-variant flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-stone-100 transition-colors"
                        aria-label="Back"
                    >
                        <ArrowLeft className="w-5 h-5 text-stone-700" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-stone-800">{t('cart.shopping_cart')}</h1>
                        <span className="text-xs text-stone-500 font-medium">{items.length} {t('cart.items')}</span>
                    </div>
                </div>
                {items.length > 0 && (
                    <button 
                        onClick={clearCart} 
                        className="text-xs font-bold text-stone-500 hover:text-red-600 transition-colors"
                    >
                        {t('cart.clear_all')}
                    </button>
                )}
            </div>

            {items.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center min-h-[60vh]">
                    <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-4 text-stone-400">
                        <ShoppingBag className="w-10 h-10" />
                    </div>
                    <h2 className="text-xl font-bold text-stone-800 mb-2">{t('cart.empty')}</h2>
                    <p className="text-stone-500 text-sm max-w-xs mb-6">
                        {t('cart.empty_desc')}
                    </p>
                    <button 
                        onClick={() => navigate('/buyer/catalogue')} 
                        className="px-6 py-3 bg-primary text-on-primary rounded-full font-bold shadow-md hover:bg-primary/90 flex items-center gap-2 transition-transform active:scale-95"
                    >
                        {t('cart.explore_marketplace')} <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <div className="p-4 sm:p-6 space-y-4 max-w-xl mx-auto">
                    {/* Items List */}
                    <div className="space-y-3">
                        {items.map((item) => (
                            <div 
                                key={item.id} 
                                className="bg-surface rounded-2xl p-4 border border-outline-variant shadow-sm flex flex-col gap-3"
                            >
                                <div className="flex gap-3">
                                    <div className="w-20 h-20 rounded-xl bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
                                        {item.image ? (
                                            <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs font-bold">Craft</div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h3 
                                                onClick={() => navigate(`/buyer/product/${item.productId}`)}
                                                className="font-bold text-stone-800 text-sm line-clamp-1 cursor-pointer hover:text-primary transition-colors"
                                            >
                                                {item.title}
                                            </h3>
                                            <button 
                                                onClick={() => removeItem(item.id)}
                                                className="text-stone-400 hover:text-red-500 p-1 -mr-1 transition-colors"
                                                aria-label="Remove item"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <p className="text-xs text-stone-500 mt-0.5">By {item.artisanName}</p>

                                        {item.enquiryConfirmed && (
                                            <div className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-tertiary bg-tertiary-fixed/30 px-2 py-0.5 rounded-full">
                                                <ShieldCheck className="w-3 h-3" /> {t('cart.enquiry_confirmed')}
                                            </div>
                                        )}

                                        {item.variant && (
                                            <span className="inline-block text-[10px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded mt-1">
                                                {item.variant.type || 'Option'}: {item.variant.value}
                                            </span>
                                        )}

                                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-100">
                                            <span className="font-extrabold text-primary text-base">
                                                ₹{(item.price * item.quantity).toLocaleString()}
                                                <span className="text-[11px] font-normal text-stone-400 ml-1">(₹{item.price} each)</span>
                                            </span>

                                            {/* Quantity Selector */}
                                            <div className="flex items-center border border-stone-200 rounded-lg bg-stone-50 overflow-hidden">
                                                <button 
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    disabled={item.quantity <= (item.moq || 1)}
                                                    className="w-7 h-7 flex items-center justify-center text-stone-600 hover:bg-stone-200 transition-colors disabled:opacity-30"
                                                    aria-label="Decrease quantity"
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                                <span className="w-8 text-center text-xs font-bold text-stone-800">
                                                    {item.quantity}
                                                </span>
                                                <button 
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    disabled={!item.isMadeToOrder && item.stockQuantity !== undefined && item.quantity >= item.stockQuantity}
                                                    className="w-7 h-7 flex items-center justify-center text-stone-600 hover:bg-stone-200 transition-colors disabled:opacity-30"
                                                    aria-label="Increase quantity"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Order Summary */}
                    <div className="bg-surface rounded-2xl p-5 border border-outline-variant shadow-sm space-y-3">
                        <h2 className="font-bold text-stone-800 text-sm uppercase tracking-wide">{t('checkout.order_summary')}</h2>
                        <div className="flex justify-between text-sm text-stone-600">
                            <span>{t('cart.subtotal')}</span>
                            <span className="font-bold text-stone-800">₹{subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm text-stone-600">
                            <span>{t('cart.shipping')}</span>
                            <span className="font-bold text-tertiary">{delivery === 0 ? t('cart.free') : `₹${delivery}`}</span>
                        </div>
                        <div className="pt-3 border-t border-stone-100 flex justify-between items-center">
                            <span className="font-bold text-base text-stone-800">{t('cart.total')}</span>
                            <span className="font-black text-xl text-primary">₹{total.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Sticky Checkout Bar */}
            {items.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 mobile-shell-width mx-auto p-4 bg-surface/95 backdrop-blur-md border-t border-outline-variant flex items-center justify-between gap-4 z-40 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
                    <div>
                        <div className="text-xs text-stone-500">{t('cart.total_payable')}</div>
                        <div className="text-xl font-black text-primary">₹{total.toLocaleString()}</div>
                    </div>
                    <button 
                        onClick={() => navigate('/buyer/checkout')}
                        className="flex-1 max-w-[220px] min-h-[48px] py-3 bg-primary text-on-primary rounded-full font-bold shadow-lg hover:bg-primary/90 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                        {t('cart.checkout')} <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
