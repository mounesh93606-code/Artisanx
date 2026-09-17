import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const getInitialApiUrl = (): string => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
    if (typeof window !== 'undefined') {
        const customUrl = localStorage.getItem('artisanx_api_url');
        if (customUrl) return customUrl;
    }
    // Default fallback to live cloud Render backend
    return 'https://artisanx.onrender.com';
};

export const API_URL = getInitialApiUrl();

const api = axios.create({
    baseURL: API_URL,
    timeout: 35000 // 35-second network timeout to prevent infinite hanging
});

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
