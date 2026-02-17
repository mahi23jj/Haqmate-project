import { PaymentStatus, RefundStatus, TrackingType } from "@prisma/client";
import { prisma } from '../prisma.js';

export class RefundService {
    async processRefund(userId: string, orderId: string, reason: string, accountName: string, accountNumber: string, phoneNumber: string): Promise<any> {
        if (!orderId) {
            throw new Error('Order ID is required for refund processing');
        }
        if (!reason) {
            throw new Error('Reason for refund is required');
        }
        if (!accountName) {
            throw new Error('Account name is required for refund processing');
        }
        if (!accountNumber) {
            throw new Error('Account number is required for refund processing');
        }



        const refund = await prisma.refundRequest.create({
            data: {
                orderId,
                userId,
                accountName,
                accountNumber,
                status: RefundStatus.PENDING,
                phoneNumber: phoneNumber,
                reason,
            }
        });

        await prisma.order.update({
            where: { id: orderId },
            data: { Refundstatus: RefundStatus.PENDING, paymentStatus: PaymentStatus.REFUNDED },
        });

        // You need to fetch the unique id of the orderTracking record first
        const trackingRecord = await prisma.orderTracking.findFirst({
            where: { orderId: orderId, type: TrackingType.REFUNDED }
        });

        if (trackingRecord) {
            await prisma.orderTracking.update({
                where: { id: trackingRecord.id },
                data: {
                    timestamp: new Date(),
                    message: `Refund requested for order ${orderId}. Reason: ${reason}`
                }
            });
        }

        // Simulate refund processing logic
        // In a real implementation, this would involve interacting with payment gateways, updating order status, etc.
        return {
            message: 'Refund request submitted successfully',
            refund
        };
    }

    // get all refund requests and filter by status
    async getRefundRequests(status?: RefundStatus): Promise<any> {
        const whereClause = status ? { status } : {};
        const refunds = await prisma.refundRequest.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' }
        });
        return refunds;

    }

    async updateRefundStatus(refundId: string, newStatus: RefundStatus, reason?: string): Promise<any> {
        if (!refundId) {
            throw new Error('Refund ID is required for updating refund status');
        }
        if (!newStatus) {
            throw new Error('New status is required for updating refund status');
        }

        const updatedRefund = await prisma.refundRequest.update({
            where: { id: refundId },
            data: { status: newStatus, reason: reason || null }
        });

        return {
            message: 'Refund status updated successfully',
            refund: updatedRefund
        };
    }
}

