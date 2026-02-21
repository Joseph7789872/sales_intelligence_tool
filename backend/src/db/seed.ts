import 'dotenv/config';
import crypto from 'crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { eq } from 'drizzle-orm';
import {
  users,
  crmConnections,
  enrichmentConfigs,
  deals,
  dealStageHistory,
  analyses,
  patterns,
  prospects,
  playbooks,
} from './schema.js';

// ── Standalone DB connection (bypasses env.ts validation) ──

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool);

// ── Constants ───────────────────────────────────────────────

// Pass SEED_CLERK_ID env var to link seed data to your real Clerk account:
//   SEED_CLERK_ID=user_xxxxx npm run seed
const SEED_CLERK_ID = process.env.SEED_CLERK_ID || 'seed_user_001';

// Pre-generate all UUIDs for FK wiring
const userId = crypto.randomUUID();
const crmConnectionId = crypto.randomUUID();
const analysisId = crypto.randomUUID();
const dealIds = Array.from({ length: 15 }, () => crypto.randomUUID());
const prospectIds = Array.from({ length: 5 }, () => crypto.randomUUID());

const NOW = new Date();
function monthsAgo(months: number): Date {
  const d = new Date(NOW);
  d.setMonth(d.getMonth() - months);
  return d;
}
function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 86_400_000);
}
function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

// ── 15 Deals ────────────────────────────────────────────────

const DEALS_DATA = [
  { idx: 0, name: 'Meridian Financial - Enterprise License', companyName: 'Meridian Financial Systems', amount: '185000.00', industry: 'FinTech', employeeCount: 450, closeMonthsAgo: 1, ownerName: 'Jordan Mitchell', contactName: 'Alex Rivera', contactTitle: 'VP of Sales', contactEmail: 'alex.rivera@meridianfs.com', description: 'Enterprise platform license for sales intelligence across 45-person sales org. Champion was VP of Sales frustrated with manual CRM updates.' },
  { idx: 1, name: 'PulseCheck Health - Annual Contract', companyName: 'PulseCheck Health', amount: '92000.00', industry: 'HealthTech', employeeCount: 220, closeMonthsAgo: 2, ownerName: 'Jordan Mitchell', contactName: 'Priya Sharma', contactTitle: 'Head of Revenue Operations', contactEmail: 'priya.sharma@pulsecheck.io', description: 'Annual contract for revenue intelligence platform. Key pain point was lack of visibility into deal progression in regulated sales cycles.' },
  { idx: 2, name: 'BrightPath Learning - Growth Plan', companyName: 'BrightPath Learning', amount: '67500.00', industry: 'EdTech', employeeCount: 180, closeMonthsAgo: 3, ownerName: 'Sarah Chen', contactName: 'Marcus Johnson', contactTitle: 'Director of Sales', contactEmail: 'marcus.johnson@brightpath.edu', description: 'Growth plan for 15-person sales team. Won because of proven ROI metrics from similar EdTech deployments.' },
  { idx: 3, name: 'AdVantage Media - Platform Deal', companyName: 'AdVantage Media', amount: '245000.00', industry: 'MarTech', employeeCount: 350, closeMonthsAgo: 1.5, ownerName: 'Sarah Chen', contactName: 'Rachel Torres', contactTitle: 'Chief Revenue Officer', contactEmail: 'rachel.torres@advantagemedia.com', description: 'Full platform deployment for MarTech company scaling from 30 to 60 reps. CRO championed internally after seeing competitor using our tool.' },
  { idx: 4, name: 'CloudVault Storage - Enterprise Agreement', companyName: 'CloudVault Storage', amount: '420000.00', industry: 'Cloud Infrastructure', employeeCount: 800, closeMonthsAgo: 4, ownerName: 'Jordan Mitchell', contactName: 'David Park', contactTitle: 'VP of Revenue', contactEmail: 'david.park@cloudvault.io', description: 'Enterprise agreement covering 80-person global sales team. Complex deal with 5 stakeholders. Won on forecast accuracy improvements.' },
  { idx: 5, name: 'Nexus HR Solutions - Team License', companyName: 'Nexus HR Solutions', amount: '54000.00', industry: 'HRTech', employeeCount: 150, closeMonthsAgo: 5, ownerName: 'Sarah Chen', contactName: 'Lisa Chang', contactTitle: 'Head of Sales', contactEmail: 'lisa.chang@nexushr.com', description: 'Team license for growing HRTech startup. Fast 30-day sales cycle driven by urgent need to improve new hire ramp time.' },
  { idx: 6, name: 'DataForge Analytics - Enterprise Platform', companyName: 'DataForge Analytics', amount: '310000.00', industry: 'Data & Analytics', employeeCount: 500, closeMonthsAgo: 2.5, ownerName: 'Jordan Mitchell', contactName: 'James Wilson', contactTitle: 'VP of Business Development', contactEmail: 'james.wilson@dataforge.ai', description: 'Enterprise platform for analytics company with 50+ AEs. Key differentiator was our ability to analyze call transcripts and extract winning patterns.' },
  { idx: 7, name: 'ShipStream Logistics - Annual Deal', companyName: 'ShipStream Logistics', amount: '175000.00', industry: 'LogiTech', employeeCount: 600, closeMonthsAgo: 6, ownerName: 'Sarah Chen', contactName: 'Carlos Mendez', contactTitle: 'Director of Revenue Operations', contactEmail: 'carlos.mendez@shipstream.com', description: 'Annual platform deal for logistics SaaS. Pain point was inconsistent messaging across 4 regional sales teams.' },
  { idx: 8, name: 'GreenLedger Carbon - Startup Plan', companyName: 'GreenLedger Carbon', amount: '38000.00', industry: 'CleanTech', employeeCount: 120, closeMonthsAgo: 7, ownerName: 'Jordan Mitchell', contactName: 'Emma Nakamura', contactTitle: 'Head of Growth', contactEmail: 'emma.nakamura@greenledger.co', description: 'Startup plan for early-stage CleanTech. Small deal but strategic — fast close driven by founder urgency to build repeatable sales process.' },
  { idx: 9, name: 'SecureNet Compliance - Enterprise Security', companyName: 'SecureNet Compliance', amount: '485000.00', industry: 'Cybersecurity', employeeCount: 900, closeMonthsAgo: 3, ownerName: 'Jordan Mitchell', contactName: 'Robert Kim', contactTitle: 'VP of Sales', contactEmail: 'robert.kim@securenet.io', description: 'Largest deal in pipeline — enterprise security company with 90-person sales org. Won after 3-month evaluation against 2 competitors.' },
  { idx: 10, name: 'PropelCRM Solutions - Growth License', companyName: 'PropelCRM Solutions', amount: '128000.00', industry: 'SalesTech', employeeCount: 280, closeMonthsAgo: 8, ownerName: 'Sarah Chen', contactName: 'Michelle Patel', contactTitle: 'Chief Revenue Officer', contactEmail: 'michelle.patel@propelcrm.com', description: 'Growth license for SalesTech company. Interesting competitive deal — they evaluated building internally vs buying. ROI analysis sealed it.' },
  { idx: 11, name: 'SpectraComms - Multi-Year Platform', companyName: 'SpectraComms Platform', amount: '375000.00', industry: 'Telecom SaaS', employeeCount: 1200, closeMonthsAgo: 4, ownerName: 'Jordan Mitchell', contactName: 'Thomas Wright', contactTitle: 'VP of Sales Operations', contactEmail: 'thomas.wright@spectracomms.com', description: 'Multi-year platform agreement for telecom SaaS giant. Complex procurement process but strong internal champion in Sales Ops.' },
  { idx: 12, name: 'AgilePlan Project - Starter Plan', companyName: 'AgilePlan Project', amount: '22500.00', industry: 'Project Management', employeeCount: 95, closeMonthsAgo: 9, ownerName: 'Sarah Chen', contactName: 'Nicole Adams', contactTitle: 'Head of Revenue Operations', contactEmail: 'nicole.adams@agileplan.io', description: 'Starter plan for small but fast-growing PM tool. Shortest sales cycle in portfolio — 18 days from first call to close.' },
  { idx: 13, name: 'RetailPulse Commerce - Annual Platform', companyName: 'RetailPulse Commerce', amount: '198000.00', industry: 'Retail Tech', employeeCount: 420, closeMonthsAgo: 5.5, ownerName: 'Jordan Mitchell', contactName: 'Brandon Lee', contactTitle: 'Director of Sales', contactEmail: 'brandon.lee@retailpulse.com', description: 'Annual platform deal for retail tech company expanding into enterprise segment. Needed better playbooks for upmarket motion.' },
  { idx: 14, name: 'BioSync Research - Enterprise Agreement', companyName: 'BioSync Research', amount: '500000.00', industry: 'BioTech', employeeCount: 3200, closeMonthsAgo: 10, ownerName: 'Jordan Mitchell', contactName: 'Dr. Sarah Okafor', contactTitle: 'VP of Enterprise Sales', contactEmail: 'sarah.okafor@biosync.com', description: 'Largest enterprise agreement — biotech company with complex, long sales cycles (90+ days). Won on ability to predict deal outcomes and coach reps.' },
];

// ── Stage History Helper ────────────────────────────────────

const STAGES = ['Prospecting', 'Discovery', 'Demo', 'Proposal', 'Negotiation', 'Closed Won'] as const;
const DURATION_RANGES: [number, number][] = [
  [5, 15],  // Prospecting
  [7, 14],  // Discovery
  [3, 10],  // Demo
  [5, 14],  // Proposal
  [7, 21],  // Negotiation
  [0, 0],   // Closed Won (terminal)
];

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function generateStageHistory(dealId: string, closeDate: Date, seedOffset: number) {
  const durations = DURATION_RANGES.map(([min, max], i) =>
    Math.floor(seededRandom(seedOffset + i) * (max - min + 1)) + min
  );
  const totalDays = durations.reduce((sum, d) => sum + d, 0);
  let current = new Date(closeDate.getTime() - totalDays * 86_400_000);

  return STAGES.map((stage, i) => {
    const enteredAt = new Date(current);
    const dur = durations[i];
    const exitedAt = i < STAGES.length - 1 ? new Date(current.getTime() + dur * 86_400_000) : null;
    if (exitedAt) current = exitedAt;
    return {
      id: crypto.randomUUID(),
      dealId,
      stageName: stage,
      enteredAt,
      exitedAt,
      durationDays: dur || null,
    };
  });
}

// ── 5 Prospects ─────────────────────────────────────────────

const PROSPECTS_DATA = [
  { idx: 0, companyName: 'Pinnacle Payments', domain: 'pinnaclepayments.com', industry: 'FinTech', employeeCount: 380, revenue: '$25M-$50M', location: 'San Francisco, CA', techStack: ['Salesforce', 'Snowflake', 'Slack', 'AWS', 'Gong'], matchScore: 93, matchReasons: ['Same industry as top deal Meridian Financial', 'Similar employee count (380 vs 450)', 'Uses Salesforce CRM', 'Series C stage matching growth profile'], contactName: 'Sarah Chen', contactTitle: 'VP of Revenue Operations', contactEmail: 'sarah.chen@pinnaclepayments.com', contactLinkedin: 'https://linkedin.com/in/sarahchen-pinnacle' },
  { idx: 1, companyName: 'VitalSign Digital Health', domain: 'vitalsignhealth.com', industry: 'HealthTech', employeeCount: 190, revenue: '$10M-$25M', location: 'Boston, MA', techStack: ['HubSpot', 'Tableau', 'Zoom', 'GCP', 'Chorus'], matchScore: 87, matchReasons: ['HealthTech vertical matches PulseCheck Health win', 'Similar company size and growth stage', 'Regulated sales environment', 'Recently raised Series B'], contactName: 'Michael Torres', contactTitle: 'Head of Sales', contactEmail: 'michael.torres@vitalsignhealth.com', contactLinkedin: 'https://linkedin.com/in/michaeltorres-vitalsign' },
  { idx: 2, companyName: 'QuantumLeap Analytics', domain: 'quantumleap.ai', industry: 'Data & Analytics', employeeCount: 550, revenue: '$50M-$100M', location: 'New York, NY', techStack: ['Salesforce', 'Databricks', 'Slack', 'Azure', 'Outreach'], matchScore: 91, matchReasons: ['Data & Analytics vertical matches DataForge win', 'Similar team size to DataForge (550 vs 500)', 'Enterprise sales motion', 'Tech stack overlap with existing customers'], contactName: 'Jennifer Park', contactTitle: 'Chief Revenue Officer', contactEmail: 'jennifer.park@quantumleap.ai', contactLinkedin: 'https://linkedin.com/in/jenniferpark-ql' },
  { idx: 3, companyName: 'CyberShield Defense', domain: 'cybershielddefense.com', industry: 'Cybersecurity', employeeCount: 720, revenue: '$75M-$150M', location: 'Austin, TX', techStack: ['Salesforce', 'Looker', 'Teams', 'AWS', 'Salesloft'], matchScore: 78, matchReasons: ['Cybersecurity vertical matches SecureNet win', 'Large sales org (70+ reps)', 'Complex enterprise deal cycles', 'Using competitive sales engagement tool'], contactName: 'Kevin Washington', contactTitle: 'VP of Sales', contactEmail: 'kevin.washington@cybershielddefense.com', contactLinkedin: 'https://linkedin.com/in/kevinwashington-csd' },
  { idx: 4, companyName: 'ScaleUp Commerce', domain: 'scaleupcommerce.com', industry: 'Retail Tech', employeeCount: 310, revenue: '$15M-$30M', location: 'Chicago, IL', techStack: ['Pipedrive', 'Google Analytics', 'Slack', 'AWS', 'Apollo'], matchScore: 72, matchReasons: ['Retail Tech vertical matches RetailPulse win', 'Mid-market moving upmarket', 'Growing sales team needs process standardization', 'Currently using lightweight CRM'], contactName: 'Amanda Rodriguez', contactTitle: 'Director of Revenue', contactEmail: 'amanda.rodriguez@scaleupcommerce.com', contactLinkedin: 'https://linkedin.com/in/amandarodriguez-suc' },
];

// ── Patterns ────────────────────────────────────────────────

const PATTERNS = {
  painPoints: [
    'Manual CRM data entry consuming 30% of rep time',
    'No visibility into deal progression bottlenecks',
    'Inconsistent sales messaging across the team',
    'Inability to replicate top performer behaviors',
    'Long ramp time for new sales hires (90+ days)',
  ],
  winningSubjects: [
    'How {Company} reduced sales cycle by 34%',
    'Quick question about your {Industry} pipeline',
    '{Company}\'s competitors are closing faster — here\'s why',
    'The {painPoint} problem — solved in 2 weeks',
  ],
  commonObjections: [
    'We already use Salesforce reports for this',
    'Our team is too small to justify the cost',
    'We need to finish our CRM migration first',
    'I need to get buy-in from our VP of Sales',
  ],
  avgSalesCycleDays: 52,
  championRoles: [
    'VP of Sales',
    'Head of Revenue Operations',
    'Chief Revenue Officer',
    'Director of Sales Operations',
    'Head of Growth',
  ],
  industryBreakdown: {
    'FinTech': 2,
    'HealthTech': 1,
    'EdTech': 1,
    'MarTech': 1,
    'Cloud Infrastructure': 1,
    'HRTech': 1,
    'Data & Analytics': 1,
    'LogiTech': 1,
    'CleanTech': 1,
    'Cybersecurity': 1,
    'SalesTech': 1,
    'Telecom SaaS': 1,
    'Project Management': 1,
    'Retail Tech': 1,
    'BioTech': 1,
  },
  dealSizeRange: { min: 22500, max: 500000, avg: 219700 },
};

// ── 5 Playbooks ─────────────────────────────────────────────

const PLAYBOOKS_DATA = [
  // Prospect 0: Pinnacle Payments (FinTech) — references Meridian Financial
  {
    coldEmail: {
      subject: 'How Meridian Financial cut sales cycle by 34% — relevant for Pinnacle Payments?',
      body: `Hi Sarah,

I noticed Pinnacle Payments is scaling rapidly in the FinTech space — similar to Meridian Financial Systems, who was struggling with manual CRM data entry consuming 30% of their reps' time.

After implementing our solution, Meridian reduced their sales cycle from 68 to 45 days and increased pipeline velocity by 34%.

Given your role as VP of Revenue Operations, I think you'd find their approach directly applicable to Pinnacle's growth stage.

Would you be open to a 15-minute call this week to explore if something similar could work for Pinnacle Payments?

Best,
[Your Name]`,
      followUp: 'Hi Sarah, wanted to follow up on my previous note about how Meridian Financial addressed the same pipeline challenges Pinnacle Payments likely faces at your scale. Happy to share their case study — just a quick 15-minute conversation.',
    },
    discoveryQuestions: [
      'How does your team currently track deal progression across your pipeline at Pinnacle Payments?',
      'What percentage of your reps\' time would you estimate goes to manual CRM updates versus actual selling?',
      'How do you currently identify which deals are at risk of stalling in your pipeline?',
      'What does your new hire ramp process look like today, and how long until reps are fully productive?',
      'Who else on your leadership team would be involved in evaluating a revenue intelligence solution?',
    ],
    painPoints: [
      { painPoint: 'Manual CRM data entry consuming 30% of rep time', relevance: 'FinTech companies at Pinnacle\'s scale (380 employees) typically have 20-40 reps, meaning 6-12 FTEs of productivity lost to admin work' },
      { painPoint: 'No visibility into deal progression bottlenecks', relevance: 'Fast-growing FinTech companies often lack standardized stage criteria, leading to inaccurate forecasts' },
      { painPoint: 'Inconsistent sales messaging across the team', relevance: 'With rapid headcount growth, message drift is common — top performers develop their own playbooks that aren\'t shared' },
    ],
    objectionHandling: [
      { objection: 'We already use Salesforce reports for this', response: 'Absolutely — Meridian Financial had the same setup. The difference they found was that static reports show lagging indicators, while our platform identifies at-risk deals in real-time. Their forecast accuracy improved from 62% to 89% in one quarter.' },
      { objection: 'Our team is too small to justify the cost', response: 'That\'s actually the ideal time to implement. Companies like GreenLedger Carbon (120 employees) started with us early and avoided the painful process of trying to retrofit insights into a scaled-up org.' },
      { objection: 'I need to get buy-in from our VP of Sales', response: 'Totally understand. We can put together a 10-minute executive brief showing projected ROI based on your current team size and deal velocity. Want me to prepare that for your next leadership sync?' },
    ],
    championPersona: {
      role: 'VP of Revenue Operations',
      motivations: ['Improve forecast accuracy to build credibility with the board', 'Reduce rep admin burden to improve quota attainment', 'Standardize sales processes across growing team', 'Demonstrate ROI of RevOps function to leadership'],
      buyingTriggers: ['Recent funding round creating pressure to scale efficiently', 'Missed forecast in previous quarter', 'New CRO hire wanting operational rigor', 'Board pressure to improve sales efficiency metrics'],
    },
    predictedTimeline: {
      daysToClose: 52,
      stages: [
        { stage: 'Discovery Call', day: 0 },
        { stage: 'Technical Demo', day: 8 },
        { stage: 'Stakeholder Review', day: 18 },
        { stage: 'Proposal Sent', day: 30 },
        { stage: 'Negotiation', day: 40 },
        { stage: 'Closed Won', day: 52 },
      ],
    },
    caseStudyRef: {
      company: 'Meridian Financial Systems',
      industry: 'FinTech',
      result: 'Reduced sales cycle from 68 to 45 days (34% improvement), increased forecast accuracy from 62% to 89%, freed up 12 hours per rep per week',
      quote: '"We went from guessing our forecast to knowing it. The ROI was obvious within the first month." — VP of Sales, Meridian Financial Systems',
    },
    qualityScore: 88,
  },

  // Prospect 1: VitalSign Digital Health (HealthTech) — references PulseCheck Health
  {
    coldEmail: {
      subject: 'How PulseCheck Health improved deal visibility in regulated sales — thoughts?',
      body: `Hi Michael,

I came across VitalSign Digital Health and noticed you're navigating the same challenge many HealthTech sales teams face — long, regulated sales cycles with limited visibility into deal progression.

PulseCheck Health had the same problem. Their Head of RevOps was spending hours each week manually piecing together deal status from Salesforce reports and rep check-ins.

After deploying our platform, they cut their average sales cycle by 22% and gave leadership real-time pipeline visibility for the first time.

As Head of Sales at VitalSign, I imagine pipeline predictability is top of mind for you. Would a 15-minute call make sense to see if their approach could work for your team?

Best,
[Your Name]`,
      followUp: 'Hi Michael, circling back on my note about PulseCheck Health\'s results in HealthTech sales. Given VitalSign\'s growth trajectory, I think their playbook would be especially relevant. Open to a quick chat this week?',
    },
    discoveryQuestions: [
      'How do you currently manage the complexity of regulated HealthTech sales cycles at VitalSign?',
      'What does your pipeline review process look like today — how often and what tools do you use?',
      'How do you ensure consistent compliance messaging across your sales conversations?',
      'What\'s your current average sales cycle length, and how does it compare to your target?',
      'How are you currently onboarding new reps to handle the nuances of selling into healthcare?',
    ],
    painPoints: [
      { painPoint: 'No visibility into deal progression bottlenecks', relevance: 'HealthTech companies face uniquely complex sales cycles with compliance reviews, clinical evaluations, and procurement — visibility gaps compound at each stage' },
      { painPoint: 'Long ramp time for new sales hires (90+ days)', relevance: 'Regulated industries require reps to learn compliance requirements on top of product knowledge, extending ramp to 4-6 months without structured enablement' },
      { painPoint: 'Inconsistent sales messaging across the team', relevance: 'In healthcare sales, inconsistent messaging creates compliance risk — not just lost deals but potential regulatory issues' },
    ],
    objectionHandling: [
      { objection: 'We need to finish our CRM migration first', response: 'PulseCheck Health was mid-migration when they started with us. Our platform actually accelerated their migration by helping them define cleaner stage criteria and data requirements upfront. We can work alongside your migration timeline.' },
      { objection: 'We already use Salesforce reports for this', response: 'PulseCheck Health was in the same boat. Their Head of RevOps found that by the time reports were pulled and analyzed, the insights were already stale. Real-time deal intelligence caught 3 at-risk deals worth $180K in the first month alone.' },
      { objection: 'Our team is too small to justify the cost', response: 'VitalSign\'s 190-person team is actually the sweet spot — big enough to have process gaps but small enough to implement quickly. PulseCheck (220 employees) saw full ROI within 60 days of deployment.' },
    ],
    championPersona: {
      role: 'Head of Sales',
      motivations: ['Build a predictable, repeatable sales process for regulated markets', 'Reduce deal slippage from compliance-related delays', 'Accelerate new rep ramp time in complex selling environment'],
      buyingTriggers: ['Series B funding pressure to demonstrate efficient growth', 'Lost deals due to stalled compliance reviews', 'New VP of Sales wanting process improvements'],
    },
    predictedTimeline: {
      daysToClose: 58,
      stages: [
        { stage: 'Discovery Call', day: 0 },
        { stage: 'Technical Demo', day: 10 },
        { stage: 'Security & Compliance Review', day: 22 },
        { stage: 'Proposal Sent', day: 35 },
        { stage: 'Negotiation', day: 48 },
        { stage: 'Closed Won', day: 58 },
      ],
    },
    caseStudyRef: {
      company: 'PulseCheck Health',
      industry: 'HealthTech',
      result: 'Reduced average sales cycle from 78 to 61 days (22% improvement), achieved real-time pipeline visibility, identified $180K in at-risk deals within first month',
      quote: '"For the first time, I could see exactly where deals were stalling in our compliance review process and intervene before it was too late." — Head of RevOps, PulseCheck Health',
    },
    qualityScore: 82,
  },

  // Prospect 2: QuantumLeap Analytics (Data & Analytics) — references DataForge Analytics
  {
    coldEmail: {
      subject: 'DataForge Analytics grew pipeline 40% with one change — QuantumLeap next?',
      body: `Hi Jennifer,

As CRO at QuantumLeap Analytics, you're likely focused on scaling revenue predictably while maintaining the technical depth your buyers expect.

DataForge Analytics was in a similar position — 500 employees, 50+ AEs, enterprise sales motion. Their VP of BD was frustrated that top performers had developed winning patterns that weren't being replicated across the team.

After deploying our platform, DataForge extracted those patterns systematically: winning discovery questions, objection responses, and email sequences. Pipeline grew 40% in two quarters.

Given QuantumLeap's trajectory, I think their playbook translates directly. Worth 15 minutes to explore?

Best,
[Your Name]`,
      followUp: 'Hi Jennifer, following up on my note about DataForge Analytics\' results. Their CRO mentioned that the biggest unlock was making top-performer behaviors visible and coachable across the entire org. Happy to share specifics in a quick call.',
    },
    discoveryQuestions: [
      'How does your team currently capture and share winning sales patterns across QuantumLeap\'s 50+ AE org?',
      'What does your coaching process look like — how do managers identify and address rep skill gaps?',
      'How are you measuring the effectiveness of your current sales messaging and positioning?',
      'What\'s your biggest challenge in scaling the sales org while maintaining deal quality?',
      'How do you approach competitive deals differently from greenfield opportunities today?',
    ],
    painPoints: [
      { painPoint: 'Inability to replicate top performer behaviors', relevance: 'At QuantumLeap\'s scale (550 employees), the gap between top and bottom quartile reps typically represents $2-4M in unrealized pipeline' },
      { painPoint: 'Manual CRM data entry consuming 30% of rep time', relevance: 'Enterprise analytics companies have complex deal structures requiring extensive logging — automation could free up 15+ hours per rep per week' },
      { painPoint: 'No visibility into deal progression bottlenecks', relevance: 'Enterprise deals in Data & Analytics often stall during technical evaluation — early identification of stalled deals is critical for quarterly targets' },
    ],
    objectionHandling: [
      { objection: 'We already use Salesforce reports for this', response: 'DataForge Analytics started the same way. What they discovered was that reports tell you what happened, but not why. Our platform analyzes call transcripts and email patterns to reveal the behaviors that actually drive wins — something no report can do.' },
      { objection: 'I need to get buy-in from our VP of Sales', response: 'Completely understand. DataForge\'s CRO actually brought the VP of Sales into our second call, and we walked through a live analysis of their existing pipeline. It made the business case obvious. Happy to prepare something similar for QuantumLeap.' },
      { objection: 'We need to finish our CRM migration first', response: 'We integrate with both legacy and modern CRM setups. DataForge was running a parallel migration during our deployment — we actually helped them validate their new CRM data structure by surfacing inconsistencies in deal staging.' },
    ],
    championPersona: {
      role: 'Chief Revenue Officer',
      motivations: ['Scale revenue org without proportional headcount increase', 'Build a data-driven coaching culture across the sales team', 'Improve win rates on enterprise deals above $200K'],
      buyingTriggers: ['Board presentation coming up requiring growth plan', 'Win rate declining as team scales', 'New competitive threats requiring sharper sales execution'],
    },
    predictedTimeline: {
      daysToClose: 48,
      stages: [
        { stage: 'Discovery Call', day: 0 },
        { stage: 'Technical Deep Dive', day: 7 },
        { stage: 'Business Case Workshop', day: 16 },
        { stage: 'Proposal Sent', day: 28 },
        { stage: 'Negotiation', day: 38 },
        { stage: 'Closed Won', day: 48 },
      ],
    },
    caseStudyRef: {
      company: 'DataForge Analytics',
      industry: 'Data & Analytics',
      result: 'Grew pipeline 40% in two quarters, improved win rate from 24% to 31%, replicated top performer patterns across 50+ AE organization',
      quote: '"We finally stopped guessing why some reps win and others don\'t. The data made it coachable." — VP of Business Development, DataForge Analytics',
    },
    qualityScore: 90,
  },

  // Prospect 3: CyberShield Defense (Cybersecurity) — references SecureNet Compliance
  {
    coldEmail: {
      subject: 'SecureNet\'s 90-person sales team cut forecast miss rate in half — CyberShield next?',
      body: `Hi Kevin,

Running a 70+ rep sales org in cybersecurity means long deal cycles, multiple stakeholders, and forecast unpredictability. That's exactly where SecureNet Compliance was before we worked together.

Their VP of Sales was dealing with deals stalling in procurement for weeks with no visibility into why. After deploying our platform, they cut forecast miss rate by 50% and identified at-risk deals an average of 2 weeks earlier.

As VP of Sales at CyberShield Defense, I imagine you face similar challenges scaling enterprise security sales. Would it be worth 15 minutes to see if SecureNet's approach could work for your org?

Best,
[Your Name]`,
      followUp: 'Hi Kevin, following up on my note about SecureNet Compliance\'s results. Their team of 90 reps is similar in scale to CyberShield\'s, and the challenges around enterprise security sales cycles are very parallel. Happy to share their before/after metrics.',
    },
    discoveryQuestions: [
      'How do you currently forecast across CyberShield\'s enterprise deals with multiple stakeholders involved?',
      'What\'s your biggest source of deal slippage — is it technical evaluation, procurement, or something else?',
      'How does your team handle objections around replacing incumbent security solutions?',
      'What does your competitive intelligence process look like when going up against other cybersecurity vendors?',
      'How are you ensuring consistent messaging around compliance and regulatory requirements in sales conversations?',
    ],
    painPoints: [
      { painPoint: 'No visibility into deal progression bottlenecks', relevance: 'Cybersecurity enterprise deals involve CISOs, IT directors, procurement, and legal — any stakeholder can stall a deal, and early identification is critical' },
      { painPoint: 'Inability to replicate top performer behaviors', relevance: 'Complex security sales require deep technical credibility — the gap between reps who can build trust with CISOs and those who can\'t is massive' },
      { painPoint: 'Inconsistent sales messaging across the team', relevance: 'With 70+ reps across regions, messaging around compliance requirements and threat landscape must be precise and current' },
    ],
    objectionHandling: [
      { objection: 'We already use Salesforce reports for this', response: 'SecureNet Compliance started with the same approach. They found that in complex enterprise security deals, the real insights are buried in call transcripts and email threads — not CRM fields. Our platform surfaces why deals stall, not just that they stalled.' },
      { objection: 'Our team is too small to justify the cost', response: 'At 720 employees with 70+ reps, CyberShield is actually in the high-impact zone. SecureNet (900 employees) calculated that identifying just 2 at-risk deals per quarter paid for the platform 3x over.' },
      { objection: 'I need to get buy-in from our VP of Sales', response: 'That makes sense for a decision like this. We can prepare a pipeline analysis using your existing CRM data — no integration needed — that demonstrates the specific deals and revenue at risk. It\'s usually a compelling conversation starter.' },
    ],
    championPersona: {
      role: 'VP of Sales',
      motivations: ['Reduce forecast variability for board reporting', 'Shorten enterprise sales cycles without sacrificing deal quality', 'Build competitive advantage through better sales execution'],
      buyingTriggers: ['Major deal loss to competitor sparking process review', 'New fiscal year with aggressive growth targets', 'Recent leadership change driving operational improvements'],
    },
    predictedTimeline: {
      daysToClose: 65,
      stages: [
        { stage: 'Discovery Call', day: 0 },
        { stage: 'Technical Demo', day: 10 },
        { stage: 'Security Review', day: 25 },
        { stage: 'Stakeholder Alignment', day: 38 },
        { stage: 'Proposal & Negotiation', day: 50 },
        { stage: 'Closed Won', day: 65 },
      ],
    },
    caseStudyRef: {
      company: 'SecureNet Compliance',
      industry: 'Cybersecurity',
      result: 'Cut forecast miss rate by 50%, identified at-risk deals 2 weeks earlier on average, improved win rate on deals above $300K from 18% to 27%',
      quote: '"In enterprise security sales, knowing a deal is at risk two weeks earlier is the difference between saving it and losing it." — VP of Sales, SecureNet Compliance',
    },
    qualityScore: 75,
  },

  // Prospect 4: ScaleUp Commerce (Retail Tech) — references RetailPulse Commerce
  {
    coldEmail: {
      subject: 'RetailPulse moved upmarket successfully — playbook for ScaleUp Commerce?',
      body: `Hi Amanda,

Moving from mid-market to enterprise is one of the hardest transitions in SaaS sales. RetailPulse Commerce was in exactly this position — a strong mid-market Retail Tech company that needed to build an enterprise sales motion from scratch.

Their Director of Sales was struggling with reps who excelled at transactional deals but couldn't navigate multi-stakeholder enterprise cycles. After deploying our platform, they identified the specific behaviors, messaging, and deal patterns that worked upmarket.

As Director of Revenue at ScaleUp Commerce, I imagine this upmarket expansion is on your roadmap too. Worth a quick conversation to see how RetailPulse's playbook could accelerate your transition?

Best,
[Your Name]`,
      followUp: 'Hi Amanda, following up on my note about RetailPulse Commerce\'s upmarket transition. They went from 0 to 8 enterprise deals in two quarters using the playbooks our platform generated. Happy to share their approach if useful.',
    },
    discoveryQuestions: [
      'Where is ScaleUp Commerce in its journey from mid-market to enterprise sales?',
      'What\'s the biggest gap you see between your current sales process and what enterprise buyers expect?',
      'How are your reps currently learning to navigate longer, multi-stakeholder deal cycles?',
      'What tools are you using today to manage your pipeline, and where are the biggest gaps?',
      'How do you currently differentiate ScaleUp Commerce in competitive enterprise evaluations?',
    ],
    painPoints: [
      { painPoint: 'Inconsistent sales messaging across the team', relevance: 'Moving upmarket requires a fundamentally different value proposition — reps trained on mid-market velocity struggle to articulate enterprise ROI' },
      { painPoint: 'Long ramp time for new sales hires (90+ days)', relevance: 'Enterprise reps are expensive hires — every extra month of ramp time costs $15-25K in fully-loaded compensation without corresponding revenue' },
      { painPoint: 'Inability to replicate top performer behaviors', relevance: 'If one rep figures out the enterprise motion, that knowledge needs to be systematized immediately — not left in their head' },
    ],
    objectionHandling: [
      { objection: 'We already use Salesforce reports for this', response: 'RetailPulse Commerce used Pipedrive reports too, and they worked fine for mid-market. But enterprise deals have 5-10x more complexity — multiple contacts, longer timelines, and subtle signals that standard reports miss entirely.' },
      { objection: 'Our team is too small to justify the cost', response: 'ScaleUp\'s 310-person team is right where RetailPulse was when they started. The platform paid for itself with their first enterprise deal ($198K) — which closed 30% faster than their previous attempts at upmarket deals.' },
      { objection: 'We need to finish our CRM migration first', response: 'Totally get it. We integrate with Pipedrive today, so there\'s no migration needed on our end. And if you\'re planning to move to Salesforce for the enterprise motion, we can help with that transition by preserving your historical deal intelligence.' },
    ],
    championPersona: {
      role: 'Director of Revenue',
      motivations: ['Prove the enterprise sales motion is viable to leadership', 'Build repeatable process that doesn\'t depend on individual heroics', 'Demonstrate personal readiness for VP-level promotion'],
      buyingTriggers: ['Board directive to move upmarket for higher ACVs', 'Lost first few enterprise deals and looking for answers', 'Competitor successfully moving upmarket creating urgency'],
    },
    predictedTimeline: {
      daysToClose: 42,
      stages: [
        { stage: 'Discovery Call', day: 0 },
        { stage: 'Product Demo', day: 7 },
        { stage: 'Team Workshop', day: 18 },
        { stage: 'Proposal Sent', day: 27 },
        { stage: 'Negotiation', day: 35 },
        { stage: 'Closed Won', day: 42 },
      ],
    },
    caseStudyRef: {
      company: 'RetailPulse Commerce',
      industry: 'Retail Tech',
      result: 'Closed 8 enterprise deals in first two quarters of upmarket expansion, reduced enterprise sales cycle from 95 to 67 days, built repeatable enterprise playbook adopted by full team',
      quote: '"We went from hoping enterprise deals would close to having a systematic playbook that our entire team could follow." — Director of Sales, RetailPulse Commerce',
    },
    qualityScore: 70,
  },
];

// ── Main ────────────────────────────────────────────────────

async function main() {
  try {
    console.log('Starting seed...\n');

    // 1. Clear existing seed data
    console.log('Clearing existing seed data...');
    await db.delete(users).where(eq(users.clerkId, SEED_CLERK_ID));
    console.log('  Done.\n');

    // 2. Insert user
    console.log('Inserting seed user...');
    await db.insert(users).values({
      id: userId,
      clerkId: SEED_CLERK_ID,
      email: 'demo@icpplaybook.com',
      fullName: 'Demo User',
      companyName: 'ICP Playbook Demo',
      onboardingStep: 4,
    });
    console.log(`  User: ${userId}`);

    // 3. Insert CRM connection
    console.log('Inserting CRM connection...');
    await db.insert(crmConnections).values({
      id: crmConnectionId,
      userId,
      provider: 'salesforce',
      accessToken: 'seed_fake_access_token',
      refreshToken: 'seed_fake_refresh_token',
      instanceUrl: 'https://demo.salesforce.com',
      tokenExpiresAt: new Date(NOW.getTime() + 30 * 86_400_000),
      lastSyncAt: daysAgo(1),
      status: 'active',
    });
    console.log(`  CRM Connection: ${crmConnectionId}`);

    // 4. Insert enrichment config
    console.log('Inserting enrichment config...');
    await db.insert(enrichmentConfigs).values({
      userId,
      provider: 'clay',
      apiKey: 'seed_fake_clay_api_key_12345',
      isValid: true,
      lastValidatedAt: daysAgo(1),
    });

    // 5. Insert 15 deals
    console.log('Inserting 15 deals...');
    const dealRows = DEALS_DATA.map((d, i) => ({
      id: dealIds[i],
      userId,
      crmConnectionId,
      externalId: `sf_opp_SEED_${String(i + 1).padStart(3, '0')}`,
      name: d.name,
      companyName: d.companyName,
      amount: d.amount,
      currency: 'USD',
      closeDate: formatDate(monthsAgo(d.closeMonthsAgo)),
      stageName: 'Closed Won',
      ownerName: d.ownerName,
      contactName: d.contactName,
      contactTitle: d.contactTitle,
      contactEmail: d.contactEmail,
      industry: d.industry,
      employeeCount: d.employeeCount,
      description: d.description,
      rawData: { source: 'seed', sfId: `sf_opp_SEED_${String(i + 1).padStart(3, '0')}` },
      syncedAt: daysAgo(1),
    }));
    await db.insert(deals).values(dealRows);
    console.log(`  Inserted ${dealRows.length} deals.`);

    // 6. Insert stage history
    console.log('Inserting deal stage history...');
    const allStageRows: ReturnType<typeof generateStageHistory> = [];
    for (let i = 0; i < DEALS_DATA.length; i++) {
      const closeDate = monthsAgo(DEALS_DATA[i].closeMonthsAgo);
      const stageRows = generateStageHistory(dealIds[i], closeDate, i * 10);
      allStageRows.push(...stageRows);
    }
    await db.insert(dealStageHistory).values(allStageRows);
    console.log(`  Inserted ${allStageRows.length} stage history entries.`);

    // 7. Insert analysis
    console.log('Inserting completed analysis...');
    const analysisStarted = daysAgo(1);
    const analysisCompleted = new Date(analysisStarted.getTime() + 180_000); // 3 min later
    await db.insert(analyses).values({
      id: analysisId,
      userId,
      status: 'completed',
      selectedDealIds: dealIds,
      dealCount: 15,
      startedAt: analysisStarted,
      completedAt: analysisCompleted,
    });
    console.log(`  Analysis: ${analysisId}`);

    // 8. Insert patterns
    console.log('Inserting patterns...');
    await db.insert(patterns).values({
      analysisId,
      painPoints: PATTERNS.painPoints,
      winningSubjects: PATTERNS.winningSubjects,
      commonObjections: PATTERNS.commonObjections,
      avgSalesCycleDays: PATTERNS.avgSalesCycleDays,
      championRoles: PATTERNS.championRoles,
      industryBreakdown: PATTERNS.industryBreakdown,
      dealSizeRange: PATTERNS.dealSizeRange,
      rawLlmOutput: 'Seed data — no LLM call was made.',
    });

    // 9. Insert 5 prospects
    console.log('Inserting 5 prospects...');
    const prospectRows = PROSPECTS_DATA.map((p, i) => ({
      id: prospectIds[i],
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
      clayEnrichmentData: { source: 'seed', enriched: true },
    }));
    await db.insert(prospects).values(prospectRows);
    console.log(`  Inserted ${prospectRows.length} prospects.`);

    // 10. Insert 5 playbooks
    console.log('Inserting 5 playbooks...');
    const playbookRows = PLAYBOOKS_DATA.map((pb, i) => ({
      analysisId,
      prospectId: prospectIds[i],
      coldEmail: pb.coldEmail,
      discoveryQuestions: pb.discoveryQuestions,
      painPoints: pb.painPoints,
      objectionHandling: pb.objectionHandling,
      championPersona: pb.championPersona,
      predictedTimeline: pb.predictedTimeline,
      caseStudyRef: pb.caseStudyRef,
      qualityScore: pb.qualityScore,
      rawLlmOutput: 'Seed data — no LLM call was made.',
    }));
    await db.insert(playbooks).values(playbookRows);
    console.log(`  Inserted ${playbookRows.length} playbooks.`);

    // Summary
    console.log('\n=== Seed Complete ===');
    console.log(`  User:              1 (clerkId: ${SEED_CLERK_ID})`);
    console.log(`  CRM Connection:    1 (salesforce)`);
    console.log(`  Enrichment Config: 1 (clay)`);
    console.log(`  Deals:             ${dealRows.length}`);
    console.log(`  Stage History:     ${allStageRows.length} entries`);
    console.log(`  Analysis:          1 (completed)`);
    console.log(`  Patterns:          1`);
    console.log(`  Prospects:         ${prospectRows.length}`);
    console.log(`  Playbooks:         ${playbookRows.length}`);
    console.log('====================\n');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\nSeed failed:', error);
    await pool.end();
    process.exit(1);
  }
}

main();
