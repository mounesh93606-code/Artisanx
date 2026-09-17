import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ShieldCheck, MapPin, Truck, CreditCard, ArrowRight, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore, type CartItem } from '../../stores/cartStore';

export default function CheckoutPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isDirect = searchParams.get('direct') === 'true';

    const { user } = useAuthStore();
    const { items: cartItems, directItem, clearCart, setDirectItem } = useCartStore();

    // Determine checkout items: direct item if direct mode, else cart items
    const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([]);

    useEffect(() => {
        if (isDirect && directItem) {
            setCheckoutItems([directItem]);
        } else if (cartItems.length > 0) {
            setCheckoutItems(cartItems);
        } else {
            // Nothing to checkout, navigate back to cart
            navigate('/buyer/cart');
        }
    }, [isDirect, directItem, cartItems, navigate]);

    // Form fields
    const [fullName, setFullName] = useState(user?.display_name || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [stateName, setStateName] = useState('');
    const [pincode, setPincode] = useState('');
    const [notes, setNotes] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cod' | 'upi'>('cod');

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [placedOrder, setPlacedOrder] = useState<any | null>(null);

    const subtotal = checkoutItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = 0;
    const total = subtotal + deliveryFee;

    const handlePlaceOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;

        if (!fullName.trim() || !phone.trim() || !address.trim() || !city.trim() || !pincode.trim()) {
            setError(t('checkout.required_fields'));
            return;
        }

        setSubmitting(true);
        setError(null);

        const deliveryAddress = {
            full_name: fullName.trim(),
            phone: phone.trim(),
            address_line1: address.trim(),
            city: city.trim(),
            state: stateName.trim(),
            postal_code: pincode.trim()
        };

        try {
            if (checkoutItems.length === 1) {
                // Single order creation
                const item = checkoutItems[0];
                const res = await api.post('/orders/', {
                    product_id: item.productId,
                    quantity: item.quantity,
                    enquiry_id: item.enquiryId || null,
                    variant: item.variant || null,
                    customization_details: item.customization || null,
                    delivery_address: deliveryAddress,
                    notes: notes.trim() || null
                });

                if (isDirect) {
                    setDirectItem(null);
                } else {
                    clearCart();
                }

                setPlacedOrder(res.data.order || { id: res.data.order_id, display_id: res.data.display_id, total_order_value: total });
            } else {
                // Batch order checkout
                const batchItems = checkoutItems.map(item => ({
                    product_id: item.productId,
                    quantity: item.quantity,
                    enquiry_id: item.enquiryId || null,
                    variant: item.variant || null,
                    customization_details: item.customization || null,
                    delivery_address: deliveryAddress,
                    notes: notes.trim() || null
                }));

                const res = await api.post('/orders/checkout', {
                    items: batchItems,
                    delivery_address: deliveryAddress,
                    notes: notes.trim() || null
                });

                clearCart();
                setPlacedOrder({
                    id: res.data.order_ids?.[0],
                    display_id: res.data.display_ids?.join(', ') || 'BATCH-ORDER',
                    total_order_value: total,
                    orders_count: res.data.orders?.length || checkoutItems.length
                });
            }
        } catch (err: any) {
            console.error('Order placement failed', err);
            const msg = err.response?.data?.detail || t('checkout.order_failed');
            setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setSubmitting(false);
        }
    };

    if (placedOrder) {
        return (
            <div className="w-full min-h-screen bg-surface-container-lowest p-6 flex flex-col justify-center items-center text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 animate-in zoom-in-90">
                    <CheckCircle2 className="w-12 h-12" />
                </div>

                <h1 className="text-2xl font-black text-stone-800 mb-2">{t('checkout.order_success')}</h1>
                <p className="text-sm text-stone-500 max-w-xs mb-6">
                    {t('checkout.order_success_desc')}
                </p>

                <div className="w-full max-w-md bg-surface border border-outline-variant rounded-2xl p-5 mb-8 text-left space-y-3 shadow-sm">
                    <div className="flex justify-between items-center text-sm border-b border-stone-100 pb-2">
                        <span className="text-stone-500 font-medium">{t('orders.order_id')}</span>
                        <span className="font-bold text-primary font-mono">{placedOrder.display_id}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-stone-100 pb-2">
                        <span className="text-stone-500 font-medium">{t('cart.total')}</span>
                        <span className="font-extrabold text-stone-800">₹{total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-stone-100 pb-2">
                        <span className="text-stone-500 font-medium">{t('checkout.payment_method')}</span>
                        <span className="font-semibold text-stone-700 uppercase">{paymentMethod}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-stone-500 font-medium">{t('common.status')}</span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 uppercase">{t('order_status.confirmed')}</span>
                    </div>
                </div>

                <div className="w-full max-w-md flex flex-col gap-3">
                    <button 
                        onClick={() => navigate(placedOrder.id ? `/buyer/orders/${placedOrder.id}` : '/buyer/orders')}
                        className="w-full py-3.5 bg-primary text-on-primary font-bold rounded-full shadow-lg hover:bg-primary/90 flex items-center justify-center gap-2 transition-transform active:scale-95"
                    >
                        {t('orders.track_order')} <ArrowRight className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => navigate('/buyer/catalogue')}
                        className="w-full py-3 text-stone-600 font-bold hover:text-stone-900 transition-colors"
                    >
                        {t('cart.continue_shopping')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full relative pb-32 bg-surface-container-lowest min-h-screen">
            {/* Top Bar */}
            <div className="bg-surface px-6 pt-6 pb-4 sticky top-0 z-10 border-b border-outline-variant flex items-center gap-3 shadow-sm">
                <button 
                    onClick={() => navigate(-1)} 
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-stone-100 transition-colors"
                    aria-label="Back"
                >
                    <ArrowLeft className="w-5 h-5 text-stone-700" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-stone-800">{t('checkout.title')}</h1>
                    <span className="text-xs text-stone-500 font-medium">{t('checkout.delivery_info')}</span>
                </div>
            </div>

            <form onSubmit={handlePlaceOrder} className="p-4 sm:p-6 space-y-6 max-w-xl mx-auto">
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-medium">
                        {error}
                    </div>
                )}

                {/* Items in Checkout */}
                <div className="bg-surface rounded-2xl p-5 border border-outline-variant shadow-sm space-y-3">
                    <h2 className="font-bold text-stone-800 text-sm uppercase tracking-wide flex items-center gap-2">
                        <Package className="w-4 h-4 text-primary" /> {t('common.products')} ({checkoutItems.length})
                    </h2>
                    
                    <div className="divide-y divide-stone-100">
                        {checkoutItems.map(item => (
                            <div key={item.id} className="py-3 first:pt-1 last:pb-1 flex gap-3 items-center">
                                <div className="w-14 h-14 rounded-xl bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
                                    {item.image ? (
                                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">Craft</div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-stone-800 text-sm truncate">{item.title}</h4>
                                    <p className="text-xs text-stone-500">By {item.artisanName}</p>
                                    <div className="flex justify-between items-center mt-1 text-xs">
                                        <span className="text-stone-600">{t('cart.quantity')}: <b>{item.quantity}</b></span>
                                        <span className="font-bold text-primary">₹{(item.price * item.quantity).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Shipping / Delivery Form */}
                <div className="bg-surface rounded-2xl p-5 border border-outline-variant shadow-sm space-y-4">
                    <h2 className="font-bold text-stone-800 text-sm uppercase tracking-wide flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" /> {t('checkout.delivery_info')}
                    </h2>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-stone-600 mb-1">{t('checkout.full_name')} *</label>
                            <input 
                                type="text"
                                required
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                placeholder="Receiver name"
                                className="w-full p-3 border border-stone-200 rounded-xl bg-surface focus:ring-2 focus:ring-primary outline-none text-sm text-stone-800"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-stone-600 mb-1">{t('checkout.phone')} *</label>
                            <input 
                                type="tel"
                                required
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="10-digit mobile number"
                                className="w-full p-3 border border-stone-200 rounded-xl bg-surface focus:ring-2 focus:ring-primary outline-none text-sm text-stone-800"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-stone-600 mb-1">{t('checkout.address')} *</label>
                            <input 
                                type="text"
                                required
                                value={address}
                                onChange={e => setAddress(e.target.value)}
                                placeholder="Address line"
                                className="w-full p-3 border border-stone-200 rounded-xl bg-surface focus:ring-2 focus:ring-primary outline-none text-sm text-stone-800"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-600 mb-1">{t('checkout.city')} *</label>
                            <input 
                                type="text"
                                required
                                value={city}
                                onChange={e => setCity(e.target.value)}
                                placeholder="City"
                                className="w-full p-3 border border-stone-200 rounded-xl bg-surface focus:ring-2 focus:ring-primary outline-none text-sm text-stone-800"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-600 mb-1">{t('checkout.state')}</label>
                            <input 
                                type="text"
                                value={stateName}
                                onChange={e => setStateName(e.target.value)}
                                placeholder="State"
                                className="w-full p-3 border border-stone-200 rounded-xl bg-surface focus:ring-2 focus:ring-primary outline-none text-sm text-stone-800"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-stone-600 mb-1">{t('checkout.postal_code')} *</label>
                            <input 
                                type="text"
                                required
                                value={pincode}
                                onChange={e => setPincode(e.target.value)}
                                placeholder="6-digit PIN code"
                                className="w-full p-3 border border-stone-200 rounded-xl bg-surface focus:ring-2 focus:ring-primary outline-none text-sm text-stone-800"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-stone-600 mb-1">{t('checkout.notes')}</label>
                            <textarea 
                                rows={2}
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Special instructions for the artisan"
                                className="w-full p-3 border border-stone-200 rounded-xl bg-surface focus:ring-2 focus:ring-primary outline-none text-sm text-stone-800 resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Payment Option */}
                <div className="bg-surface rounded-2xl p-5 border border-outline-variant shadow-sm space-y-3">
                    <h2 className="font-bold text-stone-800 text-sm uppercase tracking-wide flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-primary" /> {t('checkout.payment_method')}
                    </h2>

                    <div className="space-y-2">
                        <label 
                            onClick={() => setPaymentMethod('cod')}
                            className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                                paymentMethod === 'cod' ? 'border-primary bg-primary-container/20' : 'border-stone-200 hover:bg-stone-50'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <Truck className="w-5 h-5 text-primary" />
                                <div>
                                    <div className="font-bold text-sm text-stone-800">{t('checkout.cod')}</div>
                                    <div className="text-xs text-stone-500">{t('checkout.cod_desc')}</div>
                                </div>
                            </div>
                            <input 
                                type="radio" 
                                name="payment" 
                                checked={paymentMethod === 'cod'} 
                                onChange={() => setPaymentMethod('cod')} 
                                className="accent-primary"
                            />
                        </label>

                        <label 
                            onClick={() => setPaymentMethod('upi')}
                            className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                                paymentMethod === 'upi' ? 'border-primary bg-primary-container/20' : 'border-stone-200 hover:bg-stone-50'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="w-5 h-5 text-tertiary" />
                                <div>
                                    <div className="font-bold text-sm text-stone-800">Direct Artisan UPI</div>
                                    <div className="text-xs text-stone-500">Fast UPI transfer directly to artisan on dispatch</div>
                                </div>
                            </div>
                            <input 
                                type="radio" 
                                name="payment" 
                                checked={paymentMethod === 'upi'} 
                                onChange={() => setPaymentMethod('upi')} 
                                className="accent-primary"
                            />
                        </label>
                    </div>
                </div>

                {/* Final Order Breakdown */}
                <div className="bg-surface rounded-2xl p-5 border border-outline-variant shadow-sm space-y-3">
                    <h2 className="font-bold text-stone-800 text-sm uppercase tracking-wide">{t('checkout.order_summary')}</h2>
                    <div className="flex justify-between text-sm text-stone-600">
                        <span>{t('cart.subtotal')}</span>
                        <span className="font-bold text-stone-800">₹{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-stone-600">
                        <span>{t('cart.shipping')}</span>
                        <span className="font-bold text-tertiary">{t('cart.free')}</span>
                    </div>
                    <div className="pt-3 border-t border-stone-100 flex justify-between items-center">
                        <span className="font-bold text-base text-stone-800">{t('cart.total_payable')}</span>
                        <span className="font-black text-xl text-primary">₹{total.toLocaleString()}</span>
                    </div>
                </div>

                {/* Submit button inside shell */}
                <div className="pt-2">
                    <button 
                        type="submit"
                        disabled={submitting}
                        className="w-full min-h-[52px] py-3.5 bg-primary text-on-primary rounded-full font-bold shadow-lg hover:bg-primary/90 flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 text-base"
                    >
                        {submitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                {t('checkout.placing_order')}
                            </>
                        ) : (
                            <>
                                {t('checkout.place_order')} (₹{total.toLocaleString()})
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
