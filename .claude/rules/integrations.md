# Integration Specifications

## CRM Integrations (OAuth + API)
- **Salesforce:** OAuth 2.0 → fetch `Opportunity` object where `StageName = 'Closed Won'`
- **HubSpot:** OAuth 2.0 → fetch deals via `/crm/v3/objects/deals` with `dealstage = closedwon`
- **Pipedrive:** API token → fetch deals via `/v1/deals` with `status = won`
- **Attio:** API key → fetch records via custom object queries
- **Close:** API key → fetch opportunities with `status_type = won`

## Enrichment Integrations (API)
- **Clay:** API key → waterfall enrichment for firmographics/technographics
- **ZoomInfo:** API token → `/search/company` with filters
- **Apollo:** API key → `/people/match` and `/organizations/enrich`
- **FullEnrich:** API key → person + company enrichment endpoints
- **Clearbit:** API key → `/v2/companies/find`

## Conversation Intelligence (API)
- **Gong:** OAuth 2.0 → fetch transcripts via `/v2/calls`
- **Chorus (ZoomInfo):** API token → fetch recordings and transcripts
- Extract via NLP: pain points, objections raised, questions asked

## Sales Engagement (API)
- **Outreach:** OAuth 2.0 → create sequences via `/sequences`
- **Salesloft:** OAuth 2.0 → create cadences via `/cadences`
- Auto-populate with generated emails and call scripts

## Core Workflows

### Onboarding Flow
1. Auth (email/password or OAuth)
2. CRM connection (OAuth flow)
3. Enrichment tool setup (API key input)
4. Deal selection (fetch closed-won deals, user selects which to analyze)
5. Deal flow visualization (timeline from first contact → closed-won)
6. Kick off background analysis job

### Deal Analysis Engine
- Fetch deal data from CRM (contact info, deal value, close date, stage history)
- Fetch call transcripts from Gong/Chorus if integrated
- Fetch email sequences from Outreach/Salesloft if integrated
- Extract: pain points (NLP on transcripts), winning subject lines, avg sales cycle, champion roles, objections, stage durations

### Lookalike Generation
- Enrich closed-won companies via Clay/ZoomInfo/Apollo
- Extract firmographics (industry, headcount, funding, location)
- Extract technographics (tech stack)
- Query enrichment APIs for similar companies — exclude existing customers
- Score matches 0-100%, return top 5 per run

### Playbook Generation
For each lookalike, generate:
- Cold email (winning subject pattern + pain points from similar deals)
- Discovery questions (extracted from past demos)
- Pain points (mapped from transcript analysis)
- Objection + proven response
- Champion persona (role + why they buy)
- Timeline (predicted days to close)
- Case study reference (most similar closed-won customer)

## Known Challenges & Solutions
- **CRM rate limits** (Salesforce: 15k calls/24hrs): Cache in PostgreSQL, sync incrementally
- **Long transcripts** (10k+ words): Chunk transcripts, extract per chunk, then aggregate
- **Inconsistent enrichment formats**: Build normalization layer mapping all providers to common schema
- **Slow analysis** (2-3 min): Show progress indicators + email notification on completion