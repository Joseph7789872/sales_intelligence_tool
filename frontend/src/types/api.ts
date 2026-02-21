export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface User {
  id: string;
  clerkId: string;
  email: string;
  fullName: string | null;
  companyName: string | null;
  onboardingStep: number;
  createdAt: string;
  updatedAt: string;
}

export interface CrmConnection {
  id: string;
  provider: string;
  instanceUrl: string | null;
  status: string;
  lastSyncAt: string | null;
  tokenExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnrichmentConfig {
  id: string;
  provider: string;
  isValid: boolean;
  lastValidatedAt: string | null;
  createdAt: string;
}

export interface Deal {
  id: string;
  externalId: string;
  name: string;
  companyName: string | null;
  amount: string | null;
  currency: string | null;
  closeDate: string | null;
  stageName: string | null;
  ownerName: string | null;
  contactName: string | null;
  industry: string | null;
  employeeCount: number | null;
}

export interface StageHistoryEntry {
  id: string;
  dealId: string;
  stageName: string;
  enteredAt: string;
  exitedAt: string | null;
  durationDays: number | null;
  createdAt: string;
}

export interface DealWithHistory {
  deal: Deal;
  stageHistory: StageHistoryEntry[];
}

export interface PaginatedDeals {
  deals: Deal[];
  total: number;
  page: number;
  limit: number;
}

export interface SyncJob {
  jobId: string;
  status: string;
  progress: number;
  result?: { upserted: number };
  failedReason?: string;
}

// ── Analysis ────────────────────────────────────

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Analysis {
  id: string;
  userId: string;
  status: AnalysisStatus;
  selectedDealIds: string[];
  dealCount: number;
  errorMessage: string | null;
  errorStep: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Patterns ────────────────────────────────────

export interface DealSizeRange {
  min: number;
  max: number;
  avg: number;
}

export interface Patterns {
  id: string;
  analysisId: string;
  painPoints: string[];
  winningSubjects: string[];
  commonObjections: string[];
  avgSalesCycleDays: number | null;
  championRoles: string[];
  industryBreakdown: Record<string, number> | null;
  dealSizeRange: DealSizeRange | null;
  createdAt: string;
}

// ── Prospects ───────────────────────────────────

export interface Prospect {
  id: string;
  analysisId: string;
  companyName: string;
  domain: string | null;
  industry: string | null;
  employeeCount: number | null;
  revenue: string | null;
  location: string | null;
  techStack: string[] | null;
  matchScore: number | null;
  matchReasons: string[] | null;
  contactName: string | null;
  contactTitle: string | null;
  contactEmail: string | null;
  contactLinkedin: string | null;
  createdAt: string;
}

// ── Playbook ────────────────────────────────────

export interface ColdEmail {
  subject: string;
  body: string;
  followUp: string;
}

export interface PainPointEntry {
  painPoint: string;
  relevance: string;
}

export interface ObjectionEntry {
  objection: string;
  response: string;
}

export interface ChampionPersona {
  role: string;
  motivations: string[];
  buyingTriggers: string[];
}

export interface TimelineStage {
  stage: string;
  day: number;
}

export interface PredictedTimeline {
  daysToClose: number;
  stages: TimelineStage[];
}

export interface CaseStudyRef {
  company: string;
  industry: string;
  result: string;
  quote: string;
}

export interface Playbook {
  id: string;
  analysisId: string;
  prospectId: string;
  coldEmail: ColdEmail;
  discoveryQuestions: string[];
  painPoints: PainPointEntry[];
  objectionHandling: ObjectionEntry[];
  championPersona: ChampionPersona;
  predictedTimeline: PredictedTimeline;
  caseStudyRef: CaseStudyRef;
  qualityScore: number | null;
  userFeedback: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Composed Analysis Response ──────────────────

export interface AnalysisWithResults extends Analysis {
  patterns: Patterns | null;
  prospects: Prospect[];
  playbooks: Playbook[];
}
