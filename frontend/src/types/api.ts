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
