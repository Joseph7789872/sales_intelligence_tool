import { eq, desc, and } from 'drizzle-orm';
import { db } from '../config/db.js';
import { analyses, patterns, prospects, playbooks } from '../db/schema.js';

// ── Create ───────────────────────────────────────

export async function createAnalysis(
  userId: string,
  selectedDealIds: string[],
) {
  const [analysis] = await db
    .insert(analyses)
    .values({
      userId,
      selectedDealIds: selectedDealIds,
      dealCount: selectedDealIds.length,
      status: 'pending',
    })
    .returning();

  return analysis;
}

// ── Update Status ────────────────────────────────

export async function updateAnalysisStatus(
  analysisId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  errorMessage?: string,
  errorStep?: string,
) {
  const updates: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  };

  if (status === 'processing') {
    updates.startedAt = new Date();
  }

  if (status === 'completed' || status === 'failed') {
    updates.completedAt = new Date();
  }

  if (errorMessage !== undefined) {
    updates.errorMessage = errorMessage;
  }

  if (errorStep !== undefined) {
    updates.errorStep = errorStep;
  }

  const [updated] = await db
    .update(analyses)
    .set(updates)
    .where(eq(analyses.id, analysisId))
    .returning();

  return updated;
}

// ── Read ─────────────────────────────────────────

export async function getAnalysis(analysisId: string) {
  const [analysis] = await db
    .select()
    .from(analyses)
    .where(eq(analyses.id, analysisId))
    .limit(1);

  return analysis ?? null;
}

export async function getAnalysisWithResults(analysisId: string) {
  const [analysis] = await db
    .select()
    .from(analyses)
    .where(eq(analyses.id, analysisId))
    .limit(1);

  if (!analysis) return null;

  const [pattern] = await db
    .select()
    .from(patterns)
    .where(eq(patterns.analysisId, analysisId))
    .limit(1);

  const prospectList = await db
    .select()
    .from(prospects)
    .where(eq(prospects.analysisId, analysisId));

  const playbookList = await db
    .select()
    .from(playbooks)
    .where(eq(playbooks.analysisId, analysisId));

  return {
    ...analysis,
    patterns: pattern ?? null,
    prospects: prospectList,
    playbooks: playbookList,
  };
}

export async function listUserAnalyses(userId: string) {
  const results = await db
    .select()
    .from(analyses)
    .where(eq(analyses.userId, userId))
    .orderBy(desc(analyses.createdAt));

  return results;
}

// ── Playbook Feedback ───────────────────────────

export async function updatePlaybookFeedback(
  playbookId: string,
  analysisId: string,
  feedback: 'thumbs_up' | 'thumbs_down',
) {
  const [updated] = await db
    .update(playbooks)
    .set({ userFeedback: feedback, updatedAt: new Date() })
    .where(
      and(eq(playbooks.id, playbookId), eq(playbooks.analysisId, analysisId)),
    )
    .returning();

  return updated ?? null;
}
