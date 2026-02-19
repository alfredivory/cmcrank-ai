-- AlterTable: BackfillJob — replace month/year with dateRangeStart/dateRangeEnd
-- Made idempotent with IF EXISTS / IF NOT EXISTS for baselined databases

-- Drop the old unique constraint (may not exist if init migration was baselined)
DROP INDEX IF EXISTS "BackfillJob_year_month_tokenScope_key";

-- Drop old columns (may not exist if init migration was baselined)
ALTER TABLE "BackfillJob" DROP COLUMN IF EXISTS "month";
ALTER TABLE "BackfillJob" DROP COLUMN IF EXISTS "year";

-- Add new columns (skip if already present from a previous partial run)
ALTER TABLE "BackfillJob" ADD COLUMN IF NOT EXISTS "dateRangeStart" DATE NOT NULL DEFAULT '2024-01-01';
ALTER TABLE "BackfillJob" ADD COLUMN IF NOT EXISTS "dateRangeEnd" DATE NOT NULL DEFAULT '2026-01-01';
ALTER TABLE "BackfillJob" ADD COLUMN IF NOT EXISTS "lastProcessedCmcId" INTEGER;

-- Remove defaults used for migration (columns are required, defaults were just for ADD COLUMN)
ALTER TABLE "BackfillJob" ALTER COLUMN "dateRangeStart" DROP DEFAULT;
ALTER TABLE "BackfillJob" ALTER COLUMN "dateRangeEnd" DROP DEFAULT;

-- Update default for tokenScope
ALTER TABLE "BackfillJob" ALTER COLUMN "tokenScope" SET DEFAULT 1000;

-- Add new unique constraint
DROP INDEX IF EXISTS "BackfillJob_dateRangeStart_dateRangeEnd_tokenScope_key";
CREATE UNIQUE INDEX "BackfillJob_dateRangeStart_dateRangeEnd_tokenScope_key" ON "BackfillJob"("dateRangeStart", "dateRangeEnd", "tokenScope");
