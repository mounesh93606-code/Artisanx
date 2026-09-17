import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const getInitialApiUrl = (): string => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
    if (typeof window !== 'undefined') {
        const customUrl = localStorage.getItem('artisanx_api_url');
        if (customUrl) return customUrl;
    }
    return 'http://localhost:8000';
};

export const API_URL = getInitialApiUrl();

const api = axios.create({
    baseURL: API_URL
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
    (error) => {
        if (error.response && error.response.status === 401) {
            useAuthStore.getState().logout();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
