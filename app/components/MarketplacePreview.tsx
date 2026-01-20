'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  brand: string;
  description: string;
  imageUrl: string;
  tags: string[];
};

export default function MarketplacePreview() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch('/api/marketplace/products');
        const data = await res.json();
        if (data.success && data.products) {
          // Show first 3 products as featured
          setProducts(data.products.slice(0, 3));
        }
      } catch (err) {
        console.error('Failed to load marketplace products:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  if (loading) {
    return (
      <section className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-xl shadow-gray-200/20">
        <div className="text-center py-8">
          <p className="text-gray-400 text-sm">Loading marketplace...</p>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-xl shadow-gray-200/20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em]">Live Demo</p>
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
            Try the Full-Funnel Experience
          </h2>
          <p className="text-gray-500 font-medium text-sm max-w-2xl">
            Place an order in our demo marketplace and watch the fraud detection pipeline analyze it in real-time.
            Choose products, select a buyer profile, and see agents make decisions.
          </p>
        </div>
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-md hover:bg-blue-700 transition-all hover:-translate-y-0.5"
        >
          Open Marketplace
          <span className="text-lg">→</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {products.map((product) => (
          <div
            key={product.id}
            className="group relative bg-neutral-50/50 rounded-2xl border border-gray-100 overflow-hidden hover:border-blue-200 hover:shadow-md transition-all duration-300"
          >
            <div
              className="h-48 bg-gray-100 relative overflow-hidden"
              style={{
                backgroundImage: `url(${product.imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">
                    {product.category}
                  </p>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                    {product.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-black text-gray-900">${product.price.toFixed(2)}</p>
                  <p className="text-[10px] text-gray-400 font-semibold">{product.brand}</p>
                </div>
                {product.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {product.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-[9px] font-semibold rounded-full bg-blue-50 text-blue-600 border border-blue-100"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-8 border-t border-gray-100">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              🛒
            </div>
            <div>
              <p className="font-semibold text-gray-900">Complete Checkout Flow</p>
              <p className="text-xs text-gray-500">Cart, buyer profiles, and order processing</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              🤖
            </div>
            <div>
              <p className="font-semibold text-gray-900">Auto Fraud Analysis</p>
              <p className="text-xs text-gray-500">Agents analyze your order automatically</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              📊
            </div>
            <div>
              <p className="font-semibold text-gray-900">Live Case Tracking</p>
              <p className="text-xs text-gray-500">Watch decisions happen in real-time</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
