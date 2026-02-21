# Security & Performance Rules

## Security — Do Not
- Never store API keys in the database unencrypted — use environment variables + AWS Secrets Manager or Doppler
- Never call external APIs synchronously in request handlers — use background jobs (Bull/BullMQ)
- Never expose raw LLM responses to frontend
- Never skip error handling on API calls — CRM/enrichment APIs will fail; implement retries + graceful degradation
- Never hardcode company or deal data in demos — use seed scripts with realistic mock data

## Authentication
- Use Auth0 or Clerk — do not build custom auth
- All API routes must validate JWT tokens via middleware before processing
- OAuth tokens for CRM integrations must be stored encrypted

## Performance
- Cache CRM deal data in PostgreSQL — only sync incrementally (new deals since last sync)
- Use Redis for session caching and frequently accessed playbook data
- Background jobs via Bull/BullMQ for all CRM syncs, enrichment calls, and LLM analysis
- Never block the request/response cycle with long-running operations

## Analytics to Track
- Onboarding completion rate (% finishing all 4 setup steps)
- Deals analyzed per user (average)
- Playbook quality score (thumbs up/down feedback)
- Lookalike match accuracy (user-reported)
- Time saved vs. manual research

## Code Review Priorities
1. Security (auth, API key handling)
2. Performance (caching, background jobs)
3. UX polish (loading states, error messages, progress indicators)