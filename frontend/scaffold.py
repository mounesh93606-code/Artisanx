import os
import json
from pathlib import Path

base = Path(r"c:\Users\moune\art\frontend\src")

folders = [
    "lib", "stores", "types", "hooks",
    "components/layout", "components/ui", "components/auth",
    "components/product", "components/buyer", "components/facilitator", "components/guide-hand",
    "pages/artisan", "pages/buyer", "pages/facilitator", "i18n"
]

for f in folders:
    (base / f).mkdir(parents=True, exist_ok=True)

def write_file(path, content):
    with open(base / path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")

# Types
write_file("types/user.ts", """
export type Role = 'artisan' | 'buyer' | 'facilitator';
export type Language = 'en' | 'ta' | 'hi' | 'te' | 'kn' | 'ml' | 'bn' | 'mr' | 'ur';
export type GuidanceLevel = 'beginner' | 'intermediate' | 'experienced';

export interface User {
    id: string;
    phone: string;
    email: string;
    role: Role;
    display_name: string;
    preferred_language: Language;
    guidance_level: GuidanceLevel;
    created_at: string;
}
""")

write_file("types/product.ts", """
export type ProductStatus = 'draft' | 'published' | 'archived';

export interface Product {
    id: string;
    artisan_id: string;
    title: string;
    description: string;
    category: string;
    tags: string[];
    price: number;
    status: ProductStatus;
    readiness_score: number;
}
""")

write_file("types/enquiry.ts", """
export type EnquiryStatus = 'new' | 'viewed' | 'responded' | 'closed';

export interface Enquiry {
    id: string;
    product_id: string;
    buyer_id: string;
    quantity: number;
    status: EnquiryStatus;
}
""")

write_file("types/guidance.ts", """
export interface GuidanceStep {
    id: string;
    workflow_id: string;
    step_order: number;
    target_id: string;
    gesture_type: string;
    instruction_en: string;
    instruction_ur: string;
}
""")

# Stores
write_file("stores/authStore.ts", """
import { create } from 'zustand';
import { User } from '../types/user';

interface AuthState {
    user: User | null;
    token: string | null;
    setAuth: (user: User, token: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: null,
    setAuth: (user, token) => set({ user, token }),
    logout: () => set({ user: null, token: null }),
}));
""")

write_file("stores/productStore.ts", """
import { create } from 'zustand';
import { Product } from '../types/product';

interface ProductState {
    currentProduct: Partial<Product> | null;
    setCurrentProduct: (p: Partial<Product>) => void;
}

export const useProductStore = create<ProductState>((set) => ({
    currentProduct: null,
    setCurrentProduct: (p) => set({ currentProduct: p }),
}));
""")

write_file("stores/guidanceStore.ts", """
import { create } from 'zustand';
import { GuidanceStep } from '../types/guidance';

interface GuidanceState {
    activeWorkflowId: string | null;
    currentStep: GuidanceStep | null;
    startGuide: (workflowId: string) => void;
    stopGuide: () => void;
}

export const useGuidanceStore = create<GuidanceState>((set) => ({
    activeWorkflowId: null,
    currentStep: null,
    startGuide: (workflowId) => set({ activeWorkflowId: workflowId }),
    stopGuide: () => set({ activeWorkflowId: null, currentStep: null }),
}));
""")

# Lib
write_file("lib/supabase.ts", """
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
""")

write_file("lib/api.ts", """
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000'
});

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
""")

write_file("lib/utils.ts", """
export function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ');
}
""")

# Hooks
write_file("hooks/useAuth.ts", """
import { useAuthStore } from '../stores/authStore';
export function useAuth() { return useAuthStore(); }
""")
write_file("hooks/useProducts.ts", """
export function useProducts() { return {}; }
""")
write_file("hooks/useGuidance.ts", """
import { useGuidanceStore } from '../stores/guidanceStore';
export function useGuidance() { return useGuidanceStore(); }
""")

# Components UI
write_file("components/ui/Button.tsx", """
import React from 'react';
export function Button({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return <button className="px-4 py-2 bg-blue-600 text-white rounded" {...props}>{children}</button>;
}
""")
write_file("components/ui/Input.tsx", """
import React from 'react';
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input className="border rounded px-3 py-2" {...props} />;
}
""")
write_file("components/ui/Card.tsx", """
import React from 'react';
export function Card({ children }: { children: React.ReactNode }) {
    return <div className="border rounded shadow-sm p-4">{children}</div>;
}
""")
write_file("components/ui/Modal.tsx", """
import React from 'react';
export function Modal({ children }: { children: React.ReactNode }) {
    return <div className="fixed inset-0 bg-black/50 p-4">{children}</div>;
}
""")
write_file("components/ui/Badge.tsx", """
import React from 'react';
export function Badge({ children }: { children: React.ReactNode }) {
    return <span className="px-2 py-1 bg-gray-200 text-xs rounded">{children}</span>;
}
""")
write_file("components/ui/Spinner.tsx", """
import React from 'react';
export function Spinner() { return <div className="animate-spin w-4 h-4 border-2"></div>; }
""")
write_file("components/ui/Toast.tsx", """
import React from 'react';
export function Toast() { return <div>Toast</div>; }
""")

# Auth Components
write_file("components/auth/LoginForm.tsx", "export function LoginForm() { return <div>Login Form</div>; }")
write_file("components/auth/OtpVerify.tsx", "export function OtpVerify() { return <div>OTP Verify</div>; }")
write_file("components/auth/RoleSelect.tsx", "export function RoleSelect() { return <div>Role Select</div>; }")

# Product Components
write_file("components/product/ProductCard.tsx", "export function ProductCard() { return <div>Product Card</div>; }")
write_file("components/product/PhotoUpload.tsx", "export function PhotoUpload() { return <div>Photo Upload</div>; }")
write_file("components/product/VoiceRecorder.tsx", "export function VoiceRecorder() { return <div>Voice Recorder</div>; }")
write_file("components/product/MaterialChecklist.tsx", "export function MaterialChecklist() { return <div>Material Checklist</div>; }")
write_file("components/product/FairPriceCalculator.tsx", "export function FairPriceCalculator() { return <div>Fair Price Calculator</div>; }")
write_file("components/product/ReadinessScore.tsx", "export function ReadinessScore() { return <div>Readiness Score</div>; }")
write_file("components/product/ProductPassport.tsx", "export function ProductPassport() { return <div>Product Passport</div>; }")

# Buyer Components
write_file("components/buyer/CatalogueGrid.tsx", "export function CatalogueGrid() { return <div>Catalogue Grid</div>; }")
write_file("components/buyer/ProductDetail.tsx", "export function ProductDetail() { return <div>Product Detail</div>; }")
write_file("components/buyer/EnquiryForm.tsx", "export function EnquiryForm() { return <div>Enquiry Form</div>; }")

# Facilitator
write_file("components/facilitator/Dashboard.tsx", "export function Dashboard() { return <div>Dashboard</div>; }")

# Guide Hand
write_file("components/guide-hand/GuideHandOverlay.tsx", "export function GuideHandOverlay() { return <div>Guide Hand Overlay</div>; }")
write_file("components/guide-hand/AnimatedHand.tsx", "export function AnimatedHand() { return <div>Animated Hand</div>; }")
write_file("components/guide-hand/SpotlightHighlight.tsx", "export function SpotlightHighlight() { return <div>Spotlight Highlight</div>; }")
write_file("components/guide-hand/InstructionCard.tsx", "export function InstructionCard() { return <div>Instruction Card</div>; }")
write_file("components/guide-hand/GuideControls.tsx", "export function GuideControls() { return <div>Guide Controls</div>; }")
write_file("components/guide-hand/GuideProgress.tsx", "export function GuideProgress() { return <div>Guide Progress</div>; }")

# i18n JSONs
langs = ['en', 'ta', 'hi', 'te', 'kn', 'ml', 'bn', 'mr', 'ur']
for lang in langs:
    write_file(f"i18n/{lang}.json", json.dumps({"welcome": "Welcome", "login": "Login"}))

write_file("i18n/index.ts", """
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import ta from './ta.json';
import hi from './hi.json';
import te from './te.json';
import kn from './kn.json';
import ml from './ml.json';
import bn from './bn.json';
import mr from './mr.json';
import ur from './ur.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ta: { translation: ta },
    hi: { translation: hi },
    te: { translation: te },
    kn: { translation: kn },
    ml: { translation: ml },
    bn: { translation: bn },
    mr: { translation: mr },
    ur: { translation: ur }
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
});

export default i18n;
""")

# Layout
write_file("components/layout/LanguageSwitcher.tsx", """
import React from 'react';
import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
    const { i18n } = useTranslation();
    
    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        document.documentElement.dir = lng === 'ur' ? 'rtl' : 'ltr';
        document.documentElement.lang = lng;
    };

    const languages = [
        { code: 'en', label: 'English' },
        { code: 'ta', label: 'தமிழ்' },
        { code: 'hi', label: 'हिन्दी' },
        { code: 'te', label: 'తెలుగు' },
        { code: 'kn', label: 'ಕನ್ನಡ' },
        { code: 'ml', label: 'മലയാളം' },
        { code: 'bn', label: 'বাংলা' },
        { code: 'mr', label: 'मराठी' },
        { code: 'ur', label: 'اردو' }
    ];

    return (
        <select onChange={(e) => changeLanguage(e.target.value)} value={i18n.language} className="border rounded p-1 text-sm">
            {languages.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
    );
}
""")
write_file("components/layout/MobileNav.tsx", "export function MobileNav() { return <nav>Mobile Nav</nav>; }")
write_file("components/layout/AppLayout.tsx", """
import React from 'react';
import { Outlet } from 'react-router-dom';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileNav } from './MobileNav';

export function AppLayout() {
    return (
        <div className="flex flex-col min-h-screen">
            <header className="p-4 border-b flex justify-between">
                <h1 className="font-bold">ArtisanX</h1>
                <LanguageSwitcher />
            </header>
            <main className="flex-1 p-4">
                <Outlet />
            </main>
            <MobileNav />
        </div>
    );
}
""")

# Pages
write_file("pages/LoginPage.tsx", "export function LoginPage() { return <div>Login Page</div>; }")
write_file("pages/artisan/ArtisanHome.tsx", "export function ArtisanHome() { return <div>Artisan Home</div>; }")
write_file("pages/artisan/ProfileSetup.tsx", "export function ProfileSetup() { return <div>Profile Setup</div>; }")
write_file("pages/artisan/ProductCreate.tsx", "export function ProductCreate() { return <div>Product Create</div>; }")
write_file("pages/artisan/ProductEdit.tsx", "export function ProductEdit() { return <div>Product Edit</div>; }")
write_file("pages/artisan/ProductList.tsx", "export function ProductList() { return <div>Product List</div>; }")
write_file("pages/artisan/EnquiryList.tsx", "export function EnquiryList() { return <div>Enquiry List</div>; }")
write_file("pages/artisan/EnquiryDetail.tsx", "export function EnquiryDetail() { return <div>Enquiry Detail</div>; }")
write_file("pages/buyer/BuyerHome.tsx", "export function BuyerHome() { return <div>Buyer Home</div>; }")
write_file("pages/buyer/CataloguePage.tsx", "export function CataloguePage() { return <div>Catalogue Page</div>; }")
write_file("pages/buyer/ProductPage.tsx", "export function ProductPage() { return <div>Product Page</div>; }")
write_file("pages/facilitator/FacilitatorHome.tsx", "export function FacilitatorHome() { return <div>Facilitator Home</div>; }")

# App & Main
write_file("App.tsx", """
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { ArtisanHome } from './pages/artisan/ArtisanHome';
import { ProfileSetup } from './pages/artisan/ProfileSetup';
import { ProductCreate } from './pages/artisan/ProductCreate';
import { ProductEdit } from './pages/artisan/ProductEdit';
import { ProductList } from './pages/artisan/ProductList';
import { EnquiryList } from './pages/artisan/EnquiryList';
import { EnquiryDetail } from './pages/artisan/EnquiryDetail';
import { BuyerHome } from './pages/buyer/BuyerHome';
import { CataloguePage } from './pages/buyer/CataloguePage';
import { ProductPage } from './pages/buyer/ProductPage';
import { FacilitatorHome } from './pages/facilitator/FacilitatorHome';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<AppLayout />}>
          <Route path="artisan" element={<ArtisanHome />} />
          <Route path="artisan/setup" element={<ProfileSetup />} />
          <Route path="artisan/products/create" element={<ProductCreate />} />
          <Route path="artisan/products/edit/:id" element={<ProductEdit />} />
          <Route path="artisan/products" element={<ProductList />} />
          <Route path="artisan/enquiries" element={<EnquiryList />} />
          <Route path="artisan/enquiries/:id" element={<EnquiryDetail />} />
          
          <Route path="buyer" element={<BuyerHome />} />
          <Route path="buyer/catalogue" element={<CataloguePage />} />
          <Route path="buyer/product/:id" element={<ProductPage />} />
          
          <Route path="facilitator" element={<FacilitatorHome />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
""")

write_file("main.tsx", """
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
""")
