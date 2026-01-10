import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
    try {
        const db = await getDatabase();

        // Fetch all transactions, sorted by creation date (newest first)
        const transactions = await db
            .collection(COLLECTIONS.TRANSACTIONS)
            .find({})
            .sort({ createdAt: -1 })
            .toArray();

        return NextResponse.json({
            success: true,
            count: transactions.length,
            cases: transactions.map(tx => ({
                transactionId: tx.transactionId,
                amount: tx.amount,
                currency: tx.currency,
                userId: tx.userId,
                merchantId: tx.merchantId,
                status: tx.status,
                createdAt: tx.createdAt,
                totalCost: tx.totalCost || 0,
                finalDecision: tx.finalDecision,
            })),
        });
    } catch (error) {
        console.error('[API] Failed to fetch case list:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to retrieve cases',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
