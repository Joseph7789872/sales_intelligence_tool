import crypto from 'node:crypto';
import { eq, and, sql, count, inArray, asc, desc } from 'drizzle-orm';
import { db } from '../config/db.js';
import { deals, dealStageHistory } from '../db/schema.js';
import { NotFoundError } from '../utils/errors.js';
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

// ── Single Deal with Stage History ───────────

export async function getDealWithHistory(userId: string, dealId: string) {
  const result = await db.query.deals.findFirst({
    where: and(eq(deals.id, dealId), eq(deals.userId, userId)),
    with: {
      stageHistory: {
        orderBy: (stageHistory, { asc: a }) => [a(stageHistory.enteredAt)],
      },
    },
  });

  if (!result) {
    throw new NotFoundError('Deal');
  }

  const { stageHistory, ...deal } = result;

  return { deal, stageHistory };
}

// ── Mock Sync ─────────────────────────────────

const MOCK_DEALS = [
  { name: 'Meridian Financial - Enterprise License', companyName: 'Meridian Financial Systems', amount: '185000.00', industry: 'FinTech', employeeCount: 450, closeMonthsAgo: 1, ownerName: 'Jordan Mitchell', contactName: 'Alex Rivera', contactTitle: 'VP of Sales', contactEmail: 'alex.rivera@meridianfs.com', description: 'Enterprise platform license for sales intelligence across 45-person sales org.' },
  { name: 'PulseCheck Health - Annual Contract', companyName: 'PulseCheck Health', amount: '92000.00', industry: 'HealthTech', employeeCount: 220, closeMonthsAgo: 2, ownerName: 'Jordan Mitchell', contactName: 'Priya Sharma', contactTitle: 'Head of Revenue Operations', contactEmail: 'priya.sharma@pulsecheck.io', description: 'Annual contract for revenue intelligence platform.' },
  { name: 'BrightPath Learning - Growth Plan', companyName: 'BrightPath Learning', amount: '67500.00', industry: 'EdTech', employeeCount: 180, closeMonthsAgo: 3, ownerName: 'Sarah Chen', contactName: 'Marcus Johnson', contactTitle: 'Director of Sales', contactEmail: 'marcus.johnson@brightpath.edu', description: 'Growth plan for 15-person sales team.' },
  { name: 'AdVantage Media - Platform Deal', companyName: 'AdVantage Media', amount: '245000.00', industry: 'MarTech', employeeCount: 350, closeMonthsAgo: 1.5, ownerName: 'Sarah Chen', contactName: 'Rachel Torres', contactTitle: 'Chief Revenue Officer', contactEmail: 'rachel.torres@advantagemedia.com', description: 'Full platform deployment for MarTech company scaling from 30 to 60 reps.' },
  { name: 'CloudVault Storage - Enterprise Agreement', companyName: 'CloudVault Storage', amount: '420000.00', industry: 'Cloud Infrastructure', employeeCount: 800, closeMonthsAgo: 4, ownerName: 'Jordan Mitchell', contactName: 'David Park', contactTitle: 'VP of Revenue', contactEmail: 'david.park@cloudvault.io', description: 'Enterprise agreement covering 80-person global sales team.' },
  { name: 'Nexus HR Solutions - Team License', companyName: 'Nexus HR Solutions', amount: '54000.00', industry: 'HRTech', employeeCount: 150, closeMonthsAgo: 5, ownerName: 'Sarah Chen', contactName: 'Lisa Chang', contactTitle: 'Head of Sales', contactEmail: 'lisa.chang@nexushr.com', description: 'Team license for growing HRTech startup.' },
  { name: 'DataForge Analytics - Enterprise Platform', companyName: 'DataForge Analytics', amount: '310000.00', industry: 'Data & Analytics', employeeCount: 500, closeMonthsAgo: 2.5, ownerName: 'Jordan Mitchell', contactName: 'James Wilson', contactTitle: 'VP of Business Development', contactEmail: 'james.wilson@dataforge.ai', description: 'Enterprise platform for analytics company with 50+ AEs.' },
  { name: 'ShipStream Logistics - Annual Deal', companyName: 'ShipStream Logistics', amount: '175000.00', industry: 'LogiTech', employeeCount: 600, closeMonthsAgo: 6, ownerName: 'Sarah Chen', contactName: 'Carlos Mendez', contactTitle: 'Director of Revenue Operations', contactEmail: 'carlos.mendez@shipstream.com', description: 'Annual platform deal for logistics SaaS.' },
  { name: 'GreenLedger Carbon - Startup Plan', companyName: 'GreenLedger Carbon', amount: '38000.00', industry: 'CleanTech', employeeCount: 120, closeMonthsAgo: 7, ownerName: 'Jordan Mitchell', contactName: 'Emma Nakamura', contactTitle: 'Head of Growth', contactEmail: 'emma.nakamura@greenledger.co', description: 'Startup plan for early-stage CleanTech.' },
  { name: 'SecureNet Compliance - Enterprise Security', companyName: 'SecureNet Compliance', amount: '485000.00', industry: 'Cybersecurity', employeeCount: 900, closeMonthsAgo: 3, ownerName: 'Jordan Mitchell', contactName: 'Robert Kim', contactTitle: 'VP of Sales', contactEmail: 'robert.kim@securenet.io', description: 'Largest deal — enterprise security company with 90-person sales org.' },
  { name: 'PropelCRM Solutions - Growth License', companyName: 'PropelCRM Solutions', amount: '128000.00', industry: 'SalesTech', employeeCount: 280, closeMonthsAgo: 8, ownerName: 'Sarah Chen', contactName: 'Michelle Patel', contactTitle: 'Chief Revenue Officer', contactEmail: 'michelle.patel@propelcrm.com', description: 'Growth license for SalesTech company.' },
  { name: 'SpectraComms - Multi-Year Platform', companyName: 'SpectraComms Platform', amount: '375000.00', industry: 'Telecom SaaS', employeeCount: 1200, closeMonthsAgo: 4, ownerName: 'Jordan Mitchell', contactName: 'Thomas Wright', contactTitle: 'VP of Sales Operations', contactEmail: 'thomas.wright@spectracomms.com', description: 'Multi-year platform agreement for telecom SaaS.' },
  { name: 'AgilePlan Project - Starter Plan', companyName: 'AgilePlan Project', amount: '22500.00', industry: 'Project Management', employeeCount: 95, closeMonthsAgo: 9, ownerName: 'Sarah Chen', contactName: 'Nicole Adams', contactTitle: 'Head of Revenue Operations', contactEmail: 'nicole.adams@agileplan.io', description: 'Starter plan for small but fast-growing PM tool.' },
  { name: 'RetailPulse Commerce - Annual Platform', companyName: 'RetailPulse Commerce', amount: '198000.00', industry: 'Retail Tech', employeeCount: 420, closeMonthsAgo: 5.5, ownerName: 'Jordan Mitchell', contactName: 'Brandon Lee', contactTitle: 'Director of Sales', contactEmail: 'brandon.lee@retailpulse.com', description: 'Annual platform deal for retail tech company.' },
  { name: 'BioSync Research - Enterprise Agreement', companyName: 'BioSync Research', amount: '500000.00', industry: 'BioTech', employeeCount: 3200, closeMonthsAgo: 10, ownerName: 'Jordan Mitchell', contactName: 'Dr. Sarah Okafor', contactTitle: 'VP of Enterprise Sales', contactEmail: 'sarah.okafor@biosync.com', description: 'Largest enterprise agreement — biotech with complex sales cycles.' },
];

const STAGES = ['Prospecting', 'Discovery', 'Demo', 'Proposal', 'Negotiation', 'Closed Won'] as const;
const DURATION_RANGES: [number, number][] = [[5, 15], [7, 14], [3, 10], [5, 14], [7, 21], [0, 0]];

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function monthsAgo(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

export async function mockSync(
  userId: string,
  crmConnectionId: string,
): Promise<{ synced: number }> {
  const now = new Date();
  const dealIds: string[] = [];

  for (let i = 0; i < MOCK_DEALS.length; i++) {
    const d = MOCK_DEALS[i];
    const dealId = crypto.randomUUID();
    dealIds.push(dealId);
    const closeDate = monthsAgo(d.closeMonthsAgo);

    await db
      .insert(deals)
      .values({
        id: dealId,
        userId,
        crmConnectionId,
        externalId: `mock_deal_${String(i + 1).padStart(3, '0')}`,
        name: d.name,
        companyName: d.companyName,
        amount: d.amount,
        currency: 'USD',
        closeDate: closeDate.toISOString().split('T')[0],
        stageName: 'Closed Won',
        ownerName: d.ownerName,
        contactName: d.contactName,
        contactTitle: d.contactTitle,
        contactEmail: d.contactEmail,
        industry: d.industry,
        employeeCount: d.employeeCount,
        description: d.description,
        rawData: { source: 'mock' },
        syncedAt: now,
      })
      .onConflictDoNothing();

    // Generate stage history
    const durations = DURATION_RANGES.map(([min, max], si) =>
      Math.floor(seededRandom(i * 10 + si) * (max - min + 1)) + min,
    );
    const totalDays = durations.reduce((sum, x) => sum + x, 0);
    let current = new Date(closeDate.getTime() - totalDays * 86_400_000);

    const stageRows = STAGES.map((stage, si) => {
      const enteredAt = new Date(current);
      const dur = durations[si];
      const exitedAt = si < STAGES.length - 1 ? new Date(current.getTime() + dur * 86_400_000) : null;
      if (exitedAt) current = exitedAt;
      return {
        dealId,
        stageName: stage,
        enteredAt,
        exitedAt,
        durationDays: dur || null,
      };
    });

    await db.insert(dealStageHistory).values(stageRows);
  }

  return { synced: MOCK_DEALS.length };
}
