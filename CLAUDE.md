# ICP Playbook Engine

## Project Overview
An AI platform that turns closed-won deals into repeatable sales playbooks. Users connect their CRM, select enrichment tools, and the system analyzes wins to output lookalike prospects with complete playbooks (cold emails, discovery questions, objection handling, timelines, case studies).

Target buyer: RevOps/Sales Ops at B2B SaaS companies with 10+ closed deals and Gong/Chorus installed.

## MVP Priority
1. Auth + user management
2. Salesforce OAuth + deal sync
3. Clay API integration for enrichment
4. Basic LLM analysis (pain points + email generation)
5. Lookalike matching (simple firmographic filters)
6. Playbook display UI (dashboard with expandable cards)
7. Background job queue for analysis
8. HubSpot + Pipedrive integrations
9. Gong integration for call transcripts
10. Export to Outreach/Salesloft

## Claude-Specific Behavioral Rules
- Always plan before executing complex tasks — outline steps first, then implement incrementally
- Verify changes with tests — write unit tests for services before marking a feature complete
- If unsure about integration specs, ask for clarification before implementing
- Update rules files if a mistake repeats — document the fix as a "Do Not" rule
- Use extended thinking (max 8k tokens) for architecture decisions, database schemas, API route design
- Use subagents for large features — break into subtasks (auth → CRM → enrichment → etc.)
- Prioritize the MVP — Salesforce + Clay + basic playbook generation first

## Resolved Architecture Decisions
- **Analysis timing:** Batch only for MVP (simpler, cheaper LLM costs) — no real-time
- **Minimum deal threshold:** 10 closed deals required; show clear error if not met
- **Enrichment scope:** Per-prospect only (enrich the 5 lookalikes, not all closed deals)
- **LLM approach:** Claude API is sufficient for MVP — no fine-tuning needed