
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useNotifications, type Notification } from '../../hooks/useNotifications';
import { ArrowLeft, Bell, Package, MessageSquare, CheckCircle, Info } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface NotificationPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();

    if (!isOpen) return null;

    const getIcon = (type: string) => {
        switch (type) {
            case 'enquiry_new':
            case 'enquiry_response':
                return <MessageSquare className="w-5 h-5 text-blue-500" />;
            case 'order_confirmed':
            case 'cancellation':
            case 'cancellation_request':
            case 'cancellation_rejected':
            case 'order_status_update':
                return <Package className="w-5 h-5 text-purple-500" />;
            case 'quote_sent':
            case 'quote_rejected':
            case 'quote_change_requested':
                return <MessageSquare className="w-5 h-5 text-orange-500" />;
            case 'product_published':
                return <Package className="w-5 h-5 text-green-500" />;
            case 'profile_verified':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            default:
                return <Info className="w-5 h-5 text-gray-500" />;
        }
    };

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }

        const { type, metadata } = notification;
        if (type === 'enquiry_new' || type === 'enquiry_response') {
            if (user?.role === 'artisan') {
                navigate(`/artisan/enquiry/${metadata?.enquiry_id}`);
            } else if (user?.role === 'buyer') {
                navigate(`/buyer/enquiry/${metadata?.enquiry_id}`); 
            }
        } else if (type === 'product_published') {
            navigate(`/artisan/products/${metadata?.product_id}`);
        } else if (type === 'profile_verified') {
            navigate(`/artisan/profile`);
        } else if (['order_confirmed', 'cancellation', 'cancellation_request', 'cancellation_rejected', 'order_status_update'].includes(type)) {
            if (user?.role === 'buyer') {
                navigate(`/buyer/orders/${metadata?.order_id}`);
            } else if (user?.role === 'artisan') {
                navigate(`/artisan/order/${metadata?.order_id}`);
            }
        } else if (['quote_sent', 'quote_rejected', 'quote_change_requested'].includes(type)) {
            if (user?.role === 'buyer') {
                navigate(`/buyer/quotations/${metadata?.quotation_id}`);
            } else if (user?.role === 'artisan') {
                navigate(`/artisan/quotations/${metadata?.quotation_id}`);
            }
        }
        
        onClose();
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        
        if (diffInSeconds < 60) return t('notifications.just_now', 'Just now');
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    };

    return createPortal(
        <div className="fixed inset-y-0 inset-x-0 mx-auto mobile-shell-width z-[100] bg-surface-container-lowest shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-300">
            <div className="flex items-center p-4 border-b border-outline-variant bg-surface shadow-sm gap-3">
                <button onClick={onClose} className="p-2 -ml-2 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h2 className="text-xl font-bold text-on-surface">{t('notifications.title', 'Notifications')}</h2>
                {unreadCount > 0 && (
                    <span className="bg-primary text-on-primary px-2 py-0.5 rounded-full text-xs font-bold">
                        {unreadCount}
                    </span>
                )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {notifications.length > 0 && unreadCount > 0 && (
                    <button 
                        onClick={markAllAsRead}
                        className="text-sm font-semibold text-primary hover:underline w-full text-right"
                    >
                        {t('notifications.mark_all_read', 'Mark all as read')}
                    </button>
                )}

                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-on-surface-variant">
                        <Bell className="w-12 h-12 mb-4 opacity-50" />
                        <p>{t('notifications.empty', 'No notifications yet')}</p>
                    </div>
                ) : (
                    notifications.map(notification => (
                        <div 
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`p-4 rounded-xl border flex gap-3 cursor-pointer transition-colors ${
                                notification.is_read 
                                    ? 'bg-surface border-outline-variant/30' 
                                    : 'bg-surface-container-lowest border-primary shadow-sm'
                            }`}
                        >
                            <div className="mt-1">
                                {getIcon(notification.type)}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className={`text-sm ${notification.is_read ? 'font-medium text-on-surface-variant' : 'font-bold text-on-surface'}`}>
                                        {notification.type === 'enquiry_response' ? t('notifications.artisan_replied', 'Artisan replied to your enquiry') : notification.title}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {!notification.is_read ? (
                                            <span className="bg-primary text-on-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">New</span>
                                        ) : (
                                            <span className="bg-surface-container text-on-surface-variant text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Viewed</span>
                                        )}
                                        <span className="text-xs text-on-surface-variant whitespace-nowrap">
                                            {formatDate(notification.created_at)}
                                        </span>
                                    </div>
                                </div>
                                {notification.type === 'enquiry_response' ? (
                                    <div className="mt-1">
                                        <p className="text-xs text-on-surface-variant font-medium mb-0.5">
                                            {notification.metadata?.product_title}
                                        </p>
                                        <p className={`text-sm ${notification.is_read ? 'text-on-surface-variant' : 'text-on-surface font-medium'}`}>
                                            "{notification.metadata?.response_preview}"
                                        </p>
                                    </div>
                                ) : (
                                    <p className={`text-sm mt-1 ${notification.is_read ? 'text-on-surface-variant' : 'text-on-surface font-medium'}`}>
                                        {notification.message}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>,
        document.body
    );
}
