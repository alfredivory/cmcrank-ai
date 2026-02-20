# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/adapter-pg ./node_modules/@prisma/adapter-pg

# pdfkit and its transitive dependencies (for research PDF generation)
COPY --from=builder /app/node_modules/pdfkit ./node_modules/pdfkit
COPY --from=builder /app/node_modules/fontkit ./node_modules/fontkit
COPY --from=builder /app/node_modules/linebreak ./node_modules/linebreak
COPY --from=builder /app/node_modules/png-js ./node_modules/png-js
COPY --from=builder /app/node_modules/crypto-js ./node_modules/crypto-js
COPY --from=builder /app/node_modules/jpeg-exif ./node_modules/jpeg-exif
COPY --from=builder /app/node_modules/restructure ./node_modules/restructure
COPY --from=builder /app/node_modules/brotli ./node_modules/brotli
COPY --from=builder /app/node_modules/clone ./node_modules/clone
COPY --from=builder /app/node_modules/dfa ./node_modules/dfa
COPY --from=builder /app/node_modules/fast-deep-equal ./node_modules/fast-deep-equal
COPY --from=builder /app/node_modules/tiny-inflate ./node_modules/tiny-inflate
COPY --from=builder /app/node_modules/unicode-properties ./node_modules/unicode-properties
COPY --from=builder /app/node_modules/unicode-trie ./node_modules/unicode-trie
COPY --from=builder /app/node_modules/base64-js ./node_modules/base64-js
COPY --from=builder /app/node_modules/pako ./node_modules/pako
COPY --from=builder /app/node_modules/@swc/helpers ./node_modules/@swc/helpers
COPY --from=builder /app/node_modules/tslib ./node_modules/tslib

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
