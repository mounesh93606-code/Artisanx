import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Clock, Package } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

export default function FacilitatorOrders() {
  const { t } = useTranslation();
  const { token } = useAuthStore();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState<any>({ active_orders: [], delayed_orders: [], cancellation_requests: [], disputed_orders: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data } = await api.get(`/facilitator/orders`);
        setOrders(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (token) fetchData();
  }, [token]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest"><div className="animate-pulse w-8 h-8 rounded-full bg-stone-300"></div></div>;
  }

  return (
    <div className="w-full relative pb-24 bg-surface-container-lowest text-on-surface min-h-screen">
      <div className="bg-surface px-6 pt-12 pb-6 sticky top-0 z-10 border-b border-outline-variant/30 flex items-center gap-4">
        <button onClick={() => navigate('/facilitator')} className="p-2 -ml-2 rounded-full hover:bg-stone-100">
          <ArrowLeft className="w-6 h-6 text-on-surface" />
        </button>
        <h1 className="text-xl font-bold text-on-surface">{t('facilitator.order_monitoring') || 'Order Monitoring'}</h1>
      </div>

      <div className="p-6 space-y-8">
        {/* Delayed Orders */}
        <section>
          <h2 className="text-xl font-bold text-stone-800 mb-4 flex items-center gap-2 text-red-600">
            <Clock className="w-5 h-5" /> {t('facilitator.delayed_orders') || 'Delayed Orders'} ({orders.delayed_orders?.length || 0})
          </h2>
          <div className="space-y-4">
            {(!orders.delayed_orders || orders.delayed_orders.length === 0) ? (
              <div className="bg-surface p-6 rounded-3xl border border-outline-variant text-center text-stone-500">
                No delayed orders.
              </div>
            ) : (
              orders.delayed_orders.map((order: any) => (
                <div key={order.id} className="bg-surface p-4 rounded-3xl shadow-sm border border-red-200">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-stone-800">Order #{order.id.slice(0, 8)}</div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 uppercase">
                      Delayed
                    </span>
                  </div>
                  <div className="text-sm text-stone-600 mb-1">
                    <span className="font-semibold">Artisan:</span> {order.artisan?.display_name || 'Unknown'}
                  </div>
                  <div className="text-sm text-stone-600 mb-1">
                    <span className="font-semibold">Buyer:</span> {order.buyer?.display_name || 'Unknown'}
                  </div>
                  <div className="text-sm text-red-500 font-semibold">
                    Expected Dispatch: {new Date(order.expected_dispatch_date).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Active Orders */}
        <section>
          <h2 className="text-xl font-bold text-stone-800 mb-4 flex items-center gap-2 text-green-600">
            <Package className="w-5 h-5" /> {t('facilitator.active_orders') || 'Active Orders'} ({orders.active_orders?.length || 0})
          </h2>
          <div className="space-y-4">
            {(!orders.active_orders || orders.active_orders.length === 0) ? (
              <div className="bg-surface p-6 rounded-3xl border border-outline-variant text-center text-stone-500">
                No active orders.
              </div>
            ) : (
              orders.active_orders.map((order: any) => (
                <div key={order.id} className="bg-surface p-4 rounded-3xl shadow-sm border border-outline-variant">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-stone-800">Order #{order.id.slice(0, 8)}</div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 uppercase">
                      {order.status}
                    </span>
                  </div>
                  <div className="text-sm text-stone-600 mb-1">
                    <span className="font-semibold">Artisan:</span> {order.artisan?.display_name || 'Unknown'}
                  </div>
                  <div className="text-sm text-stone-600">
                    Expected Dispatch: {order.expected_dispatch_date ? new Date(order.expected_dispatch_date).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Cancellation Requests */}
        {orders.cancellation_requests && orders.cancellation_requests.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-4 flex items-center gap-2 text-orange-600">
              <Package className="w-5 h-5" /> Cancellation Requests ({orders.cancellation_requests.length})
            </h2>
            <div className="space-y-4">
              {orders.cancellation_requests.map((order: any) => (
                <div key={order.id} className="bg-surface p-4 rounded-3xl shadow-sm border border-orange-200">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-stone-800">Order #{order.id.slice(0, 8)}</div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 uppercase">
                      Cancellation Requested
                    </span>
                  </div>
                  <div className="text-sm text-stone-600 mb-1">
                    <span className="font-semibold">Artisan:</span> {order.artisan?.display_name || 'Unknown'}
                  </div>
                  <div className="text-sm text-stone-600">
                    <span className="font-semibold">Buyer:</span> {order.buyer?.display_name || 'Unknown'}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Disputed Orders */}
        {orders.disputed_orders && orders.disputed_orders.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-4 flex items-center gap-2 text-red-600">
              <Package className="w-5 h-5" /> Disputed Orders ({orders.disputed_orders.length})
            </h2>
            <div className="space-y-4">
              {orders.disputed_orders.map((order: any) => (
                <div key={order.id} className="bg-surface p-4 rounded-3xl shadow-sm border border-red-200">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-stone-800">Order #{order.id.slice(0, 8)}</div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 uppercase">
                      In Dispute
                    </span>
                  </div>
                  <div className="text-sm text-stone-600 mb-1">
                    <span className="font-semibold">Artisan:</span> {order.artisan?.display_name || 'Unknown'}
                  </div>
                  <div className="text-sm text-stone-600">
                    <span className="font-semibold">Buyer:</span> {order.buyer?.display_name || 'Unknown'}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
