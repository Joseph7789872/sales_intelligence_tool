import { z } from 'zod';

// ── Individual Section Schemas ──────────────────

export const ColdEmailSchema = z.object({
  subject: z.string().min(5).max(200),
  body: z.string().min(50).max(3000),
  followUp: z.string().min(20).max(1000),
});

export const PainPointEntrySchema = z.object({
  painPoint: z.string().min(5),
  relevance: z.string().min(10),
});

export const ObjectionEntrySchema = z.object({
  objection: z.string().min(5),
  response: z.string().min(20),
});

export const ChampionPersonaSchema = z.object({
  role: z.string().min(2),
  motivations: z.array(z.string()).min(1).max(5),
  buyingTriggers: z.array(z.string()).min(1).max(5),
});

export const TimelineStageSchema = z.object({
  stage: z.string().min(2),
  day: z.number().min(0),
});

export const PredictedTimelineSchema = z.object({
  daysToClose: z.number().min(1),
  stages: z.array(TimelineStageSchema).min(3).max(10),
});

export const CaseStudyRefSchema = z.object({
  company: z.string().min(2),
  industry: z.string().min(2),
  result: z.string().min(10),
  quote: z.string().min(10),
});

// ── Full Playbook Response Schema ───────────────

export const PlaybookResponseSchema = z.object({
  coldEmail: ColdEmailSchema,
  discoveryQuestions: z.array(z.string().min(10)).min(3).max(7),
  painPoints: z.array(PainPointEntrySchema).min(2).max(6),
  objectionHandling: z.array(ObjectionEntrySchema).min(2).max(6),
  championPersona: ChampionPersonaSchema,
  predictedTimeline: PredictedTimelineSchema,
  caseStudyRef: CaseStudyRefSchema,
  qualityScore: z.number().min(0).max(100),
});

export type PlaybookResponse = z.infer<typeof PlaybookResponseSchema>;

// ── Fallback Factory ────────────────────────────

interface FallbackProspect {
  companyName: string;
  industry: string;
  contactName: string;
  contactTitle: string;
}

interface FallbackPatterns {
  painPoints: string[];
  commonObjections: string[];
  avgSalesCycleDays: number;
  championRoles: string[];
}

interface FallbackDeal {
  companyName: string;
  industry: string;
  amount: string;
}

export function buildFallbackPlaybook(
  prospect: FallbackProspect,
  patterns: FallbackPatterns,
  closestDeal: FallbackDeal | null,
): PlaybookResponse {
  const pain1 = patterns.painPoints[0] ?? 'operational inefficiency';
  const pain2 = patterns.painPoints[1] ?? 'lack of data visibility';
  const pain3 = patterns.painPoints[2] ?? 'difficulty scaling processes';
  const refCompany = closestDeal?.companyName ?? 'a similar company';
  const refIndustry = closestDeal?.industry ?? prospect.industry;

  return {
    coldEmail: {
      subject: `How ${refCompany} solved ${pain1} — relevant for ${prospect.companyName}?`,
      body: `Hi ${prospect.contactName},\n\nI noticed ${prospect.companyName} is in the ${prospect.industry} space — similar to ${refCompany}, who was dealing with ${pain1} before working with us.\n\nAfter implementing our solution, ${refCompany} saw measurable improvements across their team.\n\nGiven your role as ${prospect.contactTitle}, I think you'd find their approach relevant.\n\nWould you be open to a 15-minute call this week to explore if something similar could work for ${prospect.companyName}?\n\nBest,\n[Your Name]`,
      followUp: `Hi ${prospect.contactName}, wanted to follow up on my previous note. Happy to share a quick case study from ${refCompany} if that would be helpful.`,
    },
    discoveryQuestions: [
      `How does your team currently handle ${pain1} at ${prospect.companyName}?`,
      `What does your current process look like for addressing ${pain2}?`,
      `How much time does your team spend on manual work related to ${pain3} each week?`,
      `What would it mean for ${prospect.companyName} if you could solve ${pain1} in the next quarter?`,
      `Who else on your team would be involved in evaluating a solution like this?`,
    ],
    painPoints: patterns.painPoints.slice(0, 3).map((pp) => ({
      painPoint: pp,
      relevance: `Common challenge for ${prospect.industry} companies of similar size to ${prospect.companyName}`,
    })),
    objectionHandling: patterns.commonObjections.slice(0, 3).map((obj) => ({
      objection: obj,
      response: `We've addressed this with companies like ${refCompany} in the ${refIndustry} space. They had the same concern and saw positive results within the first quarter.`,
    })),
    championPersona: {
      role: prospect.contactTitle,
      motivations: [
        'Improve team efficiency and reduce manual work',
        'Better visibility into key metrics',
        'Drive revenue growth through process optimization',
      ],
      buyingTriggers: [
        'End of quarter pressure to show results',
        'New leadership wanting operational improvements',
        'Scaling challenges outpacing current tools',
      ],
    },
    predictedTimeline: {
      daysToClose: patterns.avgSalesCycleDays,
      stages: [
        { stage: 'Discovery Call', day: 0 },
        { stage: 'Demo', day: 7 },
        { stage: 'Technical Review', day: 14 },
        { stage: 'Proposal', day: Math.round(patterns.avgSalesCycleDays * 0.6) },
        { stage: 'Negotiation', day: Math.round(patterns.avgSalesCycleDays * 0.8) },
        { stage: 'Closed Won', day: patterns.avgSalesCycleDays },
      ],
    },
    caseStudyRef: {
      company: closestDeal?.companyName ?? 'Similar Company',
      industry: refIndustry,
      result: `Improved operational efficiency and addressed ${pain1} with measurable results`,
      quote: `"This solution made a real difference for our team." — ${patterns.championRoles[0] ?? 'VP of Sales'}, ${refCompany}`,
    },
    qualityScore: 30,
  };
}
