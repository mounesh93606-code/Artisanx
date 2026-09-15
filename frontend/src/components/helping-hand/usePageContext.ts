import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export interface PageStep {
  selector: string; // data-guide-id value
  labelKey: string; // i18n key under helping_hand
  fallbackLabel: string;
  fallbackLabelTa: string;
}

export interface PageContext {
  pageKey: string;       // i18n key for page name, e.g. 'page_dashboard'
  descKey: string;       // i18n key for page description
  nextActionKey: string; // i18n key for "what should I do?"
  pageName: string;      // resolved display name
  pageDesc: string;      // resolved description
  nextAction: string;    // resolved next action
  steps: PageStep[];     // for Guide Me and Point to Next
  readableContent: string; // for TTS "Read this page"
}

export function usePageContext(): PageContext {
  const { pathname } = useLocation();
  const { t } = useTranslation();

  const resolve = (key: string) => t(`helping_hand.${key}`, { defaultValue: '' });

  // Determine which page we're on
  let pageKey = 'page_unknown';
  let descKey = 'page_unknown_desc';
  let nextActionKey = 'next_action_default';
  let steps: PageStep[] = [];

  if (pathname === '/login' || pathname.startsWith('/login')) {
    pageKey = 'page_login';
    descKey = 'page_login_desc';
    nextActionKey = 'next_action_default';
    steps = [
      {
        selector: 'login-email',
        labelKey: 'step_enter_email',
        fallbackLabel: 'Enter your email address here.',
        fallbackLabelTa: 'இங்கே உங்கள் மின்னஞ்சல் முகவரியை உள்ளிடுங்கள்.',
      },
      {
        selector: 'login-password',
        labelKey: 'step_enter_password',
        fallbackLabel: 'Enter your password here.',
        fallbackLabelTa: 'இங்கே உங்கள் கடவுச்சொல்லை உள்ளிடுங்கள்.',
      },
      {
        selector: 'login-btn',
        labelKey: 'step_click_login',
        fallbackLabel: 'Press this button to log in.',
        fallbackLabelTa: 'உள்நுழைய இந்த பட்டனை அழுத்துங்கள்.',
      },
      {
        selector: 'register-link',
        labelKey: 'step_click_register',
        fallbackLabel: 'If you are new, press this button to create an account.',
        fallbackLabelTa: 'புதியவராக இருந்தால் கணக்கை உருவாக்க இந்த பட்டனை அழுத்துங்கள்.',
      },
    ];
  } else if (pathname === '/artisan' || pathname === '/artisan/') {
    pageKey = 'page_dashboard';
    descKey = 'page_dashboard_desc';
    nextActionKey = 'next_action_dashboard';
    steps = [
      {
        selector: 'add-product-btn',
        labelKey: 'step_enter_name',
        fallbackLabel: 'Tap here to add a new product.',
        fallbackLabelTa: 'புதிய பொருளை சேர்க்க இங்கே அழுத்துங்கள்.',
      },
      {
        selector: 'products-nav',
        labelKey: 'step_enter_name',
        fallbackLabel: 'Tap here to view your products.',
        fallbackLabelTa: 'உங்கள் பொருட்களைக் காண இங்கே அழுத்துங்கள்.',
      },
    ];
  } else if (pathname === '/artisan/products') {
    pageKey = 'page_products';
    descKey = 'page_products_desc';
    nextActionKey = 'next_action_products';
    steps = [
      {
        selector: 'add-product-btn',
        labelKey: 'step_enter_name',
        fallbackLabel: 'Tap here to add a new product.',
        fallbackLabelTa: 'புதிய பொருளை சேர்க்க இங்கே அழுத்துங்கள்.',
      },
    ];
  } else if (pathname === '/artisan/product/create' || pathname.includes('/product/create')) {
    pageKey = 'page_create_product';
    descKey = 'page_create_product_desc';
    nextActionKey = 'next_action_create_product';
    steps = [
      {
        selector: 'product-name',
        labelKey: 'step_enter_name',
        fallbackLabel: 'Enter the name of your product here.',
        fallbackLabelTa: 'இங்கே உங்கள் பொருளின் பெயரை உள்ளிடுங்கள்.',
      },
      {
        selector: 'product-category',
        labelKey: 'step_enter_category',
        fallbackLabel: 'Choose the category that best fits your product.',
        fallbackLabelTa: 'உங்கள் பொருளுக்கு பொருத்தமான வகையை தேர்வு செய்யுங்கள்.',
      },
      {
        selector: 'product-price',
        labelKey: 'step_enter_price',
        fallbackLabel: 'Enter the price of your product.',
        fallbackLabelTa: 'உங்கள் பொருளின் விலையை உள்ளிடுங்கள்.',
      },
      {
        selector: 'product-image',
        labelKey: 'step_upload_image',
        fallbackLabel: 'Upload a photo of your product so buyers can see it.',
        fallbackLabelTa: 'வாங்குபவர்கள் பார்க்க உங்கள் பொருளின் புகைப்படத்தை பதிவேற்றவும்.',
      },
      {
        selector: 'submit-product',
        labelKey: 'step_submit_product',
        fallbackLabel: 'Press this button to add your product.',
        fallbackLabelTa: 'உங்கள் பொருளை சேர்க்க இந்த பட்டனை அழுத்துங்கள்.',
      },
    ];
  } else if (pathname === '/artisan/orders') {
    pageKey = 'page_orders';
    descKey = 'page_orders_desc';
    nextActionKey = 'next_action_orders';
    steps = [
      {
        selector: 'order-list-item',
        labelKey: 'step_enter_name',
        fallbackLabel: 'Tap an order to see its details.',
        fallbackLabelTa: 'விவரங்களுக்கு ஒரு ஆர்டரை தேர்வு செய்யுங்கள்.',
      },
    ];
  } else if (pathname === '/artisan/enquiries') {
    pageKey = 'page_enquiries';
    descKey = 'page_enquiries_desc';
    nextActionKey = 'next_action_enquiries';
    steps = [
      {
        selector: 'enquiry-list-item',
        labelKey: 'step_enter_name',
        fallbackLabel: 'Tap an enquiry to read the message and respond.',
        fallbackLabelTa: 'செய்தியை படிக்கவும் பதிலளிக்கவும் ஒரு விசாரணையை தேர்வு செய்யுங்கள்.',
      },
    ];
  } else if (pathname === '/artisan/profile') {
    pageKey = 'page_profile';
    descKey = 'page_profile_desc';
    nextActionKey = 'next_action_profile';
    steps = [
      {
        selector: 'profile-name',
        labelKey: 'step_enter_name',
        fallbackLabel: 'Enter your name here.',
        fallbackLabelTa: 'இங்கே உங்கள் பெயரை உள்ளிடுங்கள்.',
      },
      {
        selector: 'profile-save',
        labelKey: 'step_submit_product',
        fallbackLabel: 'Tap Save to update your profile.',
        fallbackLabelTa: 'சுயவிவரத்தை புதுப்பிக்க சேமி அழுத்துங்கள்.',
      },
    ];
  } else if (pathname === '/artisan/analytics') {
    pageKey = 'page_analytics';
    descKey = 'page_analytics_desc';
    nextActionKey = 'next_action_default';
    steps = [];
  } else if (pathname.includes('/artisan/quotations')) {
    pageKey = 'page_quotations';
    descKey = 'page_quotations_desc';
    nextActionKey = 'next_action_default';
    steps = [];
  } else if (pathname.includes('/artisan/setup')) {
    pageKey = 'page_profile';
    descKey = 'page_profile_desc';
    nextActionKey = 'next_action_profile';
    steps = [];
  }

  const pageName = resolve(pageKey);
  const pageDesc = resolve(descKey);
  const nextAction = resolve(nextActionKey);

  // Build readable content for TTS
  const readableContent = `${pageName}. ${pageDesc} ${nextAction}`;

  return {
    pageKey,
    descKey,
    nextActionKey,
    pageName,
    pageDesc,
    nextAction,
    steps,
    readableContent,
  };
}
