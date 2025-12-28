/*
  Warnings:

  - You are about to drop the column `hasRefundRequest` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `RefundRequest` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "RefundStatus" ADD VALUE 'Not_Started';

-- DropIndex
DROP INDEX "Order_status_idx";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "hasRefundRequest";

-- AlterTable
ALTER TABLE "RefundRequest" DROP COLUMN "status";

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
