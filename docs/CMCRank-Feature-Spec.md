# CMCRank.ai — CMC Rank Tracker & Analyzer

## Product Vision

CMCRank.ai is a web application focused on **relative performance analysis** of cryptocurrency tokens through their CoinMarketCap ranking position over time. Unlike existing tools that focus on absolute price, CMCRank.ai treats CMC rank as the primary signal — revealing how projects perform relative to the broader market.

The platform combines historical rank data with AI-powered research to create a collaborative, ever-growing knowledge base about what drives token performance.

**Core Insight:** Price tells you what happened to one token. Rank tells you how it performed against everyone else.

**Domain:** cmcrank.ai

---

## Data Foundation

### Data Source
- **CoinMarketCap API** (paid plan)
- Start with **top 100 tokens**, progressively expand to 200, 500, 1000 via admin controls

### Data Points Collected (daily snapshot)
- CMC Rank position
- Market capitalization (USD)
- Circulating/floating supply
- Price (USD)
- 24h trading volume
- Token metadata: name, symbol, slug, category/tags, chain, launch date, logo URL

### Historical Range
- **Target range:** January 1, 2020 → Present
- **Backfill strategy:** Progressive, not all-at-once (see F01)
- **Ongoing ingestion:** Once per day (cron job)

### Data Storage
- PostgreSQL with pgvector extension
- Rank trajectory vectors stored for similarity/correlation search

---

## Architecture Overview

### Tech Stack
- **Frontend:** Next.js 14+ (App Router) with React, TypeScript
- **Charts:** Recharts or D3.js (TBD during implementation)
- **Backend:** Next.js API routes + background workers
- **Database:** PostgreSQL + pgvector
- **AI:** OpenRouter API (model selection flexible — Claude, GPT-4, etc.)
- **Auth:** OAuth (Google + GitHub) via NextAuth.js
- **Deployment:** Self-hosted (always-on machine) behind Cloudflare Zero Trust tunnel; staging + production environments
- **CI/CD:** GitHub Actions

### Deployment Architecture
- **DNS & Security:** Cloudflare (cmcrank.ai) with Zero Trust tunnel (same approach as alfredbuilds.org)
- **Host machine:** Dedicated always-on machine used for both development and hosting
- **Option A (recommended):** Docker Compose — bundles Postgres, app, and worker cleanly; reproducible; easy to migrate
- **Option B:** Bare metal with pm2 + systemd + PostgreSQL installed directly
- **Cloudflare Tunnel:** `cloudflared` daemon on host, creates secure tunnel to Cloudflare edge; no exposed ports needed
- **SSL:** Handled by Cloudflare automatically
- **Access policies:** Can restrict admin routes via Cloudflare Zero Trust if desired

### Staging & Production Environments
- **Production:** `cmcrank.ai` → stable, tested builds only
- **Staging:** `staging.cmcrank.ai` → latest development builds for review and testing
- **Same host machine**, different ports:
  - Production: port 3000 (e.g., `docker-compose -f docker-compose.prod.yml`)
  - Staging: port 3001 (e.g., `docker-compose -f docker-compose.staging.yml`)
- **Separate databases:** `cmcrank_prod` and `cmcrank_staging` in the same PostgreSQL instance
- **Cloudflare:** Two tunnels configured, each pointing to respective port
- **Deployment flow:**
  1. Claude Code develops on a feature branch
  2. CI runs tests (GitHub Actions)
  3. Merge to `develop` → auto-deploys to `staging.cmcrank.ai`
  4. Manual review on staging (click through new features, provide feedback)
  5. Merge `develop` to `main` → auto-deploys to `cmcrank.ai` (production)
- **Staging can share the same CMC data** (read from prod DB or replicated) to avoid double API costs, but research and user data are separate
- **Environment variables:** `.env.production` and `.env.staging` files with clearly separated config
- **Staging admin access:** Same auth system but separate allowlist; useful for giving testers research access

### Key Architecture Decisions
- Server-side rendering for SEO and shareability
- API routes handle CMC data ingestion and AI orchestration
- Background worker (cron) for daily data pulls
- Research results stored as structured documents in DB
- Feature flags for progressive rollout
- All external API keys server-side only; never exposed to client
- AI prompt injection prevention on all user inputs sent to AI

---

## Feature Specifications

---

### F01: CMC Data Ingestion — Progressive Backfill

**Priority:** MVP — Foundation  
**Description:** Automated daily ingestion plus admin-controlled progressive historical backfill. Designed to respect CMC API rate limits and budget constraints.

**Daily Ingestion (ongoing):**
- Cron job runs once daily at a configurable time
- Fetches rank, market cap, circulating supply, price, volume for tracked tokens
- Stores each day's snapshot as immutable records
- Handles API rate limits and retries gracefully
- Logs ingestion results (tokens processed, errors, duration)
- Deduplication: skip if today's data already exists
- Token metadata (name, symbol, slug, categories, chain, logo) upserted on each run

**Progressive Backfill (admin-controlled):**
- **Do NOT backfill all history at once** — this would burn through CMC API credits
- Admin panel controls for:
  - **Token scope:** Select how many tokens to track (start with top 100, expand to 200, 500, 1000)
  - **Backfill horizon:** Extend historical data month-by-month (e.g., "Backfill October 2024", "Backfill September 2024", working backwards)
  - **Backfill status dashboard:** Visual showing which months have been backfilled, which are pending
  - **Trigger backfill:** Button to start backfilling the next month (runs as background job)
  - **Auto-backfill toggle:** Optionally auto-backfill one month per day/week until target date reached
  - **API usage tracking:** Show estimated API credits used / remaining
- Backfill jobs are queued and processed sequentially (not parallel) to respect rate limits
- Each backfill job covers one month of data for the current token scope
- Progress indicator while backfill is running
- Backfill can be paused/resumed

**AI Event Discovery During Backfill (optional, admin-triggered):**
- After a month is backfilled, admin can optionally trigger AI research for that month to discover events
- This is separate from user-triggered research (F07) — it's a bulk discovery mechanism
- Runs at lower priority, respects AI API rate limits
- Discovered events populate the timeline (F08) with `source: automated_backfill`

**Acceptance Criteria:**
- [ ] Daily cron job runs reliably
- [ ] Admin panel shows backfill status grid (months × token scope)
- [ ] Admin can trigger backfill for specific months
- [ ] Backfill respects API rate limits with configurable delay between requests
- [ ] API usage estimation visible in admin panel
- [ ] Token scope expandable from admin panel (100 → 200 → 500 → 1000)
- [ ] Auto-backfill mode with configurable pace
- [ ] Backfill jobs are resumable after interruption

**Database Schema Hints:**
- `tokens` table: id, cmc_id, name, symbol, slug, categories (jsonb), chain, launch_date, logo_url, is_tracked (boolean), created_at, updated_at
- `daily_snapshots` table: id, token_id, date, rank, market_cap, circulating_supply, price_usd, volume_24h, created_at
- `backfill_jobs` table: id, month, year, token_scope, status (queued/running/complete/failed/paused), started_at, completed_at, tokens_processed, errors
- `system_config` table: key-value for token_scope, auto_backfill_enabled, backfill_pace, etc.
- Index on (token_id, date) unique
- Index on (date, rank) for leaderboard queries

**Dependencies:** None  
**Tests:** Unit tests for data transformation, integration test for API call with mock, idempotency test for duplicate runs, backfill resumability test, rate limit handling.

---

### F02: Token List & Search (Home Page)

**Priority:** MVP  
**Description:** Landing page showing tracked tokens by CMC rank with search, filtering, and sorting.

**Acceptance Criteria:**
- [ ] Table view showing: Rank, Logo, Name/Symbol, Price, Market Cap, 24h Volume, 7d/30d Rank Change
- [ ] Rank change shown as green (improved) / red (declined) with arrow and delta
- [ ] Search by token name or symbol (debounced, instant filter)
- [ ] Sort by any column
- [ ] Pagination or virtual scroll
- [ ] Click any token → navigates to Token Detail page (F03)
- [ ] Filter by category (dropdown with multi-select)
- [ ] Mobile responsive
- [ ] No authentication required
- [ ] Show badge indicating how many tokens are currently tracked and data range available

**Tests:** Component render tests, search filtering logic, sort behavior, responsive layout snapshot.

---

### F03: Token Detail Page — Rank Over Time Chart

**Priority:** MVP  
**Description:** The core view. Shows a token's CMC rank trajectory over time as an interactive line chart with data overlays and event/research indicators.

**Acceptance Criteria:**
- [ ] Line chart with date on X-axis, CMC rank on Y-axis (**inverted** — rank 1 at top)
- [ ] Default view: last 1 year (or full available data if less)
- [ ] Time range selector: 7d, 30d, 90d, 1y, All (available data), Custom date range picker
- [ ] Hover tooltip showing: date, rank, market cap, price, volume, circulating supply
- [ ] Toggle overlays (switch between views, similar to CMC Price/MC toggle):
  - Rank (default, always visible)
  - Market Cap
  - Price
  - Circulating Supply
  - Volume
- [ ] Each overlay has its own Y-axis scale
- [ ] Token header: logo, name, symbol, current rank, current market cap, current price, category tags
- [ ] Rank change badges: 7d, 30d, 90d rank delta with color coding
- [ ] Shareable URL (e.g., `/token/near-protocol`)
- [ ] No authentication required to view

**Event Markers on Chart (integrated with F08):**
- [ ] Events displayed as **vertical lines** on the chart at the event date
- [ ] Vertical line color/style varies by event_type (e.g., solid for releases, dashed for partnerships)
- [ ] Hover on vertical line shows: event title, date, type
- [ ] Click on vertical line opens popover with: full description, link to 3rd party source, event type badge
- [ ] **Importance-based filtering:** Only show the top 10-15 most important events/researches for the currently visible time range
- [ ] Events outside the importance threshold are hidden but accessible via "Show all events" toggle or the events list below the chart
- [ ] Each event and research has an internal `importance_score` (0-100) calculated by AI during creation

**Research Coverage Indicator (integrated with F07):**
- [ ] **Research coverage bar** displayed as a thin strip/heatmap below the main chart (NOT overlaid on the chart itself)
- [ ] Colored segments indicate periods that have been researched
- [ ] Intensity/color indicates depth of research (single research = light, multiple/re-researched = darker)
- [ ] Click on a researched segment → opens research summary popover → "View Full Research" link
- [ ] Unresearched gaps are visually distinct (empty/gray)
- [ ] This keeps the main chart clean while showing research coverage at a glance

**AI Research Trigger (integrated with F07):**
- [ ] User can click-and-drag on the chart to select a date range
- [ ] If existing research covers the selected period → surface it first with option to "Research Again"
- [ ] If no existing research → show "Investigate This Period" button
- [ ] Button behavior depends on user role (see F06 for permissions)

**Future (not MVP):**
- [ ] Allowed users can rate events and provide feedback to AI on event interpretation
- [ ] Event feedback loop improves AI event classification over time

**Tests:** Chart renders correctly with mock data, Y-axis inversion works, overlay toggles work, URL routing, tooltip content accuracy, date range selection, importance filtering logic, research coverage bar rendering.

---

### F04: Compare Tokens Side-by-Side

**Priority:** MVP  
**Description:** Compare 2–5 tokens on a single chart to see relative rank performance.

**Acceptance Criteria:**
- [ ] Multi-token search/select: add tokens to comparison (max 5)
- [ ] All selected tokens shown as colored lines on one chart (rank over time, inverted Y)
- [ ] Shared time range selector
- [ ] Hover shows all tokens' values at that date
- [ ] Legend with token colors, clickable to toggle visibility
- [ ] Shareable URL (e.g., `/compare?tokens=bitcoin,ethereum,near-protocol`)
- [ ] "Normalize" toggle: show rank change from a common starting point (day 0 = 0 delta) for easier comparison
- [ ] No authentication required

**Tests:** Multi-line chart rendering, legend toggle, normalize calculation, URL param parsing.

---

### F05: Category View & Leaderboard

**Priority:** MVP  
**Description:** Group tokens by category (L1, DeFi, AI, Gaming, etc.) and show intra-category performance.

**Acceptance Criteria:**
- [ ] Category listing page: all categories with token count and avg rank change
- [ ] Category detail page: all tokens in that category ranked by performance
- [ ] Category leaderboard: top gainers and losers by rank change within each category (7d, 30d, 90d periods)
- [ ] Mini sparkline charts for each token in the leaderboard
- [ ] Click any token → Token Detail page
- [ ] Categories sourced from CMC API tags
- [ ] Comparison mode: select tokens within a category to compare (links to F04)
- [ ] No authentication required

**Tests:** Category grouping logic, leaderboard sorting, sparkline rendering, period switching.

---

### F06: Authentication & Authorization

**Priority:** MVP  
**Description:** OAuth-based auth with role-based access for AI research features.

**Roles:**
1. **Anonymous (no login):** Full read access to all charts, data, research results, downloads
2. **Authenticated + Allowlisted:** Can trigger AI research (F07), chat with research (F09)
3. **Authenticated + Not Allowlisted:** Sees "Request Access" button; request goes to admin queue
4. **Admin:** Manage allowlist, approve/deny access requests, manage admins, system config

**Acceptance Criteria:**
- [ ] OAuth via Google and GitHub (NextAuth.js)
- [ ] No login required for viewing any public content
- [ ] Login prompted only when user tries to trigger AI research or chat
- [ ] Allowlist stored in DB, managed by admin
- [ ] Allowlist supports:
  - Individual email addresses (e.g., `alex@near.org`)
  - Email domain patterns via regex (e.g., `*@aurora.dev`, `*@near.org`)
- [ ] Non-allowlisted authenticated users see:
  - "You don't have research access" message
  - "Request Access" button that submits a request with their email
  - Brief explanation of what research access enables
- [ ] Admin panel page (`/admin`):
  - View and manage allowlist entries (add/remove individual emails and patterns)
  - View pending access requests with approve/deny buttons
  - Approving adds the user's email to allowlist
  - Bulk approve by adding a domain pattern
  - View basic usage stats: who triggered research, when, which tokens
  - **Promote/demote admins:** Admin can grant or revoke admin role for other users
  - Backfill controls (see F01)
  - System configuration
- [ ] First user (configured via env var) is auto-admin
- [ ] **Research credits system:** Each allowlisted user has a daily limit of research triggers (configurable by admin, e.g., 5/day)
- [ ] Credit usage shown to user before triggering research

**Tests:** OAuth flow mock, allowlist matching (exact + regex), request submission, admin CRUD operations, role-based UI rendering, admin promotion/demotion, credit tracking.

---

### F07: AI Research Investigation

**Priority:** MVP  
**Description:** AI-powered research that investigates what happened to a token during a selected time period. Results are stored persistently and build a collaborative knowledge base.

**AI Backend: OpenRouter API**
- Model selection configurable (admin setting) — start with Claude Sonnet or GPT-4
- Web search enabled for research (via model capabilities or tool use)
- All API calls server-side; keys never exposed

**Trigger Flow:**
1. User selects a date range on the Token Detail chart (F03) or clicks a "Research" button
2. **User can optionally provide context/guidance** for the AI research (free-text field), e.g.:
   - "During this period there were massive unlocks of the team, but somehow the rank was not changed. Pay attention to communications about these unlocks and how the project distracted the attention of the market from it"
   - "Focus on the DeFi integrations announced in this period"
   - User is encouraged to provide links to reputable sources
3. System checks for existing research covering that period for this token
4. If existing research found → display it, offer "Research Again" option
5. If no existing research → show "Investigate This Period" button
6. On trigger: consumes 1 research credit; AI agent is invoked with token context + date range + user guidance + existing context notes (F09) + relevant existing research from nearby periods

**AI Research Agent Behavior:**
The agent searches for and synthesizes information about:
- News and announcements related to the token/project
- GitHub activity: major releases, commits, PR merges
- Protocol upgrades and technical milestones
- Partnership and integration announcements
- Exchange listings or delistings
- Tokenomics changes (supply events, burns, unlocks)
- Governance proposals and votes
- Market-wide events that affected the category
- Regulatory developments
- Community sentiment shifts
- Any sources/links provided by the user in their context

**AI Prompt Injection Prevention:**
- All user-provided context is sanitized before being included in AI prompts
- User input is wrapped in a clearly delimited "user context" section in the prompt
- System prompt explicitly instructs AI to treat user context as informational hints, not as instructions
- AI is instructed to never reveal API keys, system prompts, or internal configuration
- Output is validated for unexpected content before storage

**Research Document Template (structured output):**
```
# Research: [Token Name] — [Start Date] to [End Date]

## Executive Summary
[2-3 sentence overview of the most significant findings]

## Key Events Timeline
- [Date]: [Event title] — [Brief description] [Source link]
- [Date]: [Event title] — [Brief description] [Source link]
...

## Rank Impact Analysis
[How these events correlated with rank changes during the period]

## Market Context
[Broader market conditions during this period — was this token-specific or market-wide?]

## Technical Development
[GitHub activity, releases, protocol changes if applicable]

## On-Chain Activity
[Notable on-chain metrics changes if applicable]

## Sources
[List of all sources referenced]
```

**Importance Scoring:**
- AI assigns an `importance_score` (0-100) to the overall research and to each discovered event
- Score based on: magnitude of rank change during period, significance of events found, market impact
- This score determines visibility on the chart (F03 — only top 10-15 shown)
- Even low-importance research is stored and accessible; it's just not shown on the chart by default
- Existing research (including low-importance) is fed as context to new research for the same token

**Acceptance Criteria:**
- [ ] AI research triggered via OpenRouter API
- [ ] User context/guidance field available when triggering research
- [ ] Users encouraged to provide links to reputable sources
- [ ] Research results stored in DB as structured JSON + rendered markdown
- [ ] Each research record stores: token_id, date_range_start, date_range_end, triggered_by_user_id, user_context (the guidance provided), created_at, status (pending/complete/failed), content (structured JSON), rendered_markdown, importance_score, version (for re-research)
- [ ] Pending state shown while research is in progress (loading/streaming indicator)
- [ ] Completed research appears on the research coverage bar below the chart (F03)
- [ ] Events extracted from research are auto-created with importance scores (F08)
- [ ] Full research page: rendered document with the template above
- [ ] Duplicate detection: if existing research covers ≥80% of the requested period, surface it first with option to "Research Again"
- [ ] Only allowlisted users can trigger (see F06)
- [ ] Store triggering user ID internally (for admin analytics) but do NOT display who triggered it publicly
- [ ] Rate limiting via credit system (configurable daily limit per user)
- [ ] AI prompt injection prevention implemented

**Tests:** Research trigger flow, duplicate detection logic, document template rendering, credit/rate limiting, storage and retrieval, permission check, prompt injection prevention, importance scoring.

---

### F08: Release & Event Timeline

**Priority:** MVP  
**Description:** Event tracking overlaid on the rank chart as vertical lines, with importance-based filtering.

**Event Sources:**
1. **AI-discovered events:** Extracted from AI research (F07) — when research identifies key events, they're stored as individual timeline events with importance scores
2. **User-contributed events:** Allowlisted users can manually add events they know about that the system missed (see F09)
3. **Backfill discovery events:** Events found during admin-triggered historical backfill research (F01)
4. **Future: automated GitHub release tracking** (V1.1+)

**Event Schema:**
- token_id
- event_date
- event_type: enum (release, partnership, listing, delisting, tokenomics, governance, technical, market, regulatory, community, other)
- title (short, max 120 chars)
- description (1-2 paragraphs)
- source_url (required for user-contributed, optional for AI-discovered)
- source: enum (ai_research, user_contributed, automated_backfill)
- research_id (FK, if extracted from a research)
- importance_score (0-100)
- sentiment_score (nullable, reserved for Phase 4 sentiment analysis — bullish/bearish/neutral with magnitude)
- created_by_user_id
- created_at

**Acceptance Criteria:**
- [ ] Events displayed as **vertical lines** on the Token Detail chart at the event date
- [ ] Vertical line style varies by event_type (color, solid/dashed)
- [ ] Hover on vertical line shows: title, date, type badge
- [ ] Click on vertical line opens popover: full description, source link (opens in new tab), type badge, importance score
- [ ] **Importance filtering:** Only top 10-15 events shown on chart for current time range; "Show all events" toggle reveals the rest
- [ ] Events list view below the chart: full list, sortable by date/importance/type, searchable
- [ ] Events extracted from AI research are automatically created with AI-assigned importance scores
- [ ] Allowlisted users can add events manually via a form on the Token Detail page (must include source URL)
- [ ] Events are publicly visible (no auth required to view)
- [ ] Admin can edit/delete events, adjust importance scores
- [ ] **Future (not MVP):** Users can rate events and provide feedback on AI interpretation

**Tests:** Event creation from research, manual event form, chart overlay rendering, importance filtering, event type styling.

---

### F09: Chat with Research & User Contributions

**Priority:** MVP  
**Description:** Allowlisted users can interact with completed research documents via a chatbot, provide feedback, and contribute context. The chatbot proactively suggests re-research when valuable new context is provided.

**Chat with Research (Chatbot):**
- [ ] On a research detail page, allowlisted users see a chat interface (chatbot style)
- [ ] User can ask questions about the research findings
- [ ] User can point out inaccuracies or missing context
- [ ] User can provide additional information and is **encouraged to include links to reputable sources**
- [ ] **Chatbot behavior:**
  - Responds conversationally to questions about the research
  - When user provides new valuable context (events, links, corrections), chatbot acknowledges it
  - When chatbot determines enough new context has been accumulated, it **proactively proposes:** "Based on the context you've shared, I think a re-research could produce significantly better results. Would you like to trigger a re-research? You can also add more context before we do."
  - Chatbot asks for any additional context before triggering
  - **Triggering re-research consumes 1 research credit** from the user
- [ ] Re-research runs with:
  - The original research as context
  - All chat feedback/additions
  - User-provided links analyzed
  - Fresh web search
- [ ] Re-researched document stored as a new version (original preserved in version history)
- [ ] Chat history stored per research document, visible to all viewers

**User Context Notes on Token Page:**
- [ ] On the Token Detail page, allowlisted users can submit "context notes" — free-text information about the project
- [ ] Context notes are encouraged to include links to sources
- [ ] These notes are stored and used as additional context for all future AI research on this token
- [ ] Context notes visible on the token page (collapsible section)
- [ ] Mental model: the website is a junior data analyst; users are the senior analysts giving it tips and corrections

**Comments on Research & Events (V1.1+):**
- [ ] Users can leave comments on research documents and individual events
- [ ] Comments are publicly visible
- [ ] **Future cron job:** Periodically analyzes accumulated comments; if significant new information is found, auto-triggers re-research or improves event descriptions
- [ ] This creates a feedback loop where community knowledge improves the AI's output over time

**Acceptance Criteria:**
- [ ] Chat interface on research detail page (allowlisted users only)
- [ ] Chatbot responds to questions about research content
- [ ] Chatbot detects when user has provided valuable new context
- [ ] Chatbot proposes re-research proactively (not just on user demand)
- [ ] Re-research consumes 1 credit and triggers via F07 flow
- [ ] Version history for re-researched documents (original + all versions viewable)
- [ ] Chat history stored and visible
- [ ] Token-level context notes with source link encouragement
- [ ] Context notes fed as additional context to AI when researching that token
- [ ] Anonymous users can read chat history and context notes but cannot contribute

**Tests:** Chat message storage, chatbot re-research proposal logic, version history, context note CRUD, permission checks, credit consumption on re-research.

---

### F10: Research Download & Sharing

**Priority:** MVP  
**Description:** Research documents can be downloaded as PDF and shared via direct link.

**Acceptance Criteria:**
- [ ] Each research has a permanent shareable URL (e.g., `/research/abc123`)
- [ ] URL accessible without authentication (public by default)
- [ ] "Download as PDF" button generates a well-formatted PDF of the research document
- [ ] PDF includes: header with token info + logo, research period, all sections from the template, sources list
- [ ] PDF generated server-side
- [ ] Share button with copy-link functionality
- [ ] **Future:** Permission controls on research visibility (not in MVP — all public)

**Tests:** PDF generation matches document content, URL accessibility, share link generation.

---

### F11: Rank Analytics — Volatility Score

**Priority:** Phase 2  
**Description:** A calculated metric showing how stable or volatile a token's rank has been over time.

**Calculation:**
- Standard deviation of daily rank changes over the selected period
- Normalized to a 0-100 scale for easy comparison
- Low score = stable rank position, High score = frequent large swings

**Acceptance Criteria:**
- [ ] Volatility score displayed on Token Detail page
- [ ] Configurable period (30d, 90d, 1y, All)
- [ ] Score shown as a badge with color coding (green = stable, yellow = moderate, red = volatile)
- [ ] Hover shows the raw standard deviation and period
- [ ] Sortable column on the Token List page (F02)
- [ ] Category average volatility shown on Category page (F05)

**Tests:** Volatility calculation accuracy, edge cases (new tokens, delisted tokens), period switching.

---

### F12: Rank Analytics — Momentum Indicator

**Priority:** Phase 2  
**Description:** Shows whether a token is trending up or down in rank over recent periods.

**Calculation:**
- Rank change over 7d, 30d, 90d windows
- Weighted momentum score considering trend consistency (not just start-end delta)
- Positive momentum = consistently improving rank, Negative = consistently declining

**Acceptance Criteria:**
- [ ] Momentum indicators (7d, 30d, 90d) on Token Detail page
- [ ] Visual indicator: arrow direction + color (green up, red down) + magnitude
- [ ] Momentum column on Token List page, sortable
- [ ] "Trending" section on home page: top 10 tokens with strongest positive and negative momentum
- [ ] Category-level momentum aggregation

**Tests:** Momentum calculation, consistency weighting, trending list sorting.

---

### F13: Category Leaderboard — Fastest Movers

**Priority:** Phase 2  
**Description:** Within each category, show which tokens are gaining or losing rank the fastest.

**Acceptance Criteria:**
- [ ] Leaderboard on Category detail page (F05)
- [ ] Top 5 gainers and top 5 losers by rank change (7d, 30d, 90d toggles)
- [ ] Visual: rank change bars (green/red) with sparkline
- [ ] "Breakout" detection: tokens that moved unusually compared to their historical volatility
- [ ] Cross-category leaderboard page: fastest movers across all categories

**Tests:** Leaderboard ranking, breakout detection threshold, period switching.

---

### F14: Watchlists & Alerts

**Priority:** Phase 2  
**Description:** Authenticated users can create personal watchlists and receive alerts on significant rank changes.

**Acceptance Criteria:**
- [ ] Any authenticated user can create watchlists (not just allowlisted)
- [ ] Add/remove tokens from watchlist via button on Token List and Token Detail pages
- [ ] Watchlist dashboard page showing all watched tokens with current rank and changes
- [ ] Alert configuration per token:
  - Rank drops by N positions in 24h
  - Rank improves by N positions in 24h
  - Token enters/exits top N (e.g., top 100)
  - Custom threshold
- [ ] Alert delivery: email (Phase 2), push notifications (future)
- [ ] Alert history page showing past alerts
- [ ] Unsubscribe/disable per alert

**Tests:** Watchlist CRUD, alert threshold evaluation, email delivery mock, alert history.

---

### F15: Correlation Engine

**Priority:** Phase 3  
**Description:** Find tokens with similar rank trajectories using vector similarity search.

**Acceptance Criteria:**
- [ ] On Token Detail page: "Similar Tokens" section showing top 5 most correlated tokens
- [ ] Correlation calculated on rank trajectory vectors (pgvector cosine similarity)
- [ ] Configurable period for correlation (90d, 1y, All)
- [ ] Click a similar token → Compare view (F04) pre-populated with both tokens
- [ ] "Find Similar" search: pick a token and time period, find tokens that moved similarly
- [ ] Filter by category to find correlated tokens within a sector

**Implementation Notes:**
- Rank trajectory stored as a vector in pgvector (daily rank values for the period)
- Recomputed weekly or on-demand
- Cosine similarity for matching

**Tests:** Vector generation, similarity calculation, result relevance, period-based recomputation.

---

### F16: Shareable Chart URLs & Embeds

**Priority:** Phase 3  
**Description:** Every chart view can be shared via URL and optionally embedded.

**Acceptance Criteria:**
- [ ] All chart states encoded in URL params (token, date range, overlays, comparison tokens)
- [ ] OG meta tags for social sharing previews (token name, mini chart image)
- [ ] Embed mode (`?embed=true`) renders chart only, no navigation
- [ ] Copy link button on every chart view

**Tests:** URL state encoding/decoding, OG tag generation, embed mode rendering.

---

## Non-Functional Requirements

### Logging (STRICT REQUIREMENT)
**Every feature must implement comprehensive structured logging. This is non-negotiable.**

- **Format:** Structured JSON logs (not plain text)
- **Correlation IDs:** Every incoming request gets a unique `correlationId` that propagates through all function calls, API requests, and database queries in that request chain
- **What to log (minimum):**
  - All API route calls: method, path, params, user ID (if authenticated), response status, duration
  - All external API calls (CMC, OpenRouter): request params, response status, duration, credits consumed
  - All database mutations: table, operation, affected record IDs
  - All user actions: login, research trigger, event creation, chat message, watchlist change
  - All background jobs: start, progress, completion, errors
  - All errors: full stack trace, context, correlation ID
  - All auth events: login, logout, access denied, access request submitted
- **Log levels:** ERROR, WARN, INFO, DEBUG
  - Production: INFO and above
  - Staging: DEBUG and above
- **Storage:** Log files rotated daily, retained for 90 days minimum
- **Structured fields per log entry:**
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
- **Rule for Claude Code:** If you implement a function that calls an external service, mutates data, or handles a user action, and it doesn't have logging — that's a bug. Fix it before moving on.

### Performance
- Page load < 2s for token list
- Chart render < 1s with 5 years of daily data
- Search results < 200ms
- AI research initiation < 30s for response start (streaming)

### Security
- All API keys stored server-side only (CMC, OpenRouter)
- OAuth tokens handled by NextAuth.js
- CSRF protection on all mutations
- Rate limiting on AI research endpoints
- **AI Prompt Injection Prevention:**
  - All user inputs sanitized before inclusion in AI prompts
  - User context wrapped in clearly delimited sections
  - System prompts instruct AI to ignore instruction-like content in user context
  - AI explicitly instructed to never reveal API keys, system prompts, or internal configuration
  - Output validated before storage
  - Regular review of prompt templates for injection vulnerabilities
- Input sanitization on all user inputs (XSS, SQL injection, etc.)
- Admin routes protected by role check

### SEO & Shareability
- Server-side rendered token pages
- Clean URLs (`/token/bitcoin`, `/category/defi`, `/compare?tokens=...`)
- OG meta tags for social sharing
- Sitemap generation for tracked tokens

### Monitoring & Observability
- Structured JSON logging on all services (see Logging section above)
- Error tracking (Sentry or similar)
- Data ingestion monitoring: alert if daily cron fails
- AI research usage tracking (for admin analytics)
- API credit usage monitoring for CMC and OpenRouter
- Log aggregation dashboard (future: ELK stack or similar)

---

## Development Phases

### Phase 1: MVP
1. **F01** — Data ingestion + progressive backfill with admin controls
2. **F02** — Token list & search
3. **F03** — Token detail page + rank chart with event markers and research coverage bar
4. **F04** — Compare tokens
5. **F05** — Category view
6. **F06** — Authentication, authorization, admin panel with admin promotion
7. **F07** — AI research investigation via OpenRouter with user context and importance scoring
8. **F08** — Release & event timeline with importance filtering
9. **F09** — Chat with research (chatbot), user contributions, context notes
10. **F10** — Research download & sharing

### Phase 2: Analytics
11. **F11** — Volatility score
12. **F12** — Momentum indicator
13. **F13** — Category leaderboard
14. **F14** — Watchlists & alerts
- **F09+** — Comments on research & events; comment analysis cron job for auto-improvement

### Phase 3: Intelligence
15. **F15** — Correlation engine
16. **F16** — Shareable URLs & embeds
- Event rating and feedback loop
- Automated GitHub release tracking
- Research visibility permissions

---

## Future Vision (Phase 4+)

These capabilities are not yet specified as features but represent the long-term direction. The architecture should be designed to not block these possibilities.

### Sentiment Analysis Engine
- Analyze events and research to assign sentiment scores (bullish/bearish/neutral) to each event
- Sentiment based on: event content, community reaction, market context
- Displayed as color-coded sentiment indicators alongside events on the timeline
- Build a historical sentiment dataset per token

### Sentiment-Rank Correlation Analysis
- Correlate sentiment scores with actual rank movement that followed
- Track AI's sentiment prediction accuracy over time
- Identify patterns: which types of events reliably predict rank movement?
- Surface insights: "For L1 tokens, exchange listings correlate with +12 avg rank improvement within 30 days"

### Rank Projections
- Based on accumulated sentiment-rank correlation data, provide probabilistic rank projections
- Given current events and their sentiment, estimate likely rank direction and magnitude
- Display as a confidence-banded projection on the rank chart
- Clear disclaimers: projections, not financial advice

### Trading Strategy Analysis
- Backtest strategies based on event detection and sentiment signals
- Example: "If a top-100 token announces a major partnership (sentiment > 80), what's the average rank change in 7/30/90 days?"
- Portfolio simulation: select tokens based on rank momentum + sentiment signals
- This is an analytical/research tool, not an execution platform

### Architecture Implications
- Event schema should include a `sentiment_score` field (nullable, populated later)
- Research documents should include structured sentiment data alongside events
- Data pipeline should support batch reprocessing (re-score historical events with improved models)
- Consider separate analytics database or materialized views for heavy correlation queries

---

## GitHub Issue Generation Guide

**For Alfred (AI agent) — use these templates when creating issues:**

### Feature Issue Template
```
Title: [F##] Feature Name — Subtask Description
Labels: feature, phase-1/phase-2/phase-3, priority-high/medium/low
Milestone: MVP / Phase 2 / Phase 3

## Description
[What this subtask accomplishes]

## Spec Reference
Feature F## in CMCRank-Feature-Spec.md

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Technical Notes
[Implementation hints, affected files, patterns to follow]

## Testing Requirements
- [ ] Unit test: [description]
- [ ] Integration test: [description]

## Dependencies
- Depends on: #issue_number (if applicable)
- Blocks: #issue_number (if applicable)
```

### Bug Issue Template
```
Title: [BUG] Brief description
Labels: bug, priority-high/medium/low

## Description
[What's broken]

## Steps to Reproduce
1. Step 1
2. Step 2

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Affected Feature
F## — Feature Name
```

### Suggested Issue Breakdown per Feature

Each feature (F01-F16) should be broken into 2-5 issues:
- **Database/Schema** — create tables, migrations, indexes
- **Backend/API** — API routes, business logic, external API integration
- **Frontend/UI** — Components, pages, interactions
- **Tests** — Test suite for the feature
- **Integration** — Connecting frontend to backend, end-to-end flow

Example for F07 (AI Research):
1. `[F07] AI Research — Database schema for research documents and versions`
2. `[F07] AI Research — OpenRouter API integration with prompt templates and injection prevention`
3. `[F07] AI Research — Research trigger API endpoint with dedup, credits, and importance scoring`
4. `[F07] AI Research — Research document renderer (template → HTML/markdown)`
5. `[F07] AI Research — Frontend: date range selection, context input field, trigger button, loading state`
6. `[F07] AI Research — Frontend: research coverage bar below chart + detail page`
7. `[F07] AI Research — Tests: trigger flow, dedup, permissions, rendering, injection prevention`

---

## CLAUDE.md Guidance (for Claude Code)

This section should be extracted into the project's CLAUDE.md file at the repository root:

### Project: CMCRank.ai
- **Stack:** Next.js 14+ (App Router), TypeScript, PostgreSQL + pgvector, OpenRouter API, NextAuth.js
- **Deployment:** Docker Compose on self-hosted always-on machine behind Cloudflare Zero Trust tunnel
- **Environments:** Production (`cmcrank.ai` :3000) and Staging (`staging.cmcrank.ai` :3001) with separate databases

### Coding Standards
- TypeScript strict mode, no `any` types
- All API routes return typed responses
- Database queries via Prisma ORM (or Drizzle — TBD)
- All components are functional React with hooks
- CSS via Tailwind CSS
- No inline styles

### Testing Requirements
- **Every feature must have tests before or alongside implementation**
- **If something breaks, fix it before moving on. Do not skip broken tests.**
- Unit tests: Vitest
- Component tests: React Testing Library
- API integration tests: Supertest
- E2E tests: Playwright (for critical flows)
- **Minimum coverage target: 90% for business logic**
- Run tests after every feature implementation
- CI must pass before merging

### File Structure
```
/src
  /app                  # Next.js App Router pages
    /page.tsx           # Home (Token List)
    /token/[slug]/      # Token Detail
    /compare/           # Compare view
    /category/[slug]/   # Category view
    /research/[id]/     # Research detail
    /admin/             # Admin panel
    /api/               # API routes
      /tokens/
      /snapshots/
      /research/
      /events/
      /auth/
      /admin/
  /components           # Shared React components
    /charts/            # Chart components
    /layout/            # Layout components
    /ui/                # Generic UI components
  /lib                  # Shared utilities
    /db/                # Database client, queries
    /cmc/               # CoinMarketCap API client
    /ai/                # OpenRouter API integration + prompt templates
    /auth/              # Auth utilities
    /sanitize/          # Input sanitization + prompt injection prevention
  /types                # TypeScript type definitions
  /workers              # Background jobs (cron, backfill)
  /tests                # Test files mirroring src structure
/docker                 # Docker Compose config
  /docker-compose.yml
  /Dockerfile
```

### Conventions
- Feature flags via environment variables: `FEATURE_FLAG_WATCHLISTS=true`
- All dates stored as UTC in DB
- API responses follow consistent envelope: `{ data: T, error?: string }`
- Commits reference issue numbers: `feat(F07): implement research trigger #47`
- Branch naming: `feature/f07-research-trigger`, `fix/f03-chart-inversion`

### What NOT to Do
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

### Logging Rules (MANDATORY)
- Every API route, external API call, database mutation, user action, and background job MUST have structured JSON logging
- Use correlation IDs to trace requests end-to-end
- Log levels: ERROR, WARN, INFO, DEBUG
- If a function is missing logging, that is a bug — fix it before moving on
- See Non-Functional Requirements → Logging section in the spec for full details

### Future-Proofing
- Event schema should include nullable `sentiment_score` field (not populated yet, reserved for Phase 4 sentiment analysis)
- Design data models to support batch reprocessing of historical records
