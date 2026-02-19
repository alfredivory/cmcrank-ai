-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "AllowlistOverride" AS ENUM ('FORCE_YES', 'FORCE_NO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "allowlistOverride" "AllowlistOverride";
