import { inArray } from 'drizzle-orm';
import { db } from '../config/db.js';
import { deals, patterns, dealStageHistory } from '../db/schema.js';
import { callClaude, chunkText } from './claude.service.js';
import {
  PatternExtractionResponseSchema,
  FALLBACK_PATTERNS,
  type PatternExtractionResponse,
} from './pattern-extraction.schemas.js';

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

// ── Prompt Constants ─────────────────────────────

const SYSTEM_PROMPT = `You are a B2B sales analyst specializing in closed-won deal analysis. Your job is to identify repeatable patterns from successful deals that can be used to target similar prospects.

Respond ONLY with valid JSON — no markdown, no explanation, no text before or after the JSON object.`;

function buildAnalysisPrompt(dealSummaries: string, dealCount: number): string {
  return `Here are ${dealCount} closed-won B2B deals. Analyze the patterns across these deals.

${dealSummaries}

Based on these deals, extract the following patterns as a JSON object:
{
  "painPoints": ["3-5 specific pain points these buyers likely experienced, inferred from their industry, company size, and roles involved"],
  "winningSubjects": ["3-5 cold email subject line templates that would resonate with similar prospects, using placeholders like {Company}, {Industry}, {painPoint}"],
  "commonObjections": ["3-5 sales objections these buyers likely raised during the sales process"],
  "championRoles": ["3-5 job titles that were the key champions or decision-makers in these deals"]
}`;
}

function buildMergePrompt(chunkResults: PatternExtractionResponse[]): string {
  return `I analyzed multiple batches of closed-won deals and got these partial results. Merge them into a single consolidated analysis, keeping the top 3-5 most common/important items for each category. Remove duplicates and near-duplicates.

Partial results:
${JSON.stringify(chunkResults, null, 2)}

Return a single merged JSON object:
{
  "painPoints": ["3-5 consolidated pain points"],
  "winningSubjects": ["3-5 consolidated subject line templates"],
  "commonObjections": ["3-5 consolidated objections"],
  "championRoles": ["3-5 consolidated champion roles"]
}`;
}

// ── Deal Summary Builder ─────────────────────────

type DealRow = typeof deals.$inferSelect;

interface StageInfo {
  stageName: string;
  durationDays: number | null;
}

function buildDealSummary(
  deal: DealRow,
  stageInfo: StageInfo[],
): string {
  const parts = [
    deal.companyName ?? 'Unknown Company',
    deal.industry ? `Industry: ${deal.industry}` : null,
    deal.amount ? `Deal size: $${Number(deal.amount).toLocaleString()}` : null,
    deal.employeeCount ? `Employees: ${deal.employeeCount}` : null,
    deal.contactTitle ? `Champion: ${deal.contactTitle}` : null,
    deal.contactName ? `Contact: ${deal.contactName}` : null,
    deal.description ? `Description: ${deal.description}` : null,
    deal.closeDate ? `Closed: ${deal.closeDate}` : null,
  ].filter(Boolean);

  if (stageInfo.length > 0) {
    const stages = stageInfo
      .map((s) => `${s.stageName}${s.durationDays ? ` (${s.durationDays}d)` : ''}`)
      .join(' → ');
    parts.push(`Stages: ${stages}`);
  }

  return `- ${parts.join(' | ')}`;
}

// ── LLM Pattern Analysis ────────────────────────

async function analyzePatternsWithLLM(
  dealSummaries: string,
  dealCount: number,
): Promise<{ patterns: PatternExtractionResponse; rawOutput: string }> {
  const chunks = chunkText(dealSummaries);

  if (chunks.length === 1) {
    // Single call — all deals fit in one prompt
    const result = await callClaude({
      systemPrompt: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildAnalysisPrompt(chunks[0], dealCount) }],
      maxTokens: 2000,
    });

    const parsed = PatternExtractionResponseSchema.safeParse(result.json);
    if (parsed.success) {
      return { patterns: parsed.data, rawOutput: result.text };
    }

    console.warn('[pattern-extraction] LLM response failed Zod validation, using fallback');
    return { patterns: FALLBACK_PATTERNS, rawOutput: result.text };
  }

  // Multi-chunk: analyze each chunk, then merge
  const chunkResults: PatternExtractionResponse[] = [];
  const rawOutputs: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkDealCount = chunks[i].split('\n- ').length - 1 || 1;
    const result = await callClaude({
      systemPrompt: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildAnalysisPrompt(chunks[i], chunkDealCount) }],
      maxTokens: 2000,
    });

    rawOutputs.push(`--- Chunk ${i + 1} ---\n${result.text}`);

    const parsed = PatternExtractionResponseSchema.safeParse(result.json);
    if (parsed.success) {
      chunkResults.push(parsed.data);
    }
  }

  if (chunkResults.length === 0) {
    console.warn('[pattern-extraction] All chunks failed validation, using fallback');
    return { patterns: FALLBACK_PATTERNS, rawOutput: rawOutputs.join('\n') };
  }

  // Merge results
  const mergeResult = await callClaude({
    systemPrompt: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildMergePrompt(chunkResults) }],
    maxTokens: 2000,
  });

  rawOutputs.push(`--- Merge ---\n${mergeResult.text}`);

  const merged = PatternExtractionResponseSchema.safeParse(mergeResult.json);
  if (merged.success) {
    return { patterns: merged.data, rawOutput: rawOutputs.join('\n') };
  }

  // If merge fails, use the first chunk's result
  return { patterns: chunkResults[0], rawOutput: rawOutputs.join('\n') };
}

// ── Extract Patterns (Main Entry Point) ──────────

export async function extractPatterns(
  analysisId: string,
  dealIds: string[],
): Promise<ExtractedPatterns> {
  // 1. Fetch the selected deals
  const selectedDeals = await db
    .select()
    .from(deals)
    .where(inArray(deals.id, dealIds));

  // 2. Fetch stage histories
  const histories = await db
    .select()
    .from(dealStageHistory)
    .where(inArray(dealStageHistory.dealId, dealIds));

  // Group stage history by deal
  const stagesByDeal = new Map<string, StageInfo[]>();
  for (const h of histories) {
    const existing = stagesByDeal.get(h.dealId) ?? [];
    existing.push({ stageName: h.stageName, durationDays: h.durationDays });
    stagesByDeal.set(h.dealId, existing);
  }

  // 3. Build deal summaries for LLM
  const summaries = selectedDeals
    .map((deal) => buildDealSummary(deal, stagesByDeal.get(deal.id) ?? []))
    .join('\n');

  // 4. Call Claude for LLM-extracted patterns
  const { patterns: llmPatterns, rawOutput } = await analyzePatternsWithLLM(
    summaries,
    selectedDeals.length,
  );

  // 5. Compute data-driven stats
  const amounts = selectedDeals
    .map((d) => parseFloat(d.amount ?? '0'))
    .filter((a) => a > 0);

  const industries: Record<string, number> = {};
  for (const deal of selectedDeals) {
    const ind = deal.industry ?? 'Unknown';
    industries[ind] = (industries[ind] ?? 0) + 1;
  }

  const dealHistoryMap = new Map<string, number>();
  for (const h of histories) {
    if (h.durationDays) {
      const current = dealHistoryMap.get(h.dealId) ?? 0;
      dealHistoryMap.set(h.dealId, current + h.durationDays);
    }
  }
  const cycleDays = [...dealHistoryMap.values()];
  const avgCycle = cycleDays.length > 0
    ? Math.round(cycleDays.reduce((a, b) => a + b, 0) / cycleDays.length)
    : 45;

  // 6. Merge LLM results + computed stats
  const extracted: ExtractedPatterns = {
    painPoints: llmPatterns.painPoints,
    winningSubjects: llmPatterns.winningSubjects,
    commonObjections: llmPatterns.commonObjections,
    championRoles: llmPatterns.championRoles,
    avgSalesCycleDays: avgCycle,
    industryBreakdown: industries,
    dealSizeRange: {
      min: amounts.length > 0 ? Math.min(...amounts) : 0,
      max: amounts.length > 0 ? Math.max(...amounts) : 0,
      avg: amounts.length > 0
        ? Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length)
        : 0,
    },
  };

  // 7. Persist to patterns table
  await db.insert(patterns).values({
    analysisId,
    painPoints: extracted.painPoints,
    winningSubjects: extracted.winningSubjects,
    commonObjections: extracted.commonObjections,
    avgSalesCycleDays: extracted.avgSalesCycleDays,
    championRoles: extracted.championRoles,
    industryBreakdown: extracted.industryBreakdown,
    dealSizeRange: extracted.dealSizeRange,
    rawLlmOutput: rawOutput,
  });

  return extracted;
}
