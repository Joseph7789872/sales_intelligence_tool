import { AppError } from '../utils/errors.js';

const SF_API_VERSION = 'v59.0';
const SF_ID_CHUNK_SIZE = 200;

// ── Types ──────────────────────────────────────

interface SalesforceQueryResponse<T> {
  totalSize: number;
  done: boolean;
  nextRecordsUrl?: string;
  records: T[];
}

interface SalesforceOpportunity {
  Id: string;
  Name: string;
  Amount: number | null;
  CurrencyIsoCode?: string;
  CloseDate: string;
  StageName: string;
  Description: string | null;
  LastModifiedDate: string;
  Owner: { Name: string } | null;
  Account: {
    Name: string;
    Industry: string | null;
    NumberOfEmployees: number | null;
  } | null;
  OpportunityContactRoles?: {
    records: Array<{
      Contact: {
        Name: string;
        Title: string | null;
        Email: string | null;
      };
      IsPrimary: boolean;
    }>;
  } | null;
}

interface SalesforceStageHistory {
  OpportunityId: string;
  StageName: string;
  CreatedDate: string;
}

export interface MappedDeal {
  externalId: string;
  name: string;
  companyName: string | null;
  amount: string | null;
  currency: string;
  closeDate: string | null;
  stageName: string | null;
  ownerName: string | null;
  contactName: string | null;
  contactTitle: string | null;
  contactEmail: string | null;
  industry: string | null;
  employeeCount: number | null;
  description: string | null;
  rawData: Record<string, unknown>;
}

export interface MappedStageHistory {
  externalOpportunityId: string;
  stageName: string;
  enteredAt: Date;
}

// ── Salesforce Query Helpers ───────────────────

async function sfQuery<T>(
  accessToken: string,
  instanceUrl: string,
  soql: string,
): Promise<SalesforceQueryResponse<T>> {
  const url = `${instanceUrl}/services/data/${SF_API_VERSION}/query?q=${encodeURIComponent(soql)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 401) {
    throw new AppError('Salesforce token expired', 401, 'SF_TOKEN_EXPIRED');
  }
  if (response.status === 403) {
    throw new AppError('Insufficient Salesforce permissions', 403, 'SF_PERMISSION_DENIED');
  }
  if (!response.ok) {
    const body = await response.text();
    throw new AppError(`Salesforce query failed (${response.status}): ${body}`, 502, 'SF_QUERY_ERROR');
  }

  return response.json() as Promise<SalesforceQueryResponse<T>>;
}

async function sfQueryMore<T>(
  accessToken: string,
  instanceUrl: string,
  nextRecordsUrl: string,
): Promise<SalesforceQueryResponse<T>> {
  const url = `${instanceUrl}${nextRecordsUrl}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new AppError(`Salesforce pagination failed (${response.status}): ${body}`, 502, 'SF_QUERY_ERROR');
  }

  return response.json() as Promise<SalesforceQueryResponse<T>>;
}

// ── Field Mapping ──────────────────────────────

function mapOpportunityToDeal(opp: SalesforceOpportunity): MappedDeal {
  const primaryContact = opp.OpportunityContactRoles?.records?.[0]?.Contact ?? null;

  return {
    externalId: opp.Id,
    name: opp.Name,
    companyName: opp.Account?.Name ?? null,
    amount: opp.Amount != null ? String(opp.Amount) : null,
    currency: opp.CurrencyIsoCode ?? 'USD',
    closeDate: opp.CloseDate ?? null,
    stageName: opp.StageName ?? null,
    ownerName: opp.Owner?.Name ?? null,
    contactName: primaryContact?.Name ?? null,
    contactTitle: primaryContact?.Title ?? null,
    contactEmail: primaryContact?.Email ?? null,
    industry: opp.Account?.Industry ?? null,
    employeeCount: opp.Account?.NumberOfEmployees ?? null,
    description: opp.Description ?? null,
    rawData: opp as unknown as Record<string, unknown>,
  };
}

// ── Public API ─────────────────────────────────

export async function fetchClosedWonDeals(
  accessToken: string,
  instanceUrl: string,
  lastSyncAt: Date | null,
  onProgress?: (fetched: number, total: number) => void,
): Promise<MappedDeal[]> {
  let soql = `SELECT Id, Name, Amount, CurrencyIsoCode, CloseDate, StageName, Description,
       LastModifiedDate, Owner.Name,
       Account.Name, Account.Industry, Account.NumberOfEmployees,
       (SELECT Contact.Name, Contact.Title, Contact.Email, IsPrimary
        FROM OpportunityContactRoles WHERE IsPrimary = true LIMIT 1)
FROM Opportunity
WHERE StageName = 'Closed Won'`;

  if (lastSyncAt) {
    soql += ` AND LastModifiedDate > ${lastSyncAt.toISOString()}`;
  }

  soql += ` ORDER BY CloseDate DESC`;

  const allDeals: MappedDeal[] = [];
  let result = await sfQuery<SalesforceOpportunity>(accessToken, instanceUrl, soql);

  for (const record of result.records) {
    allDeals.push(mapOpportunityToDeal(record));
  }
  onProgress?.(allDeals.length, result.totalSize);

  while (!result.done && result.nextRecordsUrl) {
    result = await sfQueryMore<SalesforceOpportunity>(
      accessToken,
      instanceUrl,
      result.nextRecordsUrl,
    );
    for (const record of result.records) {
      allDeals.push(mapOpportunityToDeal(record));
    }
    onProgress?.(allDeals.length, result.totalSize);
  }

  return allDeals;
}

export async function fetchStageHistory(
  accessToken: string,
  instanceUrl: string,
  opportunityIds: string[],
): Promise<MappedStageHistory[]> {
  if (opportunityIds.length === 0) return [];

  const allHistory: MappedStageHistory[] = [];

  // Chunk IDs to stay within Salesforce IN clause limits
  for (let i = 0; i < opportunityIds.length; i += SF_ID_CHUNK_SIZE) {
    const chunk = opportunityIds.slice(i, i + SF_ID_CHUNK_SIZE);
    const idList = chunk.map((id) => `'${id}'`).join(',');

    const soql = `SELECT OpportunityId, StageName, CreatedDate
FROM OpportunityHistory
WHERE OpportunityId IN (${idList})
  AND StageName != null
ORDER BY CreatedDate ASC`;

    try {
      const result = await sfQuery<SalesforceStageHistory>(accessToken, instanceUrl, soql);

      for (const record of result.records) {
        allHistory.push({
          externalOpportunityId: record.OpportunityId,
          stageName: record.StageName,
          enteredAt: new Date(record.CreatedDate),
        });
      }

      // Follow pagination if needed
      let page = result;
      while (!page.done && page.nextRecordsUrl) {
        page = await sfQueryMore<SalesforceStageHistory>(
          accessToken,
          instanceUrl,
          page.nextRecordsUrl,
        );
        for (const record of page.records) {
          allHistory.push({
            externalOpportunityId: record.OpportunityId,
            stageName: record.StageName,
            enteredAt: new Date(record.CreatedDate),
          });
        }
      }
    } catch (error) {
      // OpportunityHistory may not be available if field tracking is not enabled
      if (error instanceof AppError && error.statusCode === 400) {
        console.warn('OpportunityHistory not available — skipping stage history');
        return [];
      }
      throw error;
    }
  }

  return allHistory;
}
