# CMCRank.ai

**Price tells you what happened to one token. Rank tells you how it performed against everyone else.**

CMCRank.ai is a cryptocurrency analytics platform focused on **relative performance** — tracking how tokens move in the CoinMarketCap rankings over time. Instead of watching price charts in isolation, CMCRank reveals whether a project is gaining or losing ground against the broader market.

**Live:** [cmcrank.ai](https://cmcrank.ai)

## What It Does

- **Rank tracking** — Daily snapshots of CoinMarketCap rankings for the top 1,000 tokens, with history going back to February 2024
- **Interactive charts** — Visualize a token's rank trajectory over time with overlays for price, market cap, volume, and circulating supply
- **Time range analysis** — Compare performance across 7d, 30d, 90d, 1y, or custom date ranges
- **Category filtering** — Filter tokens by sector (L1, DeFi, AI, Gaming, etc.) to see intra-category performance
- **Shareable views** — Every chart state is encoded in the URL, making any view bookmarkable and shareable

## Roadmap

### Now — Core Analytics (Phase 1)

The foundation is live: daily data ingestion, token list with search/sort/filter, and detailed rank charts with metric overlays.

Coming next in Phase 1:

- **Token comparison** — Overlay 2–5 tokens on a single chart to compare rank trajectories side by side
- **Category views** — Dedicated pages per category with intra-sector leaderboards and performance breakdowns
- **AI research** — Select a time range on any chart and trigger an AI investigation into what drove the rank movement (news, releases, tokenomics events, market context). Results are stored as permanent, shareable research documents
- **Event timeline** — Key events (partnerships, listings, protocol upgrades) displayed as markers on the rank chart, with importance-based filtering
- **Research chat** — Conversational interface to ask questions about completed research, contribute context, and trigger re-investigations with new information

### Next — Advanced Analytics (Phase 2)

- **Rank volatility score** — How stable or erratic is a token's ranking? Normalized 0–100 metric
- **Momentum indicators** — Trend-weighted rank direction over 7d/30d/90d, surfacing tokens with consistent trajectory changes
- **Category leaderboards** — Fastest movers within each sector, with breakout detection for unusual movements
- **Watchlists and alerts** — Personal token watchlists with configurable alerts on significant rank changes

### Later — Intelligence Layer (Phase 3+)

- **Correlation engine** — Find tokens with similar rank trajectories using vector similarity search (pgvector)
- **Sentiment analysis** — Score events as bullish/bearish/neutral and correlate sentiment with actual rank outcomes
- **Rank projections** — Probabilistic rank direction estimates based on accumulated event-rank correlation data

## Stack

- **Framework:** Next.js 16 (App Router, React 19)
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL 16 + pgvector, Prisma ORM v7
- **Styling:** Tailwind CSS 4
- **Charts:** Recharts
- **Auth:** NextAuth.js (Google + GitHub OAuth)
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

## License

[MIT](LICENSE)
