/*
  Warnings:

  - You are about to drop the column `hasRefundRequest` on the `Order` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "RefundStatus" ADD VALUE 'Not_Started';

-- DropIndex
DROP INDEX "Order_status_idx";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "hasRefundRequest",
ADD COLUMN     "Refundstatus" "RefundStatus" NOT NULL DEFAULT 'Not_Started';

-- AlterTable
ALTER TABLE "RefundRequest" ALTER COLUMN "status" SET DEFAULT 'Not_Started';

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
