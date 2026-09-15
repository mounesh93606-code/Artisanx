import { useNavigate, useLocation } from 'react-router-dom';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const navItems = [
    { name: 'Home', path: '/artisan', icon: 'home' },
    { name: 'Products', path: '/artisan/products', icon: 'inventory_2' },
    { name: 'Enquiries', path: '/artisan/enquiries', icon: 'chat' },
    { name: 'Orders', path: '/artisan/orders', icon: 'shopping_bag' },
    { name: 'Profile', path: '/artisan/profile', icon: 'person' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 mobile-shell-width mx-auto bg-surface border-t border-outline-variant/20 px-6 py-3 flex justify-between items-center z-50 rounded-t-3xl safe-area-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.04)]">
      {navItems.map((item) => {
        const isActive = path === item.path || (item.path !== '/artisan' && path.startsWith(item.path));
        return (
          <button
            key={item.name}
            onClick={() => navigate(item.path)}
            className="flex flex-col items-center justify-center space-y-1 min-w-[48px] min-h-[48px] group active:scale-95 transition-transform"
          >
            <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant group-hover:bg-surface-container-low group-hover:text-on-surface'}`}>
              <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                {item.icon}
              </span>
            </div>
            <span className={`text-[10px] font-bold transition-colors ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>
              {item.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
