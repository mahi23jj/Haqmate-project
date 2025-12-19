/*
  Warnings:

  - The `status` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `status` on the `OrderTracking` table. All the data in the column will be lost.
  - You are about to drop the `feedback_request` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `orderrecived` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentMethod` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `OrderTracking` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'TO_BE_DELIVERED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SCREENSHOT_SENT', 'FAILED', 'CONFIRMED', 'DECLINED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('NOT_SCHEDULED', 'SCHEDULED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "TrackingType" AS ENUM ('PAYMENT_SUBMITTED', 'PAYMENT_CONFIRMED', 'DELIVERY_SCHEDULED', 'CONFIRMED', 'CANCELLED', 'REFUNDED');

-- DropForeignKey
ALTER TABLE "feedback_request" DROP CONSTRAINT "feedback_request_orderId_fkey";

-- DropForeignKey
ALTER TABLE "feedback_request" DROP CONSTRAINT "feedback_request_userId_fkey";

-- DropForeignKey
ALTER TABLE "user" DROP CONSTRAINT "user_areaId_fkey";

-- DropIndex
DROP INDEX "Order_deliveryDate_idx";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'NOT_SCHEDULED',
ADD COLUMN     "orderrecived" TEXT NOT NULL,
ADD COLUMN     "paymentDeclineReason" TEXT,
ADD COLUMN     "paymentMethod" TEXT NOT NULL,
ADD COLUMN     "paymentProofUrl" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "refundAmount" DOUBLE PRECISION,
DROP COLUMN "status",
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT';

-- AlterTable
ALTER TABLE "OrderTracking" DROP COLUMN "status",
ADD COLUMN     "message" TEXT,
ADD COLUMN     "type" "TrackingType" NOT NULL;

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "areaId" DROP NOT NULL;

-- DropTable
DROP TABLE "feedback_request";

-- DropEnum
DROP TYPE "Status";

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- CreateIndex
CREATE INDEX "Order_deliveryStatus_idx" ON "Order"("deliveryStatus");

-- CreateIndex
CREATE INDEX "OrderTracking_orderId_idx" ON "OrderTracking"("orderId");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "area"("id") ON DELETE SET NULL ON UPDATE CASCADE;
