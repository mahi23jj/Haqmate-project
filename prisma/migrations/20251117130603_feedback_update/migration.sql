-- DropIndex
DROP INDEX "Order_deliveryDate_key";

-- DropIndex
DROP INDEX "Order_status_key";

-- DropIndex
DROP INDEX "feedback_orderId_key";

-- DropIndex
DROP INDEX "feedback_request_status_createdAt_key";

-- CreateTable
CREATE TABLE "FeedbackAnalytics" (
    "id" TEXT NOT NULL,
    "teffTypeId" TEXT NOT NULL,
    "qualityId" TEXT,
    "packagingId" TEXT,
    "feedbackId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,

    CONSTRAINT "FeedbackAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeedbackAnalytics_teffTypeId_qualityId_packagingId_idx" ON "FeedbackAnalytics"("teffTypeId", "qualityId", "packagingId");

-- CreateIndex
CREATE INDEX "Order_deliveryDate_idx" ON "Order"("deliveryDate");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "feedback_orderId_idx" ON "feedback"("orderId");

-- CreateIndex
CREATE INDEX "feedback_request_status_createdAt_idx" ON "feedback_request"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "FeedbackAnalytics" ADD CONSTRAINT "FeedbackAnalytics_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "feedback"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
