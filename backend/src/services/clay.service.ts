// ── Clay API Enrichment Service ──────────────────
// Enriches prospect companies with firmographic data, tech stack, and contacts
// via the Clay waterfall enrichment API.

const CLAY_API_BASE = 'https://api.clay.com/v1';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

// ── Types ──────────────────────────────────────

export interface ClayEnrichmentResult {
  companyName?: string;
  domain?: string;
  industry?: string;
  employeeCount?: number;
  revenue?: string;
  location?: string;
  techStack?: string[];
  contactName?: string;
  contactTitle?: string;
  contactEmail?: string;
  contactLinkedin?: string;
  raw: Record<string, unknown>;
}

// ── Helpers ────────────────────────────────────

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

// ── Enrich Company ──────────────────────────────

/**
 * Enriches a single company via Clay API.
 * Returns null on failure (graceful degradation).
 */
export async function enrichCompany(
  apiKey: string,
  companyName: string,
  domain?: string,
): Promise<ClayEnrichmentResult | null> {
  const body: Record<string, string> = { company_name: companyName };
  if (domain) body.domain = domain;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${CLAY_API_BASE}/enrichment/company`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        if (isRetryable(response.status) && attempt < MAX_RETRIES - 1) {
          console.warn(
            `[clay] Retry ${attempt + 1}/${MAX_RETRIES} for ${companyName}: HTTP ${response.status}`,
          );
          await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
          continue;
        }
        console.warn(`[clay] Enrichment failed for ${companyName}: HTTP ${response.status}`);
        return null;
      }

      const data = await response.json() as Record<string, unknown>;
      return normalizeClayResponse(data);
    } catch (err) {
      if (attempt < MAX_RETRIES - 1) {
        console.warn(
          `[clay] Retry ${attempt + 1}/${MAX_RETRIES} for ${companyName}: ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
        await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
        continue;
      }
      console.warn(`[clay] Enrichment error for ${companyName}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return null;
    }
  }

  return null;
}

// ── Normalize Response ──────────────────────────

function normalizeClayResponse(data: Record<string, unknown>): ClayEnrichmentResult {
  return {
    companyName: asString(data.name ?? data.company_name),
    domain: asString(data.domain ?? data.website),
    industry: asString(data.industry),
    employeeCount: asNumber(data.employee_count ?? data.employees),
    revenue: asString(data.revenue ?? data.annual_revenue),
    location: buildLocation(data),
    techStack: asStringArray(data.tech_stack ?? data.technologies),
    contactName: asString(data.contact_name),
    contactTitle: asString(data.contact_title ?? data.contact_role),
    contactEmail: asString(data.contact_email),
    contactLinkedin: asString(data.contact_linkedin ?? data.linkedin_url),
    raw: data,
  };
}

function buildLocation(data: Record<string, unknown>): string | undefined {
  const city = asString(data.city);
  const state = asString(data.state);
  const country = asString(data.country);
  const parts = [city, state, country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : undefined;
}

function asString(val: unknown): string | undefined {
  return typeof val === 'string' && val.length > 0 ? val : undefined;
}

function asNumber(val: unknown): number | undefined {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const n = parseInt(val, 10);
    return isNaN(n) ? undefined : n;
  }
  return undefined;
}

function asStringArray(val: unknown): string[] | undefined {
  if (Array.isArray(val)) {
    return val.filter((v) => typeof v === 'string' && v.length > 0);
  }
  return undefined;
}
