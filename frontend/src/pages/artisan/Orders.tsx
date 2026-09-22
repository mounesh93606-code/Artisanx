import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { ArrowLeft, Package, Clock } from 'lucide-react';
import { useOrderStore } from '../../stores/orderStore';

export default function Orders() {
  const navigate = useNavigate();
  const { orders, loading, fetchArtisanOrders } = useOrderStore();

  useEffect(() => {
    fetchArtisanOrders();
  }, [fetchArtisanOrders]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_production': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ready_for_dispatch': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'dispatched': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'delivered': return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': 
      case 'cancellation_requested': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-stone-100 text-stone-600 border-stone-200';
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest pb-24 text-on-surface">
      <div className="bg-surface px-4 pt-12 pb-4 sticky top-0 z-10 border-b border-outline-variant/30">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/artisan')} className="text-stone-600 hover:text-stone-900">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-stone-800">Orders</h1>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto">
        {loading ? (
          <div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>
        ) : orders.length === 0 ? (
          <div className="text-center p-8 bg-surface rounded-2xl border border-outline-variant text-stone-500">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-bold">No orders yet</p>
            <p className="text-sm mt-1">When buyers accept your quotations, they will appear here as orders.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o: any) => (
              <div 
                key={o.id} 
                className="bg-surface rounded-2xl p-4 shadow-sm border border-outline-variant relative cursor-pointer hover:bg-stone-50 transition-colors"
                onClick={() => navigate(`/artisan/order/${o.id}`)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-stone-800 text-lg">{o.display_id}</h3>
                    <p className="text-xs font-bold text-stone-500 mt-0.5">{o.product_snapshot?.title || 'Product'}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-green-100 text-green-800 uppercase">
                      PAID
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getStatusColor(o.status)}`}>
                      {o.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-stone-200 overflow-hidden shrink-0 border border-stone-200">
                     {o.product_snapshot?.image_url ? (
                        <img src={o.product_snapshot.image_url} alt="Product" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-400 text-[10px]"><Package className="w-5 h-5"/></div>
                      )}
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wide">Quantity</p>
                      <p className="font-bold text-stone-800">{o.quantity}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wide">Total Value</p>
                      <p className="font-bold text-primary">₹{o.total_order_value.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-stone-500 font-medium pt-3 border-t border-outline-variant/50">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> {new Date(o.order_date).toLocaleDateString()}
                  </span>
                  <span>Buyer: <span className="font-bold text-stone-700">{o.buyer?.display_name || 'Buyer'}</span></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
