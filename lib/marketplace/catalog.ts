export type MarketplaceProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: 'USD';
  brand: string;
  rating: number;
  tags: string[];
  description: string;
  imageUrl: string;
};

export type CartItemInput = {
  productId?: string;
  id?: string;
  quantity: number;
};

export type MarketplaceLineItem = {
  productId: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  lineTotal: number;
  imageUrl: string;
  tags: string[];
};

const catalog: MarketplaceProduct[] = [
  {
    id: 'prd_headphones_aurora',
    name: 'Aurora Wireless Headphones',
    category: 'Electronics',
    price: 199,
    currency: 'USD',
    brand: 'Aurora',
    rating: 4.7,
    tags: ['audio', 'high_value'],
    description: 'Noise canceling over-ear headphones with 30-hour battery.',
    imageUrl:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'prd_sneakers_nova',
    name: 'Nova Running Sneakers',
    category: 'Apparel',
    price: 129,
    currency: 'USD',
    brand: 'Nova',
    rating: 4.6,
    tags: ['footwear', 'fitness'],
    description: 'Lightweight running sneakers with breathable mesh.',
    imageUrl:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'prd_smartwatch_pulse',
    name: 'Pulse Smartwatch',
    category: 'Electronics',
    price: 249,
    currency: 'USD',
    brand: 'Pulse',
    rating: 4.5,
    tags: ['wearable', 'high_value'],
    description: 'Heart rate monitoring, GPS, and 5-day battery.',
    imageUrl:
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'prd_coffee_summit',
    name: 'Summit Coffee Roaster',
    category: 'Home',
    price: 149,
    currency: 'USD',
    brand: 'Summit',
    rating: 4.4,
    tags: ['kitchen'],
    description: 'Small batch coffee roaster with adjustable profiles.',
    imageUrl:
      'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'prd_backpack_orbit',
    name: 'Orbit Travel Backpack',
    category: 'Accessories',
    price: 89,
    currency: 'USD',
    brand: 'Orbit',
    rating: 4.8,
    tags: ['travel'],
    description: 'Carry-on compatible with hidden laptop compartment.',
    imageUrl:
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'prd_skincare_lumen',
    name: 'Lumen Skincare Set',
    category: 'Beauty',
    price: 72,
    currency: 'USD',
    brand: 'Lumen',
    rating: 4.3,
    tags: ['skincare'],
    description: 'Cleanser, serum, and moisturizer for daily routine.',
    imageUrl:
      'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'prd_keyboard_flux',
    name: 'Flux Mechanical Keyboard',
    category: 'Electronics',
    price: 159,
    currency: 'USD',
    brand: 'Flux',
    rating: 4.6,
    tags: ['gaming', 'high_value'],
    description: 'Hot-swappable switches with RGB lighting.',
    imageUrl:
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'prd_candle_haven',
    name: 'Haven Scented Candle Set',
    category: 'Home',
    price: 48,
    currency: 'USD',
    brand: 'Haven',
    rating: 4.2,
    tags: ['home'],
    description: 'Four seasonal scents with soy wax blend.',
    imageUrl:
      'https://images.unsplash.com/photo-1731481382640-4859340396a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8Mnx8c2NlbnRlZCUyMGNhbmRsZSUyMHNldHxlbnwwfHx8fDE3Njg0MTMzMjB8MA&ixlib=rb-4.1.0&q=80&w=800',
  },
  {
    id: 'prd_jacket_sierra',
    name: 'Sierra Utility Jacket',
    category: 'Apparel',
    price: 179,
    currency: 'USD',
    brand: 'Sierra',
    rating: 4.5,
    tags: ['outerwear'],
    description: 'Weather-resistant jacket with multiple pockets.',
    imageUrl:
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'prd_waterbottle_peak',
    name: 'Peak Insulated Bottle',
    category: 'Outdoors',
    price: 39,
    currency: 'USD',
    brand: 'Peak',
    rating: 4.7,
    tags: ['outdoors'],
    description: 'Keeps drinks cold for 24 hours.',
    imageUrl:
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8Mnx8c3RhaW5sZXNzJTIwc3RlZWwlMjB3YXRlciUyMGJvdHRsZXxlbnwwfHx8fDE3Njg0MTQwNzJ8MA&ixlib=rb-4.1.0&q=80&w=800',
  },
  {
    id: 'prd_camera_lumen',
    name: 'Lumen Mirrorless Camera',
    category: 'Electronics',
    price: 899,
    currency: 'USD',
    brand: 'Lumen',
    rating: 4.8,
    tags: ['photography', 'high_value'],
    description: '24MP mirrorless camera with 4K video.',
    imageUrl:
      'https://images.unsplash.com/photo-1606986601547-a4d886b671b2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8Mnx8bWlycm9ybGVzcyUyMGNhbWVyYXxlbnwwfHx8fDE3Njg0MTMzMjJ8MA&ixlib=rb-4.1.0&q=80&w=800',
  },
  {
    id: 'prd_laptop_quantum',
    name: 'Quantum Pro Laptop',
    category: 'Electronics',
    price: 2499,
    currency: 'USD',
    brand: 'Quantum',
    rating: 4.9,
    tags: ['high_value', 'electronics', 'high_risk'],
    description: 'Professional workstation laptop with 32GB RAM and RTX 4090 GPU.',
    imageUrl:
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'prd_watch_luxury',
    name: 'Luxury Chronograph Watch',
    category: 'Accessories',
    price: 3499,
    currency: 'USD',
    brand: 'Luxury',
    rating: 4.8,
    tags: ['high_value', 'luxury', 'high_risk'],
    description: 'Swiss-made automatic chronograph with sapphire crystal.',
    imageUrl:
      'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'prd_handbag_designer',
    name: 'Designer Leather Handbag',
    category: 'Accessories',
    price: 1899,
    currency: 'USD',
    brand: 'Designer',
    rating: 4.7,
    tags: ['high_value', 'luxury', 'high_risk'],
    description: 'Handcrafted Italian leather handbag with gold hardware.',
    imageUrl:
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8Mnx8bGVhdGhlciUyMGhhbmRiYWd8ZW58MHx8fHwxNzY4NDEzMzI1fDA&ixlib=rb-4.1.0&q=80&w=800',
  },
  {
    id: 'prd_gaming_rig',
    name: 'Elite Gaming PC Setup',
    category: 'Electronics',
    price: 3299,
    currency: 'USD',
    brand: 'Elite',
    rating: 4.9,
    tags: ['high_value', 'gaming', 'high_risk'],
    description: 'Custom-built gaming PC with liquid cooling and RGB lighting.',
    imageUrl:
      'https://images.unsplash.com/photo-1603481588273-2f908a9a7a1b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8Mnx8Z2FtaW5nJTIwcGMlMjBzZXR1cHxlbnwwfHx8fDE3Njg0MTM2NDh8MA&ixlib=rb-4.1.0&q=80&w=800',
  },
];

const productMap = new Map(catalog.map((product) => [product.id, product]));

export function getMarketplaceProducts() {
  return catalog;
}

export function getMarketplaceCategories() {
  return Array.from(new Set(catalog.map((product) => product.category))).sort();
}

export function getProductById(productId: string) {
  return productMap.get(productId);
}

export function buildLineItems(cart: CartItemInput[]): MarketplaceLineItem[] {
  return cart.map((item) => {
    const productId = item.productId || item.id;
    if (!productId) {
      throw new Error('Cart item missing product id');
    }
    const product = getProductById(productId);
    if (!product) {
      throw new Error(`Unknown product: ${productId}`);
    }
    const quantity = Number(item.quantity || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`Invalid quantity for ${productId}`);
    }
    return {
      productId: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      quantity,
      lineTotal: Number((product.price * quantity).toFixed(2)),
      imageUrl: product.imageUrl,
      tags: product.tags,
    };
  });
}

export function calculateTotals(items: MarketplaceLineItem[]) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = Number(
    items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)
  );
  const shipping = subtotal > 200 ? 0 : 9.99;
  const tax = Number((subtotal * 0.0825).toFixed(2));
  const discount = 0;
  const total = Number((subtotal + shipping + tax - discount).toFixed(2));

  return {
    itemCount,
    subtotal,
    shipping,
    tax,
    discount,
    total,
  };
}
