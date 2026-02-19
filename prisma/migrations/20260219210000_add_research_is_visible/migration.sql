-- AlterTable
ALTER TABLE "Research" ADD COLUMN IF NOT EXISTS "isVisible" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Research_isVisible_idx" ON "Research"("isVisible");
