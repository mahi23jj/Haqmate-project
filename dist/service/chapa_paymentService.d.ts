export interface CreatePaymentIntentRequest {
    orderId: string;
    buyerId: string;
    currency: string;
    metadata?: Record<string, any>;
    idempotencyKey?: string;
}
export interface PaymentIntentResponse {
    id: string;
    clientSecret: string;
    status: string;
    amount: number;
    currency: string;
    metadata: {};
    created_at: Date;
    orderid?: string;
}
export interface PaymentResponse {
    id: string;
    orderId: string;
    provider: string;
    providerRef: string;
    amount: number;
    status: string;
    type: string;
    paymentIntentId: string;
    rawPayload: Record<string, any>;
    createdAt: string;
}
export interface RefundResponse {
    id: string;
    status: string;
    created_at: Date;
}
export interface CreateRefundRequest {
    paymentIntentId: string;
    amount: number;
    reason?: string;
    metadata?: Record<string, any>;
    idempotencyKey?: string;
}
export interface PaymentProvider {
    createPaymentIntent(req: CreatePaymentIntentRequest): Promise<PaymentIntentResponse>;
    getPaymentIntent(id: string): Promise<PaymentIntentResponse | null>;
    handleWebhook(data: any): Promise<void>;
}
export interface PaymentRefundResponse {
    id: string;
    status: string;
    order_id: string;
}
export declare class ChapaIntegration implements PaymentProvider {
    createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntentResponse>;
    getPaymentIntent(id: string): Promise<PaymentIntentResponse | null>;
    handleWebhook(data: any): Promise<void>;
}
export declare class PaymentService {
    private providers;
    constructor();
    private getProvider;
    createPaymentIntent(method: string, req: CreatePaymentIntentRequest): Promise<PaymentIntentResponse>;
    getPaymentIntent(method: string, id: string): Promise<PaymentIntentResponse | null>;
    handleWebhook(method: string, event: any): Promise<void>;
}
//# sourceMappingURL=chapa_paymentService.d.ts.map