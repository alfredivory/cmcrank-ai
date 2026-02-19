# CLAUDE.md — CMCRank.ai

## Project: CMCRank.ai

CMCRank.ai is a web application focused on **relative performance analysis** of cryptocurrency tokens through their CoinMarketCap ranking position over time.

- **Stack:** Next.js 14+ (App Router), TypeScript, PostgreSQL + pgvector, OpenRouter API, NextAuth.js
- **Deployment:** Docker Compose on self-hosted always-on machine behind Cloudflare Zero Trust tunnel
- **Environments:** Production (`cmcrank.ai` :3000) and Staging (`staging.cmcrank.ai` :3001) with separate databases

## Coding Standards

- TypeScript strict mode, no `any` types
- All API routes return typed responses
- Database queries via Prisma ORM
- All components are functional React with hooks
- CSS via Tailwind CSS
- No inline styles

## Testing Requirements

- **Every feature must have tests before or alongside implementation**
- **If something breaks, fix it before moving on. Do not skip broken tests.**
- Unit tests: Vitest
- Component tests: React Testing Library
- API integration tests: Supertest
- E2E tests: Playwright (for critical flows)
- **Minimum coverage target: 90% for business logic**
- Run tests after every feature implementation
- CI must pass before merging

## Deployment

### Branches & Environments

- `develop` → auto-deploys to `staging.cmcrank.ai` (:3001)
- `main` → deploys to `cmcrank.ai` (:3000) after manual approval (alfredivory or alexauroradev)
- Feature branches → branch from `develop`, PR back to `develop`

### Pipeline

1. Push triggers CI on GitHub-hosted runners (lint, typecheck, test, build)
2. After CI passes, deploy job runs on self-hosted runner (`/Users/alfredivory/actions-runner/`)
3. Deploy script: copies env file → builds Docker image → runs Prisma migrations → restarts app → health check

### Infrastructure

- Self-hosted GitHub Actions runner (macOS ARM64, launchd auto-start)
- Cloudflare Zero Trust tunnel routes both domains
- Docker Compose per environment: `docker-compose.staging.yml`, `docker-compose.prod.yml`
- Separate compose project names (`cmcrank-staging`, `cmcrank-production`) to isolate containers
- Environment files on host only: `~/.config/cmcrank/.env.staging`, `~/.config/cmcrank/.env.production`
- DB backups stored at `~/.config/cmcrank/backups/`

### Deploy Scripts

- `scripts/deploy-staging.sh` — called by GitHub Actions, can also run manually
- `scripts/deploy-production.sh` — same structure, different compose file and env

## File Structure

```
/src
  /app                    # Next.js App Router pages
    /page.tsx             # Home (Token List)
    /token/[slug]/        # Token Detail
    /compare/             # Compare view
    /category/[slug]/     # Category view
    /research/[id]/       # Research detail
    /admin/               # Admin panel
    /api/                 # API routes
      /tokens/
      /snapshots/
      /research/
      /events/
      /auth/
      /admin/
  /components             # Shared React components
    /charts/              # Chart components
    /layout/              # Layout components
    /ui/                  # Generic UI components
  /lib                    # Shared utilities
    /db/                  # Database client, queries
    /cmc/                 # CoinMarketCap API client
    /ai/                  # OpenRouter API integration + prompt templates
    /auth/                # Auth utilities
    /sanitize/            # Input sanitization + prompt injection prevention
    /logger/              # Structured logging utilities
  /types                  # TypeScript type definitions
  /workers                # Background jobs (cron, backfill)
/tests                    # Test files mirroring src structure
/scripts                  # Deploy scripts
/prisma                   # Prisma schema and migrations
/docker-compose.yml           # Dev environment
/docker-compose.staging.yml   # Staging environment
/docker-compose.prod.yml      # Production environment
/Dockerfile                   # Multi-stage build (standalone Next.js)
/.github/workflows/           # CI and deploy workflows
```

## Conventions

- Feature flags via environment variables: `FEATURE_FLAG_WATCHLISTS=true`
- All dates stored as UTC in DB
- API responses follow consistent envelope: `{ data: T, error?: string }`
- Commits reference issue numbers: `feat(F07): implement research trigger #47`
- Branch naming: `feature/f07-research-trigger`, `fix/f03-chart-inversion`
- **URL as source of truth for view state** — any user-facing filter, range, sort, or view mode must be reflected in URL search params so the view is shareable and bookmarkable. Server components read `searchParams` to pre-fetch the correct data; client components update the URL via `window.history.replaceState` on state changes. Never store view state only in React state.

## What NOT to Do

- Do not use client-side API keys (all external API calls server-side)
- Do not skip tests to save time
- Do not create god components (max 200 lines per component)
- Do not use `any` type — define proper interfaces
- Do not hardcode values — use environment variables or constants
- Do not implement features not in the spec without discussion
- Do not pass user input directly into AI prompts without sanitization
- Do not expose internal system details (API keys, prompt templates) in responses
- **Do not write any function that calls an external service, mutates data, or handles a user action without structured logging** — this is a bug if missing
- Do not deploy to production without staging verification

## Logging Rules (MANDATORY)

- Every API route, external API call, database mutation, user action, and background job MUST have structured JSON logging
- Use correlation IDs to trace requests end-to-end
- Log levels: ERROR, WARN, INFO, DEBUG
- If a function is missing logging, that is a bug — fix it before moving on

### Log Entry Format

```json
{
  "timestamp": "ISO8601",
  "level": "INFO",
  "correlationId": "uuid",
  "service": "api|worker|cron",
  "action": "research.trigger",
  "userId": "optional",
  "tokenId": "optional",
  "duration_ms": 1234,
  "metadata": {},
  "error": "optional stack trace"
}
```

## Future-Proofing

- Event schema should include nullable `sentiment_score` field (not populated yet, reserved for Phase 4 sentiment analysis)
- Design data models to support batch reprocessing of historical records

## Key Configuration

- API keys stored at: `~/.config/cmcrank/`
- Initial admins: `alex.shevchenko@defuse.org`, `alfred.ivory@defuse.org`
- Feature spec: `docs/CMCRank-Feature-Spec.md` (full spec with all features F01-F16)
- Issues: GitHub issues track implementation tasks per feature (e.g., `F01` label for data ingestion)
