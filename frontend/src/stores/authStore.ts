import { create } from 'zustand';
import api from '../lib/api';

interface User {
    id: string;
    email?: string;
    phone?: string;
    role?: 'artisan' | 'buyer' | 'facilitator';
    [key: string]: any;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    error: string | null;
    clearError: () => void;
    sendOtp: (phone: string) => Promise<void>;
    verifyOtp: (phone: string, token: string) => Promise<void>;
    loginWithEmail: (email: string, password: string) => Promise<void>;
    registerWithEmail: (email: string, password: string, role?: 'artisan' | 'buyer' | 'facilitator', phone?: string) => Promise<void>;
    setRole: (role: 'artisan' | 'buyer' | 'facilitator') => Promise<void>;
    updateProfile: (data: Record<string, any>) => Promise<void>;
    logout: () => void;
    checkAuth: (isRetry?: boolean) => Promise<void>;
    language: string;
    setLanguage: (lang: string) => void;
}

const getStoredUser = (): User | null => {
    try {
        const u = localStorage.getItem('auth_user');
        return u ? JSON.parse(u) : null;
    } catch {
        return null;
    }
};

const setStoredUser = (user: User | null) => {
    if (user) {
        localStorage.setItem('auth_user', JSON.stringify(user));
    } else {
        localStorage.removeItem('auth_user');
    }
};

export const useAuthStore = create<AuthState>((set, get) => ({
    user: getStoredUser(),
    token: localStorage.getItem('auth_token'),
    isLoading: false,
    isAuthenticated: !!localStorage.getItem('auth_token'),
    error: null,
    language: localStorage.getItem('language') || 'en',

    setLanguage: (lang) => {
        localStorage.setItem('language', lang);
        set({ language: lang });
    },

    clearError: () => set({ error: null }),

    sendOtp: async (phone) => {
        set({ isLoading: true, error: null });
        try {
            await api.post('/auth/send-otp', { phone });
        } catch (error: any) {
            set({ error: error.response?.data?.detail || error.message || 'Failed to send OTP' });
        } finally {
            set({ isLoading: false });
        }
    },

    verifyOtp: async (phone, token) => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await api.post('/auth/verify-otp', { phone, otp: token });
            localStorage.setItem('auth_token', data.access_token);
            if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
            setStoredUser(data.user);
            set({ user: data.user, token: data.access_token, isAuthenticated: true });
        } catch (error: any) {
            set({ error: error.response?.data?.detail || error.message || 'Failed to verify OTP' });
        } finally {
            set({ isLoading: false });
        }
    },

    loginWithEmail: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await api.post('/auth/login', { email, password });
            localStorage.setItem('auth_token', data.access_token);
            if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
            setStoredUser(data.user);
            set({ user: data.user, token: data.access_token, isAuthenticated: true });
        } catch (error: any) {
            set({ error: error.response?.data?.detail || error.message || 'Login failed' });
        } finally {
            set({ isLoading: false });
        }
    },

    registerWithEmail: async (email, password, role, phone) => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await api.post('/auth/register', { email, password, phone });
            
            if (data.access_token) {
                localStorage.setItem('auth_token', data.access_token);
                if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
                setStoredUser(data.user);
                set({ user: data.user, token: data.access_token, isAuthenticated: true });
            } else {
                setStoredUser(data.user);
                set({ user: data.user });
            }
            
            if (role) {
                const roleData = await api.post('/auth/set-role', { role });
                setStoredUser(roleData.data);
                set({ user: roleData.data });
            }
        } catch (error: any) {
            set({ error: error.response?.data?.detail || error.message || 'Registration failed' });
        } finally {
            set({ isLoading: false });
        }
    },

    setRole: async (role) => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await api.post('/auth/set-role', { role });
            setStoredUser(data);
            set({ user: data });
        } catch (error: any) {
            set({ error: error.response?.data?.detail || error.message || 'Failed to set role' });
        } finally {
            set({ isLoading: false });
        }
    },

    updateProfile: async (profileData) => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await api.post('/auth/update-profile', profileData);
            const updated = { ...get().user, ...data };
            setStoredUser(updated);
            set({ user: updated });
        } catch (error: any) {
            set({ error: error.response?.data?.detail || error.message || 'Failed to update profile' });
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    logout: () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        setStoredUser(null);
        set({ user: null, token: null, isAuthenticated: false });
    },

    checkAuth: async (isRetry = false) => {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            setStoredUser(null);
            set({ isAuthenticated: false, user: null });
            return;
        }
        
        set({ isLoading: true });
        try {
            const { data } = await api.get('/auth/me');
            setStoredUser(data);
            set({ user: data, isAuthenticated: true });
        } catch (error: any) {
            if (error.response?.status === 401 && !isRetry) {
                const refreshToken = localStorage.getItem('refresh_token');
                if (refreshToken) {
                    try {
                        const { data } = await api.post('/auth/refresh', { refresh_token: refreshToken });
                        localStorage.setItem('auth_token', data.access_token);
                        if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
                        set({ token: data.access_token });
                        
                        // Retry checkAuth once
                        const store = get();
                        return store.checkAuth(true);
                    } catch (refreshError) {
                        // Refresh failed, proceed to logout
                    }
                }
            }
            
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
            setStoredUser(null);
            set({ user: null, token: null, isAuthenticated: false });
        } finally {
            set({ isLoading: false });
        }
    }
}));
