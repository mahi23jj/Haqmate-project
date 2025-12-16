
import { NotFoundError } from '../utils/apperror.js';
import { ChapaIntegration } from './chapa_paymentService.js';
import { DeliveryServiceImpl, type ExtraDistanceLevel } from './delivery.js';
import { OrderServiceImpl } from './orderservice.js';
import type { Product } from './telebirr_productservice.js';

import { PrismaClient } from '@prisma/client';



const prisma = new PrismaClient();

export interface OrderItemInput {
    productId: string;
    quantity?: number;  // optional, default to 1
    packagingsize: number;
}


export enum Status {
    PENDING = 'pending',
    FAILED = 'failed',
    PAID = 'paid',
    DELIVERED = 'delivered',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
    REFUNDED = 'refunded'
}



export interface paymentService {
    placeorderandpay({
        userId,
        products,
        locationId,
        phoneNumber,
        orderReceived,
        paymentMethod,
        extraDistance
    }: {
        userId: string;
        products: OrderItemInput[];
        locationId: string;  // IMPORTANT: this is areaId
        phoneNumber: string;
        orderReceived: string;
        paymentMethod: string;
        extraDistance?: ExtraDistanceLevel;
    }): Promise<any>;
}


export class paymentServiceImpl implements paymentService {
    async placeorderandpay({
        userId,
        products,
        locationId,
        phoneNumber,
        orderReceived,
        paymentMethod,
        extraDistance
    }: {
        userId: string;
        products: OrderItemInput[];
        locationId: string;  // IMPORTANT: this is areaId
        phoneNumber: string;
        orderReceived: string;
        paymentMethod: string;
        extraDistance?: ExtraDistanceLevel;

    }) {

        const value = new OrderServiceImpl();

        const payment = new ChapaIntegration();

        // 1. Create order
        const order = await value.createMultiOrder(
            userId,
            products,
            locationId,
            phoneNumber,
            orderReceived,
            paymentMethod,
            extraDistance
        );

        // 2. If payment is CHAPA → create payment intent
        if (paymentMethod === "Chapa") {
            const paymentIntent = await payment.createPaymentIntent({
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
        return {
            order,
            paymentIntent: null,
        };

    }
}
