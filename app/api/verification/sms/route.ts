import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, COLLECTIONS } from '@/lib/mongodb';
import { handleCustomerResponseBySessionId } from '@/lib/agents/customer-notification-agent';

function normalizePhoneE164(phone?: string | null) {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('+')) {
    const cleaned = `+${trimmed.slice(1).replace(/\D/g, '')}`;
    return /^\+\d{10,15}$/.test(cleaned) ? cleaned : null;
  }
  return null;
}

function parseResponse(body?: string | null) {
  if (!body) return null;
  const normalized = body.trim().toUpperCase();
  const firstWord = normalized.split(/\s+/)[0];
  if (['YES', 'Y', 'CONFIRM', 'CONFIRMED', 'APPROVE', 'OK'].includes(firstWord)) {
    return 'CONFIRMED' as const;
  }
  if (['NO', 'N', 'DISPUTE', 'DISPUTED', 'FRAUD', 'DENY'].includes(firstWord)) {
    return 'DISPUTED' as const;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let from: string | null = null;
    let body: string | null = null;

    if (contentType.includes('application/json')) {
      const json = await request.json();
      from = json?.From || json?.from || null;
      body = json?.Body || json?.body || null;
    } else {
      const raw = await request.text();
      const params = new URLSearchParams(raw);
      from = params.get('From');
      body = params.get('Body');
    }

    const normalizedPhone = normalizePhoneE164(from);
    if (!normalizedPhone) {
      return NextResponse.json({ success: false, error: 'Missing or invalid From phone number' }, { status: 400 });
    }

    const response = parseResponse(body);
    if (!response) {
      return NextResponse.json({ success: false, error: 'Unsupported response' }, { status: 400 });
    }

    const db = await getDatabase();
    const sessions = await db
      .collection(COLLECTIONS.VERIFICATION_SESSIONS)
      .find({
        'metadata.notificationTarget.phone': normalizedPhone,
        status: { $in: ['PENDING', 'VERIFIED'] },
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    const session = sessions[0];
    if (!session) {
      return NextResponse.json({ success: false, error: 'No active verification session found' }, { status: 404 });
    }

    const result = await handleCustomerResponseBySessionId(session.sessionId, response, 'sms');
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[API] SMS verification handler failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
