'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  brand: string;
  rating: number;
  tags: string[];
  description: string;
  imageUrl: string;
};

type BuyerProfile = {
  id: string;
  label: string;
  description: string;
  riskTier: 'low' | 'medium' | 'high';
  accountAgeDays: number;
  phone: string;
  email: string;
  shipping: {
    address1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  payment: {
    method: string;
    provider: string;
    cardLast4: string;
  };
  ipAddress: string;
  deviceId: string;
};

type OrderResult = {
  success: boolean;
  orderId?: string;
  transactionId?: string;
  pollUrl?: string;
  error?: string;
};

const buyerProfiles: BuyerProfile[] = [
  {
    id: 'trusted_buyer',
    label: 'Trusted Buyer (Low Risk)',
    description: 'Long-tenured buyer, domestic shipping, clean device.',
    riskTier: 'low',
    accountAgeDays: 365,
    phone: '+15551234567',
    email: 'ava.trusted@example.com',
    shipping: {
      address1: '425 Market St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94105',
      country: 'US',
    },
    payment: { method: 'card', provider: 'visa', cardLast4: '4242' },
    ipAddress: '74.23.10.5',
    deviceId: 'dev_trusted_001',
  },
  {
    id: 'giftcard_checker',
    label: 'Gift Card + New Device (Medium Risk)',
    description: 'Gift card purchase with new device and short account age.',
    riskTier: 'medium',
    accountAgeDays: 9,
    phone: '+15557654321',
    email: 'jamie.gift@example.com',
    shipping: {
      address1: '10 Main St',
      city: 'Austin',
      state: 'TX',
      postalCode: '73301',
      country: 'US',
    },
    payment: { method: 'card', provider: 'mastercard', cardLast4: '1881' },
    ipAddress: '18.221.10.4',
    deviceId: 'dev_new_902',
  },
  {
    id: 'intl_highvalue',
    label: 'International High-Value (High Risk)',
    description: 'High-value electronics, international ship, late hour.',
    riskTier: 'high',
    accountAgeDays: 3,
    phone: '+447700900123',
    email: 'lee.intl@example.co.uk',
    shipping: {
      address1: '221B Baker Street',
      city: 'London',
      state: '',
      postalCode: 'NW16XE',
      country: 'UK',
    },
    payment: { method: 'card', provider: 'amex', cardLast4: '3005' },
    ipAddress: '82.10.44.21',
    deviceId: 'dev_intl_443',
  },
];

function classNames(...classes: Array<string | boolean | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

export default function MarketplacePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [selectedProfile, setSelectedProfile] = useState<BuyerProfile>(buyerProfiles[0]);
  const [placing, setPlacing] = useState(false);
  const [result, setResult] = useState<OrderResult | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/marketplace/products');
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to load products');
        setProducts(data.products || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const catalogById = useMemo(() => {
    const map: Record<string, Product> = {};
    products.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [products]);

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([productId, quantity]) => {
        const product = catalogById[productId];
        if (!product || quantity <= 0) return null;
        return { product, quantity };
      })
      .filter(Boolean) as Array<{ product: Product; quantity: number }>;
  }, [cart, catalogById]);

  const subtotal = cartItems.reduce(
    (sum, { product, quantity }) => sum + product.price * quantity,
    0
  );
  const shipping = subtotal > 200 ? 0 : cartItems.length > 0 ? 9.99 : 0;
  const tax = Number((subtotal * 0.0825).toFixed(2));
  const total = Number((subtotal + shipping + tax).toFixed(2));

  const addToCart = (productId: string) => {
    setCart((prev) => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setCart((prev) => {
      const next = { ...prev };
      if (quantity <= 0) {
        delete next[productId];
      } else {
        next[productId] = quantity;
      }
      return next;
    });
  };

  const clearCart = () => setCart({});

  const quickAddGiftCardScenario = () => {
    const giftCard = products.find((p) => p.tags.includes('gift_card')) || products.find((p) => p.id.includes('giftcard'));
    if (giftCard) {
      setCart({ [giftCard.id]: 2 });
      setSelectedProfile(buyerProfiles[1]);
    }
  };

  const placeOrder = async () => {
    setResult(null);
    if (cartItems.length === 0) {
      setError('Add at least one item to the cart.');
      return;
    }

    setPlacing(true);
    setError(null);
    try {
      const payload = {
        buyer: {
          id: selectedProfile.id,
          name: selectedProfile.label,
          email: selectedProfile.email,
          phone: selectedProfile.phone,
          accountAgeDays: selectedProfile.accountAgeDays,
          riskTier: selectedProfile.riskTier,
        },
        items: cartItems.map(({ product, quantity }) => ({
          productId: product.id,
          quantity,
        })),
        shipping: selectedProfile.shipping,
        payment: selectedProfile.payment,
        metadata: {
          deviceId: selectedProfile.deviceId,
          ipAddress: selectedProfile.ipAddress,
          userAgent: 'Marketplace Demo UI/1.0',
        },
        event: {
          eventType: 'order.created',
          source: 'marketplace_demo_ui',
        },
      };

      const res = await fetch('/api/marketplace/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data: OrderResult = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Order failed');
      }
      setResult(data);
      clearCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-10 lg:py-14 space-y-8">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Marketplace Demo</p>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
              Full-Funnel Checkout → Fraud Pipeline
            </h1>
            <p className="text-sm text-gray-600 mt-2 max-w-2xl">
              Pick products, choose a buyer profile, and place an order. The middleware auto-creates a
              transaction, runs agents, and routes verification when needed.
            </p>
          </div>
          {result?.transactionId && (
            <Link
              href={`/case/${result.transactionId}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 text-white text-sm font-semibold shadow-md hover:bg-emerald-700 transition"
            >
              View Live Case →
            </Link>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Grid */}
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Catalog</h2>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <button
                  onClick={quickAddGiftCardScenario}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-gray-300 transition text-xs font-semibold"
                >
                  Quick Add: Gift Card (medium risk)
                </button>
              </div>
            </div>

            {loading && <p className="text-gray-500">Loading products...</p>}
            {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition p-4 flex flex-col"
                >
                  <div
                    className="h-40 rounded-xl bg-gray-100 mb-3 overflow-hidden"
                    style={{
                      backgroundImage: `url(${product.imageUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">{product.category}</p>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">{product.name}</h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {product.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-gray-100 text-gray-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div>
                      <p className="text-xl font-black text-gray-900">${product.price.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">Brand: {product.brand}</p>
                    </div>
                    <button
                      onClick={() => addToCart(product.id)}
                      className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Cart + Buyer */}
          <section className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-gray-900">Cart</h3>
                <span className="text-xs text-gray-500 font-semibold">
                  {cartItems.length} items • ${total.toFixed(2)}
                </span>
              </div>
              {cartItems.length === 0 ? (
                <p className="text-sm text-gray-500">Add products to build a transaction.</p>
              ) : (
                <div className="space-y-3">
                  {cartItems.map(({ product, quantity }) => (
                    <div key={product.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-500">
                          ${product.price.toFixed(2)} × {quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          value={quantity}
                          onChange={(e) => updateQuantity(product.id, Number(e.target.value))}
                          className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm"
                        />
                        <button
                          onClick={() => updateQuantity(product.id, 0)}
                          className="text-xs text-gray-400 hover:text-red-500"
                          aria-label="Remove item"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-gray-100 mt-3 pt-3 space-y-1 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>${shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h3 className="text-base font-bold text-gray-900 mb-2">Buyer Profile</h3>
              <div className="space-y-2">
                {buyerProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => setSelectedProfile(profile)}
                    className={classNames(
                      'w-full text-left p-3 rounded-xl border transition',
                      selectedProfile.id === profile.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{profile.label}</p>
                        <p className="text-xs text-gray-500">{profile.description}</p>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">
                        {profile.riskTier}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <button
                onClick={placeOrder}
                disabled={placing || cartItems.length === 0}
                className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow hover:bg-blue-700 disabled:bg-gray-300 disabled:shadow-none transition"
              >
                {placing ? 'Submitting...' : 'Place Order & Run Fraud Pipeline'}
              </button>
              {result?.transactionId && (
                <div className="text-sm text-gray-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  Order accepted.{' '}
                  <Link href={`/case/${result.transactionId}`} className="text-emerald-700 font-semibold underline">
                    View case
                  </Link>
                </div>
              )}
              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{error}</div>}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
