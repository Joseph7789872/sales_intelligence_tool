import type { Request, Response, NextFunction } from 'express';
import { dealSyncQueue } from '../config/queues.js';
import * as dealService from '../services/deal.service.js';
import { listConnectionsByUser } from '../services/crm.service.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * POST /api/v1/deals/sync
 * Enqueues a deal sync job for the given CRM connection.
 */
export async function triggerSync(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { connectionId } = req.body as { connectionId: string };

    // Verify connection belongs to user
    const connections = await listConnectionsByUser(req.user!.id);
    const connection = connections.find((c) => c.id === connectionId);
    if (!connection) throw new NotFoundError('CRM Connection');

    const job = await dealSyncQueue.add(
      'sync',
      {
        userId: req.user!.id,
        crmConnectionId: connectionId,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 3600 * 24 },
        removeOnFail: { age: 3600 * 24 * 7 },
      },
    );

    res.status(202).json({
      data: { jobId: job.id },
      message: 'Deal sync started',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/deals/sync/:jobId
 * Returns the status of a deal sync job.
 */
export async function getSyncStatus(
  req: Request<{ jobId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const job = await dealSyncQueue.getJob(req.params.jobId);
    if (!job) throw new NotFoundError('Sync job');

    const state = await job.getState();

    res.json({
      data: {
        jobId: job.id,
        status: state,
        progress: job.progress,
        result: state === 'completed' ? job.returnvalue : undefined,
        failedReason: state === 'failed' ? job.failedReason : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/deals
 * Lists the authenticated user's synced deals with pagination.
 */
export async function listDeals(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as {
      connectionId?: string;
      page?: number;
      limit?: number;
      sortBy?: 'closeDate' | 'amount' | 'companyName';
      sortOrder?: 'asc' | 'desc';
    };

    const result = await dealService.listUserDeals(req.user!.id, {
      connectionId: query.connectionId,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}
