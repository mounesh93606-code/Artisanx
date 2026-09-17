import { create } from 'zustand';
import api from '../lib/api';

export interface DashboardMetrics {
  total_products: number;
  published_products: number;
  new_enquiries: number;
  pending_quotations: number;
  orders: {
    active: number;
    completed: number;
    cancelled: number;
    returned: number;
    total_value: number;
    completion_rate: number;
    cancellation_rate: number;
    on_time_rate: number;
  };
  recent_activity: any[];
}

interface DashboardState {
  metrics: DashboardMetrics;
  loading: boolean;
  error: string | null;
  fetchMetrics: () => Promise<void>;
}

export const DEFAULT_METRICS: DashboardMetrics = {
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
    completion_rate: 100,
    cancellation_rate: 0,
    on_time_rate: 100
  },
  recent_activity: []
};

export const useDashboardStore = create<DashboardState>((set) => ({
  metrics: DEFAULT_METRICS,
  loading: false,
  error: null,
  fetchMetrics: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/dashboard/artisan');
      set({ metrics: res.data, loading: false });
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      set({ error: err.message, loading: false });
    }
  }
}));
