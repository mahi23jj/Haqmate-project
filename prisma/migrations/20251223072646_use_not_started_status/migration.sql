-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "Refundstatus" "RefundStatus" NOT NULL DEFAULT 'Not_Started';

-- AlterTable
ALTER TABLE "RefundRequest" ADD COLUMN     "status" "RefundStatus" NOT NULL DEFAULT 'Not_Started';
