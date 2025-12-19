-- DropIndex
DROP INDEX "OrderTracking_orderId_key";

-- CreateIndex
CREATE INDEX "OrderTracking_orderId_idx" ON "OrderTracking"("orderId");
