import { db } from '../config/db.js';
import { prospects } from '../db/schema.js';
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
}

// ── Find Lookalikes ──────────────────────────────
// TODO: Replace stub with Clay/enrichment API calls in a later step

export async function findLookalikes(
  analysisId: string,
  extractedPatterns: ExtractedPatterns,
): Promise<Prospect[]> {
  // Stub: 5 mock prospect companies
  // In production, this will query Clay/ZoomInfo/Apollo based on
  // firmographics from the patterns (industry, deal size, employee count)
  const topIndustry = Object.entries(extractedPatterns.industryBreakdown)
    .sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'Technology';

  const mockProspects: Prospect[] = [
    {
      companyName: 'Acme Analytics',
      domain: 'acmeanalytics.com',
      industry: topIndustry,
      employeeCount: 250,
      revenue: '$25M',
      location: 'San Francisco, CA',
      techStack: ['Salesforce', 'HubSpot', 'Slack'],
      matchScore: 92,
      matchReasons: ['Same industry', 'Similar employee count', 'Uses Salesforce'],
      contactName: 'Sarah Chen',
      contactTitle: 'VP of Sales',
      contactEmail: 'sarah@acmeanalytics.com',
      contactLinkedin: 'https://linkedin.com/in/sarahchen',
    },
    {
      companyName: 'DataBridge Solutions',
      domain: 'databridge.io',
      industry: topIndustry,
      employeeCount: 180,
      revenue: '$18M',
      location: 'Austin, TX',
      techStack: ['Salesforce', 'Outreach', 'Gong'],
      matchScore: 87,
      matchReasons: ['Same industry', 'Revenue in range', 'Uses Gong'],
      contactName: 'Mike Rodriguez',
      contactTitle: 'Director of Revenue Operations',
      contactEmail: 'mike@databridge.io',
      contactLinkedin: 'https://linkedin.com/in/mikerodriguez',
    },
    {
      companyName: 'CloudMetrics Inc',
      domain: 'cloudmetrics.com',
      industry: topIndustry,
      employeeCount: 320,
      revenue: '$35M',
      location: 'New York, NY',
      techStack: ['HubSpot', 'Salesloft', 'Chorus'],
      matchScore: 81,
      matchReasons: ['Same industry', 'Similar deal size', 'Growth stage match'],
      contactName: 'Jessica Park',
      contactTitle: 'Head of Sales Enablement',
      contactEmail: 'jessica@cloudmetrics.com',
      contactLinkedin: 'https://linkedin.com/in/jessicapark',
    },
    {
      companyName: 'RevStack',
      domain: 'revstack.co',
      industry: topIndustry,
      employeeCount: 120,
      revenue: '$12M',
      location: 'Denver, CO',
      techStack: ['Pipedrive', 'Apollo', 'Slack'],
      matchScore: 76,
      matchReasons: ['Same industry', 'Growth trajectory match'],
      contactName: 'Tom Williams',
      contactTitle: 'VP of Sales',
      contactEmail: 'tom@revstack.co',
      contactLinkedin: 'https://linkedin.com/in/tomwilliams',
    },
    {
      companyName: 'PipelineIQ',
      domain: 'pipelineiq.com',
      industry: topIndustry,
      employeeCount: 200,
      revenue: '$22M',
      location: 'Chicago, IL',
      techStack: ['Salesforce', 'Outreach', 'ZoomInfo'],
      matchScore: 73,
      matchReasons: ['Same industry', 'Uses Salesforce', 'Similar tech stack'],
      contactName: 'Amanda Foster',
      contactTitle: 'Director of Sales',
      contactEmail: 'amanda@pipelineiq.com',
      contactLinkedin: 'https://linkedin.com/in/amandafoster',
    },
  ];

  // Persist to prospects table
  await db.insert(prospects).values(
    mockProspects.map((p) => ({
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
    })),
  );

  return mockProspects;
}
