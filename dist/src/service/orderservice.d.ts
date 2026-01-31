import { type ExtraDistanceLevel, OrderStatus, DeliveryStatus, PaymentStatus, TrackingType } from '@prisma/client';
export interface OrderItemInput {
    productId: string;
    quantity?: number;
    packagingsize: number;
}
export interface OrderResponse {
    id: string;
    userId: string;
    merchOrderId: string;
    phoneNumber: string;
    location: string;
    totalAmount: number;
    idempotencyKey: string;
    orderrecived: string;
    paymentMethod: string;
    paymentProofUrl?: string;
    refundstatus: string;
    cancelReason?: string;
    deliveryFee: number;
    deliverystatus: DeliveryStatus;
    paymentstatus: PaymentStatus;
    deliveryDate?: Date | null;
    status: OrderStatus;
    createdAt: Date;
    updatedAt: Date;
    items: {
        id: string;
        quantity: number;
        price: number;
        packaging: number;
        product: {
            id: string;
            name: string;
            images?: {
                url: string;
            }[];
        };
    }[];
    tracking: {
        status: string;
        title: string;
        timestamp: Date | null;
    }[];
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
export declare class OrderServiceImpl {
    getOrdersWithTracking(userId: any, status?: OrderStatus, page?: number, limit?: number): Promise<{
        items: any[];
        total: number;
    }>;
    updateTrackingStep(orderId: string, type: TrackingType, message?: string): Promise<void>;
    getOrderDetail(orderId: string): Promise<OrderResponse>;
    cancelOrder(orderId: string): Promise<void>;
    createMultiOrder({ userId, products, locationId, // maps to areaId
    phoneNumber, orderReceived, // from request, string 'Delivery' | 'Pickup'
    paymentMethod, idempotencyKey, extraDistance, }: {
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
    }>;
}
//# sourceMappingURL=orderservice.d.ts.map