import { db } from '../config/db.js';
import { prospects } from '../db/schema.js';
import { callClaude } from './claude.service.js';
import { getConfigsByUser } from './enrichment.service.js';
import { enrichCompany, type ClayEnrichmentResult } from './clay.service.js';
import { decrypt } from '../utils/encryption.js';
import { LookalikeResponseSchema } from './lookalike-search.schemas.js';
import type { ExtractedPatterns } from './pattern-extraction.service.js';

// ── Types ──────────────────────────────────────

export interface Prospect {
  companyName: string;
  domain: string;
  industry: string;
  employeeCount: number;
  revenue: string;
  location: string;
  techStack: string[];
  matchScore: number;
  matchReasons: string[];
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  contactLinkedin: string;
  clayEnrichmentData?: Record<string, unknown>;
}

// ── Prompt ────────────────────────────────────

const SYSTEM_PROMPT = `You are a B2B sales intelligence expert. Your job is to suggest real companies that match a given ideal customer profile based on closed-won deal patterns.

Respond ONLY with valid JSON — no markdown, no explanation, no text before or after the JSON object.`;

function buildLookalikePrompt(patterns: ExtractedPatterns): string {
  const topIndustries = Object.entries(patterns.industryBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([ind, count]) => `${ind} (${count} deals)`)
    .join(', ');

  const { min, max, avg } = patterns.dealSizeRange;

  return `Based on these patterns from closed-won B2B deals, suggest 5 real companies that would be strong lookalike prospects.

Deal Patterns:
- Top industries: ${topIndustries || 'Various'}
- Deal sizes: $${min.toLocaleString()} - $${max.toLocaleString()} (avg $${avg.toLocaleString()})
- Average sales cycle: ${patterns.avgSalesCycleDays} days
- Champion roles: ${patterns.championRoles.join(', ')}
- Key pain points: ${patterns.painPoints.join('; ')}

Requirements:
- Suggest real, well-known B2B companies (not fictional)
- Companies should be in similar industries and size ranges
- Include a likely decision-maker contact with a realistic title
- Each prospect should have a unique match score between 70-95

Return JSON:
{
  "prospects": [
    {
      "companyName": "Company Name",
      "domain": "company.com",
      "industry": "Industry",
      "employeeCount": 500,
      "revenue": "$50M",
      "location": "City, State",
      "techStack": ["Tool1", "Tool2"],
      "matchScore": 85,
      "matchReasons": ["Reason 1", "Reason 2"],
      "contactName": "Full Name",
      "contactTitle": "VP of Sales",
      "contactEmail": "name@company.com",
      "contactLinkedin": "https://linkedin.com/in/name"
    }
  ]
}`;
}

// ── Fallback Prospects ──────────────────────────

function getFallbackProspects(patterns: ExtractedPatterns): Prospect[] {
  const topIndustry = Object.entries(patterns.industryBreakdown)
    .sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'Technology';

  return [
    {
      companyName: 'Prospect Company A',
      domain: 'prospectA.com',
      industry: topIndustry,
      employeeCount: 250,
      revenue: `$${Math.round(patterns.dealSizeRange.avg / 1000)}k ARR target`,
      location: 'San Francisco, CA',
      techStack: ['Salesforce', 'HubSpot'],
      matchScore: 85,
      matchReasons: ['Same industry', 'Similar company size'],
      contactName: 'Contact Pending',
      contactTitle: patterns.championRoles[0] ?? 'VP of Sales',
      contactEmail: 'pending@prospectA.com',
      contactLinkedin: '',
    },
  ];
}

// ── Clay Enrichment ──────────────────────────────

function mergeClayData(prospect: Prospect, clay: ClayEnrichmentResult): Prospect {
  return {
    ...prospect,
    companyName: clay.companyName ?? prospect.companyName,
    domain: clay.domain ?? prospect.domain,
    industry: clay.industry ?? prospect.industry,
    employeeCount: clay.employeeCount ?? prospect.employeeCount,
    revenue: clay.revenue ?? prospect.revenue,
    location: clay.location ?? prospect.location,
    techStack: clay.techStack && clay.techStack.length > 0 ? clay.techStack : prospect.techStack,
    contactName: clay.contactName ?? prospect.contactName,
    contactTitle: clay.contactTitle ?? prospect.contactTitle,
    contactEmail: clay.contactEmail ?? prospect.contactEmail,
    contactLinkedin: clay.contactLinkedin ?? prospect.contactLinkedin,
    clayEnrichmentData: clay.raw,
  };
}

// ── Find Lookalikes (Main Entry Point) ───────────

export async function findLookalikes(
  analysisId: string,
  userId: string,
  extractedPatterns: ExtractedPatterns,
): Promise<Prospect[]> {
  // 1. Ask Claude for lookalike suggestions
  const result = await callClaude({
    systemPrompt: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildLookalikePrompt(extractedPatterns) }],
    maxTokens: 3000,
  });

  const parsed = LookalikeResponseSchema.safeParse(result.json);
  let prospectList: Prospect[];

  if (parsed.success) {
    prospectList = parsed.data.prospects;
  } else {
    console.warn('[lookalike-search] LLM response failed Zod validation, using fallback');
    prospectList = getFallbackProspects(extractedPatterns);
  }

  // 2. Attempt Clay enrichment if configured
  const configs = await getConfigsByUser(userId);
  const clayConfig = configs.find((c) => c.provider === 'clay' && c.isValid);

  if (clayConfig) {
    try {
      // Need to fetch the full config with encrypted API key
      const fullConfigs = await getFullConfigsByUser(userId);
      const fullClayConfig = fullConfigs.find((c) => c.provider === 'clay');

      if (fullClayConfig) {
        const apiKey = decrypt(fullClayConfig.apiKey);

        for (let i = 0; i < prospectList.length; i++) {
          const enriched = await enrichCompany(
            apiKey,
            prospectList[i].companyName,
            prospectList[i].domain,
          );
          if (enriched) {
            prospectList[i] = mergeClayData(prospectList[i], enriched);
          }
        }
      }
    } catch (err) {
      console.warn(
        `[lookalike-search] Clay enrichment failed, using LLM data: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }

  // 3. Persist to prospects table
  await db.insert(prospects).values(
    prospectList.map((p) => ({
      analysisId,
      companyName: p.companyName,
      domain: p.domain,
      industry: p.industry,
      employeeCount: p.employeeCount,
      revenue: p.revenue,
      location: p.location,
      techStack: p.techStack,
      matchScore: p.matchScore,
      matchReasons: p.matchReasons,
      contactName: p.contactName,
      contactTitle: p.contactTitle,
      contactEmail: p.contactEmail,
      contactLinkedin: p.contactLinkedin,
      clayEnrichmentData: p.clayEnrichmentData ?? null,
    })),
  );

  return prospectList;
}

// ── Internal Helpers ─────────────────────────────
// Need raw DB access to get encrypted API key (getConfigsByUser sanitizes it out)

import { eq } from 'drizzle-orm';
import { enrichmentConfigs } from '../db/schema.js';

async function getFullConfigsByUser(userId: string) {
  return db
    .select()
    .from(enrichmentConfigs)
    .where(eq(enrichmentConfigs.userId, userId));
}
