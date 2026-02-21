import { Worker, Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';
import { db } from '../config/db.js';
import { crmConnections } from '../db/schema.js';
import { getValidAccessToken } from '../services/crm.service.js';
import { fetchClosedWonDeals, fetchStageHistory } from '../services/salesforce.service.js';
import {
  upsertDeals,
  upsertStageHistory,
  getDealsByExternalIds,
} from '../services/deal.service.js';

// ── Types ──────────────────────────────────────

export interface DealSyncJobData {
  userId: string;
  crmConnectionId: string;
}

export interface DealSyncJobResult {
  dealCount: number;
  upserted: number;
  stageHistoryCount: number;
}

// ── Worker Process Function ────────────────────

async function processDealSync(
  job: Job<DealSyncJobData, DealSyncJobResult>,
): Promise<DealSyncJobResult> {
  const { userId, crmConnectionId } = job.data;

  await job.updateProgress(0);

  // 1. Get valid access token (auto-refreshes if expired)
  const { accessToken, instanceUrl } = await getValidAccessToken(crmConnectionId);

  // 2. Get lastSyncAt for incremental sync
  const [connection] = await db
    .select({ lastSyncAt: crmConnections.lastSyncAt })
    .from(crmConnections)
    .where(eq(crmConnections.id, crmConnectionId))
    .limit(1);

  const lastSyncAt = connection?.lastSyncAt ?? null;

  await job.updateProgress(10);

  // 3. Fetch closed-won deals from Salesforce
  const mappedDeals = await fetchClosedWonDeals(
    accessToken,
    instanceUrl,
    lastSyncAt,
    (fetched, total) => {
      const progress = total > 0
        ? 10 + Math.round((fetched / total) * 40)
        : 50;
      job.updateProgress(progress);
    },
  );

  await job.updateProgress(50);

  // 4. Upsert deals into database
  const { upserted } = await upsertDeals(userId, crmConnectionId, mappedDeals);

  await job.updateProgress(70);

  // 5. Fetch and store stage history
  let stageHistoryCount = 0;
  const externalIds = mappedDeals.map((d) => d.externalId);

  if (externalIds.length > 0) {
    const stageHistory = await fetchStageHistory(accessToken, instanceUrl, externalIds);

    await job.updateProgress(80);

    if (stageHistory.length > 0) {
      const dealIdMap = await getDealsByExternalIds(userId, externalIds);
      stageHistoryCount = await upsertStageHistory(dealIdMap, stageHistory);
    }
  }

  await job.updateProgress(90);

  // 6. Update lastSyncAt on the connection
  await db
    .update(crmConnections)
    .set({ lastSyncAt: new Date(), updatedAt: new Date() })
    .where(eq(crmConnections.id, crmConnectionId));

  await job.updateProgress(100);

  return { dealCount: mappedDeals.length, upserted, stageHistoryCount };
}

// ── Worker Instance ────────────────────────────

const connection = { url: env.REDIS_URL };

export const dealSyncWorker = new Worker<DealSyncJobData, DealSyncJobResult>(
  'deal-sync',
  processDealSync,
  {
    connection,
    concurrency: 3,
    limiter: {
      max: 5,
      duration: 60_000,
    },
  },
);

dealSyncWorker.on('completed', (job, result) => {
  console.log(
    `[deal-sync] Completed for user ${job.data.userId}: ${result.dealCount} deals synced`,
  );
});

dealSyncWorker.on('failed', (job, err) => {
  console.error(
    `[deal-sync] Failed for user ${job?.data.userId}: ${err.message}`,
  );
});
