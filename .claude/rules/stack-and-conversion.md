# Tech Stack & Coding Conventions

## Tech Stack
- **Frontend:** React 18 + TypeScript, Tailwind CSS, Framer Motion
- **Backend:** Node.js + Express, TypeScript
- **Database:** PostgreSQL (deals, playbooks, user data), Redis (caching)
- **AI/LLM:** Claude API (Anthropic) — claude-sonnet-4-20250514
- **Auth:** Auth0 or Clerk
- **Hosting:** Vercel (frontend), Railway/Render (backend), AWS S3 (file storage)

## File Structure
```
/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── types/
│   │   └── styles/
│   ├── public/
│   └── tests/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── types/
│   ├── migrations/
│   └── tests/
├── shared/
├── docs/
└── scripts/
```

## Frontend Conventions
- Functional components with TypeScript only
- Custom hooks for reusable logic (e.g., `useCRMConnection`, `useEnrichment`)
- Tailwind for all styling — avoid inline styles unless dynamic
- Component naming: PascalCase (e.g., `DealFlowChart.tsx`)
- Props interfaces: `ComponentNameProps` (e.g., `DealCardProps`)

## Backend Conventions
- RESTful API design: `/api/v1/deals`, `/api/v1/playbooks`, etc.
- Use async/await — no callbacks
- Centralized error handling middleware with typed errors
- Zod for all request/response validation
- Service layer pattern: Controllers → Services → External APIs

## Database Conventions
- Use migrations for all schema changes — never manual SQL in prod
- snake_case for all tables and columns (e.g., `closed_deals`, `user_id`)
- Indexes on all foreign keys and frequently queried fields

## General
- Follow DRY — extract reusable utilities
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`
- Never use `any` type in TypeScript
- No global state without context
- Never hardcode API keys anywhere in code