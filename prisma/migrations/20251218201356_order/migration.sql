/*
  Warnings:

  - A unique constraint covering the columns `[orderId]` on the table `OrderTracking` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "OrderTracking_orderId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "OrderTracking_orderId_key" ON "OrderTracking"("orderId");
