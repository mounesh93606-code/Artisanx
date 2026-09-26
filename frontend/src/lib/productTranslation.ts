import api from './api';

export interface TranslatedProductFields {
  title: string;
  description: string;
  short_description?: string;
  full_description?: string;
  key_highlights?: string[];
  craft_story?: string;
  care_instructions?: string;
}

// In-memory cache for ultra-fast language switches
const translationCache = new Map<string, TranslatedProductFields>();

export async function getTranslatedProduct(
  productId: string,
  original: TranslatedProductFields,
  targetLang: string
): Promise<TranslatedProductFields> {
  if (!targetLang || targetLang === 'en') {
    return original;
  }

  const cacheKey = `${productId || original.title}_${targetLang}`;

  // Check in-memory cache
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // Check localStorage cache
  try {
    const stored = localStorage.getItem(`trans_${cacheKey}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      translationCache.set(cacheKey, parsed);
      return parsed;
    }
  } catch (e) {
    // Ignore storage parse issues
  }

  // Request backend translation
  try {
    const res = await api.post('/products/translate', {
      product_id: productId,
      title: original.title,
      description: original.description || original.full_description || '',
      short_description: original.short_description || '',
      full_description: original.full_description || original.description || '',
      key_highlights: original.key_highlights || [],
      craft_story: original.craft_story || '',
      care_instructions: original.care_instructions || '',
      target_language: targetLang,
      source_language: 'en'
    });

    const result: TranslatedProductFields = {
      title: res.data?.title || original.title,
      description: res.data?.description || res.data?.full_description || original.description,
      short_description: res.data?.short_description || original.short_description,
      full_description: res.data?.full_description || res.data?.description || original.full_description,
      key_highlights: res.data?.key_highlights || original.key_highlights,
      craft_story: res.data?.craft_story || original.craft_story,
      care_instructions: res.data?.care_instructions || original.care_instructions
    };

    // Store in caches
    translationCache.set(cacheKey, result);
    try {
      localStorage.setItem(`trans_${cacheKey}`, JSON.stringify(result));
    } catch (e) {
      // Storage quota safety
    }

    return result;
  } catch (error) {
    console.error('Failed to translate product:', error);
    return original;
  }
}
