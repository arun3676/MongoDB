'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SubmitForm() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        amount: '',
        currency: 'USD',
        userId: '',
        merchantId: '',
        metadata: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const amount = parseFloat(formData.amount);
        if (isNaN(amount) || amount <= 0) {
            setError('Amount must be greater than 0');
            return;
        }

        if (!formData.userId.trim()) {
            setError('User ID is required');
            return;
        }

        if (!formData.merchantId.trim()) {
            setError('Merchant ID is required');
            return;
        }

        setIsSubmitting(true);

        try {
            let metadata = undefined;
            if (formData.metadata.trim()) {
                try {
                    metadata = JSON.parse(formData.metadata);
                } catch (err) {
                    setError('Metadata must be valid JSON');
                    setIsSubmitting(false);
                    return;
                }
            }

            const response = await fetch('/api/case/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount,
                    currency: formData.currency,
                    userId: formData.userId.trim(),
                    merchantId: formData.merchantId.trim(),
                    metadata,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to create case');
            }

            router.push(`/case/${data.transactionId}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setIsSubmitting(false);
        }
    };

    const inputClasses = "w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 text-sm font-medium transition-all";
    const labelClasses = "block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1";

    return (
        <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-2xl shadow-gray-200/20 max-w-3xl mx-auto">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Manual Transaction Audit</h2>
                <p className="text-gray-500 font-medium text-sm">Input data to trigger the multi-agent neural evaluation cluster.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="sm:col-span-2">
                        <label htmlFor="amount" className={labelClasses}>
                            Transaction Amount
                        </label>
                        <input
                            type="number"
                            id="amount"
                            name="amount"
                            step="0.01"
                            min="0"
                            value={formData.amount}
                            onChange={handleChange}
                            required
                            disabled={isSubmitting}
                            className={inputClasses}
                            placeholder="0.00"
                        />
                    </div>

                    <div>
                        <label htmlFor="currency" className={labelClasses}>
                            Currency
                        </label>
                        <select
                            id="currency"
                            name="currency"
                            value={formData.currency}
                            onChange={handleChange}
                            disabled={isSubmitting}
                            className={inputClasses}
                        >
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="userId" className={labelClasses}>
                            Subject User ID
                        </label>
                        <input
                            type="text"
                            id="userId"
                            name="userId"
                            value={formData.userId}
                            onChange={handleChange}
                            required
                            disabled={isSubmitting}
                            className={inputClasses}
                            placeholder="user_8829"
                        />
                    </div>

                    <div>
                        <label htmlFor="merchantId" className={labelClasses}>
                            Target Merchant ID
                        </label>
                        <input
                            type="text"
                            id="merchantId"
                            name="merchantId"
                            value={formData.merchantId}
                            onChange={handleChange}
                            required
                            disabled={isSubmitting}
                            className={inputClasses}
                            placeholder="nexus_main"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="metadata" className={labelClasses}>
                        Contextual Metadata (JSON)
                    </label>
                    <textarea
                        id="metadata"
                        name="metadata"
                        value={formData.metadata}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        rows={4}
                        className={`${inputClasses} font-mono`}
                        placeholder='{ "ip": "1.1.1.1", "origin": "retail" }'
                    />
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-2xl text-xs font-bold" role="alert">
                        SYSTEM_ERROR: {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gray-900 text-white py-5 px-6 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all disabled:bg-gray-100 disabled:text-gray-300 shadow-xl shadow-gray-900/10 active:scale-95 flex items-center justify-center gap-3"
                >
                    {isSubmitting ? (
                        <>
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Analyzing...</span>
                        </>
                    ) : (
                        'Initiate Fraud Audit'
                    )}
                </button>
            </form>
        </div>
    );
}
