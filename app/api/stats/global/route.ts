import { NextResponse } from 'next/server';
import { COLLECTIONS, getDatabase } from '@/lib/mongodb';

const NETWORK_SIGNAL_PRICE = 0.25;

const lowRiskFilter = {
  status: 'COMPLETED',
  $or: [
    { 'metadata.riskLevel': 'LOW' },
    { 'metadata.riskTier': 'LOW' },
    { 'metadata.riskScore': { $lte: 0.35 } },
    { amount: { $lt: 50 } },
  ],
};

export async function GET() {
  try {
    const db = await getDatabase();

    // Total Fraud Prevented (sum of denied transaction amounts)
    const fraudPreventedAgg = await db
      .collection(COLLECTIONS.TRANSACTIONS)
      .aggregate([
        { $match: { status: 'COMPLETED', finalDecision: 'DENY' } },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();
    const totalFraudPrevented = Number(fraudPreventedAgg[0]?.total ?? 0);

    // Low-risk cases that avoided the $0.25 network signal
    const lowRiskAgg = await db
      .collection(COLLECTIONS.TRANSACTIONS)
      .aggregate([
        { $match: lowRiskFilter },
        {
          $lookup: {
            from: COLLECTIONS.SIGNALS,
            localField: 'transactionId',
            foreignField: 'transactionId',
            as: 'signals',
          },
        },
        {
          $addFields: {
            purchasedNetwork: {
              $anyElementTrue: {
                $map: {
                  input: '$signals',
                  as: 'signal',
                  in: { $eq: ['$$signal.signalType', 'network'] },
                },
              },
            },
          },
        },
        { $match: { purchasedNetwork: { $ne: true } } },
        { $count: 'count' },
      ])
      .toArray();
    const lowRiskCasesAvoided = lowRiskAgg[0]?.count ?? 0;
    const efficiencyGain = Number((lowRiskCasesAvoided * NETWORK_SIGNAL_PRICE).toFixed(2));

    // Average confidence of Arbiter (Debate Tribunal) decisions
    const arbiterAgg = await db
      .collection(COLLECTIONS.DECISIONS)
      .aggregate([
        {
          $match: {
            agentName: { $in: ['Debate Tribunal', 'Arbiter Agent'] },
            confidence: { $exists: true },
          },
        },
        {
          $group: {
            _id: null,
            avgConfidence: { $avg: '$confidence' },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();
    const averageConfidence = arbiterAgg[0]?.avgConfidence ?? 0;
    const arbiterDecisions = arbiterAgg[0]?.count ?? 0;

    const totalCases = await db
      .collection(COLLECTIONS.TRANSACTIONS)
      .countDocuments({ status: 'COMPLETED' });

    return NextResponse.json({
      success: true,
      stats: {
        totalFraudPrevented,
        efficiencyGain,
        averageConfidence: Number((averageConfidence * 100).toFixed(2)),
        totalCases,
        lowRiskCasesAvoided,
        arbiterDecisions,
      },
    });
  } catch (error) {
    console.error('[API] Global stats failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to compute global stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
