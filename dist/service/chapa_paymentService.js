// import { sql } from "../db/client";
import { nanoid } from "nanoid";
import { idempotencyService } from "./IdempotencyService.js";
import { OrderServiceImpl } from "./orderservice.js";
import { PrismaClient, OrderStatus, DeliveryStatus, PaymentStatus, TrackingType } from '@prisma/client';
import { NotFoundError } from '../utils/apperror.js';
import { prisma } from '../prisma.js';
// ---------- Implementation ----------
export class ChapaIntegration {
    //   private order: OrderServiceImpl;
    //   constructor() {
    //     this.order = new OrderService();
    //   }
    // --- Create Payment Intent ---
    async createPaymentIntent(request) {
        const { orderId, buyerId, currency, metadata = {}, idempotencyKey, } = request;
        const key = idempotencyKey || idempotencyService.generateKey();
        const operation = "create_payment_intent";
        // Step 1: check idempotency
        const existing = await idempotencyService.checkIdempotency(key, operation, request);
        if (existing)
            return existing.response_data;
        // Step 2: create pending idempotency record
        await idempotencyService.storeIdempotency(key, operation, request, null, "PENDING");
        try {
            // Step 3: fetch order
            const order = await prisma.order.findUnique({
                where: { id: orderId },
                select: {
                    id: true,
                    userId: true,
                    totalAmount: true,
                    // totalCents: true,
                    status: true,
                },
            });
            if (!order)
                throw new Error("Order not found");
            if (order.status !== OrderStatus.PENDING_PAYMENT) {
                throw new Error('Order is not awaiting payment');
            }
            if (order.userId !== buyerId)
                throw new Error("Order does not belong to this buyer");
            const amount = order.totalAmount;
            const txRef = nanoid(10);
            // Step 4: call Chapa
            const response = await fetch("https://api.chapa.co/v1/transaction/initialize", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    amount,
                    currency: currency || "ETB",
                    email: metadata.email,
                    first_name: metadata.firstName,
                    last_name: metadata.lastName,
                    tx_ref: txRef,
                    callback_url: `http://localhost:3000/api/payment/callback`
                    // ${process.env.BASE_URL},
                }),
            });
            const data = await response.json();
            if (data.status !== "success") {
                throw new Error(`Chapa init failed: ${typeof data.message === "string"
                    ? data.message
                    : JSON.stringify(data)}`);
            }
            // Step 5: Prisma transaction to insert both records
            const result = await prisma.$transaction(async (tx) => {
                // Save payment intent
                const intent = await tx.paymentIntent.create({
                    data: {
                        orderId,
                        userId: buyerId,
                        amount,
                        currency: (currency || "ETB").toUpperCase(),
                        method: "CHAPA",
                        status: "PENDING",
                        providerId: txRef,
                        clientSecret: data.data.checkout_url,
                        metadata: {
                            ...metadata,
                            idempotencyKey: key,
                            txRef,
                        },
                        idempotencyKey: key,
                    },
                });
                // Save transaction log
                await tx.paymentTransaction.create({
                    data: {
                        orderId,
                        provider: "CHAPA",
                        providerRef: txRef,
                        amountCents: amount,
                        status: "initiated",
                        rawPayload: data,
                        paymentIntentId: intent.id,
                        type: "CAPTURE",
                    },
                });
                return intent;
            });
            const responseObj = {
                id: result.id,
                clientSecret: result.clientSecret ? result.clientSecret : "",
                status: "PENDING",
                amount,
                currency: (currency || "ETB").toUpperCase(),
                metadata: {
                    txRef,
                    idempotencyKey: key,
                },
                created_at: result.createdAt,
            };
            // update idempotency
            await idempotencyService.updateIdempotencyStatus(key, operation, "SUCCESS", responseObj);
            return responseObj;
        }
        catch (error) {
            // error-handling with idempotency logging
            await idempotencyService.updateIdempotencyStatus(key, operation, "FAILURE", {
                error: error instanceof Error ? error.message : "Unknown error",
            });
            throw error;
        }
    }
    // --- Get Payment Intent ---
    async getPaymentIntent(id) {
        const result = await prisma.paymentIntent.findUnique({
            where: { id },
        });
        if (!result)
            return null;
        return {
            id: result.id,
            clientSecret: result.clientSecret ? result.clientSecret : "",
            orderid: result.orderId,
            status: result.status,
            amount: result.amount, // Prisma returns number directly
            currency: result.currency,
            metadata: result.metadata ? result.metadata : {},
            created_at: result.createdAt,
        };
    }
    async handleWebhook(data) {
        const txRef = data.trx_ref;
        if (!txRef) {
            console.warn("Missing trx_ref in callback.");
            return;
        }
        // STEP 1: VERIFY PAYMENT FROM CHAPA
        //   const verifyResponse = await fetch(
        //     `https://api.chapa.co/v1/transaction/verify/${txRef}`,
        //     {
        //       headers: {
        //         Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
        //       },
        //     }
        //   );
        //   const verifyJson = await verifyResponse.json();
        const chapaStatus = data.status;
        console.log("Chapa verified status:", chapaStatus);
        let newStatus;
        if (chapaStatus === "success") {
            newStatus = "paid";
        }
        else if (["failed", "cancelled"].includes(chapaStatus)) {
            newStatus = "failed";
        }
        else {
            newStatus = "pending";
        }
        // STEP 2: UPDATE PAYMENT INTENT
        const updatedIntent = await prisma.paymentIntent.updateMany({
            where: { providerId: txRef },
            data: { status: newStatus, updatedAt: new Date() },
        });
        if (updatedIntent.count === 0) {
            console.warn(`No payment_intent found for txRef=${txRef}`);
            return;
        }
        // STEP 3: GET THE PAYMENT INTENT
        const paymentIntent = await prisma.paymentIntent.findFirst({
            where: { providerId: txRef },
        });
        if (!paymentIntent)
            return;
        // STEP 4: UPDATE TRANSACTION
        await prisma.paymentTransaction.updateMany({
            where: { paymentIntentId: paymentIntent.id },
            data: { status: newStatus, updatedAt: new Date() },
        });
        if (newStatus === "paid") {
            // transaction and update both order and order tracking 
            await prisma.order.update({
                where: { id: paymentIntent.orderId },
                data: { status: OrderStatus.TO_BE_DELIVERED, deliveryStatus: DeliveryStatus.NOT_SCHEDULED, paymentStatus: PaymentStatus.CONFIRMED, updatedAt: new Date() },
            });
            const value = new OrderServiceImpl();
            await value.updateTrackingStep(paymentIntent.orderId, TrackingType.PAYMENT_CONFIRMED, "Payment confirmed via Chapa");
        }
        else if (newStatus === "failed") {
            await prisma.order.update({
                where: { id: paymentIntent.orderId },
                data: { status: OrderStatus.TO_BE_DELIVERED, deliveryStatus: DeliveryStatus.NOT_SCHEDULED, paymentStatus: PaymentStatus.FAILED, updatedAt: new Date() },
            });
        }
        // STEP 5: UPDATE ORDER
        console.log(`Order + Payment updated to: ${newStatus}`);
    }
}
// ---------- Payment Service Wrapper ----------
export class PaymentService {
    providers;
    constructor() {
        this.providers = {
            CHAPA: new ChapaIntegration(),
        };
    }
    getProvider(method) {
        const provider = this.providers[method];
        if (!provider)
            throw new Error(`Unsupported payment method: ${method}`);
        return provider;
    }
    async createPaymentIntent(method, req) {
        return this.getProvider(method).createPaymentIntent(req);
    }
    async getPaymentIntent(method, id) {
        return this.getProvider(method).getPaymentIntent(id);
    }
    //   async confirmPaymentIntent(method: string, id: string) {
    //     return this.getProvider(method).confirmPaymentIntent(id);
    //   }
    //   async confirmPaymentRefund(method: string, id: string) {
    //     return this.getProvider(method).confirmPaymentRefund(id);
    //   }
    //   async rejectPaymentRefund(method: string, id: string) {
    //     return this.getProvider(method).rejectPaymentRefund(id);
    //   }
    //   async refundPayment(method: string, req: CreateRefundRequest) {
    //     return this.getProvider(method).refundPayment(req);
    //   }
    async handleWebhook(method, event) {
        return this.getProvider(method).handleWebhook(event);
    }
}
//# sourceMappingURL=chapa_paymentService.js.map