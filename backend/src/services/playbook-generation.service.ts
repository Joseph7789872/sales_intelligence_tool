import { eq, inArray } from 'drizzle-orm';
import { db } from '../config/db.js';
import { prospects, playbooks, deals } from '../db/schema.js';
import { callClaude } from './claude.service.js';
import {
  PlaybookResponseSchema,
  buildFallbackPlaybook,
} from './playbook-generation.schemas.js';
import type { ExtractedPatterns } from './pattern-extraction.service.js';

// ── Types ──────────────────────────────────────

type ProspectRow = typeof prospects.$inferSelect;

interface DealContext {
  companyName: string;
  industry: string;
  amount: string;
  contactTitle: string;
  description: string | null;
}

// ── Prompt Constants ─────────────────────────────

const SYSTEM_PROMPT = `You are an elite B2B sales strategist who creates highly personalized sales playbooks. You have deep expertise in:
- Crafting cold emails that get responses (15%+ reply rates)
- Building discovery question frameworks
- Mapping buyer pain points to specific industries and company profiles
- Handling objections with evidence-based responses referencing real customer successes
- Identifying champion personas and their buying motivations
- Predicting sales timelines based on historical data

You generate playbooks for NEW prospects based on patterns from REAL closed-won deals. Your playbooks must:
1. Reference real past customer names and successes (from the provided deal data)
2. Be highly specific to the prospect's industry, company size, and contact role
3. Never use generic filler — every sentence must be tailored

Respond ONLY with valid JSON — no markdown, no explanation, no text before or after the JSON object.`;

// ── Prompt Builder ───────────────────────────────

function buildPlaybookPrompt(
  prospect: ProspectRow,
  patterns: ExtractedPatterns,
  closedWonDeals: DealContext[],
): string {
  const referenceDeal = findClosestDeal(prospect, closedWonDeals) ?? closedWonDeals[0];

  const dealSummaries = closedWonDeals
    .slice(0, 5)
    .map(
      (d) =>
        `  - ${d.companyName} (${d.industry}, $${Number(d.amount).toLocaleString()}, champion: ${d.contactTitle})`,
    )
    .join('\n');

  const { min, max, avg } = patterns.dealSizeRange;

  return `Generate a complete sales playbook for this prospect based on our closed-won deal patterns.

=== PROSPECT ===
Company: ${prospect.companyName}
Domain: ${prospect.domain ?? 'unknown'}
Industry: ${prospect.industry ?? 'unknown'}
Employees: ${prospect.employeeCount ?? 'unknown'}
Revenue: ${prospect.revenue ?? 'unknown'}
Location: ${prospect.location ?? 'unknown'}
Tech Stack: ${(prospect.techStack as string[] | null)?.join(', ') ?? 'unknown'}
Contact: ${prospect.contactName ?? 'Unknown'} (${prospect.contactTitle ?? 'Decision Maker'})
Match Score: ${prospect.matchScore ?? 0}%
Match Reasons: ${(prospect.matchReasons as string[] | null)?.join('; ') ?? 'N/A'}

=== CLOSED-WON DEAL PATTERNS ===
Pain Points: ${patterns.painPoints.join('; ')}
Winning Subject Lines: ${patterns.winningSubjects.join('; ')}
Common Objections: ${patterns.commonObjections.join('; ')}
Champion Roles: ${patterns.championRoles.join(', ')}
Avg Sales Cycle: ${patterns.avgSalesCycleDays} days
Deal Size Range: $${min.toLocaleString()} - $${max.toLocaleString()} (avg $${avg.toLocaleString()})

=== REAL CLOSED-WON CUSTOMERS (reference these by name) ===
${dealSummaries}

Most similar past customer: ${referenceDeal.companyName} (${referenceDeal.industry}, $${Number(referenceDeal.amount).toLocaleString()})

=== EXAMPLE OUTPUT ===
Here is an example of the exact JSON structure to return (for a DIFFERENT prospect — do NOT copy this content, only the structure):

{
  "coldEmail": {
    "subject": "How Acme Corp cut pipeline review time by 60% — relevant for DataFlow?",
    "body": "Hi Sarah,\\n\\nI noticed DataFlow is scaling rapidly in the analytics space — similar to where Acme Corp was 6 months ago when they were spending 12+ hours/week on manual pipeline reviews.\\n\\nAfter implementing our solution, Acme Corp cut that time by 60% and improved forecast accuracy by 40%. Given DataFlow's growth trajectory and your role leading RevOps, I think you'd find their approach interesting.\\n\\nWould you be open to a 15-minute call next Tuesday or Wednesday to explore if something similar could work for your team?\\n\\nBest,\\n[Your Name]",
    "followUp": "Hi Sarah, wanted to bump this — I also put together a quick 2-minute breakdown of how Acme Corp's RevOps team restructured their pipeline reviews. Happy to share if useful."
  },
  "discoveryQuestions": [
    "How does your RevOps team currently track pipeline health across DataFlow's growing sales org?",
    "What does your forecasting process look like today — is it mostly spreadsheet-based or do you have automation in place?",
    "When reps update deal stages, how confident are you in the accuracy of those updates?",
    "If you could get pipeline insights in real-time instead of weekly reviews, what would that unlock for your team?",
    "Who else on the leadership team would need to see ROI data before moving forward with a new tool?"
  ],
  "painPoints": [
    { "painPoint": "Manual pipeline reviews consuming 10+ hours/week", "relevance": "DataFlow's rapid growth in analytics means their sales team is likely scaling faster than their RevOps processes can keep up" },
    { "painPoint": "Inaccurate revenue forecasts", "relevance": "Analytics companies like DataFlow rely heavily on predictable revenue — inaccurate forecasts directly impact hiring and product investment decisions" },
    { "painPoint": "CRM data quality degradation", "relevance": "With DataFlow's 200+ employees, CRM hygiene typically breaks down as more reps join without standardized processes" }
  ],
  "objectionHandling": [
    { "objection": "We already have a solution in place", "response": "Totally understand — Acme Corp was actually using a competitor before switching. What they found was that the existing tool couldn't scale past 50 reps. Given DataFlow's growth rate, it might be worth a quick comparison to see if you're hitting similar limitations." },
    { "objection": "Budget is tight this quarter", "response": "Makes sense. What Acme Corp did was start with a 30-day pilot with just the RevOps team — the time savings alone (12 hours/week back) justified the full rollout within one quarter. We could structure something similar." },
    { "objection": "Need internal alignment first", "response": "Absolutely. We have a one-page ROI calculator that Acme Corp's VP of Sales used to get buy-in from their CFO in under a week. I can customize one for DataFlow with your specific metrics." }
  ],
  "championPersona": {
    "role": "VP of Revenue Operations",
    "motivations": ["Prove RevOps impact to leadership with measurable metrics", "Reduce manual work so team can focus on strategic initiatives", "Build a scalable revenue engine for DataFlow's next growth phase"],
    "buyingTriggers": ["Missed forecast targets two quarters in a row", "Board pressure to improve revenue predictability", "New CRO hire demanding better pipeline visibility"]
  },
  "predictedTimeline": {
    "daysToClose": 45,
    "stages": [
      { "stage": "Discovery Call", "day": 0 },
      { "stage": "Demo with RevOps Team", "day": 5 },
      { "stage": "Technical Evaluation", "day": 12 },
      { "stage": "Business Case / ROI Review", "day": 22 },
      { "stage": "Procurement / Legal", "day": 35 },
      { "stage": "Closed Won", "day": 45 }
    ]
  },
  "caseStudyRef": {
    "company": "Acme Corp",
    "industry": "Analytics",
    "result": "Reduced pipeline review time by 60%, improved forecast accuracy by 40%, and saved the RevOps team 12 hours/week within 30 days",
    "quote": "This tool completely transformed how our sales team operates. We went from guessing to knowing. — VP of Sales, Acme Corp"
  },
  "qualityScore": 85
}

=== INSTRUCTIONS ===
Generate a playbook for ${prospect.companyName} following the EXACT JSON structure above. Key requirements:
- The cold email MUST reference ${referenceDeal.companyName} by name as a real success story
- Discovery questions must be specific to ${prospect.companyName}'s industry (${prospect.industry ?? 'their industry'}) and the contact's role (${prospect.contactTitle ?? 'decision maker'})
- Pain points must explain why SPECIFICALLY ${prospect.companyName} would experience each pain
- Objection responses must reference real past customers by name from the closed-won list
- The case study must reference the most similar real customer: ${referenceDeal.companyName}
- The quality score should be your self-assessment (0-100) of how personalized and actionable this playbook is
- Timeline stages should reflect a realistic ${patterns.avgSalesCycleDays}-day sales cycle for ${prospect.industry ?? 'this industry'}
- Do NOT wrap the JSON in markdown code fences — return raw JSON only

Return ONLY the JSON object.`;
}

// ── Helpers ──────────────────────────────────────

function findClosestDeal(
  prospect: ProspectRow,
  dealContexts: DealContext[],
): DealContext | null {
  if (dealContexts.length === 0) return null;

  const sameIndustry = dealContexts.find(
    (d) => d.industry.toLowerCase() === (prospect.industry ?? '').toLowerCase(),
  );
  return sameIndustry ?? dealContexts[0];
}

// ── Single Prospect Generation ───────────────────

async function generateSinglePlaybook(
  prospect: ProspectRow,
  patterns: ExtractedPatterns,
  dealContexts: DealContext[],
  analysisId: string,
): Promise<typeof playbooks.$inferInsert> {
  try {
    const result = await callClaude({
      systemPrompt: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildPlaybookPrompt(prospect, patterns, dealContexts),
        },
      ],
      maxTokens: 4000,
    });

    const parsed = PlaybookResponseSchema.safeParse(result.json);

    if (parsed.success) {
      return {
        analysisId,
        prospectId: prospect.id,
        coldEmail: parsed.data.coldEmail,
        discoveryQuestions: parsed.data.discoveryQuestions,
        painPoints: parsed.data.painPoints,
        objectionHandling: parsed.data.objectionHandling,
        championPersona: parsed.data.championPersona,
        predictedTimeline: parsed.data.predictedTimeline,
        caseStudyRef: parsed.data.caseStudyRef,
        qualityScore: parsed.data.qualityScore,
        rawLlmOutput: result.text,
      };
    }

    console.warn(
      `[playbook-generation] Zod validation failed for ${prospect.companyName}: ${parsed.error.message}`,
    );

    const closestDeal = findClosestDeal(prospect, dealContexts);
    const fallback = buildFallbackPlaybook(
      {
        companyName: prospect.companyName,
        industry: prospect.industry ?? 'Technology',
        contactName: prospect.contactName ?? 'there',
        contactTitle: prospect.contactTitle ?? 'Decision Maker',
      },
      patterns,
      closestDeal
        ? {
            companyName: closestDeal.companyName,
            industry: closestDeal.industry,
            amount: closestDeal.amount,
          }
        : null,
    );

    return {
      analysisId,
      prospectId: prospect.id,
      ...fallback,
      rawLlmOutput: `VALIDATION_FAILED: ${result.text}`,
    };
  } catch (err) {
    console.error(
      `[playbook-generation] Claude call failed for ${prospect.companyName}: ${err instanceof Error ? err.message : 'Unknown error'}`,
    );

    const closestDeal = findClosestDeal(prospect, dealContexts);
    const fallback = buildFallbackPlaybook(
      {
        companyName: prospect.companyName,
        industry: prospect.industry ?? 'Technology',
        contactName: prospect.contactName ?? 'there',
        contactTitle: prospect.contactTitle ?? 'Decision Maker',
      },
      patterns,
      closestDeal
        ? {
            companyName: closestDeal.companyName,
            industry: closestDeal.industry,
            amount: closestDeal.amount,
          }
        : null,
    );

    return {
      analysisId,
      prospectId: prospect.id,
      ...fallback,
      rawLlmOutput: `API_ERROR: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

// ── Generate Playbooks (Main Entry Point) ────────

export async function generatePlaybooks(
  analysisId: string,
  extractedPatterns: ExtractedPatterns,
  selectedDealIds: string[],
): Promise<number> {
  // 1. Fetch prospects for this analysis
  const prospectList = await db
    .select()
    .from(prospects)
    .where(eq(prospects.analysisId, analysisId));

  if (prospectList.length === 0) return 0;

  // 2. Fetch closed-won deals for context (real customer names)
  const closedWonDeals = await db
    .select({
      companyName: deals.companyName,
      industry: deals.industry,
      amount: deals.amount,
      contactTitle: deals.contactTitle,
      description: deals.description,
    })
    .from(deals)
    .where(inArray(deals.id, selectedDealIds));

  const dealContexts: DealContext[] = closedWonDeals.map((d) => ({
    companyName: d.companyName ?? 'Unknown Company',
    industry: d.industry ?? 'Unknown',
    amount: d.amount ?? '0',
    contactTitle: d.contactTitle ?? 'Decision Maker',
    description: d.description,
  }));

  // 3. Generate playbook for each prospect (sequential to avoid rate limits)
  const playbookValues: Array<typeof playbooks.$inferInsert> = [];

  for (const prospect of prospectList) {
    const playbook = await generateSinglePlaybook(
      prospect,
      extractedPatterns,
      dealContexts,
      analysisId,
    );
    playbookValues.push(playbook);
  }

  // 4. Batch insert all playbooks
  if (playbookValues.length > 0) {
    await db.insert(playbooks).values(playbookValues);
  }

  return playbookValues.length;
}
