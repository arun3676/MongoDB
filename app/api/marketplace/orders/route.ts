/**
 * POST /api/marketplace/orders
 *
 * Example payload:
 * {
 *   "buyer": {
 *     "id": "buyer_204",
 *     "name": "Ava Martin",
 *     "email": "ava@example.com",
 *     "phone": "+15551234567",
 *     "accountAgeDays": 12,
 *     "riskTier": "medium"
 *   },
 *   "items": [
 *     { "productId": "prd_headphones_aurora", "quantity": 1 },
 *     { "productId": "prd_backpack_orbit", "quantity": 2 }
 *   ],
 *   "shipping": {
 *     "address1": "425 Market St",
 *     "city": "San Francisco",
 *     "state": "CA",
 *     "postalCode": "94105",
 *     "country": "US"
 *   },
 *   "payment": {
 *     "method": "card",
 *     "provider": "visa",
 *     "cardLast4": "4242"
 *   },
 *   "metadata": {
 *     "deviceId": "dev_784",
 *     "ipAddress": "74.23.10.5",
 *     "userAgent": "Marketplace iOS 1.0"
 *   }
 * }
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb';
import { runSuspicionAgent } from '@/lib/agents/suspicion-agent';
import { buildLineItems, calculateTotals } from '@/lib/marketplace/catalog';

export const dynamic = 'force-dynamic';

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getRiskFlags(items: Array<{ tags: string[] }>) {
  const flags: string[] = [];
  const hasHighValue = items.some((item) => item.tags.includes('high_value'));
  const hasGiftCard = items.some((item) => item.tags.includes('gift_card') || item.tags.includes('high_risk'));

  if (hasHighValue) flags.push('HIGH_VALUE_ITEM');
  if (hasGiftCard) flags.push('GIFT_CARD_PURCHASE');

  return flags;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orderId,
      buyer,
      items,
      shipping,
      payment,
      metadata = {},
      currency = 'USD',
      marketplaceId = 'marketplace_nexus',
      event = {},
    } = body || {};

    if (!buyer || !buyer.id) {
      return NextResponse.json(
        { success: false, error: 'buyer.id is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'items array is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const resolvedOrderId = orderId || makeId('ORD-MKT');

    if (orderId) {
      const existing = await db
        .collection(COLLECTIONS.MARKETPLACE_ORDERS)
        .findOne({ orderId });
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'orderId already exists' },
          { status: 409 }
        );
      }
    }

    const lineItems = buildLineItems(items);
    const totals = calculateTotals(lineItems);
    const transactionId = makeId('TX-MKT');
    const now = new Date();

    const buyerEmail = buyer.email || null;
    const buyerPhone = buyer.phone || buyer.phoneNumber || null;
    const accountAgeDays = Number.isFinite(Number(buyer.accountAgeDays))
      ? Number(buyer.accountAgeDays)
      : null;
    const riskTier = buyer.riskTier || null;
    const riskFlags = getRiskFlags(lineItems);
    const newAccount = accountAgeDays !== null ? accountAgeDays < 7 : false;
    const highRisk =
      riskTier === 'high' || riskFlags.includes('GIFT_CARD_PURCHASE') || totals.total > 1500;
    const shippingCountry = shipping?.country || 'US';
    const internationalTransfer = shippingCountry.toUpperCase() !== 'US';
    const hour = now.getHours();
    const unusualHour = hour < 6 || hour >= 23;

    const orderDocument = {
      orderId: resolvedOrderId,
      transactionId,
      marketplaceId,
      status: 'PROCESSING',
      currency,
      buyer: {
        id: buyer.id,
        name: buyer.name || null,
        email: buyerEmail,
        phone: buyerPhone,
        accountAgeDays,
        riskTier,
      },
      items: lineItems,
      pricing: totals,
      shipping: shipping || null,
      payment: payment || null,
      event: {
        eventId: event.eventId || makeId('evt'),
        eventType: event.eventType || 'order.created',
        source: event.source || 'marketplace_demo',
      },
      risk: {
        riskFlags,
        highRisk,
        newAccount,
        internationalTransfer,
        unusualHour,
      },
      createdAt: now,
      updatedAt: now,
    };

    await db.collection(COLLECTIONS.MARKETPLACE_ORDERS).insertOne(orderDocument);

    const transactionMetadata = {
      marketplaceOrderId: resolvedOrderId,
      orderTotal: totals.total,
      itemCount: totals.itemCount,
      categories: Array.from(new Set(lineItems.map((item) => item.category))),
      riskFlags,
      paymentMethod: payment?.method || null,
      cardLast4: payment?.cardLast4 || null,
      shippingCountry,
      deviceId: metadata.deviceId || null,
      ipAddress: metadata.ipAddress || null,
      userAgent: metadata.userAgent || null,
      phone: buyerPhone,
      email: buyerEmail,
      newAccount,
      highRisk,
      internationalTransfer,
      unusualHour,
    };

    await runSuspicionAgent({
      transactionId,
      amount: totals.total,
      currency,
      userId: buyer.id,
      merchantId: marketplaceId,
      metadata: transactionMetadata,
    });

    return NextResponse.json({
      success: true,
      orderId: resolvedOrderId,
      transactionId,
      status: 'PROCESSING',
      amount: totals.total,
      currency,
      pollUrl: `/api/case/${transactionId}`,
      orderUrl: `/api/marketplace/orders/${resolvedOrderId}`,
    });
  } catch (error) {
    console.error('[API] Marketplace order failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create marketplace order',
      },
      { status: 500 }
    );
  }
}
