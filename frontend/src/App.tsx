import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { useAuthStore } from './stores/authStore';
import LoginPage from './pages/LoginPage';

import ArtisanHome from './pages/artisan/ArtisanHome';
import ProfileSetup from './pages/artisan/ProfileSetup';
import ProductCreate from './pages/artisan/ProductCreate';
import ProductList from './pages/artisan/ProductList';
import ProductDetail from './pages/artisan/ProductDetail';
import ProductEdit from './pages/artisan/ProductEdit';
import PublicProductPage from './pages/PublicProductPage';
import SplashPage from './pages/SplashPage';
import LanguageSelectionPage from './pages/LanguageSelectionPage';
import ProfilePage from './pages/artisan/ProfilePage';
import EnquiryList from './pages/artisan/EnquiryList';
import EnquiryDetail from './pages/artisan/EnquiryDetail';
import Quotations from './pages/artisan/Quotations';
import ArtisanQuotationDetail from './pages/artisan/ArtisanQuotationDetail';
import Orders from './pages/artisan/Orders';
import OrderDetail from './pages/artisan/OrderDetail';
import Conversations from './pages/artisan/Conversations';
import ConversationDetail from './pages/artisan/ConversationDetail';
import ReviewsList from './pages/artisan/ReviewsList';
import BusinessAnalytics from './pages/artisan/BusinessAnalytics';

import BuyerHome from './pages/buyer/BuyerHome';
import CataloguePage from './pages/buyer/CataloguePage';
import BuyerEnquiryDetail from './pages/buyer/BuyerEnquiryDetail';
import BuyerProductPage from './pages/buyer/BuyerProductPage';
import BuyerOrders from './pages/buyer/BuyerOrders';
import BuyerProfile from './pages/buyer/BuyerProfile';
import ArtisanStorePage from './pages/buyer/ArtisanStorePage';
import SavedProductsPage from './pages/buyer/SavedProductsPage';
import BuyerEnquiries from './pages/buyer/BuyerEnquiries';
import BuyerQuotationDetail from './pages/buyer/BuyerQuotationDetail';
import BuyerOrderDetail from './pages/buyer/BuyerOrderDetail';
import CartPage from './pages/buyer/CartPage';
import CheckoutPage from './pages/buyer/CheckoutPage';
import PaymentStatusPage from './pages/buyer/PaymentStatusPage';
import FacilitatorHome from './pages/facilitator/FacilitatorHome';
import FacilitatorArtisanProfile from './pages/facilitator/FacilitatorArtisanProfile';
import SupportRequestsList from './pages/facilitator/SupportRequestsList';
import SupportRequestDetail from './pages/facilitator/SupportRequestDetail';
import DisputesList from './pages/facilitator/DisputesList';
import DisputeDetail from './pages/facilitator/DisputeDetail';
import FacilitatorOrders from './pages/facilitator/FacilitatorOrders';
import ActivityLog from './pages/facilitator/ActivityLog';
import ArtisanDirectory from './pages/facilitator/ArtisanDirectory';
import ProductReviewQueue from './pages/facilitator/ProductReviewQueue';
import FacilitatorProfile from './pages/facilitator/FacilitatorProfile';
import NotificationsHub from './pages/facilitator/NotificationsHub';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from './components/layout/AuthLayout';
import { ArtisanLayout } from './components/layout/ArtisanLayout';
import { BuyerLayout } from './components/layout/BuyerLayout';
import { FacilitatorLayout } from './components/layout/FacilitatorLayout';
import { PublicLayout } from './components/layout/PublicLayout';

const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode, allowedRole?: string }) => {
  const { t } = useTranslation();

  const { isAuthenticated, user, isLoading } = useAuthStore();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-brand-bg">{t('common.loading')}</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRole && user?.role !== allowedRole) {
    return <Navigate to={`/${user?.role || 'login'}`} replace />;
  }

  return <>{children}</>;
};

const BackButtonHandler: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listenerHandle: any = null;

    const setupListener = async () => {
      listenerHandle = await CapApp.addListener('backButton', () => {
        const rootPaths = ['/login', '/artisan', '/buyer', '/facilitator', '/', '/splash', '/select-language'];
        const isRoot = rootPaths.includes(location.pathname);

        if (isRoot) {
          CapApp.exitApp();
        } else {
          navigate(-1);
        }
      });
    };

    setupListener();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [navigate, location.pathname]);

  return null;
};

const AppUrlListener: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listenerHandle: any = null;

    const handleUrl = (rawUrl: string) => {
      try {
        // Automatically close in-app browser if open
        Browser.close().catch(() => {});

        // Handles "artisanx://payment/status?order_id=...&product_id=..."
        const normalized = rawUrl.replace(/^artisanx:\/\//, 'https://artisanx.app/');
        const parsed = new URL(normalized);
        const path = parsed.pathname;
        const search = parsed.search;

        if (path.includes('payment/status')) {
          navigate(`/buyer/payment/status${search}`);
        } else if (path.startsWith('/product/')) {
          navigate(path);
        } else if (path.startsWith('/buyer/') || path.startsWith('/artisan/')) {
          navigate(`${path}${search}`);
        } else {
          navigate(`${path}${search}`);
        }
      } catch (e) {
        console.warn('Failed to parse appUrlOpen URL', rawUrl, e);
      }
    };

    const setupListener = async () => {
      try {
        const launchUrl = await CapApp.getLaunchUrl();
        if (launchUrl && launchUrl.url) {
          handleUrl(launchUrl.url);
        }
      } catch (err) {
        console.warn('Error reading launch URL', err);
      }

      listenerHandle = await CapApp.addListener('appUrlOpen', (event: any) => {
        if (event && event.url) {
          handleUrl(event.url);
        }
      });
    };

    setupListener();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [navigate]);

  return null;
};

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <BackButtonHandler />
      <AppUrlListener />
      <Routes>
        
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Artisan Routes */}
        <Route path="/artisan" element={<ProtectedRoute allowedRole="artisan"><ArtisanLayout /></ProtectedRoute>}>
          <Route index element={<ArtisanHome />} />
          <Route path="setup" element={<ProfileSetup />} />
          <Route path="products" element={<ProductList />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="product/create" element={<ProductCreate />} />
          <Route path="products/new" element={<ProductCreate />} />
          <Route path="products/:id/edit" element={<ProductEdit />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="enquiries" element={<EnquiryList />} />
          <Route path="enquiry/:id" element={<EnquiryDetail />} />
          <Route path="quotations" element={<Quotations />} />
          <Route path="quotations/:id" element={<ArtisanQuotationDetail />} />
          <Route path="orders" element={<Orders />} />
          <Route path="order/:id" element={<OrderDetail />} />
          <Route path="conversations" element={<Conversations />} />
          <Route path="conversation/:id" element={<ConversationDetail />} />
          <Route path="reviews" element={<ReviewsList />} />
          <Route path="analytics" element={<BusinessAnalytics />} />
        </Route>
        
        {/* Buyer Routes */}
        <Route path="/buyer" element={<ProtectedRoute allowedRole="buyer"><BuyerLayout /></ProtectedRoute>}>
          <Route index element={<BuyerHome />} />
          <Route path="catalogue" element={<CataloguePage />} />
          <Route path="product/:id" element={<BuyerProductPage />} />
          <Route path="artisan/:id" element={<ArtisanStorePage />} />
          <Route path="saved" element={<SavedProductsPage />} />
          <Route path="enquiries" element={<BuyerEnquiries />} />
          <Route path="quotations/:id" element={<BuyerQuotationDetail />} />
          <Route path="enquiry/:id" element={<BuyerEnquiryDetail />} />
          <Route path="orders" element={<BuyerOrders />} />
          <Route path="orders/:id" element={<BuyerOrderDetail />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="payment/status" element={<PaymentStatusPage />} />
          <Route path="profile" element={<BuyerProfile />} />
        </Route>

        <Route path="/facilitator" element={<ProtectedRoute allowedRole="facilitator"><FacilitatorLayout /></ProtectedRoute>}>
          <Route index element={<FacilitatorHome />} />
          <Route path="artisans" element={<ArtisanDirectory />} />
          <Route path="artisans/:id" element={<FacilitatorArtisanProfile />} />
          <Route path="reviews" element={<ProductReviewQueue />} />
          <Route path="profile" element={<FacilitatorProfile />} />
          <Route path="notifications" element={<NotificationsHub />} />
          <Route path="support" element={<SupportRequestsList />} />
          <Route path="support/:id" element={<SupportRequestDetail />} />
          <Route path="disputes" element={<DisputesList />} />
          <Route path="disputes/:id" element={<DisputeDetail />} />
          <Route path="orders" element={<FacilitatorOrders />} />
          <Route path="activity" element={<ActivityLog />} />
        </Route>

        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/product/:productId" element={<PublicProductPage />} />
        </Route>

        <Route path="/language" element={<LanguageSelectionPage />} />
        <Route path="/" element={<SplashPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
