'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Product {
    id: string;
    name: string;
    price: number;
    image: string;
    category: string;
    description: string;
}

const PRODUCTS: Product[] = [
    {
        id: 'p1',
        name: 'Neural Processor Pro',
        price: 1299.99,
        image: 'https://images.unsplash.com/photo-1591405351990-4726e331f141?auto=format&fit=crop&w=800&q=80',
        category: 'Hardware',
        description: 'Next-gen AI processing unit for edge computing.'
    },
    {
        id: 'p2',
        name: 'Quantum Storage Drive',
        price: 850.00,
        image: 'https://images.unsplash.com/photo-1597733336794-12d05021d510?auto=format&fit=crop&w=800&q=80',
        category: 'Storage',
        description: 'Immutable quantum-encrypted data storage.'
    },
    {
        id: 'p3',
        name: 'Holographic Display X',
        price: 2499.00,
        image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80',
        category: 'Display',
        description: 'True 3D holographic projection system.'
    },
    {
        id: 'p4',
        name: 'Biometric Security Hub',
        price: 499.00,
        image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc51?auto=format&fit=crop&w=800&q=80',
        category: 'Security',
        description: 'Multi-factor biometric authentication node.'
    },
    {
        id: 'p5',
        name: 'Neural Link Interface',
        price: 3200.00,
        image: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80',
        category: 'Interface',
        description: 'Direct brain-computer communication bridge.'
    },
    {
        id: 'p6',
        name: 'Flux Capacitor Core',
        price: 99.00,
        image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
        category: 'Power',
        description: 'Stable temporal energy containment unit.'
    },
    {
        id: 'p7',
        name: 'Synthetic Synapse Kit',
        price: 150.00,
        image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
        category: 'Hardware',
        description: 'DIY neural network expansion components.'
    },
    {
        id: 'p8',
        name: 'Dark Matter Battery',
        price: 5200.00,
        image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
        category: 'Power',
        description: 'Infinite power source using dark matter stabilization.'
    }
];

export default function Marketplace() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [purchasingId, setPurchasingId] = useState<string | null>(null);

    const filteredProducts = PRODUCTS.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase())
    );

    const handlePurchase = async (product: Product) => {
        setPurchasingId(product.id);
        try {
            const response = await fetch('/api/case/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: product.price,
                    currency: 'USD',
                    userId: `user_market_${Math.floor(Math.random() * 10000)}`,
                    merchantId: 'market_main_01',
                    metadata: {
                        productId: product.id,
                        productName: product.name,
                        category: product.category,
                        interface: 'marketplace_middleware'
                    }
                }),
            });

            const data = await response.json();
            if (data.success) {
                router.push(`/case/${data.transactionId}`);
            }
        } catch (err) {
            console.error('Purchase failed:', err);
            setPurchasingId(null);
        }
    };

    return (
        <div className="space-y-8">
            {/* Search Header */}
            <div className="relative max-w-2xl mx-auto">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-4 border border-gray-200 rounded-2xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm transition-all"
                    placeholder="Search futuristic hardware, storage, or security..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map((product) => (
                    <div key={product.id} className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col">
                        <div className="relative h-48 overflow-hidden">
                            <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-blue-600 shadow-sm">
                                {product.category}
                            </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
                            <p className="text-gray-500 text-sm mb-4 flex-1 line-clamp-2">{product.description}</p>
                            <div className="flex items-center justify-between mt-4">
                                <span className="text-2xl font-black text-gray-900">${product.price.toLocaleString()}</span>
                                <button
                                    onClick={() => handlePurchase(product)}
                                    disabled={purchasingId !== null}
                                    className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-600 transition-colors disabled:bg-gray-400 flex items-center gap-2"
                                >
                                    {purchasingId === product.id ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Verifying...
                                        </>
                                    ) : 'Buy Now'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredProducts.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">No products found matching "{search}"</p>
                </div>
            )}
        </div>
    );
}
