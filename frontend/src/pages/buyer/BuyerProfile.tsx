import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { useBuyerStore } from '../../stores/buyerStore';
import { LogOut, Heart, User, Bell, Settings, HelpCircle, ChevronRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function BuyerProfile() {
    const { t } = useTranslation();
    const { user, logout } = useAuthStore();
    const { savedProducts } = useBuyerStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="w-full relative pb-24 bg-surface-container-lowest min-h-screen">
            <div className="bg-primary px-6 py-10 rounded-b-[2rem] text-on-primary shadow-md">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                        <User className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{user?.display_name || 'Buyer'}</h1>
                        <p className="text-primary-container">{user?.email || user?.phone || 'Premium Member'}</p>
                    </div>
                </div>
            </div>

            <div className="p-6 -mt-6">
                <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant mb-6 overflow-hidden">
                    <div className="p-4 border-b border-stone-100">
                        <h2 className="font-bold text-stone-800 mb-4">My Account</h2>
                        
                        <Link to="/buyer/orders" className="flex items-center justify-between p-3 bg-stone-50 rounded-xl mb-3 hover:bg-stone-100 transition-colors">
                            <div className="flex items-center gap-3 font-medium text-stone-700">
                                <Package className="w-5 h-5 text-stone-500" /> My Orders
                            </div>
                            <ChevronRight className="w-4 h-4 text-stone-400" />
                        </Link>
                        
                        <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl mb-3 hover:bg-stone-100 transition-colors">
                            <div className="flex items-center gap-3 font-medium text-stone-700">
                                <Heart className="w-5 h-5 text-stone-500" /> Saved Products
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">{savedProducts.length}</span>
                                <ChevronRight className="w-4 h-4 text-stone-400" />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors">
                            <div className="flex items-center gap-3 font-medium text-stone-700">
                                <Bell className="w-5 h-5 text-stone-500" /> Notifications
                            </div>
                            <ChevronRight className="w-4 h-4 text-stone-400" />
                        </div>
                    </div>
                    
                    <div className="p-4">
                        <h2 className="font-bold text-stone-800 mb-4">Settings</h2>
                        
                        <Link to="/language" state={{ from: '/buyer/profile' }} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl mb-3 hover:bg-stone-100 transition-colors">
                            <div className="flex items-center gap-3 font-medium text-stone-700">
                                <Settings className="w-5 h-5 text-stone-500" /> {t('app.choose_language', { defaultValue: 'Language Preferences' })}
                            </div>
                            <ChevronRight className="w-4 h-4 text-stone-400" />
                        </Link>
                        
                        <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors">
                            <div className="flex items-center gap-3 font-medium text-stone-700">
                                <HelpCircle className="w-5 h-5 text-stone-500" /> Support & FAQ
                            </div>
                            <ChevronRight className="w-4 h-4 text-stone-400" />
                        </div>
                    </div>
                </div>

                <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 p-4 font-bold text-red-600 bg-red-50 rounded-2xl hover:bg-red-100 transition-colors"
                >
                    <LogOut className="w-5 h-5" /> {t('common.logout')}
                </button>
            </div>
        </div>
    );
}

// Ensure Package is imported or use a local component if not
import { Package } from 'lucide-react';
