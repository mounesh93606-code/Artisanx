import httpx
import re
import hashlib
from datetime import datetime, timezone
import statistics
from .schemas import MarketPriceResult, MarketListing
from config import settings
from database import get_service_client
from ai.gemini_client import get_gemini_client, process_audio_and_generate

service_client = get_service_client()

def summarize_reasoning(listings: list[MarketListing], low: float, high: float) -> str:
    # We will implement this in gemini_client.py, but for circular dependencies, we can just call it there
    from ai.gemini_client import summarize_market_reasoning
    return summarize_market_reasoning(listings, low, high)

def build_query_signature(category: str, materials: list[str]) -> str:
    cat_norm = category.lower().strip()
    cat_norm = re.sub(r'[^a-z0-9]+', '_', cat_norm)
    
    mats_norm = []
    for m in materials:
        m_norm = m.lower().strip()
        m_norm = re.sub(r'[^a-z0-9]+', '_', m_norm)
        if m_norm:
            mats_norm.append(m_norm)
            
    mats_norm.sort()
    mats_str = "_".join(mats_norm)
    
    raw = f"{cat_norm}___{mats_str}"
    return hashlib.md5(raw.encode('utf-8')).hexdigest()

def clean_price(price_str: str) -> float:
    if not price_str:
        return 0.0
    # Remove everything except digits and decimal point
    cleaned = re.sub(r'[^\d.]', '', price_str)
    try:
        return float(cleaned)
    except ValueError:
        return 0.0

def clean_search_query(category: str, materials: list[str]) -> str:
    cat_clean = re.sub(r'[^a-zA-Z0-9\s]', ' ', category)
    words = [w for w in (cat_clean + ' ' + ' '.join(materials)).split() if len(w) > 2]
    seen = set()
    dedup = [w for w in words if not (w.lower() in seen or seen.add(w.lower()))]
    return ' '.join(dedup[:4])

async def search_market_listings(category: str, materials: list[str]) -> list[MarketListing]:
    if not settings.SERPAPI_KEY:
        return []
        
    primary_query = clean_search_query(category, materials)
    queries_to_try = [primary_query]
    fallback_query = re.sub(r'[^a-zA-Z0-9\s]', ' ', category).strip()
    if fallback_query and fallback_query.lower() != primary_query.lower():
        queries_to_try.append(fallback_query)

    all_listings = []
    
    async with httpx.AsyncClient(verify=False) as client:
        for q in queries_to_try:
            try:
                response = await client.get(
                    "https://serpapi.com/search",
                    params={
                        "engine": "google",
                        "q": q,
                        "tbm": "shop",
                        "api_key": settings.SERPAPI_KEY,
                        "gl": "in",
                        "hl": "en"
                    },
                    timeout=25.0
                )
                if response.status_code == 200:
                    shopping_results = response.json().get("shopping_results", [])
                    for item in shopping_results:
                        title = item.get("title", "")
                        price_str = item.get("price", "")
                        source = item.get("source", "Online Store")
                        url = item.get("product_link") or item.get("link") or ""
                        
                        price = clean_price(price_str)
                        if title and price > 0 and url:
                            all_listings.append(MarketListing(
                                title=title,
                                price=price,
                                source=source,
                                url=url
                            ))
                    if all_listings:
                        break # Got results with primary query, no need to query again
            except httpx.ReadTimeout:
                print(f"SerpApi request for '{q}' timed out")
            except Exception as e:
                print(f"SerpApi Error for '{q}': {e}")
                
    # Deduplicate by URL
    seen_urls = set()
    unique_listings = []
    for l in all_listings:
        if l.url not in seen_urls:
            seen_urls.add(l.url)
            unique_listings.append(l)
            
    return unique_listings

def filter_outliers(listings: list[MarketListing], category: str, materials: list[str]) -> list[MarketListing]:
    if not listings:
        return []

    cat_keywords = set(re.findall(r'\w+', category.lower()))
    mat_keywords = set()
    for m in materials:
        mat_keywords.update(re.findall(r'\w+', m.lower()))
        
    relevant_listings = []
    for l in listings:
        title_lower = l.title.lower()
        title_words = set(re.findall(r'\w+', title_lower))
        if cat_keywords.intersection(title_words) or mat_keywords.intersection(title_words) or "handmade" in title_lower or "artisan" in title_lower or "craft" in title_lower:
            relevant_listings.append(l)
            
    # If keyword filtering was too strict, fallback to original Google Shopping listings
    candidates = relevant_listings if relevant_listings else listings
    
    if len(candidates) < 3:
        return candidates[:8]
        
    # Outlier Filtering (IQR)
    prices = sorted([l.price for l in candidates])
    q1 = prices[len(prices) // 4]
    q3 = prices[(len(prices) * 3) // 4]
    iqr = q3 - q1
    
    lower_bound = max(50.0, q1 - 1.5 * iqr)
    upper_bound = q3 + 1.5 * iqr
    
    filtered = [l for l in candidates if lower_bound <= l.price <= upper_bound]
    return filtered[:8] if filtered else candidates[:8]

async def get_or_refresh_market_price(category: str, materials: list[str]) -> MarketPriceResult:
    sig = build_query_signature(category, materials)
    
    # Check Cache
    try:
        cache_res = service_client.table("market_price_cache").select("*").eq("query_signature", sig).execute()
        if cache_res.data:
            row = cache_res.data[0]
            fetched_at = datetime.fromisoformat(row["fetched_at"].replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            delta = now - fetched_at
            if delta.total_seconds() < 48 * 3600:
                listings = [MarketListing(**item) for item in row.get("source_listings", [])]
                low = row["price_low"]
                high = row["price_high"]
                median = row["price_median"]
                sources = list(dict.fromkeys(l.source for l in listings))
                src_str = ", ".join(sources[:3]) if sources else "Indian online stores"
                reasoning = f"Based on live market listings from {src_str}, similar {category.lower()} items are listed between ₹{int(low)} and ₹{int(high)}, with a market median of ₹{int(median)}."
                return MarketPriceResult(
                    price_low=low,
                    price_high=high,
                    price_median=median,
                    listings=listings,
                    reasoning=reasoning,
                    is_cached=True,
                    status="success"
                )
    except Exception as e:
        print(f"Cache check error: {e}")
        
    # Fetch from live
    listings = await search_market_listings(category, materials)
    filtered = filter_outliers(listings, category, materials)
    
    if not filtered:
        # Graceful baseline when SerpAPI has no data or network disconnects
        return MarketPriceResult(status="insufficient_data")
        
    prices = sorted([l.price for l in filtered])
    low = prices[0]
    high = prices[-1]
    median = statistics.median(prices)
    
    sources = list(dict.fromkeys(l.source for l in filtered))
    src_str = ", ".join(sources[:3]) if sources else "marketplace listings"
    reasoning = f"Based on {len(filtered)} live market listings from {src_str}, similar handcrafted {category.lower()} items range between ₹{int(low)} and ₹{int(high)}, with a market median of ₹{int(median)}."
    
    # Upsert Cache
    try:
        data_to_upsert = {
            "query_signature": sig,
            "price_low": low,
            "price_high": high,
            "price_median": median,
            "source_listings": [l.model_dump() for l in filtered]
        }
        
        cache_res = service_client.table("market_price_cache").select("id").eq("query_signature", sig).execute()
        if cache_res.data:
            service_client.table("market_price_cache").update(data_to_upsert).eq("query_signature", sig).execute()
        else:
            service_client.table("market_price_cache").insert(data_to_upsert).execute()
    except Exception as e:
        print(f"Cache upsert error: {e}")
        
    return MarketPriceResult(
        price_low=low,
        price_high=high,
        price_median=median,
        listings=filtered,
        reasoning=reasoning,
        is_cached=False,
        status="success"
    )
