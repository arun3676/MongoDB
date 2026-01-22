import crypto from 'crypto';
import { COLLECTIONS, getDatabase } from '../mongodb';
import { sendEmailNotification, sendSMSNotification, sendWebhookNotification } from '../notifications';
import { runBuyerDecisionAgent } from './buyer-decision-agent';
import { getBaseUrl } from '../env';

type VerificationStatus = 'PENDING' | 'VERIFIED' | 'CONFIRMED' | 'DISPUTED' | 'EXPIRED';

interface VerificationSession {
  sessionId: string;
  transactionId: string;
  userId: string;
  sessionTokenHash: string;
  status: VerificationStatus;
  createdAt: Date;
  expiresAt: Date;
  verifiedAt?: Date;
  customerResponse?: 'CONFIRMED' | 'DISPUTED';
  identityVerified: boolean;
  metadata?: {
    notificationSent?: boolean;
    notificationChannel?: 'email' | 'sms' | 'webhook';
    notificationTarget?: {
      phone?: string | null;
      email?: string | null;
      webhookUrl?: string | null;
    };
    escalationReason?: string;
  };
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function normalizePhoneE164(phone?: string | number | null) {
  if (phone === undefined || phone === null) return null;
  const normalized = typeof phone === 'string' ? phone : String(phone);
  const trimmed = normalized.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('+')) {
    const cleaned = `+${trimmed.slice(1).replace(/\D/g, '')}`;
    return /^\+\d{10,15}$/.test(cleaned) ? cleaned : null;
  }
  return null;
}

function getContactInfo(transaction: any) {
  const metadata = transaction?.metadata || {};
  return {
    phone:
      metadata.phone ||
      metadata.phoneNumber ||
      metadata.userPhone ||
      metadata.contactPhone ||
      metadata.contact?.phone,
    email:
      metadata.email ||
      metadata.userEmail ||
      metadata.contactEmail ||
      metadata.contact?.email,
    webhookUrl: metadata.webhookUrl || metadata.contact?.webhookUrl,
  };
}

function createVerificationId() {
  return `ver_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function logVerificationEvent(params: {
  transactionId: string;
  sessionId: string;
  eventType: string;
  channel?: string;
  payload?: Record<string, any>;
}) {
  const db = await getDatabase();
  await db.collection(COLLECTIONS.VERIFICATIONS).insertOne({
    verificationId: createVerificationId(),
    transactionId: params.transactionId,
    sessionId: params.sessionId,
    eventType: params.eventType,
    channel: params.channel,
    payload: params.payload || {},
    createdAt: new Date(),
  });
}

export async function createVerificationSession(transactionId: string) {
  const db = await getDatabase();
  const token = crypto.randomBytes(32).toString('hex');
  const sessionId = `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

  const transaction = await db.collection(COLLECTIONS.TRANSACTIONS).findOne({ transactionId });
  if (!transaction) {
    throw new Error(`Transaction ${transactionId} not found`);
  }

  const { phone, email, webhookUrl } = getContactInfo(transaction);
  const normalizedPhone = normalizePhoneE164(phone);
  const phoneValue = phone ? String(phone) : null;

  const session: VerificationSession = {
    sessionId,
    transactionId,
    userId: transaction.userId,
    sessionTokenHash: hashToken(token),
    status: 'PENDING',
    createdAt: now,
    expiresAt,
    identityVerified: false,
    metadata: {
      notificationSent: false,
      notificationTarget: {
        phone: normalizedPhone || phoneValue,
        email: email || null,
        webhookUrl: webhookUrl || null,
      },
    },
  };

  await db.collection(COLLECTIONS.VERIFICATION_SESSIONS).insertOne(session);

  await logVerificationEvent({
    transactionId,
    sessionId,
    eventType: 'SESSION_CREATED',
    payload: {
      expiresAt,
      notificationTarget: session.metadata?.notificationTarget,
    },
  });

  return { sessionId, token, expiresAt };
}

export async function sendNotification(transactionId: string, sessionToken: string) {
  const db = await getDatabase();
  const transaction = await db.collection(COLLECTIONS.TRANSACTIONS).findOne({ transactionId });

  if (!transaction) {
    throw new Error(`Transaction ${transactionId} not found`);
  }

  const baseUrl = getBaseUrl();
  const verificationLink = `${baseUrl}/verify/${sessionToken}`;

  const { phone, email, webhookUrl } = getContactInfo(transaction);
  const normalizedPhone = normalizePhoneE164(phone);
  const phoneValue = phone ? String(phone) : null;

  const amount = transaction?.amount;
  const currency = transaction?.currency || 'USD';
  const merchantId = transaction?.merchantId || 'merchant';
  let amountDisplay = 'this purchase';
  if (typeof amount === 'number') {
    try {
      amountDisplay = new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
    } catch (error) {
      amountDisplay = `$${amount.toFixed(2)}`;
    }
  }
  const message =
    typeof amount === 'number'
      ? `Reply YES to confirm your ${amountDisplay} purchase at ${merchantId}. Reply NO if not you. ${verificationLink}`
      : `Reply YES to confirm this purchase. Reply NO if not you. ${verificationLink}`;

  let channel: 'email' | 'sms' | 'webhook' = 'email';

  if (webhookUrl) {
    await sendWebhookNotification(webhookUrl, { transactionId, verificationLink });
    channel = 'webhook';
  } else if (normalizedPhone) {
    await sendSMSNotification(normalizedPhone, verificationLink, message);
    channel = 'sms';
  } else {
    await sendEmailNotification(email || 'customer@example.com', verificationLink, message);
    channel = 'email';
  }

  await db.collection(COLLECTIONS.VERIFICATION_SESSIONS).updateOne(
    { transactionId, sessionTokenHash: hashToken(sessionToken) },
    {
      $set: {
        'metadata.notificationSent': true,
        'metadata.notificationChannel': channel,
        'metadata.notificationTarget': {
          phone: normalizedPhone || phoneValue,
          email: email || null,
          webhookUrl: webhookUrl || null,
        },
      },
    }
  );

  const session = await db.collection(COLLECTIONS.VERIFICATION_SESSIONS).findOne(
    { transactionId, sessionTokenHash: hashToken(sessionToken) },
    { projection: { sessionId: 1 } }
  );

  if (session?.sessionId) {
    await logVerificationEvent({
      transactionId,
      sessionId: session.sessionId,
      eventType: 'NOTIFICATION_SENT',
      channel,
      payload: {
        target: {
          phone: normalizedPhone || phoneValue,
          email: email || null,
          webhookUrl: webhookUrl || null,
        },
      },
    });
  }

  return { channel, verificationLink };
}

export async function triggerCustomerNotification(transactionId: string) {
  const { token, sessionId } = await createVerificationSession(transactionId);
  await sendNotification(transactionId, token);

  const db = await getDatabase();
  await db.collection(COLLECTIONS.AGENT_STEPS).insertOne({
    transactionId,
    stepNumber: await db.collection(COLLECTIONS.AGENT_STEPS).countDocuments({ transactionId }) + 1,
    agentName: 'Customer Notification Agent',
    action: 'NOTIFICATION_SENT',
    timestamp: new Date(),
    output: { sessionId },
  });

  return { sessionId, token };
}

export async function verifyCustomerIdentity(sessionToken: string, verificationData: Record<string, any>) {
  const db = await getDatabase();
  const session = await db.collection(COLLECTIONS.VERIFICATION_SESSIONS).findOne({
    sessionTokenHash: hashToken(sessionToken),
  });

  if (!session) {
    throw new Error('Invalid verification session');
  }

  if (session.expiresAt < new Date()) {
    await db.collection(COLLECTIONS.VERIFICATION_SESSIONS).updateOne(
      { sessionTokenHash: hashToken(sessionToken) },
      { $set: { status: 'EXPIRED' } }
    );
    throw new Error('Verification session expired');
  }

  // Minimal identity verification: match last4 if present
  const expectedLast4 = session?.metadata?.['last4'] || session?.['last4'];
  const providedLast4 = verificationData?.last4;
  const identityVerified = expectedLast4 ? expectedLast4 === providedLast4 : true;

  await db.collection(COLLECTIONS.VERIFICATION_SESSIONS).updateOne(
    { sessionTokenHash: hashToken(sessionToken) },
    { $set: { status: 'VERIFIED', verifiedAt: new Date(), identityVerified } }
  );

  await logVerificationEvent({
    transactionId: session.transactionId,
    sessionId: session.sessionId,
    eventType: 'IDENTITY_VERIFIED',
    payload: { identityVerified },
  });

  return { identityVerified };
}

async function processCustomerResponse(
  session: any,
  response: 'CONFIRMED' | 'DISPUTED',
  source: 'web' | 'sms' | 'webhook'
) {
  const db = await getDatabase();

  if (session.expiresAt < new Date()) {
    await db.collection(COLLECTIONS.VERIFICATION_SESSIONS).updateOne(
      { sessionId: session.sessionId },
      { $set: { status: 'EXPIRED' } }
    );
    throw new Error('Verification session expired');
  }

  const newStatus: VerificationStatus = response === 'CONFIRMED' ? 'CONFIRMED' : 'DISPUTED';

  await db.collection(COLLECTIONS.VERIFICATION_SESSIONS).updateOne(
    { sessionId: session.sessionId },
    { $set: { status: newStatus, customerResponse: response, updatedAt: new Date() } }
  );

  await logVerificationEvent({
    transactionId: session.transactionId,
    sessionId: session.sessionId,
    eventType: 'CUSTOMER_RESPONSE',
    channel: source,
    payload: { response, identityVerified: session.identityVerified },
  });

  const transactionUpdates: Record<string, any> = {
    updatedAt: new Date(),
    verificationRequired: false,
    verificationStatus: newStatus,
  };

  if (response === 'CONFIRMED') {
    transactionUpdates.customerConfirmed = true;
  } else {
    transactionUpdates.customerDisputed = true;
    await escalateToHumanAgent(session.transactionId, 'Customer disputed transaction');
  }

  await db.collection(COLLECTIONS.TRANSACTIONS).updateOne(
    { transactionId: session.transactionId },
    { $set: transactionUpdates }
  );

  await db.collection(COLLECTIONS.AGENT_STEPS).insertOne({
    transactionId: session.transactionId,
    stepNumber: await db.collection(COLLECTIONS.AGENT_STEPS).countDocuments({ transactionId: session.transactionId }) + 1,
    agentName: 'Customer Notification Agent',
    action: response === 'CONFIRMED' ? 'CUSTOMER_CONFIRMED' : 'CUSTOMER_DISPUTED',
    timestamp: new Date(),
    output: { response },
  });

  setImmediate(() => {
    runBuyerDecisionAgent(session.transactionId, [], {
      verificationContext: {
        sessionId: session.sessionId,
        response,
        identityVerified: session.identityVerified,
        channel: source,
        receivedAt: new Date(),
      },
    }).catch((error) => {
      console.error('[Customer Notification Agent] Buyer/Decision re-evaluation failed:', error);
    });
  });

  return { status: newStatus };
}

export async function handleCustomerResponse(
  sessionToken: string,
  response: 'CONFIRMED' | 'DISPUTED',
  source: 'web' | 'sms' | 'webhook' = 'web'
) {
  const db = await getDatabase();
  const session = await db.collection(COLLECTIONS.VERIFICATION_SESSIONS).findOne({
    sessionTokenHash: hashToken(sessionToken),
  });

  if (!session) {
    throw new Error('Invalid verification session');
  }

  return processCustomerResponse(session, response, source);
}

export async function handleCustomerResponseBySessionId(
  sessionId: string,
  response: 'CONFIRMED' | 'DISPUTED',
  source: 'web' | 'sms' | 'webhook' = 'sms'
) {
  const db = await getDatabase();
  const session = await db.collection(COLLECTIONS.VERIFICATION_SESSIONS).findOne({ sessionId });

  if (!session) {
    throw new Error('Invalid verification session');
  }

  return processCustomerResponse(session, response, source);
}

export async function escalateToHumanAgent(transactionId: string, reason: string) {
  const db = await getDatabase();
  await db.collection(COLLECTIONS.TRANSACTIONS).updateOne(
    { transactionId },
    { $set: { requiresHumanReview: true, escalationReason: reason, updatedAt: new Date() } }
  );

  await db.collection(COLLECTIONS.AGENT_STEPS).insertOne({
    transactionId,
    stepNumber: await db.collection(COLLECTIONS.AGENT_STEPS).countDocuments({ transactionId }) + 1,
    agentName: 'Customer Notification Agent',
    action: 'ESCALATED_TO_HUMAN',
    timestamp: new Date(),
    output: { reason },
  });
}
