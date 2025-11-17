/*
  Warnings:

  - A unique constraint covering the columns `[deliveryDate]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[status]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "feedback_status" AS ENUM ('pending', 'notified', 'completed', 'cancelled');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "feedback_request" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "feedback_status" NOT NULL DEFAULT 'pending',
    "feedback_submitted" BOOLEAN NOT NULL DEFAULT false,
    "skip_count" INTEGER NOT NULL DEFAULT 0,
    "price" DOUBLE PRECISION NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "rating" INTEGER,
    "message" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feedback_request_orderId_key" ON "feedback_request"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_request_status_createdAt_key" ON "feedback_request"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_orderId_key" ON "feedback"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_deliveryDate_key" ON "Order"("deliveryDate");

-- CreateIndex
CREATE UNIQUE INDEX "Order_status_key" ON "Order"("status");

-- AddForeignKey
ALTER TABLE "feedback_request" ADD CONSTRAINT "feedback_request_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_request" ADD CONSTRAINT "feedback_request_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
