/*
  Warnings:

  - Made the column `rating` on table `feedback` required. This step will fail if there are existing NULL values in that column.
  - Made the column `submittedAt` on table `feedback` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "TeffProduct" ADD COLUMN     "rating" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "totalRating" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "feedback" ALTER COLUMN "rating" SET NOT NULL,
ALTER COLUMN "submittedAt" SET NOT NULL,
ALTER COLUMN "submittedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "feedback_productid_rating_idx" ON "feedback"("productid", "rating");

-- CreateIndex
CREATE INDEX "feedback_productid_submittedAt_idx" ON "feedback"("productid", "submittedAt");
