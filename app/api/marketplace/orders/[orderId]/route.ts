import { NextResponse } from 'next/server';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'orderId is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const order = await db
      .collection(COLLECTIONS.MARKETPLACE_ORDERS)
      .findOne({ orderId });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const transaction = await db
      .collection(COLLECTIONS.TRANSACTIONS)
      .findOne({ transactionId: order.transactionId });

    return NextResponse.json({
      success: true,
      order,
      transaction: transaction
        ? {
            transactionId: transaction.transactionId,
            status: transaction.status,
            finalDecision: transaction.finalDecision,
            confidence: transaction.confidence,
            updatedAt: transaction.updatedAt,
          }
        : null,
      pollUrl: transaction ? `/api/case/${transaction.transactionId}` : null,
    });
  } catch (error) {
    console.error('[API] Marketplace order lookup failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load marketplace order' },
      { status: 500 }
    );
  }
}
