import { eq, inArray } from 'drizzle-orm';
import { db } from '../config/db.js';
import { deals, patterns, dealStageHistory } from '../db/schema.js';

// ── Types ──────────────────────────────────────

export interface ExtractedPatterns {
  painPoints: string[];
  winningSubjects: string[];
  commonObjections: string[];
  avgSalesCycleDays: number;
  championRoles: string[];
  industryBreakdown: Record<string, number>;
  dealSizeRange: { min: number; max: number; avg: number };
}

// ── Extract Patterns ─────────────────────────────
// TODO: Replace stub with Claude API call in a later step

export async function extractPatterns(
  analysisId: string,
  dealIds: string[],
): Promise<ExtractedPatterns> {
  // Fetch the selected deals for context
  const selectedDeals = await db
    .select()
    .from(deals)
    .where(inArray(deals.id, dealIds));

  // Compute real stats from deal data
  const amounts = selectedDeals
    .map((d) => parseFloat(d.amount ?? '0'))
    .filter((a) => a > 0);

  const industries: Record<string, number> = {};
  for (const deal of selectedDeals) {
    const ind = deal.industry ?? 'Unknown';
    industries[ind] = (industries[ind] ?? 0) + 1;
  }

  // Fetch stage histories to compute avg sales cycle
  const histories = await db
    .select()
    .from(dealStageHistory)
    .where(inArray(dealStageHistory.dealId, dealIds));

  const cycleDays: number[] = [];
  const dealHistoryMap = new Map<string, number>();
  for (const h of histories) {
    if (h.durationDays) {
      const current = dealHistoryMap.get(h.dealId) ?? 0;
      dealHistoryMap.set(h.dealId, current + h.durationDays);
    }
  }
  for (const total of dealHistoryMap.values()) {
    cycleDays.push(total);
  }

  const avgCycle = cycleDays.length > 0
    ? Math.round(cycleDays.reduce((a, b) => a + b, 0) / cycleDays.length)
    : 45;

  // Stub: LLM-extracted fields (will be replaced with Claude API call)
  const extracted: ExtractedPatterns = {
    painPoints: [
      'Manual data entry consuming 10+ hours/week',
      'Lack of visibility into pipeline health',
      'Inability to forecast revenue accurately',
    ],
    winningSubjects: [
      'How {Company} reduced pipeline review time by 60%',
      'Your {Industry} peers are closing 30% faster',
      '{Contact}, quick question about {painPoint}',
    ],
    commonObjections: [
      'We already have a CRM solution',
      'Budget is locked for this quarter',
      'Need to get buy-in from the team',
    ],
    avgSalesCycleDays: avgCycle,
    championRoles: [
      'VP of Sales',
      'Director of Revenue Operations',
      'Head of Sales Enablement',
    ],
    industryBreakdown: industries,
    dealSizeRange: {
      min: amounts.length > 0 ? Math.min(...amounts) : 0,
      max: amounts.length > 0 ? Math.max(...amounts) : 0,
      avg: amounts.length > 0
        ? Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length)
        : 0,
    },
  };

  // Persist to patterns table
  await db.insert(patterns).values({
    analysisId,
    painPoints: extracted.painPoints,
    winningSubjects: extracted.winningSubjects,
    commonObjections: extracted.commonObjections,
    avgSalesCycleDays: extracted.avgSalesCycleDays,
    championRoles: extracted.championRoles,
    industryBreakdown: extracted.industryBreakdown,
    dealSizeRange: extracted.dealSizeRange,
    rawLlmOutput: 'STUB — no LLM call made',
  });

  return extracted;
}
