import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb';
import {
  verifyCustomerIdentity,
  handleCustomerResponse,
} from '@/lib/agents/customer-notification-agent';
import crypto from 'crypto';

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionToken: string }> }
) {
  try {
    const { sessionToken: token } = await params;
    const db = await getDatabase();
    const session = await db.collection(COLLECTIONS.VERIFICATION_SESSIONS).findOne({
      sessionTokenHash: hashToken(token),
    });

    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        transactionId: session.transactionId,
        status: session.status,
        expiresAt: session.expiresAt,
        identityVerified: session.identityVerified,
        customerResponse: session.customerResponse,
      },
    });
  } catch (error) {
    console.error('[API] Verification session lookup failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve verification session' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionToken: string }> }
) {
  try {
    const { sessionToken: token } = await params;
    const body = await req.json();
    const { action } = body;

    if (action === 'verify') {
      const result = await verifyCustomerIdentity(token, body);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'respond') {
      const { response } = body;
      if (response !== 'CONFIRMED' && response !== 'DISPUTED') {
        return NextResponse.json({ success: false, error: 'Invalid response' }, { status: 400 });
      }
      const result = await handleCustomerResponse(token, response, 'web');
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[API] Verification handler failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
