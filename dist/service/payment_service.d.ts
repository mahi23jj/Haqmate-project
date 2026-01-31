import { type ExtraDistanceLevel } from './delivery.js';
export interface OrderItemInput {
    productId: string;
    quantity?: number;
    packagingsize: number;
}
export declare const ORDER_TRACKING_STEPS: readonly [{
    readonly status: "PAYMENT_SUBMITTED";
    readonly title: "Order Placed";
}, {
    readonly status: "PAYMENT_CONFIRMED";
    readonly title: "Payment Confirmed";
}, {
    readonly status: "DELIVERY_SCHEDULED";
    readonly title: "Scheduled for Delivery";
}, {
    readonly status: "CONFIRMED";
    readonly title: "Completed";
}, {
    readonly status: "CANCELLED";
    readonly title: "Cancelled";
}];
export interface paymentService {
    placeorderandpay({ userId, products, locationId, phoneNumber, orderReceived, paymentMethod, idempotencyKey, extraDistance }: {
        userId: string;
        products: OrderItemInput[];
        locationId: string;
        phoneNumber: string;
        orderReceived: string;
        paymentMethod: string;
        idempotencyKey: string;
        extraDistance?: ExtraDistanceLevel;
    }): Promise<any>;
}
export declare class paymentServiceImpl implements paymentService {
    placeorderandpay({ userId, products, locationId, phoneNumber, orderReceived, paymentMethod, idempotencyKey, extraDistance, }: {
        userId: string;
        products: OrderItemInput[];
        locationId: string;
        phoneNumber: string;
        orderReceived: string;
        paymentMethod: string;
        idempotencyKey: string;
        extraDistance?: ExtraDistanceLevel;
    }): Promise<{
        id: string;
        totalAmount: number;
    } | import("./chapa_paymentService.js").PaymentIntentResponse>;
}
//# sourceMappingURL=payment_service.d.ts.map