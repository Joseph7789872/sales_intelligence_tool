import { Worker, Job } from 'bullmq';
import { env } from '../config/env.js';
import { publishSSEEvent } from '../services/sse-publisher.js';
import {
  getAnalysis,
  updateAnalysisStatus,
} from '../services/analysis.service.js';
import { extractPatterns } from '../services/pattern-extraction.service.js';
import { findLookalikes } from '../services/lookalike-search.service.js';
import { generatePlaybooks } from '../services/playbook-generation.service.js';
import { db } from '../config/db.js';
import { jobLogs } from '../db/schema.js';

// ── Types ──────────────────────────────────────

export interface AnalysisJobData {
  userId: string;
  analysisId: string;
}

export interface AnalysisJobResult {
  patternsExtracted: boolean;
  prospectCount: number;
  playbookCount: number;
}

// ── Helpers ────────────────────────────────────

async function publishProgress(
  userId: string,
  analysisId: string,
  step: 'patterns' | 'lookalikes' | 'playbooks' | 'complete' | 'error',
  progress: number,
  message: string,
): Promise<void> {
  await publishSSEEvent(userId, {
    type: 'analysis:progress',
    payload: { analysisId, step, progress, message },
  });
}

async function publishStepComplete(
  userId: string,
  analysisId: string,
  step: string,
): Promise<void> {
  await publishSSEEvent(userId, {
    type: 'analysis:step-complete',
    payload: { analysisId, step },
  });
}

async function logJob(
  analysisId: string,
  jobId: string,
  queueName: string,
  status: string,
  durationMs?: number,
  errorMessage?: string,
): Promise<void> {
  await db.insert(jobLogs).values({
    analysisId,
    jobId,
    queueName,
    status,
    durationMs,
    errorMessage,
  });
}

// ── Worker Process Function ────────────────────

async function processAnalysis(
  job: Job<AnalysisJobData, AnalysisJobResult>,
): Promise<AnalysisJobResult> {
  const { userId, analysisId } = job.data;
  const startTime = Date.now();

  // Validate analysis exists
  const analysis = await getAnalysis(analysisId);
  if (!analysis) {
    throw new Error(`Analysis ${analysisId} not found`);
  }

  const selectedDealIds = analysis.selectedDealIds as string[];

  // 1. Set status to processing
  await updateAnalysisStatus(analysisId, 'processing');
  await job.updateProgress(0);

  // 2. Pattern Extraction
  await publishProgress(userId, analysisId, 'patterns', 5, 'Analyzing deal patterns...');

  let extractedPatterns;
  try {
    extractedPatterns = await extractPatterns(analysisId, selectedDealIds);
    await publishStepComplete(userId, analysisId, 'patterns');
    await job.updateProgress(33);
    await publishProgress(userId, analysisId, 'patterns', 33, 'Patterns extracted successfully');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Pattern extraction failed';
    await updateAnalysisStatus(analysisId, 'failed', message, 'patterns');
    await publishSSEEvent(userId, {
      type: 'analysis:error',
      payload: { analysisId, step: 'patterns', error: message },
    });
    await logJob(analysisId, job.id!, 'analysis-orchestrator', 'failed', Date.now() - startTime, message);
    throw err;
  }

  // 3. Lookalike Search
  await publishProgress(userId, analysisId, 'lookalikes', 40, 'Searching for lookalike prospects...');

  let prospectResults;
  try {
    prospectResults = await findLookalikes(analysisId, extractedPatterns);
    await publishStepComplete(userId, analysisId, 'lookalikes');
    await job.updateProgress(66);
    await publishProgress(userId, analysisId, 'lookalikes', 66, `Found ${prospectResults.length} lookalike prospects`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lookalike search failed';
    await updateAnalysisStatus(analysisId, 'failed', message, 'lookalikes');
    await publishSSEEvent(userId, {
      type: 'analysis:error',
      payload: { analysisId, step: 'lookalikes', error: message },
    });
    await logJob(analysisId, job.id!, 'analysis-orchestrator', 'failed', Date.now() - startTime, message);
    throw err;
  }

  // 4. Playbook Generation
  await publishProgress(userId, analysisId, 'playbooks', 70, 'Generating sales playbooks...');

  let playbookCount: number;
  try {
    playbookCount = await generatePlaybooks(analysisId, extractedPatterns);
    await publishStepComplete(userId, analysisId, 'playbooks');
    await job.updateProgress(95);
    await publishProgress(userId, analysisId, 'playbooks', 95, `Generated ${playbookCount} playbooks`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Playbook generation failed';
    await updateAnalysisStatus(analysisId, 'failed', message, 'playbooks');
    await publishSSEEvent(userId, {
      type: 'analysis:error',
      payload: { analysisId, step: 'playbooks', error: message },
    });
    await logJob(analysisId, job.id!, 'analysis-orchestrator', 'failed', Date.now() - startTime, message);
    throw err;
  }

  // 5. Complete
  await updateAnalysisStatus(analysisId, 'completed');
  await job.updateProgress(100);
  await publishSSEEvent(userId, {
    type: 'analysis:complete',
    payload: { analysisId },
  });
  await publishProgress(userId, analysisId, 'complete', 100, 'Analysis complete!');

  const result: AnalysisJobResult = {
    patternsExtracted: true,
    prospectCount: prospectResults.length,
    playbookCount,
  };

  await logJob(analysisId, job.id!, 'analysis-orchestrator', 'completed', Date.now() - startTime);

  return result;
}

// ── Worker Instance ────────────────────────────

const connection = { url: env.REDIS_URL };

export const analysisOrchestratorWorker = new Worker<AnalysisJobData, AnalysisJobResult>(
  'analysis-orchestrator',
  processAnalysis,
  {
    connection,
    concurrency: 1,
    limiter: {
      max: 2,
      duration: 60_000,
    },
  },
);

analysisOrchestratorWorker.on('completed', (job, result) => {
  console.log(
    `[analysis-orchestrator] Completed for user ${job.data.userId}: ` +
    `${result.prospectCount} prospects, ${result.playbookCount} playbooks`,
  );
});

analysisOrchestratorWorker.on('failed', (job, err) => {
  console.error(
    `[analysis-orchestrator] Failed for user ${job?.data.userId}: ${err.message}`,
  );
});
