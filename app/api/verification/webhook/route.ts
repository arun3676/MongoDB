import { NextRequest, NextResponse } from 'next/server';
import { createVerificationSession } from '@/lib/agents/customer-notification-agent';
import { getBaseUrl } from '@/lib/env';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId } = body;

    if (!transactionId) {
      return NextResponse.json({ success: false, error: 'transactionId is required' }, { status: 400 });
    }

    const { token, sessionId, expiresAt } = await createVerificationSession(transactionId);

    const baseUrl = getBaseUrl();
    const verificationLink = `${baseUrl}/verify/${token}`;

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
