import { eq, and, sql, count, inArray, asc, desc } from 'drizzle-orm';
import { db } from '../config/db.js';
import { deals, dealStageHistory } from '../db/schema.js';
import type { MappedDeal, MappedStageHistory } from './salesforce.service.js';

// ── Types ──────────────────────────────────────

type DealRow = typeof deals.$inferSelect;

export interface ListDealsOptions {
  connectionId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'closeDate' | 'amount' | 'companyName';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedDeals {
  deals: DealRow[];
  total: number;
  page: number;
  limit: number;
}

// ── Deal Upsert ────────────────────────────────

const UPSERT_CHUNK_SIZE = 100;

export async function upsertDeals(
  userId: string,
  crmConnectionId: string,
  mappedDeals: MappedDeal[],
): Promise<{ upserted: number }> {
  if (mappedDeals.length === 0) return { upserted: 0 };

  let upserted = 0;

  for (let i = 0; i < mappedDeals.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = mappedDeals.slice(i, i + UPSERT_CHUNK_SIZE);

    const values = chunk.map((deal) => ({
      userId,
      crmConnectionId,
      externalId: deal.externalId,
      name: deal.name,
      companyName: deal.companyName,
      amount: deal.amount,
      currency: deal.currency,
      closeDate: deal.closeDate,
      stageName: deal.stageName,
      ownerName: deal.ownerName,
      contactName: deal.contactName,
      contactTitle: deal.contactTitle,
      contactEmail: deal.contactEmail,
      industry: deal.industry,
      employeeCount: deal.employeeCount,
      description: deal.description,
      rawData: deal.rawData,
      syncedAt: new Date(),
    }));

    await db
      .insert(deals)
      .values(values)
      .onConflictDoUpdate({
        target: [deals.userId, deals.externalId],
        set: {
          crmConnectionId: sql`excluded.crm_connection_id`,
          name: sql`excluded.name`,
          companyName: sql`excluded.company_name`,
          amount: sql`excluded.amount`,
          currency: sql`excluded.currency`,
          closeDate: sql`excluded.close_date`,
          stageName: sql`excluded.stage_name`,
          ownerName: sql`excluded.owner_name`,
          contactName: sql`excluded.contact_name`,
          contactTitle: sql`excluded.contact_title`,
          contactEmail: sql`excluded.contact_email`,
          industry: sql`excluded.industry`,
          employeeCount: sql`excluded.employee_count`,
          description: sql`excluded.description`,
          rawData: sql`excluded.raw_data`,
          syncedAt: sql`excluded.synced_at`,
        },
      });

    upserted += chunk.length;
  }

  return { upserted };
}

// ── Stage History ──────────────────────────────

export async function upsertStageHistory(
  dealIdMap: Map<string, string>,
  stageHistory: MappedStageHistory[],
): Promise<number> {
  if (stageHistory.length === 0 || dealIdMap.size === 0) return 0;

  // Group by deal
  const byDeal = new Map<string, MappedStageHistory[]>();
  for (const entry of stageHistory) {
    const dealId = dealIdMap.get(entry.externalOpportunityId);
    if (!dealId) continue;
    const existing = byDeal.get(dealId) ?? [];
    existing.push(entry);
    byDeal.set(dealId, existing);
  }

  const affectedDealIds = [...byDeal.keys()];
  if (affectedDealIds.length === 0) return 0;

  // Delete existing stage history for affected deals
  await db
    .delete(dealStageHistory)
    .where(inArray(dealStageHistory.dealId, affectedDealIds));

  // Build insert values with computed exitedAt and durationDays
  const insertValues: Array<{
    dealId: string;
    stageName: string;
    enteredAt: Date;
    exitedAt: Date | null;
    durationDays: number | null;
  }> = [];

  for (const [dealId, entries] of byDeal) {
    const sorted = entries.sort((a, b) => a.enteredAt.getTime() - b.enteredAt.getTime());

    for (let i = 0; i < sorted.length; i++) {
      const exitedAt = i < sorted.length - 1 ? sorted[i + 1].enteredAt : null;
      const durationDays =
        exitedAt != null
          ? Math.round((exitedAt.getTime() - sorted[i].enteredAt.getTime()) / (1000 * 60 * 60 * 24))
          : null;

      insertValues.push({
        dealId,
        stageName: sorted[i].stageName,
        enteredAt: sorted[i].enteredAt,
        exitedAt,
        durationDays,
      });
    }
  }

  if (insertValues.length > 0) {
    // Bulk insert in chunks
    for (let i = 0; i < insertValues.length; i += UPSERT_CHUNK_SIZE) {
      const chunk = insertValues.slice(i, i + UPSERT_CHUNK_SIZE);
      await db.insert(dealStageHistory).values(chunk);
    }
  }

  return insertValues.length;
}

// ── Query Helpers ──────────────────────────────

export async function getDealsByExternalIds(
  userId: string,
  externalIds: string[],
): Promise<Map<string, string>> {
  if (externalIds.length === 0) return new Map();

  const rows = await db
    .select({ id: deals.id, externalId: deals.externalId })
    .from(deals)
    .where(and(eq(deals.userId, userId), inArray(deals.externalId, externalIds)));

  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.externalId, row.id);
  }
  return map;
}

export async function getDealCount(
  userId: string,
  crmConnectionId?: string,
): Promise<number> {
  const conditions = [eq(deals.userId, userId)];
  if (crmConnectionId) {
    conditions.push(eq(deals.crmConnectionId, crmConnectionId));
  }

  const [result] = await db
    .select({ count: count() })
    .from(deals)
    .where(and(...conditions));

  return result.count;
}

export async function listUserDeals(
  userId: string,
  options: ListDealsOptions = {},
): Promise<PaginatedDeals> {
  const {
    connectionId,
    page = 1,
    limit = 50,
    sortBy = 'closeDate',
    sortOrder = 'desc',
  } = options;

  const conditions = [eq(deals.userId, userId)];
  if (connectionId) {
    conditions.push(eq(deals.crmConnectionId, connectionId));
  }

  const whereClause = and(...conditions);

  const sortColumn = {
    closeDate: deals.closeDate,
    amount: deals.amount,
    companyName: deals.companyName,
  }[sortBy];

  const orderFn = sortOrder === 'asc' ? asc : desc;

  const [totalResult, dealRows] = await Promise.all([
    db.select({ count: count() }).from(deals).where(whereClause),
    db
      .select()
      .from(deals)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset((page - 1) * limit),
  ]);

  return {
    deals: dealRows,
    total: totalResult[0].count,
    page,
    limit,
  };
}
