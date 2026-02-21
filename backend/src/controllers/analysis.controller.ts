import type { Request, Response, NextFunction } from 'express';
import { analysisOrchestratorQueue } from '../config/queues.js';
import * as analysisService from '../services/analysis.service.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

const MIN_DEALS = 10;

/**
 * POST /api/v1/analyses
 * Creates an analysis and enqueues the orchestrator job.
 */
export async function startAnalysis(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { selectedDealIds } = req.body as { selectedDealIds: string[] };

    if (!Array.isArray(selectedDealIds) || selectedDealIds.length < MIN_DEALS) {
      throw new ValidationError(
        `At least ${MIN_DEALS} deals are required to start an analysis`,
      );
    }

    const analysis = await analysisService.createAnalysis(
      req.user!.id,
      selectedDealIds,
    );

    const job = await analysisOrchestratorQueue.add(
      'analyze',
      {
        userId: req.user!.id,
        analysisId: analysis.id,
      },
      {
        attempts: 2,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: { age: 3600 * 24 },
        removeOnFail: { age: 3600 * 24 * 7 },
      },
    );

    res.status(202).json({
      data: { analysisId: analysis.id, jobId: job.id },
      message: 'Analysis started',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/analyses
 * Lists all analyses for the authenticated user.
 */
export async function listAnalyses(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const results = await analysisService.listUserAnalyses(req.user!.id);

    res.json({ data: results });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/analyses/:id
 * Returns a single analysis with full results (patterns, prospects, playbooks).
 */
export async function getAnalysis(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };

    const analysis = await analysisService.getAnalysisWithResults(id);
    if (!analysis) throw new NotFoundError('Analysis');

    // Ensure the analysis belongs to the requesting user
    if (analysis.userId !== req.user!.id) {
      throw new NotFoundError('Analysis');
    }

    res.json({ data: analysis });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/analyses/:id/playbooks/:playbookId/feedback
 * Updates the userFeedback field on a playbook.
 */
export async function updatePlaybookFeedback(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id: analysisId, playbookId } = req.params as {
      id: string;
      playbookId: string;
    };
    const { feedback } = req.body as { feedback: 'thumbs_up' | 'thumbs_down' };

    const analysis = await analysisService.getAnalysis(analysisId);
    if (!analysis || analysis.userId !== req.user!.id) {
      throw new NotFoundError('Analysis');
    }

    const updated = await analysisService.updatePlaybookFeedback(
      playbookId,
      analysisId,
      feedback,
    );

    if (!updated) throw new NotFoundError('Playbook');

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}
