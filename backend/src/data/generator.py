"""
Benchmark Artisan Dataset and Image Generator.
Generates realistic, domain-calibrated benchmark datasets representing Indian handicrafts
across 8 key categories, based on genuine craft economics (raw materials, artisan labour,
complexity tiers, state traditions, and market comps).

NOTE: This is a calibrated benchmark dataset designed for training, validating, and testing
the Dynamic Pricing ML pipeline when proprietary transaction data is not present in the workspace.
It is explicitly labeled as benchmark simulation data.
"""
import random
import uuid
from datetime import datetime, timedelta
from pathlib import Path
import numpy as np
import pandas as pd
from PIL import Image, ImageDraw, ImageFilter
from src.utils.config import (
    RAW_DATA_DIR,
    IMAGES_DIR,
    BENCHMARK_CATEGORIES,
    RANDOM_SEED,
)
from src.utils.logger import get_logger

logger = get_logger("data_generator")

# Domain craft definitions with authentic materials, techniques, and cost profiles
CRAFT_PROFILES = {
    "Pottery": {
        "materials": ["Terracotta Clay", "Ceramic Stoneware", "Blue Pottery Quartz", "Black Clay"],
        "craft_types": ["Wheel Throwing", "Coil Pottery", "Glazed Blue Pottery", "Hand Modeling"],
        "items": ["Decorative Vase", "Diya Set (Set of 6)", "Serving Bowl", "Planter Pot", "Tea Kulhar Set", "Water Pitcher"],
        "origins": ["Jaipur, Rajasthan", "Khurja, Uttar Pradesh", "Bishnupur, West Bengal", "Nizamabad, UP"],
        "mat_cost_range": (60, 450),
        "labour_hours": {"Low": (2, 4), "Medium": (5, 9), "High": (10, 20), "Masterpiece": (24, 45)},
        "hourly_rate": (50, 90),
        "color_palettes": [(194, 100, 52), (160, 82, 45), (41, 128, 185), (44, 62, 80), (218, 165, 32)],
    },
    "Textiles": {
        "materials": ["Chanderi Silk", "Mulberry Silk", "Handspun Khadi Cotton", "Pashmina Wool", "Ikat Cotton"],
        "craft_types": ["Handloom Weaving", "Block Printing", "Kalamkari Hand Painting", "Tie and Dye (Bandhani)"],
        "items": ["Stole / Scarf", "Dupatta", "Saree", "Table Runner", "Cushion Cover (Pair)", "Kurta Fabric"],
        "origins": ["Chanderi, MP", "Varanasi, UP", "Srikalahasti, AP", "Patan, Gujarat", "Kashmir"],
        "mat_cost_range": (300, 2800),
        "labour_hours": {"Low": (4, 8), "Medium": (12, 24), "High": (30, 60), "Masterpiece": (70, 150)},
        "hourly_rate": (70, 130),
        "color_palettes": [(192, 57, 43), (142, 68, 173), (243, 156, 18), (39, 174, 96), (230, 126, 34)],
    },
    "Woodcraft": {
        "materials": ["Sheesham Wood", "Walnut Wood", "Teak Wood", "Channapatna Softwood", "Rosewood"],
        "craft_types": ["Hand Carving", "Inlay Work", "Lacquered Turning", "Joinery & Relief"],
        "items": ["Jewellery Keepsake Box", "Decorative Wall Panel", "Serving Tray", "Coaster Set (6 pcs)", "Handcrafted Figurine", "Spice Box"],
        "origins": ["Saharanpur, UP", "Srinagar, Kashmir", "Channapatna, Karnataka", "Hoshiarpur, Punjab"],
        "mat_cost_range": (180, 1200),
        "labour_hours": {"Low": (3, 6), "Medium": (8, 16), "High": (20, 40), "Masterpiece": (50, 100)},
        "hourly_rate": (65, 110),
        "color_palettes": [(101, 67, 33), (139, 69, 19), (205, 133, 63), (222, 184, 135), (74, 43, 20)],
    },
    "Jewellery": {
        "materials": ["Brass & Meenakari Enamel", "Sterling Silver (92.5)", "Terracotta Clay & Beads", "Dhokra Bell Metal", "Glass & Semi-Precious Stones"],
        "craft_types": ["Filigree (Tarakasi)", "Kundan Meenakari", "Tribal Casting", "Bead Weaving", "Clay Molding"],
        "items": ["Statement Necklace", "Jhumka Earrings", "Bangle Set (Pair)", "Choker Set", "Pendant with Chain", "Anklet Pair"],
        "origins": ["Jaipur, Rajasthan", "Cuttack, Odisha", "Bastar, Chhattisgarh", "Kolhapur, Maharashtra"],
        "mat_cost_range": (150, 2200),
        "labour_hours": {"Low": (2, 5), "Medium": (6, 14), "High": (18, 36), "Masterpiece": (45, 90)},
        "hourly_rate": (80, 160),
        "color_palettes": [(212, 175, 55), (192, 192, 192), (184, 115, 51), (199, 0, 57), (46, 134, 193)],
    },
    "Basketry": {
        "materials": ["Assam Bamboo & Cane", "Sabai Grass", "Moonj Grass", "Water Hyacinth", "Palm Leaf"],
        "craft_types": ["Coiled Weaving", "Plaited Weaving", "Twill Basketry", "Ribbed Construction"],
        "items": ["Storage Basket with Lid", "Planter Basket", "Laundry Hamper", "Fruit Bowl", "Handwoven Tote Bag", "Wall Plate Basket"],
        "origins": ["Assam", "Mayurbhanj, Odisha", "Prayagraj, UP", "Kerala", "Tripura"],
        "mat_cost_range": (80, 420),
        "labour_hours": {"Low": (3, 6), "Medium": (7, 14), "High": (16, 28), "Masterpiece": (35, 60)},
        "hourly_rate": (50, 85),
        "color_palettes": [(238, 207, 161), (189, 154, 108), (146, 114, 76), (107, 142, 35), (205, 170, 125)],
    },
    "Painting": {
        "materials": ["Handmade Cotton Paper & Natural Pigments", "Canvas Fabric", "Silk Cloth", "Treated Wooden Board"],
        "craft_types": ["Madhubani Painting", "Warli Tribal Art", "Pattachitra Scroll Art", "Gond Art", "Miniature Painting"],
        "items": ["Framed Wall Art (12x16 in)", "Scroll Painting", "Canvas Panel (18x24 in)", "Greeting Art Cards (Set)", "Wooden Hand-Painted Tray"],
        "origins": ["Madhubani, Bihar", "Dahanu, Maharashtra", "Raghurajpur, Odisha", "Dindori, MP", "Bikaner, Rajasthan"],
        "mat_cost_range": (120, 850),
        "labour_hours": {"Low": (4, 8), "Medium": (12, 22), "High": (25, 50), "Masterpiece": (60, 130)},
        "hourly_rate": (75, 140),
        "color_palettes": [(192, 57, 43), (241, 196, 15), (41, 128, 185), (39, 174, 96), (236, 240, 241)],
    },
    "Embroidery": {
        "materials": ["Pure Georgette Fabric", "Mulmul Cotton", "Khadi Silk", "Tussar Silk", "Anchor Cotton Threads"],
        "craft_types": ["Lucknowi Chikankari", "Punjab Phulkari", "Karnataka Kasuti", "Bengal Kantha Stitch", "Kutch Mirror Work"],
        "items": ["Embroidered Kurta", "Dupatta", "Saree with Pallu Work", "Wall Hanging Tapestry", "Cushion Cover (Pair)"],
        "origins": ["Lucknow, UP", "Amritsar, Punjab", "Dharwad, Karnataka", "Santiniketan, WB", "Bhuj, Gujarat"],
        "mat_cost_range": (250, 1900),
        "labour_hours": {"Low": (6, 12), "Medium": (18, 35), "High": (40, 80), "Masterpiece": (90, 200)},
        "hourly_rate": (60, 115),
        "color_palettes": [(253, 237, 236), (245, 183, 177), (215, 189, 226), (169, 223, 191), (250, 219, 216)],
    },
    "Metal craft": {
        "materials": ["Bell Metal (Kansa)", "Brass Alloy", "Copper", "Zinc-Copper Alloy (Bidri)", "Iron"],
        "craft_types": ["Lost-Wax Casting (Dhokra)", "Engraving & Chasing", "Bidriware Silver Inlay", "Hammered Metal Beating"],
        "items": ["Dhokra Elephant / Tribal Figurine", "Brass Urli Bowl", "Bidri Coaster Set (4 pcs)", "Traditional Oil Lamp (Diya)", "Wall Plaque"],
        "origins": ["Bastar, Chhattisgarh", "Moradabad, UP", "Bidar, Karnataka", "Thanjavur, Tamil Nadu"],
        "mat_cost_range": (200, 1800),
        "labour_hours": {"Low": (4, 8), "Medium": (10, 20), "High": (25, 45), "Masterpiece": (55, 110)},
        "hourly_rate": (75, 125),
        "color_palettes": [(205, 127, 50), (184, 115, 51), (218, 165, 32), (44, 62, 80), (128, 128, 128)],
    },
}

COMPLEXITY_LEVELS = ["Low", "Medium", "High", "Masterpiece"]
SIZES = ["Small", "Medium", "Large", "Extra Large"]


def generate_craft_image(
    image_path: Path,
    category: str,
    complexity: str,
    palettes: list[tuple[int, int, int]],
    seed: int,
) -> None:
    """Generate a realistic synthetic craft product image with distinct visual motifs and textures."""
    rng = random.Random(seed)
    width, height = 224, 224

    # Base background: subtle craft-paper or studio backdrop
    bg_base = rng.choice([(248, 246, 240), (242, 238, 230), (250, 248, 245), (235, 232, 225)])
    img = Image.new("RGB", (width, height), color=bg_base)
    draw = ImageDraw.Draw(img)

    # Primary and secondary colors from craft palette
    primary_color = rng.choice(palettes)
    secondary_color = rng.choice([c for c in palettes if c != primary_color] or palettes)
    accent_color = rng.choice(palettes)

    # Visual complexity determines number of geometric elements and layering
    element_count = {"Low": 8, "Medium": 18, "High": 35, "Masterpiece": 60}[complexity]

    # Draw stylized artisan craft motifs based on category
    if category in ["Pottery", "Metal craft"]:
        # Circular / curved pottery / bowl / vessel silhouettes
        cx, cy = width // 2, height // 2
        r = rng.randint(45, 80)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=primary_color, outline=secondary_color, width=3)
        # Inner rings and details
        for i in range(element_count):
            sub_r = max(5, r - (i * 4))
            draw.ellipse([cx - sub_r, cy - sub_r, cx + sub_r, cy + sub_r], outline=accent_color, width=1)
    elif category in ["Textiles", "Embroidery"]:
        # Weave / pattern grid lines and cross-stitches
        step = max(6, 120 // element_count)
        for x in range(20, width - 20, step):
            draw.line([(x, 20), (x, height - 20)], fill=primary_color, width=2)
        for y in range(20, height - 20, step):
            draw.line([(20, y), (width - 20, y)], fill=secondary_color, width=2)
        # Accent diamond motifs
        for _ in range(element_count // 2):
            bx, by = rng.randint(40, 180), rng.randint(40, 180)
            draw.polygon([(bx, by - 8), (bx + 8, by), (bx, by + 8), (bx - 8, by)], fill=accent_color)
    elif category in ["Woodcraft", "Basketry"]:
        # Textured grain / woven slats
        for i in range(element_count):
            y = 25 + i * ((height - 50) // max(1, element_count))
            draw.rectangle([25, y, width - 25, y + 4], fill=primary_color)
            if i % 2 == 0:
                draw.rectangle([35, y - 2, width - 35, y + 2], fill=secondary_color)
    else:  # Painting, Jewellery
        # Folk art shapes / ornamental geometry
        for _ in range(element_count):
            shape_type = rng.choice(["circle", "poly", "line"])
            px, py = rng.randint(30, 190), rng.randint(30, 190)
            sz = rng.randint(8, 30)
            if shape_type == "circle":
                draw.ellipse([px, py, px + sz, py + sz], fill=primary_color, outline=accent_color)
            elif shape_type == "poly":
                draw.polygon([(px, py), (px + sz, py + sz // 2), (px - sz // 2, py + sz)], fill=secondary_color)
            else:
                draw.line([(px, py), (px + sz, py + sz)], fill=accent_color, width=2)

    # Add soft craft blur / texture realism
    img = img.filter(ImageFilter.SMOOTH_MORE)

    image_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(image_path, format="JPEG", quality=88)


def generate_benchmark_dataset(
    num_samples: int = 2400,
    output_csv: Path | None = None,
    generate_images: bool = True,
    seed: int = RANDOM_SEED,
) -> pd.DataFrame:
    """
    Generate a complete, domain-calibrated benchmark artisan dataset.
    Follows authentic Indian craft economic formulas:
    - total_cost = material_cost + labour_cost + packaging_cost + transport_cost + other_cost
    - target_price = total_cost * (1 + artisan_margin + complexity_premium + rating_premium) + residual
    """
    np.random.seed(seed)
    random.seed(seed)
    records = []

    samples_per_category = num_samples // len(BENCHMARK_CATEGORIES)

    logger.info(f"Generating {num_samples} benchmark records across {len(BENCHMARK_CATEGORIES)} categories...")

    for category in BENCHMARK_CATEGORIES:
        prof = CRAFT_PROFILES[category]

        for idx in range(samples_per_category):
            item_name = random.choice(prof["items"])
            material = random.choice(prof["materials"])
            craft_type = random.choice(prof["craft_types"])
            origin = random.choice(prof["origins"])
            complexity = random.choice(COMPLEXITY_LEVELS)
            size = random.choice(SIZES)

            # Product Identity
            p_id = f"ART-{category[:3].upper()}-{idx + 1000:04d}"
            p_name = f"Authentic {material} {item_name} ({craft_type})"

            tags = f"{category.lower()},{material.lower().replace(' ', '_')},{craft_type.lower().replace(' ', '_')},{complexity.lower()},handcrafted,indian_artisan"
            description = (
                f"Exquisite handcrafted {item_name} made from premium {material} using traditional "
                f"{craft_type} techniques by skilled artisans from {origin}. Demonstrates {complexity.lower()} "
                f"level craftsmanship with attention to traditional heritage detailing."
            )

            # Physical dimensions
            size_multiplier = {"Small": 0.7, "Medium": 1.0, "Large": 1.4, "Extra Large": 1.9}[size]
            weight_g = round(float(np.random.uniform(150, 1200) * size_multiplier), 1)
            length_cm = round(float(np.random.uniform(10, 45) * size_multiplier), 1)
            width_cm = round(float(np.random.uniform(8, 35) * size_multiplier), 1)
            height_cm = round(float(np.random.uniform(5, 30) * size_multiplier), 1)
            quantity = 1
            handmade = True
            customization = random.choice([True, False])

            # Cost Structure
            base_mat = float(np.random.uniform(*prof["mat_cost_range"])) * size_multiplier
            material_cost = round(base_mat, 2)

            hr_range = prof["labour_hours"][complexity]
            hours = float(np.random.uniform(*hr_range))
            rate = float(np.random.uniform(*prof["hourly_rate"]))
            labour_cost = round(hours * rate, 2)

            packaging_cost = round(float(np.random.uniform(25, 120) * size_multiplier), 2)
            transport_cost = round(float(np.random.uniform(40, 180)), 2)
            other_cost = round(float(np.random.uniform(15, 60)), 2)

            total_cost = material_cost + labour_cost + packaging_cost + transport_cost + other_cost

            # Pricing Economics
            base_margin = float(np.random.uniform(0.25, 0.45))
            complexity_margin = {"Low": 0.05, "Medium": 0.12, "High": 0.22, "Masterpiece": 0.40}[complexity]
            rating = round(float(np.clip(np.random.normal(4.4, 0.4), 3.0, 5.0)), 1)
            rating_margin = (rating - 4.0) * 0.05

            multiplier = 1.0 + base_margin + complexity_margin + rating_margin
            ideal_price = total_cost * multiplier
            noise = float(np.random.normal(0, 0.06 * ideal_price))
            target_price = max(round(ideal_price + noise, 2), round(total_cost * 1.15, 2))

            # Market Comparative Information
            spread_pct = float(np.random.uniform(0.20, 0.45))
            market_mean = round(target_price * float(np.random.uniform(0.95, 1.05)), 2)
            market_min = round(market_mean * (1.0 - spread_pct / 2), 2)
            market_max = round(market_mean * (1.0 + spread_pct / 2), 2)
            market_median = round(market_mean * float(np.random.uniform(0.98, 1.02)), 2)
            market_p25 = round(market_min + (market_median - market_min) * 0.5, 2)
            market_p75 = round(market_median + (market_max - market_median) * 0.5, 2)
            market_sample_count = int(np.random.randint(5, 45))
            review_count = int(np.random.randint(2, 250))

            # Image generation
            img_rel_path = f"sample_products/{p_id}.jpg"
            img_abs_path = IMAGES_DIR / img_rel_path
            if generate_images and not img_abs_path.exists():
                generate_craft_image(
                    img_abs_path,
                    category=category,
                    complexity=complexity,
                    palettes=prof["color_palettes"],
                    seed=seed + idx,
                )

            created_date = datetime.now() - timedelta(days=random.randint(1, 180))

            records.append({
                "product_id": p_id,
                "product_name": p_name,
                "category": category,
                "material": material,
                "craft_type": craft_type,
                "tags": tags,
                "description": description,
                "size": size,
                "weight_g": weight_g,
                "length_cm": length_cm,
                "width_cm": width_cm,
                "height_cm": height_cm,
                "quantity": quantity,
                "handmade": handmade,
                "customization": customization,
                "complexity": complexity,
                "material_cost": material_cost,
                "labour_cost": labour_cost,
                "packaging_cost": packaging_cost,
                "transport_cost": transport_cost,
                "other_cost": other_cost,
                "market_min": market_min,
                "market_max": market_max,
                "market_mean": market_mean,
                "market_median": market_median,
                "market_p25": market_p25,
                "market_p75": market_p75,
                "market_sample_count": market_sample_count,
                "average_rating": rating,
                "review_count": review_count,
                "image_path": str(img_rel_path),
                "target_price": target_price,
                "currency": "INR",
                "source": "benchmark_simulation_v1",
                "timestamp": created_date.isoformat(),
            })

    df = pd.DataFrame(records)

    out_path = output_csv or (RAW_DATA_DIR / "artisan_benchmark_dataset.csv")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out_path, index=False)
    logger.info(f"Benchmark dataset saved to {out_path} ({len(df)} rows)")

    return df
