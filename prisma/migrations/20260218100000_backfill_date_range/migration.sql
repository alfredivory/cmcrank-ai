-- AlterTable: BackfillJob — replace month/year with dateRangeStart/dateRangeEnd

-- Drop the old unique constraint
DROP INDEX "BackfillJob_year_month_tokenScope_key";

-- Drop old columns
ALTER TABLE "BackfillJob" DROP COLUMN "month";
ALTER TABLE "BackfillJob" DROP COLUMN "year";

-- Add new columns
ALTER TABLE "BackfillJob" ADD COLUMN "dateRangeStart" DATE NOT NULL;
ALTER TABLE "BackfillJob" ADD COLUMN "dateRangeEnd" DATE NOT NULL;
ALTER TABLE "BackfillJob" ADD COLUMN "lastProcessedCmcId" INTEGER;

-- Update default for tokenScope
ALTER TABLE "BackfillJob" ALTER COLUMN "tokenScope" SET DEFAULT 1000;

-- Add new unique constraint
CREATE UNIQUE INDEX "BackfillJob_dateRangeStart_dateRangeEnd_tokenScope_key" ON "BackfillJob"("dateRangeStart", "dateRangeEnd", "tokenScope");
