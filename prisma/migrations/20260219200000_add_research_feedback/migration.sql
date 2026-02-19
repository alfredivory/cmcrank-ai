-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "FeedbackRating" AS ENUM ('THUMBS_UP', 'THUMBS_DOWN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ResearchFeedback" (
    "id" TEXT NOT NULL,
    "researchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" "FeedbackRating" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ResearchFeedback_researchId_idx" ON "ResearchFeedback"("researchId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ResearchFeedback_researchId_userId_key" ON "ResearchFeedback"("researchId", "userId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ResearchFeedback" ADD CONSTRAINT "ResearchFeedback_researchId_fkey" FOREIGN KEY ("researchId") REFERENCES "Research"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ResearchFeedback" ADD CONSTRAINT "ResearchFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
