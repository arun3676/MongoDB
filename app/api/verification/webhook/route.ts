import { NextRequest, NextResponse } from 'next/server';
import { createVerificationSession } from '@/lib/agents/customer-notification-agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId } = body;

    if (!transactionId) {
      return NextResponse.json({ success: false, error: 'transactionId is required' }, { status: 400 });
    }

    const { token, sessionId, expiresAt } = await createVerificationSession(transactionId);

    const verificationLink = `${process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:3001'}/verify/${token}`;

    return NextResponse.json({
      success: true,
      sessionId,
      verificationLink,
      expiresAt,
    });
  } catch (error) {
    console.error('[API] Verification webhook failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
