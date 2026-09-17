import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GuidanceWorkflow } from '../types/guidance';

export type GuidanceStatus = 'idle' | 'active' | 'paused' | 'waiting' | 'completed';

export const ARTISAN_TOUR_WORKFLOW: GuidanceWorkflow = {
  id: 'artisan_full_walkthrough',
  name: 'artisan_walkthrough',
  description: 'Helping Hand: Complete Product Listing Tour',
  target_role: 'artisan',
  is_active: true,
  steps: [
    {
      id: 'step_1_add_product',
      workflow_id: 'artisan_full_walkthrough',
      step_order: 1,
      screen_name: 'Dashboard',
      target_id: 'add-product',
      route: '/artisan',
      gesture_type: 'tap',
      instruction_en: 'Tap "+ Add Product" to start showcasing your handcrafted product.',
      instruction_ta: 'உங்கள் கைவினைப் பொருளைப் பட்டியலிட "+ தயாரிப்பைச் சேர்" என்பதைத் தட்டவும்.',
      instruction_hi: 'अपना हस्तशिल्प उत्पाद जोड़ने के लिए "+ उत्पाद जोड़ें" पर टैप करें।',
      instruction_te: 'మీ చేతిపని ఉత్పత్తిని ప్రదర్శించడానికి "+ ఉత్పత్తిని జోడించు" నొక్కండి.',
      instruction_kn: 'ನಿಮ್ಮ ಕರಕುಶಲ ಉತ್ಪನ್ನವನ್ನು ಪಟ್ಟಿ ಮಾಡಲು "+ ಉತ್ಪನ್ನವನ್ನು ಸೇರಿಸಿ" ಟ್ಯಾಪ್ ಮಾಡಿ.',
      instruction_ml: 'നിങ്ങളുടെ കരകൗശല ഉൽപ്പന്നം ലിസ്റ്റ് ചെയ്യാൻ "+ ഉൽപ്പന്നം ചേർക്കുക" ടാപ്പുചെയ്യുക.',
      instruction_bn: 'আপনার হস্তশিল্প তালিকাভুক্ত করতে "+ পণ্য যোগ করুন" আলতো চাপুন।',
      instruction_mr: 'तुमचे हस्तकला उत्पादन जोडण्यासाठी "+ उत्पादन जोडा" वर टॅप करा.',
      instruction_ur: 'اپنی دستکاری کی پروڈکٹ شامل کرنے کے لیے "+ پروڈکٹ شامل کریں" پر ٹیپ کریں۔'
    },
    {
      id: 'step_2_photo',
      workflow_id: 'artisan_full_walkthrough',
      step_order: 2,
      screen_name: 'Photo Studio',
      target_id: 'product-image',
      route: '/artisan/product/create',
      productStep: 1,
      gesture_type: 'point',
      instruction_en: 'Take or upload a product photo. Our AI will enhance lighting and clean up the background.',
      instruction_ta: 'புகைப்படம் எடுக்கவும் அல்லது பதிவேற்றவும். எங்கள் AI பின்னணியை அழகாக மாற்றும்.',
      instruction_hi: 'फ़ोटो लें या अपलोड करें। हमारा AI स्टूडियो बैकग्राउंड साफ़ और लाइटिंग बेहतर करेगा।',
      instruction_te: 'ఫోటో తీయండి లేదా అప్‌లోడ్ చేయండి. మా AI స్టూడియో లైటింగ్‌ను మరియు నేపథ్యాన్ని మెరుగుపరుస్తుంది.',
      instruction_kn: 'ಫೋಟೋ ತೆಗೆಯಿರಿ ಅಥವಾ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ. ನಮ್ಮ AI ಬೆಳಕನ್ನು ಸುಧಾರಿಸುತ್ತದೆ.',
      instruction_ml: 'ഫോട്ടോ എടുക്കുക അല്ലെങ്കിൽ അപ്‌ലോഡ് ചെയ്യുക. ഞങ്ങളുടെ AI പശ്ചാത്തലം വൃത്തിയാക്കും.',
      instruction_bn: 'একটি ছবি তুলুন বা আপলোড করুন। আমাদের AI ব্যাকগ্রাউন্ড পরিষ্কার করবে।',
      instruction_mr: 'फोटो काढा किंवा अपलोड करा. आमचा AI पार्श्वभूमी स्वच्छ करेल.',
      instruction_ur: 'تصویر لیں یا اپ لوڈ کریں۔ ہمارا AI پس منظر کو صاف کرے گا۔'
    },
    {
      id: 'step_3_voice',
      workflow_id: 'artisan_full_walkthrough',
      step_order: 3,
      screen_name: 'Voice Assistant',
      target_id: 'voice-input',
      route: '/artisan/product/create',
      productStep: 2,
      gesture_type: 'tap',
      instruction_en: 'Describe your product using your voice in your native language.',
      instruction_ta: 'மைக்ரோஃபோனைத் தட்டி உங்கள் தாய்மொழியில் தயாரிப்பை விவரிக்கவும்.',
      instruction_hi: 'माइक्रोफ़ोन पर टैप करें और अपनी भाषा में उत्पाद का वर्णन करें।',
      instruction_te: 'మైక్రోఫోన్ నొక్కండి మరియు మీ స్వంత భాషలో మీ చేతిపనిని వివరించండి.',
      instruction_kn: 'ಮೈಕ್ರೊಫೋನ್ ಟ್ಯಾಪ್ ಮಾಡಿ ಮತ್ತು ನಿಮ್ಮ ಸ್ವಂತ ಭಾಷೆಯಲ್ಲಿ ಉತ್ಪನ್ನವನ್ನು ವಿವರಿಸಿ.',
      instruction_ml: 'മൈക്രോഫോൺ ടാപ്പുചെയ്ത് നിങ്ങളുടെ സ്വന്തം ഭാഷയിൽ ഉൽപ്പന്നം വിവരിക്കുക.',
      instruction_bn: 'মাইক্রোফোনে আলতো চাপুন এবং নিজের ভাষায় পণ্যের বর্ণনা দিন।',
      instruction_mr: 'मायक्रोफोनवर टॅप करा आणि तुमच्या भाषेत उत्पादनाचे वर्णन करा.',
      instruction_ur: 'مائیکروفون پر ٹیپ کریں اور اپنی زبان میں پروڈکٹ کی وضاحت کریں۔'
    },
    {
      id: 'step_4_review',
      workflow_id: 'artisan_full_walkthrough',
      step_order: 4,
      screen_name: 'AI Catalogue',
      target_id: 'product-title',
      route: '/artisan/product/create',
      productStep: 3,
      gesture_type: 'point',
      instruction_en: 'Review the AI-generated catalogue. You can customize or edit any details.',
      instruction_ta: 'AI உருவாக்கிய விவரங்களைச் சரிபார்க்கவும். நீங்கள் எதையும் திருத்தலாம்.',
      instruction_hi: 'AI द्वारा बनाए गए कैटलॉग की समीक्षा करें। आप कोई भी विवरण संपादित कर सकते हैं।',
      instruction_te: 'AI సృష్టించిన కేటలాగ్‌ను సమీక్షించండి. మీరు ఏదైనా సవరించవచ్చు.',
      instruction_kn: 'AI ರಚಿಸಿದ ಕ್ಯಾಟಲಾಗ್ ಪರಿಶೀಲಿಸಿ. ನೀವು ಸಂಪಾದಿಸಬಹುದು.',
      instruction_ml: 'AI സൃഷ്ടിച്ച കാറ്റലോഗ് പരിശോധിക്കുക. നിങ്ങൾക്ക് എഡിറ്റുചെയ്യാം.',
      instruction_bn: 'AI দ্বারা প্রস্তুত ক্যাটালগ পর্যালোচনা করুন। আপনি সম্পাদনা করতে পারেন।',
      instruction_mr: 'AI ने तयार केलेले कॅटलॉग तपासा. आपण ते संपादित करू शकता.',
      instruction_ur: 'AI کی تیار کردہ کیٹلاگ چیک کریں۔ آپ ترمیم بھی کر سکتے ہیں۔'
    },
    {
      id: 'step_5_price',
      workflow_id: 'artisan_full_walkthrough',
      step_order: 5,
      screen_name: 'Dynamic Pricing',
      target_id: 'price',
      route: '/artisan/product/create',
      productStep: 5,
      gesture_type: 'point',
      instruction_en: 'Check the dynamic suggested price and fair cost breakdown. Set your desired selling price.',
      instruction_ta: 'பரிந்துரைக்கப்பட்ட விலை மற்றும் நியாயமான செலவைச் சரிபார்த்து உங்கள் விலையை அமைக்கவும்.',
      instruction_hi: 'सुझाए गए मूल्य और लागत विवरण की जांच करें। अपना विक्रय मूल्य तय करें।',
      instruction_te: 'సూచించిన ధర మరియు ఖర్చు విభజనను తనిఖీ చేయండి. మీ తుది ధరను నిర్ణయించండి.',
      instruction_kn: 'ಸೂಚಿಸಲಾದ ಬೆಲೆ ಮತ್ತು ವೆಚ್ಚವನ್ನು ಪರಿಶೀಲಿಸಿ. ನಿಮ್ಮ ಮಾರಾಟ ಬೆಲೆಯನ್ನು ನಿಗದಿಪಡಿಸಿ.',
      instruction_ml: 'നിർദ്ദേശിച്ച വിലയും ചെലവും പരിശോധിക്കുക. നിങ്ങളുടെ വിൽപന വില നിശ്ചയിക്കുക.',
      instruction_bn: 'পরামর্শকৃত মূল্য এবং খরচ বিভাজন পরীক্ষা করুন। আপনার বিক্রয় মূল্য নির্ধারণ করুন।',
      instruction_mr: 'सुचवलेली किंमत आणि खर्च तपासा. आपली विक्री किंमत सेट करा.',
      instruction_ur: 'تجویز کردہ قیمت چیک کریں۔ اپنی حتمی قیمت مقرر کریں۔'
    },
    {
      id: 'step_6_publish',
      workflow_id: 'artisan_full_walkthrough',
      step_order: 6,
      screen_name: 'Publish Product',
      target_id: 'publish-product',
      route: '/artisan/product/create',
      productStep: 7,
      gesture_type: 'tap',
      instruction_en: 'Review readiness score and tap Publish to make your product live for buyers!',
      instruction_ta: 'தயார்நிலை மதிப்பெண்ணைச் சரிபார்த்து, தயாரிப்பை வெளியிட தட்டவும்!',
      instruction_hi: 'अपनी तत्परता स्कोर देखें और खरीदारों के लिए उत्पाद लाइव करने हेतु प्रकाशित करें पर टैप करें!',
      instruction_te: 'మీ సంసిద్ధత స్కోర్‌ను తనిఖీ చేసి, కొనుగోలుదారుల కోసం ప్రచురించు నొక్కండి!',
      instruction_kn: 'ಸಿದ್ಧತೆ ಸ್ಕೋರ್ ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಪ್ರಕಟಿಸಲು ಟ್ಯಾಪ್ ಮಾಡಿ!',
      instruction_ml: 'തയ്യാറെടുപ്പ് സ്കോർ പരിശോധിച്ച് പ്രസിദ്ധീകരിക്കുക ടാപ്പുചെയ്യുക!',
      instruction_bn: 'প্রস্তুতির স্কোর পরীক্ষা করুন এবং প্রকাশ করতে আলতো চাপুন!',
      instruction_mr: 'तयारीचा स्कोअर तपासा आणि खरेदीदारांसाठी उत्पादन प्रकाशित करा!',
      instruction_ur: 'اپنی تیاری کا اسکور چیک کریں اور خریداروں کے لیے شائع کرنے پر کلک کریں!'
    }
  ]
};

export const BUYER_TOUR_WORKFLOW: GuidanceWorkflow = {
  id: 'buyer_full_walkthrough',
  name: 'buyer_walkthrough',
  description: 'Helping Hand: Buyer Exploration & Order Tour',
  target_role: 'buyer',
  is_active: true,
  steps: [
    {
      id: 'buyer_step_1',
      workflow_id: 'buyer_full_walkthrough',
      step_order: 1,
      screen_name: 'Buyer Home',
      target_id: 'search-input',
      route: '/buyer',
      gesture_type: 'point',
      instruction_en: 'Search for genuine handcrafted products directly from artisan clusters.',
      instruction_ta: 'கைவினைஞர்களிடமிருந்து நேரடியாக உண்மையான கைவினைப் பொருட்களைத் தேடுங்கள்.',
      instruction_hi: 'कारीगरों से सीधे असली हस्तनिर्मित उत्पादों की खोज करें।',
      instruction_te: 'చేతివృత్తులవారి నుండి నేరుగా అసలైన చేతిపనులను శోధించండి.',
      instruction_kn: 'ಕುಶಲಕರ್ಮಿಗಳಿಂದ ನೇರವಾಗಿ ಅಧಿಕೃತ ಕರಕುಶಲ ವಸ್ತುಗಳನ್ನು ಹುಡುಕಿ.',
      instruction_ml: 'കരകൗശല വിദഗ്ദ്ധരിൽ നിന്ന് നേരിട്ട് ആധികാരിക ഉൽപ്പന്നങ്ങൾ തിരയുക.',
      instruction_bn: 'কারিগরদের কাছ থেকে সরাসরি খাঁটি হস্তশিল্প অনুসন্ধান করুন।',
      instruction_mr: 'कारागिरांकडून थेट अस्सल हस्तनिर्मित उत्पादने शोधा.',
      instruction_ur: 'کاریگروں سے براہ راست اصلی دستکاری کی مصنوعات تلاش کریں۔'
    },
    {
      id: 'buyer_step_2',
      workflow_id: 'buyer_full_walkthrough',
      step_order: 2,
      screen_name: 'Marketplace',
      target_id: 'catalogue-nav',
      route: '/buyer',
      gesture_type: 'tap',
      instruction_en: 'Browse the complete catalogue with filters for craft type, materials, and origin.',
      instruction_ta: 'கைவினை வகை, பொருட்கள் மற்றும் இருப்பிட வடிப்பான்களுடன் முழு பட்டியலையும் காண்க.',
      instruction_hi: 'शिल्प प्रकार, सामग्री और स्थान फिल्टर के साथ पूरा कैटलॉग ब्राउज़ करें।',
      instruction_te: 'క్రాఫ్ట్ రకం, పదార్థాల ఫిల్టర్‌లతో పూర్తి కేటలాగ్‌ను బ్రౌజ్ చేయండి.',
      instruction_kn: 'ಕರಕುಶಲ ಪ್ರಕಾರ ಮತ್ತು ಸಾಮಗ್ರಿಗಳ ಫಿಲ್ಟರ್‌ಗಳೊಂದಿಗೆ ಸಂಪೂರ್ಣ ಕ್ಯಾಟಲಾಗ್ ಬ್ರೌಸ್ ಮಾಡಿ.',
      instruction_ml: 'ക്രാഫ്റ്റ് തരം, മെറ്റീരിയലുകൾ എന്നിവ പ്രകാരം ഫിൽട്ടർ ചെയ്ത് കാറ്റലോഗ് കാണുക.',
      instruction_bn: 'শিল্পের ধরণ এবং উপকরণ ফিল্টার সহ সম্পূর্ণ ক্যাটালগ ব্রাউজ করুন।',
      instruction_mr: 'हस्तकला प्रकार आणि साहित्य फिल्टरसह संपूर्ण कॅटलॉग ब्राउझ करा.',
      instruction_ur: 'دستکاری کی قسم اور مواد کے فلٹرز کے ساتھ مکمل کیٹلاگ دیکھیں۔'
    },
    {
      id: 'buyer_step_3',
      workflow_id: 'buyer_full_walkthrough',
      step_order: 3,
      screen_name: 'Product Details',
      target_id: 'enquiry',
      route: '/buyer/catalogue',
      gesture_type: 'point',
      instruction_en: 'Send an enquiry to customize colors, order bulk quantities, or negotiate terms directly.',
      instruction_ta: 'விருப்பக்கேள்விகள், மொத்த ஆர்டர்கள் அல்லது பேச்சுவார்த்தை நடத்த விசாரணை அனுப்பவும்.',
      instruction_hi: 'कस्टमाइज़ेशन, थोक ऑर्डर या सीधे बातचीत के लिए पूछताछ भेजें।',
      instruction_te: 'అనుకూలీకరణ లేదా బల్క్ ఆర్డర్‌ల కోసం విచారణను పంపండి.',
      instruction_kn: 'ಕಸ್ಟಮೈಸೇಶನ್ ಅಥವಾ ಬೃಹತ್ ಆರ್ಡರ್‌ಗಳಿಗಾಗಿ ವಿಚಾರಣೆಯನ್ನು ಕಳುಹಿಸಿ.',
      instruction_ml: 'ഇഷ്‌ടാനുസൃതമാക്കലിനോ ബൾക്ക് ഓർഡറുകൾക്കോ ആയി അന്വേഷണം അയയ്ക്കുക.',
      instruction_bn: 'কাস্টমাইজেশন বা বাল্ক অর্ডারের জন্য অনুসন্ধান পাঠান।',
      instruction_mr: 'कस्टमायझेशन किंवा मोठ्या प्रमाणावर ऑर्डर्ससाठी चौकशी पाठवा.',
      instruction_ur: 'اپنی مرضی کے مطابق بنانے یا بلک آرڈرز کے لیے انکوائری بھیجیں۔'
    },
    {
      id: 'buyer_step_4',
      workflow_id: 'buyer_full_walkthrough',
      step_order: 4,
      screen_name: 'Cart & Buy Now',
      target_id: 'buy-now',
      route: '/buyer/cart',
      gesture_type: 'tap',
      instruction_en: 'Buy immediately with Buy Now or review your cart with direct verified artisan delivery.',
      instruction_ta: 'உடனடியாக வாங்கவும் அல்லது சரிபார்க்கப்பட்ட விநியோகத்துடன் கூடையில் உள்ளதை ஆர்டர் செய்யவும்.',
      instruction_hi: 'तुरंत खरीदें या सत्यापित कारीगर डिलीवरी के साथ अपने कार्ट की समीक्षा करें।',
      instruction_te: 'వెంటనే కొనండి లేదా ధృవీకరించబడిన డెలివరీతో మీ కార్ట్‌ను సమీక్షించండి.',
      instruction_kn: 'ತಕ್ಷಣ ಖರೀದಿಸಿ ಅಥವಾ ಪರಿಶೀಲಿಸಿದ ವಿತರಣೆಯೊಂದಿಗೆ ನಿಮ್ಮ ಕಾರ್ಟ್ ಪರಿಶೀಲಿಸಿ.',
      instruction_ml: 'ഉടൻ വാങ്ങുക അല്ലെങ്കിൽ നിങ്ങളുടെ കാർട്ട് പരിശോധിച്ച് ഓർഡർ ചെയ്യുക.',
      instruction_bn: 'অবিলম্বে কিনুন বা যাচাইকৃত ডেলিভারি সহ আপনার কার্ট পর্যালোচনা করুন।',
      instruction_mr: 'त्वरित खरेदी करा किंवा आपल्या कार्टचे पुनरावलोकन करा.',
      instruction_ur: 'فوری طور پر خریدیں یا تصدیق شدہ ترسیل کے ساتھ اپنی کارٹ چیک کریں۔'
    }
  ]
};

interface GuidanceState {
    isActive: boolean;
    currentWorkflow: GuidanceWorkflow | null;
    currentStepIndex: number;
    status: GuidanceStatus;
    guidanceLevel: 'full' | 'minimal' | 'off';
    completedWorkflows: string[];

    // Actions
    setGuidanceLevel: (level: 'full' | 'minimal' | 'off') => void;
    startWorkflow: (workflow: GuidanceWorkflow) => void;
    startArtisanTour: () => void;
    startBuyerTour: () => void;
    nextStep: () => void;
    previousStep: () => void;
    pause: () => void;
    resume: () => void;
    skip: () => void;
    replay: () => void;
    complete: () => void;
    markDontShowAgain: (workflowId: string) => void;
}

export const useGuidanceStore = create<GuidanceState>()(
  persist(
    (set, get) => ({
      isActive: false,
      currentWorkflow: null,
      currentStepIndex: 0,
      status: 'idle',
      guidanceLevel: 'full',
      completedWorkflows: [],

      setGuidanceLevel: (level) => set({ guidanceLevel: level }),

      startWorkflow: (workflow) => {
        set({
          isActive: true,
          currentWorkflow: workflow,
          currentStepIndex: 0,
          status: 'active'
        });
      },

      startArtisanTour: () => {
        get().startWorkflow(ARTISAN_TOUR_WORKFLOW);
      },

      startBuyerTour: () => {
        get().startWorkflow(BUYER_TOUR_WORKFLOW);
      },

      nextStep: () => {
        const { currentWorkflow, currentStepIndex } = get();
        if (!currentWorkflow || !currentWorkflow.steps) return;
        
        if (currentStepIndex < currentWorkflow.steps.length - 1) {
            set({ currentStepIndex: currentStepIndex + 1, status: 'active' });
        } else {
            get().complete();
        }
      },

      previousStep: () => {
        const { currentStepIndex } = get();
        if (currentStepIndex > 0) {
            set({ currentStepIndex: currentStepIndex - 1, status: 'active' });
        }
      },

      pause: () => set({ status: 'paused' }),
      
      resume: () => set({ status: 'active' }),
      
      skip: () => set({ isActive: false, status: 'idle', currentWorkflow: null, currentStepIndex: 0 }),
      
      replay: () => set({ currentStepIndex: 0, status: 'active' }),
      
      complete: () => {
        const { currentWorkflow, completedWorkflows } = get();
        const updated = currentWorkflow ? [...new Set([...completedWorkflows, currentWorkflow.id])] : completedWorkflows;
        set({ isActive: false, status: 'completed', currentWorkflow: null, currentStepIndex: 0, completedWorkflows: updated });
      },

      markDontShowAgain: (workflowId) => {
        set((state) => ({
            completedWorkflows: [...new Set([...state.completedWorkflows, workflowId])]
        }));
      }
    }),
    {
      name: 'guidance-storage',
      partialize: (state) => ({ 
        completedWorkflows: state.completedWorkflows,
        guidanceLevel: state.guidanceLevel 
      }),
    }
  )
);
