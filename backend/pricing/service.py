from typing import Optional
from .schemas import PricingInput, PricingOutput
from market_intelligence.schemas import MarketPriceResult

def calculate_price(input_data: PricingInput, market_data: Optional[MarketPriceResult] = None) -> PricingOutput:
    total_material = sum(m.quantity * m.unit_cost for m in input_data.material_costs)
    total_hidden = sum(h.amount for h in input_data.hidden_costs)
    labor_cost = input_data.labor_hours * input_data.labor_rate
    
    logistics = input_data.logistics_cost or 0.0
    
    cost_of_production = (
        total_material + 
        total_hidden + 
        labor_cost + 
        input_data.packaging_cost + 
        input_data.overhead_cost + 
        logistics
    )
    
    profit = cost_of_production * (input_data.profit_margin_percent / 100.0)
    min_safe_price = cost_of_production * 1.1
    suggested_price = cost_of_production + profit
    range_low = suggested_price * 0.9
    range_high = suggested_price * 1.2
    
    output = PricingOutput(
        total_material_cost=round(total_material, 2),
        total_hidden_costs=round(total_hidden, 2),
        total_labor_cost=round(labor_cost, 2),
        total_cost_of_production=round(cost_of_production, 2),
        profit_amount=round(profit, 2),
        min_safe_price=round(min_safe_price, 2),
        suggested_price=round(suggested_price, 2),
        price_range_low=round(range_low, 2),
        price_range_high=round(range_high, 2),
        breakdown={
            "material": round(total_material, 2),
            "hidden": round(total_hidden, 2),
            "labor": round(labor_cost, 2),
            "packaging": round(input_data.packaging_cost, 2),
            "overhead": round(input_data.overhead_cost, 2),
            "logistics": round(logistics, 2)
        },
        recommended_final_price=round(suggested_price, 2)
    )
    
    if market_data and market_data.status != "insufficient_data":
        output.market_data_source = "live_search"
        output.market_price_low = market_data.price_low
        output.market_price_high = market_data.price_high
        output.market_price_median = market_data.price_median
        output.market_price_reasoning = market_data.reasoning
        output.market_sample_listings = [l.model_dump() for l in market_data.listings]
        output.recommended_final_price = max(output.suggested_price, market_data.price_median)
        
    return output

async def calculate_pricing_with_market_intelligence(req: PricingInput) -> PricingOutput:
    market_data = None
    if req.category and req.materials:
        try:
            from market_intelligence.service import get_or_refresh_market_price
            market_data = await get_or_refresh_market_price(req.category, req.materials)
        except Exception:
            pass
    return calculate_price(req, market_data)

