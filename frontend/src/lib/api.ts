import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

export const CLOUD_API_URL = 'https://artisanx.onrender.com';

const isPrivateIp = (host: string): boolean => {
    return (
        /^192\.168\./.test(host) ||
        /^10\./.test(host) ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
    );
};

export const getApiUrl = (): string => {
    if (typeof window !== 'undefined') {
        const isNative = (window as any)?.Capacitor?.isNativePlatform?.();
        const customUrl = localStorage.getItem('artisanx_api_url');
        const isHttps = window.location.protocol === 'https:';

        // For native mobile app, default to local backend (via adb reverse or LAN)
        if (isNative) {
            if (customUrl && !customUrl.includes('onrender.com')) {
                return customUrl;
            }
            return 'http://localhost:8000';
        }

        // Check stored custom URL: prevent mixed-content blocking on HTTPS web browsers
        if (customUrl) {
            if (isHttps && customUrl.startsWith('http://')) {
                localStorage.removeItem('artisanx_api_url');
            } else {
                return customUrl;
            }
        }

        const hostname = window.location.hostname || '';

        // If hosted on Vercel, Render, or any public domain -> connect to live Render backend
        if (
            hostname.includes('vercel.app') ||
            hostname.includes('onrender.com') ||
            (hostname && !['localhost', '127.0.0.1'].includes(hostname) && !isPrivateIp(hostname))
        ) {
            return CLOUD_API_URL;
        }

        // If loaded from a LAN/Wi-Fi IP in mobile browser (e.g. 192.168.x.x)
        if (isPrivateIp(hostname)) {
            return `${window.location.protocol}//${hostname}:8000`;
        }
    }
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
    return 'http://localhost:8000';
};

export let API_URL = getApiUrl();

const api = axios.create({
    baseURL: API_URL,
    timeout: 90000 // 90-second network timeout for AI pipelines & cloud cold-starts
});

export const setApiUrl = (newUrl: string): string => {
    const clean = newUrl.trim().replace(/\/+$/, '');
    localStorage.setItem('artisanx_api_url', clean);
    API_URL = clean;
    api.defaults.baseURL = clean;
    return clean;
};

export const testApiConnection = async (testUrl?: string): Promise<{ ok: boolean; status?: number; error?: string }> => {
    const target = (testUrl || getApiUrl()).replace(/\/+$/, '');
    try {
        const res = await axios.get(`${target}/health`, { timeout: 4000 });
        return { ok: res.status === 200, status: res.status };
    } catch (err: any) {
        return { ok: false, error: err.message || 'Connection failed' };
    }
};


api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response && error.response.status === 401 && !originalRequest?._retry) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken && !originalRequest.url?.includes('/auth/refresh') && !originalRequest.url?.includes('/auth/login')) {
                try {
                    const res = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: refreshToken });
                    if (res.data?.access_token) {
                        localStorage.setItem('auth_token', res.data.access_token);
                        if (res.data.refresh_token) localStorage.setItem('refresh_token', res.data.refresh_token);
                        useAuthStore.setState({ token: res.data.access_token, user: res.data.user || useAuthStore.getState().user });
                        originalRequest.headers.Authorization = `Bearer ${res.data.access_token}`;
                        return api(originalRequest);
                    }
                } catch (refreshErr) {
                    console.error('Session refresh failed:', refreshErr);
                }
            }
            useAuthStore.getState().logout();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
