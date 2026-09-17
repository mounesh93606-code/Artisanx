import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useDashboardStore } from '../../stores/dashboardStore';

export default function BusinessAnalytics() {
  const navigate = useNavigate();
  const [performance, setPerformance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { metrics, fetchMetrics } = useDashboardStore();

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.get('/analytics/artisan/performance'),
        fetchMetrics()
      ]);
      if (results[0].status === 'fulfilled' && results[0].value?.data) {
        setPerformance(results[0].value.data);
      }
    } catch (e) {
      console.error("Failed to fetch analytics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [fetchMetrics]);

  const safeMetrics = useMemo(() => {
    return metrics || {
      total_products: 0,
      published_products: 0,
      new_enquiries: 0,
      pending_quotations: 0,
      orders: {
        active: 0,
        completed: 0,
        cancelled: 0,
        returned: 0,
        total_value: 0,
        completion_rate: 0,
        cancellation_rate: 0,
        on_time_rate: 0
      },
      recent_activity: []
    };
  }, [metrics]);

  const safePerf = useMemo(() => {
    return performance || {
      total_views: 0,
      total_passport_views: 0,
      total_saves: 0,
      total_enquiries: 0,
      total_orders: 0,
      conversion_rate: 0,
      top_products: []
    };
  }, [performance]);

  return (
    <div className="w-full min-h-screen bg-surface flex flex-col pb-safe">
      <header className="fixed top-0 inset-x-0 mobile-shell-width mx-auto z-40 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-safe">
        <div className="h-16 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/artisan')}
              className="min-w-[44px] min-h-[44px] -ml-2 flex items-center justify-center text-on-surface rounded-full hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <h1 className="font-bold text-lg text-on-surface tracking-tight truncate ml-1">Business Analytics</h1>
          </div>
          <button
            onClick={fetchAnalytics}
            className="p-2 text-stone-500 hover:text-primary transition-colors rounded-full hover:bg-surface-container"
            title="Refresh Analytics"
          >
            <span className={`material-symbols-outlined text-[20px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 pt-24 pb-8 w-full max-w-lg mx-auto space-y-6">
        {loading && !performance && !metrics ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-on-surface-variant font-medium">Loading business insights...</span>
          </div>
        ) : (
          <>
            <section className="bg-primary-fixed/20 border border-primary/20 rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-4">Total Revenue</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center text-2xl font-bold shrink-0">
                  <span className="material-symbols-outlined text-[28px]">account_balance_wallet</span>
                </div>
                <div>
                  <span className="text-3xl font-black text-primary">₹{(safeMetrics.orders?.total_value || 0).toLocaleString()}</span>
                  <p className="text-xs font-semibold text-on-surface-variant mt-0.5">Across {safePerf.total_orders || 0} orders</p>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm text-center">
                <span className="text-2xl font-black text-secondary">{safePerf.total_views || 0}</span>
                <span className="block text-[11px] font-bold text-on-surface-variant uppercase mt-1">Total Views</span>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm text-center">
                <span className="text-2xl font-black text-tertiary">{safePerf.total_passport_views || 0}</span>
                <span className="block text-[11px] font-bold text-on-surface-variant uppercase mt-1">Passport Views</span>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm text-center">
                <span className="text-2xl font-black text-primary">{safePerf.conversion_rate || 0}%</span>
                <span className="block text-[11px] font-bold text-on-surface-variant uppercase mt-1">Conversion Rate</span>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm text-center">
                <span className="text-2xl font-black text-error">{safeMetrics.orders?.cancellation_rate || 0}%</span>
                <span className="block text-[11px] font-bold text-on-surface-variant uppercase mt-1">Cancel Rate</span>
              </div>
            </section>

            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-on-surface mb-4">Top Products</h3>
              {!safePerf.top_products || safePerf.top_products.length === 0 ? (
                <div className="text-center py-6 text-stone-400 text-xs">
                  No product activity data recorded yet.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {safePerf.top_products.map((p: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center font-bold text-sm shrink-0">
                        #{idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-sm text-on-surface truncate block">{p.title}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-medium text-on-surface-variant flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">visibility</span> {p.views || 0}</span>
                          <span className="text-[10px] font-medium text-on-surface-variant flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">chat</span> {p.enquiries || 0}</span>
                          <span className="text-[10px] font-medium text-primary flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">shopping_bag</span> {p.orders || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
