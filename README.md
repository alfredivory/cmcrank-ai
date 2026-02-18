# CMCRank.ai

**CMC Rank Tracker & Analyzer** — Track cryptocurrency performance through CoinMarketCap ranking over time.

> **Core Insight:** Price tells you what happened to one token. Rank tells you how it performed against everyone else.

## Features

- 📈 **Rank Over Time Charts** — Track token CMC rank trajectory with interactive charts
- 🔍 **AI-Powered Research** — Investigate what events caused rank changes
- 📊 **Compare Tokens** — Side-by-side rank comparison (2-5 tokens)
- 🏷️ **Category Analysis** — Performance analysis by sector (L1, DeFi, AI, etc.)
- 📚 **Collaborative Knowledge Base** — Community-contributed context and research
- 📥 **Shareable Reports** — Download research as PDF, share via link

## Tech Stack

- **Frontend:** Next.js 14+ (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes, PostgreSQL + pgvector
- **AI:** OpenRouter API (Claude, GPT-4, etc.)
- **Auth:** NextAuth.js (Google + GitHub OAuth)
- **Deployment:** Docker Compose behind Cloudflare Zero Trust

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16+ with pgvector extension

### Development Setup

```bash
# Clone the repo
git clone https://github.com/alfredivory/cmcrank-ai.git
cd cmcrank-ai

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your API keys
# - CMC_API_KEY (CoinMarketCap)
# - OPENROUTER_API_KEY
# - GOOGLE_CLIENT_ID/SECRET
# - GITHUB_CLIENT_ID/SECRET

# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Docker Development

```bash
# Start all services (app + postgres)
docker-compose up -d

# View logs
docker-compose logs -f app
```

## Environment Variables

See `.env.example` for all configuration options.

## Documentation

- [API Documentation](docs/API.md) *(coming soon)*
- [Contributing Guide](CONTRIBUTING.md) *(coming soon)*

## License

MIT

---

Built with 🎩 by [Alfred Ivory](https://github.com/alfredivory)
