import { create } from 'zustand';
import api from '../lib/api';

interface ProductWizardState {
    currentStep: number;
    setStep: (step: number) => void;
    draftId: string | null;
    photos: Array<{ id: string, image_url: string, enhanced_url?: string, original_url?: string, is_main: boolean, quality_score?: number, enhanced_quality_score?: number, suggestions?: string[], enhanced_quality?: boolean }>;
    setPhotos: (photos: any[]) => void;
    addPhoto: (photo: any) => void;
    deletePhoto: (id: string) => Promise<void>;
    voiceData: { record_id?: string, original_text?: string, translated_text?: string } | null;
    setVoiceData: (data: any) => void;
    catalogueData: {
      title: string;
      description: string;
      category: string;
      tags: string[];
      materials: string[];
      care_instructions: string;
      estimated_production_time: string;
      dimensions: string;
      stock_quantity: number | '';
      reserved_stock?: number;
      is_made_to_order?: boolean;
      monthly_capacity?: number | '';
      low_stock_threshold?: number | '';
      moq: number | '';
      lead_time_days: number | '';
    } | null;
    setCatalogueData: (data: any) => void;
    materialsData: Array<{ id: string, name: string, quantity: number, unit: string, cost: number }>;
    setMaterialsData: (materials: any[]) => void;
    pricingData: {
      laborHours: number;
      laborRate: number;
      packagingCost: number;
      overheadCost: number;
      logisticsCost: number;
      profitMargin: number;
      finalPrice: number;
      finalPriceBasis: string;
      marketData?: {
          price_low: number | null;
          price_high: number | null;
          price_median: number | null;
          reasoning: string | null;
          source: string;
          listings: Array<{title: string, price: number, source: string, url: string}> | null;
          recommended_final_price: number;
      };
    };
    setPricingData: (data: any) => void;
    fetchMarketData: () => Promise<void>;
    saveDraft: () => Promise<void>;
    publishProduct: () => Promise<void>;
    loadProduct: (id: string) => Promise<void>;
    reset: () => void;
}

export const useProductStore = create<ProductWizardState>((set, get) => ({
    currentStep: 1,
    setStep: (step) => set({ currentStep: step }),
    draftId: null,
    photos: [],
    setPhotos: (photos) => set({ photos }),
    addPhoto: (photo) => set((state) => ({ photos: [...state.photos, photo] })),
    deletePhoto: async (id) => {
        try {
            await api.delete(`/images/${id}`);
            set((state) => ({ photos: state.photos.filter((p) => p.id !== id) }));
        } catch (e) {
            console.error("Failed to delete photo", e);
        }
    },
    voiceData: null,
    setVoiceData: (voiceData) => set({ voiceData }),
    catalogueData: null,
    setCatalogueData: (catalogueData) => set((state) => {
        const incoming = typeof catalogueData === 'function' ? catalogueData(state.catalogueData) : catalogueData;
        if (!incoming) return { catalogueData: null };
        return {
            catalogueData: state.catalogueData
                ? { ...state.catalogueData, ...incoming }
                : incoming
        };
    }),
    materialsData: [],
    setMaterialsData: (materialsData) => set({ materialsData }),
    pricingData: {
      laborHours: 0, laborRate: 0, packagingCost: 0, overheadCost: 0, logisticsCost: 0, profitMargin: 20, finalPrice: 0, finalPriceBasis: 'cost_floor'
    },
    setPricingData: (pricingData) => set((state) => ({ pricingData: { ...state.pricingData, ...pricingData } })),
    fetchMarketData: async () => {
        const state = get();
        const category = state.catalogueData?.category;
        const materials = state.materialsData.map(m => m.name).join(',');
        
        if (!category || !materials) {
            alert("Add a product category and at least one material to compare market prices.");
            return;
        }
        
        try {
            const res = await api.post('/pricing/calculate', {
                material_costs: state.materialsData.map(m => ({ name: m.name, quantity: m.quantity, unit_cost: m.cost })),
                hidden_costs: [],
                labor_hours: state.pricingData.laborHours,
                labor_rate: state.pricingData.laborRate,
                packaging_cost: state.pricingData.packagingCost,
                overhead_cost: state.pricingData.overheadCost,
                logistics_cost: state.pricingData.logisticsCost,
                profit_margin_percent: state.pricingData.profitMargin,
                category: category,
                materials: state.materialsData.map(m => m.name)
            });
            
            const marketData = {
                price_low: res.data.market_price_low,
                price_high: res.data.market_price_high,
                price_median: res.data.market_price_median,
                reasoning: res.data.market_price_reasoning,
                source: res.data.market_data_source,
                listings: res.data.market_sample_listings,
                recommended_final_price: res.data.recommended_final_price
            };
            
            set((s) => ({
                pricingData: { ...s.pricingData, marketData }
            }));
            
        } catch (error) {
            console.error("Failed to fetch market data", error);
            alert("Unable to load market prices. Please try again.");
        }
    },
    saveDraft: async () => {
      const state = get();
      const payload = {
        title: state.catalogueData?.title || '',
        description: state.catalogueData?.description || '',
        category: state.catalogueData?.category || '',
        tags: state.catalogueData?.tags || [],
        materials: { list: state.materialsData.map(m => ({ name: m.name, quantity: m.quantity, unit: m.unit })) },
        care_instructions: state.catalogueData?.care_instructions || '',
        price: state.pricingData.finalPrice || 0,
        status: 'draft',
        dimensions: state.catalogueData?.dimensions || '',
        stock_quantity: state.catalogueData?.stock_quantity === '' ? null : state.catalogueData?.stock_quantity,
        reserved_stock: state.catalogueData?.reserved_stock || 0,
        is_made_to_order: state.catalogueData?.is_made_to_order || false,
        monthly_capacity: state.catalogueData?.monthly_capacity === '' ? null : state.catalogueData?.monthly_capacity,
        low_stock_threshold: state.catalogueData?.low_stock_threshold === '' ? 5 : state.catalogueData?.low_stock_threshold,
        moq: state.catalogueData?.moq === '' ? null : state.catalogueData?.moq,
        lead_time_days: state.catalogueData?.lead_time_days === '' ? null : state.catalogueData?.lead_time_days
      };

      let productId = state.draftId;
      if (!productId) {
        const { data } = await api.post('/products/', payload);
        productId = data.id;
        set({ draftId: productId });
      } else {
        await api.put(`/products/${productId}`, payload);
      }
      
      // Always save Pricing Data explicitly to hit the pricing backend logic and store private costs
      if (productId) {
          try {
              await api.post(`/pricing/save/${productId}`, {
                  material_costs: state.materialsData.map(m => ({ name: m.name, quantity: m.quantity, unit_cost: m.cost })),
                  hidden_costs: [],
                  labor_hours: state.pricingData.laborHours,
                  labor_rate: state.pricingData.laborRate,
                  packaging_cost: state.pricingData.packagingCost,
                  overhead_cost: state.pricingData.overheadCost,
                  logistics_cost: state.pricingData.logisticsCost,
                  profit_margin_percent: state.pricingData.profitMargin,
                  final_price_basis: state.pricingData.finalPriceBasis
              });
          } catch (e) {
              console.error("Pricing save failed", e);
          }
      }
    },
    publishProduct: async () => {
      const state = get();
      if (!state.draftId) await state.saveDraft();
      await api.post(`/products/${get().draftId}/publish`);
    },
    loadProduct: async (id: string) => {
      try {
        const { data } = await api.get(`/products/${id}`);
        const materialsData = data.materials?.list || [];
        
        let pricingData: ProductWizardState['pricingData'] = { laborHours: 0, laborRate: 0, packagingCost: 0, overheadCost: 0, logisticsCost: 0, profitMargin: 20, finalPrice: data.price || 0, finalPriceBasis: 'cost_floor' };
        let fullMaterialsData = materialsData;
        try {
          const { data: pricingRes } = await api.get(`/pricing/${id}`);
          if (pricingRes) {
            pricingData = {
              laborHours: pricingRes.labor_hours || 0,
              laborRate: pricingRes.labor_rate || 0,
              packagingCost: pricingRes.packaging_cost || 0,
              overheadCost: pricingRes.overhead_cost || 0,
              logisticsCost: pricingRes.logistics_cost || 0,
              profitMargin: pricingRes.profit_margin_percent || 20,
              finalPrice: pricingRes.calculated_suggested_price || data.price || 0,
              finalPriceBasis: pricingRes.final_price_basis || 'cost_floor',
              marketData: {
                price_low: pricingRes.market_price_low,
                price_high: pricingRes.market_price_high,
                price_median: pricingRes.market_price_low ? (pricingRes.market_price_low + pricingRes.market_price_high)/2 : null,
                reasoning: pricingRes.market_price_reasoning,
                source: pricingRes.market_data_source,
                listings: pricingRes.market_sample_listings,
                recommended_final_price: pricingRes.calculated_suggested_price
              }
            };
            if (pricingRes.material_costs && pricingRes.material_costs.materials) {
              fullMaterialsData = pricingRes.material_costs.materials.map((m: any) => ({
                id: m.id || Math.random().toString(),
                name: m.name,
                quantity: m.quantity,
                unit: m.unit,
                cost: m.unit_cost
              }));
            }
          }
        } catch(err) {
          console.warn("Could not load pricing data for draft (normal if not saved yet)", err);
        }
        
        // Let's get images
        const { data: imgData } = await api.get(`/images/product/${id}`);
        const photos = imgData || [];
        
        set({
          draftId: id,
          currentStep: 1, // Start at step 1 for editing
          catalogueData: {
            title: data.title || '',
            description: data.description || '',
            category: data.category || '',
            tags: data.tags || [],
            materials: materialsData.map((m: any) => m.name),
            care_instructions: data.care_instructions || '',
            estimated_production_time: '',
            dimensions: data.dimensions || '',
            stock_quantity: data.stock_quantity ?? '',
            reserved_stock: data.reserved_stock ?? 0,
            is_made_to_order: data.is_made_to_order ?? false,
            monthly_capacity: data.monthly_capacity ?? '',
            low_stock_threshold: data.low_stock_threshold ?? 5,
            moq: data.moq ?? '',
            lead_time_days: data.lead_time_days ?? ''
          },
          materialsData: fullMaterialsData,
          pricingData: pricingData,
          photos: photos
        });
      } catch(e) {
        console.error("Failed to load product", e);
      }
    },
    reset: () => set({
      currentStep: 1, draftId: null, photos: [], voiceData: null, catalogueData: null, materialsData: [],
      pricingData: { laborHours: 0, laborRate: 0, packagingCost: 0, overheadCost: 0, logisticsCost: 0, profitMargin: 20, finalPrice: 0, finalPriceBasis: 'cost_floor' }
    })
}));
