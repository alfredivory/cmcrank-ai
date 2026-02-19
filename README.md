# CMCRank.ai

Track cryptocurrency token rankings over time using CoinMarketCap data. Visualize rank, price, market cap, volume, and supply trends with interactive charts.

**Live:** [cmcrank.ai](https://cmcrank.ai) | **Staging:** [staging.cmcrank.ai](https://staging.cmcrank.ai)

## Stack

- **Framework:** Next.js 16 (App Router, React 19)
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL 16 + pgvector, Prisma ORM v7
- **Styling:** Tailwind CSS 4
- **Charts:** Recharts
- **Auth:** NextAuth.js (Google + GitHub OAuth)
- **Deployment:** Docker Compose, Cloudflare Zero Trust tunnel
- **Testing:** Vitest + React Testing Library

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16 (or Docker)
- npm

### Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed initial data
npm run db:seed

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — NextAuth session secret
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth
- `GITHUB_ID` / `GITHUB_SECRET` — GitHub OAuth

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run check` | Lint + typecheck + test + build (CI equivalent) |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed database with initial data |

## Deployment

Two environments with separate databases and Docker Compose configs:

- **`develop` branch** auto-deploys to staging (`staging.cmcrank.ai`)
- **`main` branch** deploys to production (`cmcrank.ai`) after approval

CI pipeline: lint → typecheck → test → build → deploy.

See `scripts/deploy-staging.sh` and `scripts/deploy-production.sh`.

## Project Structure

```
src/
  app/                    # Next.js pages and API routes
    page.tsx              # Homepage — token list
    token/[slug]/         # Token detail — rank chart
    api/tokens/           # Token + snapshot API endpoints
    admin/                # Admin panel
  components/
    charts/               # RankChart, TimeRangeSelector, etc.
    tokens/               # TokenHeader, CategoryTags, etc.
    layout/               # SiteFooter, etc.
  lib/
    db/                   # Prisma client, seed script
    queries/              # Database query functions
    format.ts             # Number/date formatting
    chart-utils.ts        # Chart tick computation
    logger/               # Structured JSON logging
  types/                  # TypeScript type definitions
  workers/                # Background jobs (ingestion, backfill)
tests/                    # Tests mirroring src/ structure
prisma/                   # Schema and migrations
scripts/                  # Deploy scripts
```

## License

Private — all rights reserved.
