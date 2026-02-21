import { relations } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  decimal,
  date,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ──────────────────────────────────────────────
// 1. USERS
// ──────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: varchar('clerk_id', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 255 }),
  companyName: varchar('company_name', { length: 255 }),
  onboardingStep: integer('onboarding_step').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ──────────────────────────────────────────────
// 2. CRM CONNECTIONS
// ──────────────────────────────────────────────

export const crmConnections = pgTable(
  'crm_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 50 }).notNull(),
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token').notNull(),
    instanceUrl: varchar('instance_url', { length: 500 }),
    tokenExpiresAt: timestamp('token_expires_at'),
    lastSyncAt: timestamp('last_sync_at'),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('crm_connections_user_id_idx').on(table.userId),
  ],
);

// ──────────────────────────────────────────────
// 3. ENRICHMENT CONFIGS
// ──────────────────────────────────────────────

export const enrichmentConfigs = pgTable(
  'enrichment_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 50 }).notNull(),
    apiKey: text('api_key').notNull(),
    isValid: boolean('is_valid').notNull().default(false),
    lastValidatedAt: timestamp('last_validated_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('enrichment_configs_user_id_idx').on(table.userId),
  ],
);

// ──────────────────────────────────────────────
// 4. DEALS
// ──────────────────────────────────────────────

export const deals = pgTable(
  'deals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    crmConnectionId: uuid('crm_connection_id')
      .notNull()
      .references(() => crmConnections.id),
    externalId: varchar('external_id', { length: 255 }).notNull(),
    name: varchar('name', { length: 500 }).notNull(),
    companyName: varchar('company_name', { length: 255 }),
    amount: decimal('amount', { precision: 12, scale: 2 }),
    currency: varchar('currency', { length: 3 }).default('USD'),
    closeDate: date('close_date'),
    stageName: varchar('stage_name', { length: 100 }),
    ownerName: varchar('owner_name', { length: 255 }),
    contactName: varchar('contact_name', { length: 255 }),
    contactTitle: varchar('contact_title', { length: 255 }),
    contactEmail: varchar('contact_email', { length: 255 }),
    industry: varchar('industry', { length: 100 }),
    employeeCount: integer('employee_count'),
    description: text('description'),
    rawData: jsonb('raw_data'),
    syncedAt: timestamp('synced_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('deals_user_id_idx').on(table.userId),
    uniqueIndex('deals_user_external_id_idx').on(table.userId, table.externalId),
  ],
);

// ──────────────────────────────────────────────
// 5. DEAL STAGE HISTORY
// ──────────────────────────────────────────────

export const dealStageHistory = pgTable(
  'deal_stage_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dealId: uuid('deal_id')
      .notNull()
      .references(() => deals.id, { onDelete: 'cascade' }),
    stageName: varchar('stage_name', { length: 100 }).notNull(),
    enteredAt: timestamp('entered_at').notNull(),
    exitedAt: timestamp('exited_at'),
    durationDays: integer('duration_days'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('deal_stage_history_deal_id_idx').on(table.dealId),
  ],
);

// ──────────────────────────────────────────────
// 6. ANALYSES
// ──────────────────────────────────────────────

export const analyses = pgTable(
  'analyses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 30 }).notNull().default('pending'),
    selectedDealIds: jsonb('selected_deal_ids').notNull(),
    dealCount: integer('deal_count').notNull(),
    errorMessage: text('error_message'),
    errorStep: varchar('error_step', { length: 50 }),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('analyses_user_id_idx').on(table.userId),
    index('analyses_status_idx').on(table.status),
  ],
);

// ──────────────────────────────────────────────
// 7. PATTERNS
// ──────────────────────────────────────────────

export const patterns = pgTable(
  'patterns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    analysisId: uuid('analysis_id')
      .notNull()
      .unique()
      .references(() => analyses.id, { onDelete: 'cascade' }),
    painPoints: jsonb('pain_points').notNull(),
    winningSubjects: jsonb('winning_subjects').notNull(),
    commonObjections: jsonb('common_objections').notNull(),
    avgSalesCycleDays: integer('avg_sales_cycle_days'),
    championRoles: jsonb('champion_roles').notNull(),
    industryBreakdown: jsonb('industry_breakdown'),
    dealSizeRange: jsonb('deal_size_range'),
    rawLlmOutput: text('raw_llm_output'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
);

// ──────────────────────────────────────────────
// 8. PROSPECTS
// ──────────────────────────────────────────────

export const prospects = pgTable(
  'prospects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    analysisId: uuid('analysis_id')
      .notNull()
      .references(() => analyses.id, { onDelete: 'cascade' }),
    companyName: varchar('company_name', { length: 255 }).notNull(),
    domain: varchar('domain', { length: 255 }),
    industry: varchar('industry', { length: 100 }),
    employeeCount: integer('employee_count'),
    revenue: varchar('revenue', { length: 50 }),
    location: varchar('location', { length: 255 }),
    techStack: jsonb('tech_stack'),
    matchScore: integer('match_score'),
    matchReasons: jsonb('match_reasons'),
    contactName: varchar('contact_name', { length: 255 }),
    contactTitle: varchar('contact_title', { length: 255 }),
    contactEmail: varchar('contact_email', { length: 255 }),
    contactLinkedin: varchar('contact_linkedin', { length: 500 }),
    clayEnrichmentData: jsonb('clay_enrichment_data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('prospects_analysis_id_idx').on(table.analysisId),
  ],
);

// ──────────────────────────────────────────────
// 9. PLAYBOOKS
// ──────────────────────────────────────────────

export const playbooks = pgTable(
  'playbooks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    analysisId: uuid('analysis_id')
      .notNull()
      .references(() => analyses.id, { onDelete: 'cascade' }),
    prospectId: uuid('prospect_id')
      .notNull()
      .unique()
      .references(() => prospects.id, { onDelete: 'cascade' }),
    coldEmail: jsonb('cold_email').notNull(),
    discoveryQuestions: jsonb('discovery_questions').notNull(),
    painPoints: jsonb('pain_points').notNull(),
    objectionHandling: jsonb('objection_handling').notNull(),
    championPersona: jsonb('champion_persona').notNull(),
    predictedTimeline: jsonb('predicted_timeline').notNull(),
    caseStudyRef: jsonb('case_study_ref').notNull(),
    qualityScore: integer('quality_score'),
    userFeedback: varchar('user_feedback', { length: 10 }),
    rawLlmOutput: text('raw_llm_output'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('playbooks_analysis_id_idx').on(table.analysisId),
    index('playbooks_prospect_id_idx').on(table.prospectId),
  ],
);

// ──────────────────────────────────────────────
// 10. JOB LOGS
// ──────────────────────────────────────────────

export const jobLogs = pgTable(
  'job_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    analysisId: uuid('analysis_id').references(() => analyses.id, {
      onDelete: 'set null',
    }),
    queueName: varchar('queue_name', { length: 100 }).notNull(),
    jobId: varchar('job_id', { length: 255 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    attemptNumber: integer('attempt_number').notNull().default(1),
    durationMs: integer('duration_ms'),
    errorMessage: text('error_message'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('job_logs_analysis_id_idx').on(table.analysisId),
  ],
);

// ──────────────────────────────────────────────
// RELATIONS (for Drizzle relational queries)
// ──────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  crmConnections: many(crmConnections),
  enrichmentConfigs: many(enrichmentConfigs),
  deals: many(deals),
  analyses: many(analyses),
}));

export const crmConnectionsRelations = relations(crmConnections, ({ one, many }) => ({
  user: one(users, {
    fields: [crmConnections.userId],
    references: [users.id],
  }),
  deals: many(deals),
}));

export const enrichmentConfigsRelations = relations(enrichmentConfigs, ({ one }) => ({
  user: one(users, {
    fields: [enrichmentConfigs.userId],
    references: [users.id],
  }),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  user: one(users, {
    fields: [deals.userId],
    references: [users.id],
  }),
  crmConnection: one(crmConnections, {
    fields: [deals.crmConnectionId],
    references: [crmConnections.id],
  }),
  stageHistory: many(dealStageHistory),
}));

export const dealStageHistoryRelations = relations(dealStageHistory, ({ one }) => ({
  deal: one(deals, {
    fields: [dealStageHistory.dealId],
    references: [deals.id],
  }),
}));

export const analysesRelations = relations(analyses, ({ one, many }) => ({
  user: one(users, {
    fields: [analyses.userId],
    references: [users.id],
  }),
  patterns: one(patterns),
  prospects: many(prospects),
  jobLogs: many(jobLogs),
}));

export const patternsRelations = relations(patterns, ({ one }) => ({
  analysis: one(analyses, {
    fields: [patterns.analysisId],
    references: [analyses.id],
  }),
}));

export const prospectsRelations = relations(prospects, ({ one }) => ({
  analysis: one(analyses, {
    fields: [prospects.analysisId],
    references: [analyses.id],
  }),
  playbook: one(playbooks),
}));

export const playbooksRelations = relations(playbooks, ({ one }) => ({
  analysis: one(analyses, {
    fields: [playbooks.analysisId],
    references: [analyses.id],
  }),
  prospect: one(prospects, {
    fields: [playbooks.prospectId],
    references: [prospects.id],
  }),
}));

export const jobLogsRelations = relations(jobLogs, ({ one }) => ({
  analysis: one(analyses, {
    fields: [jobLogs.analysisId],
    references: [analyses.id],
  }),
}));
