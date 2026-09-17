import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
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
