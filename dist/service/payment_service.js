import { NotFoundError } from '../utils/apperror.js';
import { ChapaIntegration } from './chapa_paymentService.js';
import { DeliveryServiceImpl } from './delivery.js';
import { OrderServiceImpl } from './orderservice.js';
import { PrismaClient, TrackingType } from '@prisma/client';
import { mannualpaymentServiceImpl } from './screanshoot_payment.js';
import { prisma } from '../prisma.js';
// export enum Status {
//     PENDING = 'pending',
//     FAILED = 'failed',
//     PAID = 'paid',
//     DELIVERED = 'delivered',
//     COMPLETED = 'completed',
//     CANCELLED = 'cancelled',
//     REFUNDED = 'refunded'
// }
export const ORDER_TRACKING_STEPS = [
    { status: TrackingType.PAYMENT_SUBMITTED, title: 'Order Placed' },
    { status: TrackingType.PAYMENT_CONFIRMED, title: 'Payment Confirmed' },
    { status: TrackingType.DELIVERY_SCHEDULED, title: 'Scheduled for Delivery' },
    { status: TrackingType.CONFIRMED, title: 'Completed' },
    { status: TrackingType.CANCELLED, title: 'Cancelled' }
];
export class paymentServiceImpl {
    async placeorderandpay({ userId, products, locationId, phoneNumber, orderReceived, paymentMethod, idempotencyKey, extraDistance, }) {
        const value = new OrderServiceImpl();
        const chapapayment = new ChapaIntegration();
        const mannualpayment = new mannualpaymentServiceImpl();
        const order = await value.createMultiOrder({
            userId,
            products,
            locationId,
            phoneNumber,
            orderReceived,
            paymentMethod,
            idempotencyKey,
        });
        // have transaction 
        /*  const order = await prisma.$transaction(async (tx) => {
             // 1. Create the order
           
 
             // 2. Create tracking steps
             await tx.orderTracking.createMany({
                 data: ORDER_TRACKING_STEPS.map(step => ({
                     orderId: order.id,
                     type: step.status,
                     title: step.title,
                     timestamp: step.status === TrackingType.PAYMENT_SUBMITTED ? new Date() : null,
                 }))
             });
 
             return order;
         }); */
        // 1. Create order
        // 2. If payment is CHAPA → create payment intent
        if (paymentMethod === "Chapa") {
            const paymentIntent = await chapapayment.createPaymentIntent({
                orderId: order.id,
                buyerId: userId, // 🔥 SAME user, guaranteed
                currency: "ETB",
                metadata: {
                    email: "user@email.com", // optional
                    firstName: "User",
                    lastName: "Name",
                },
            });
            return paymentIntent;
        }
        // 3. If COD or other
        return order;
    }
}
//# sourceMappingURL=payment_service.js.map