// import { sql } from "../db/client";
import { nanoid } from "nanoid";
import { idempotencyService } from "./IdempotencyService.js";
import { OrderServiceImpl } from "./orderservice.js";

import { PrismaClient, OrderStatus, DeliveryStatus, PaymentStatus, TrackingType } from '@prisma/client';
import { NotFoundError } from '../utils/apperror.js';
import type { Product } from './productservice.js';
const prisma = new PrismaClient();

// ---------- Interfaces ----------
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
  createPaymentIntent(
    req: CreatePaymentIntentRequest
  ): Promise<PaymentIntentResponse>;
  getPaymentIntent(id: string): Promise<PaymentIntentResponse | null>;
  //   confirmPaymentIntent(id: string): Promise<PaymentIntentResponse>;
  //confirmPaymentRefund(id: string): Promise<PaymentRefundResponse>;
  // rejectPaymentRefund(id: string): Promise<PaymentRefundResponse>;
  handleWebhook(data: any): Promise<void>;
  //  refundPayment(req: CreateRefundRequest): Promise<RefundResponse>;
  //   getPaymentHistory(
  //     role: "user" | "seller" | "admin",
  //     userId: string,
  //     limit?: number,
  //     offset?: number
  //   ): Promise<PaymentResponse[]>;
}

export interface PaymentRefundResponse {
  id: string;
  status: string;
  order_id: string;
}

// ---------- Implementation ----------
export class ChapaIntegration implements PaymentProvider {
  //   private order: OrderServiceImpl;

  //   constructor() {
  //     this.order = new OrderService();
  //   }

  // --- Create Payment Intent ---


  async createPaymentIntent(
    request: CreatePaymentIntentRequest
  ): Promise<PaymentIntentResponse> {
    const {
      orderId,
      buyerId,
      currency,
      metadata = {},
      idempotencyKey,
    } = request;

    const key = idempotencyKey || idempotencyService.generateKey();
    const operation = "create_payment_intent";

    // Step 1: check idempotency
    const existing = await idempotencyService.checkIdempotency(
      key,
      operation,
      request
    );
    if (existing) return existing.response_data;

    // Step 2: create pending idempotency record
    await idempotencyService.storeIdempotency(
      key,
      operation,
      request,
      null,
      "PENDING"
    );

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

      if (!order) throw new Error("Order not found");


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
        throw new Error(
          `Chapa init failed: ${typeof data.message === "string"
            ? data.message
            : JSON.stringify(data)
          }`
        );
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

      const responseObj: PaymentIntentResponse = {
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
      await idempotencyService.updateIdempotencyStatus(
        key,
        operation,
        "SUCCESS",
        responseObj
      );

      return responseObj;
    } catch (error) {
      // error-handling with idempotency logging
      await idempotencyService.updateIdempotencyStatus(
        key,
        operation,
        "FAILURE",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        }
      );

      throw error;
    }
  }





  // --- Get Payment Intent ---
  async getPaymentIntent(id: string): Promise<PaymentIntentResponse | null> {
    const result = await prisma.paymentIntent.findUnique({
      where: { id },
    });

    if (!result) return null;

    return {
      id: result.id,
      clientSecret: result.clientSecret ? result.clientSecret : "",
      orderid: result.orderId,
      status: result.status,
      amount: result.amount,  // Prisma returns number directly
      currency: result.currency,
      metadata: result.metadata ? result.metadata : {},
      created_at: result.createdAt,
    };
  }


  async handleWebhook(data: any): Promise<void> {
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

    let newStatus: "pending" | "failed" | "paid";

    if (chapaStatus === "success") {
      newStatus = "paid";
    } else if (["failed", "cancelled"].includes(chapaStatus)) {
      newStatus = "failed";
    } else {
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

    if (!paymentIntent) return;

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

      await prisma.orderTracking.update({
        where: { orderId: paymentIntent.orderId },
        data: { type: TrackingType.PAYMENT_CONFIRMED, title: "Payment Confirmed", createdAt: new Date() },

      })

    } else if (newStatus === "failed") {
      await prisma.order.update({
        where: { id: paymentIntent.orderId },
        data: { status: OrderStatus.TO_BE_DELIVERED, deliveryStatus: DeliveryStatus.NOT_SCHEDULED, paymentStatus: PaymentStatus.FAILED, updatedAt: new Date() },
      });

    }
    // STEP 5: UPDATE ORDER


    console.log(`Order + Payment updated to: ${newStatus}`);
  }




  // async handleWebhook(data: any): Promise<void> {
  //   const { tx_ref: txRef, status: chapaStatus } = data;

  //   console.log("chapa stutus 1 ",chapaStatus )

  //   let newStatus: 'pending'| 'failed' | 'paid';



  //   if (chapaStatus.toLowerCase().includes("success")) {
  //      newStatus = 'paid';

  //   }

  //   else if (["failed", "cancelled"].some(x => chapaStatus.toLowerCase().includes(x))){
  //       newStatus = 'failed';

  //   }
  //   else  {
  //       newStatus = 'pending';
  //   }

  //   const updatedIntent = await prisma.paymentIntent.updateMany({
  //     where: { providerId: txRef },
  //     data: { status: newStatus, updatedAt: new Date() },
  //   });

  //   if (updatedIntent.count === 0) {
  //     console.warn(`No payment_intent found for txRef=${txRef}`);
  //     return;
  //   }

  //   // Get actual intent (to know order_id)
  //   const paymentIntent = await prisma.paymentIntent.findFirst({
  //     where: { providerId: txRef },
  //   });

  //   if (!paymentIntent) return;

  //   // Update payment_transactions
  //   await prisma.paymentTransaction.updateMany({
  //     where: { paymentIntentId: paymentIntent.id },
  //     data: { status: newStatus, updatedAt: new Date() },
  //   });

  //   // Update order status
  //   await prisma.order.update({
  //     where: { id: paymentIntent.orderId },
  //     data: { status: newStatus, updatedAt: new Date() },
  //   });


  // }

  // async refundPayment(req: CreateRefundRequest): Promise<RefundResponse> {
  //   const { paymentIntentId, amount, reason, metadata = {}, idempotencyKey } = req;

  //   const key = idempotencyKey || idempotencyService.generateKey();
  //   const operation = "create_refund";

  //   const existingRecord = await idempotencyService.checkIdempotency(
  //     key,
  //     operation,
  //     req
  //   );
  //   if (existingRecord) return existingRecord.response_data;

  //   try {
  //     await idempotencyService.storeIdempotency(
  //       key,
  //       operation,
  //       req,
  //       null,
  //       "PENDING"
  //     );

  //     const paymentIntent = await this.getPaymentIntent(paymentIntentId);
  //     if (!paymentIntent) throw new Error("Payment intent not found");
  //     if (paymentIntent.status !== "SUCCEEDED")
  //       throw new Error("Only succeeded payments can be refunded");

  //     // Create payment transaction (refund)
  //     const transaction = await prisma.paymentTransaction.create({
  //       data: {
  //         orderId: paymentIntent.orderid,
  //         provider: "CHAPA",
  //         providerRef: paymentIntent.metadata.txRef,
  //         amountCents: amount,
  //         status: "PENDING",
  //         raw_payload: {
  //           ...metadata,
  //           reason,
  //           idempotencyKey: key,
  //         },
  //         payment_intent_id: paymentIntentId,
  //         type: "REFUND",
  //       },
  //     });

  //     const refundAmount = amount || paymentIntent.amount;

  //     // Insert into order_refunds
  //     await prisma.orderRefunds.create({
  //       data: {
  //         order_id: paymentIntent.orderid,
  //         transaction_id: transaction.id,
  //         reason: reason || null,
  //         amount_cents: refundAmount,
  //         status: "processing",
  //       },
  //     });

  //     const refundResponse = {
  //       id: transaction.id,
  //       status: "PENDING",
  //       created_at: transaction.created_at,
  //     };

  //     await idempotencyService.updateIdempotencyStatus(
  //       key,
  //       operation,
  //       "SUCCEEDED",
  //       refundResponse
  //     );

  //     return refundResponse;
  //   } catch (error) {
  //     await idempotencyService.updateIdempotencyStatus(
  //       key,
  //       operation,
  //       "FAILED",
  //       {
  //         error: error instanceof Error ? error.message : "Unknown error",
  //       }
  //     );
  //     throw error;
  //   }
  // }


  // --- Get Payment History ---
  /*  async getPaymentHistory(
   userId: string,
   limit = 50,
   offset = 0
 ): Promise<PaymentResponse[]> {
   let whereClause: any = {};
 
     whereClause.order = { user_id: userId };
 
   // admin → no filter
 
   const rows = await prisma.paymentTransaction.findMany({
     where: whereClause,
     include: { order: true },
     orderBy: { createdAt: "desc" },
     take: limit,
     skip: offset,
   });
 
   return rows.map((row) => ({
 
     id: row.id,
     orderId: row.orderId,
     provider: row.provider,
     providerRef: row.providerRef ,
     amount: row.amountCents,
     status: row.status,
     type: row.type,
     paymentIntentId: row.paymentIntentId,
     rawPayload: row.rawPayload ?? {},
     createdAt: row.createdAt
 
   }));
 } */

  // async confirmPaymentRefund(id: string): Promise<PaymentRefundResponse> {
  //   const refundTx = await prisma.paymentTransactions.findUnique({
  //     where: { id },
  //   });

  //   if (!refundTx) throw new Error("Payment refund not found");
  //   if (refundTx.type !== "REFUND") throw new Error("Payment is not a refund");

  //   if (refundTx.status !== "SUCCEEDED") {
  //     await prisma.paymentTransactions.update({
  //       where: { id },
  //       data: { status: "SUCCEEDED" },
  //     });

  //     this.order.markRefundCompleted(refundTx.order_id, true);
  //   }

  //   return {
  //     id: refundTx.id,
  //     status: "SUCCEEDED",
  //     order_id: refundTx.order_id,
  //   };
  // }

  // async rejectPaymentRefund(id: string): Promise<PaymentRefundResponse> {
  //   const refundTx = await prisma.paymentTransactions.findUnique({
  //     where: { id },
  //   });

  //   if (!refundTx) throw new Error("Payment refund not found");
  //   if (refundTx.type !== "REFUND") throw new Error("Payment is not a refund");

  //   await prisma.paymentTransactions.update({
  //     where: { id },
  //     data: { status: "FAILED" },
  //   });

  //   this.order.markRefundCompleted(refundTx.order_id, false);

  //   return {
  //     id: refundTx.id,
  //     status: "FAILED",
  //     order_id: refundTx.order_id,
  //   };
  // }

  // async confirmPaymentIntent(id: string): Promise<PaymentIntentResponse> {
  //   const paymentIntent = await this.getPaymentIntent(id);
  //   if (!paymentIntent) throw new Error("Payment intent not found");

  //   if (
  //     paymentIntent.status !== "PENDING" &&
  //     paymentIntent.status !== "REQUIRES_ACTION"
  //   ) {
  //     throw new Error(
  //       `Cannot confirm payment intent with status: ${paymentIntent.status}`
  //     );
  //   }

  //   try {
  //     const txRef = paymentIntent.metadata.txRef;
  //     if (!txRef) throw new Error("Missing Chapa txRef in metadata");

  //     const response = await fetch(
  //       `https://api.chapa.co/v1/transaction/verify/${txRef}`,
  //       {
  //         method: "GET",
  //         headers: {
  //           Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
  //           "Content-Type": "application/json",
  //         },
  //       }
  //     );

  //     const data = await response.json();
  //     if (data.status !== "success") throw new Error("Chapa verification failed");

  //     const chapaStatus = data.data.status;
  //     const amountPaid = parseInt(data.data.amount, 10);
  //     const providerRef = data.data.tx_ref;

  //     const newStatus = this.mapChapaStatusToInternal(chapaStatus);

  //     await prisma.paymentIntents.update({
  //       where: { id },
  //       data: { status: newStatus, updated_at: new Date() },
  //     });

  //     // Only create capture transaction if payment succeeded
  //     if (chapaStatus === "success") {
  //       await this.createTransactionPrisma(
  //         id,
  //         "CAPTURE",
  //         amountPaid,
  //         providerRef,
  //         data.data,
  //         newStatus
  //       );
  //     }

  //     return {
  //       ...paymentIntent,
  //       status: newStatus,
  //       amount: amountPaid,
  //       metadata: { ...paymentIntent.metadata, chapa: data.data },
  //     };
  //   } catch (error) {
  //     console.error("Error confirming Chapa payment intent:", error);
  //     throw new Error(
  //       `Failed to confirm payment intent: ${
  //         error instanceof Error ? error.message : "Unknown error"
  //       }`
  //     );
  //   }
  // }

  // private async createTransactionPrisma(
  //   paymentIntentId: string,
  //   type: "AUTH" | "CAPTURE" | "REFUND" | "VOID",
  //   amount: number,
  //   providerRef: string,
  //   metadata: Record<string, any> = {},
  //   status: string
  // ) {
  //   const tx = await prisma.paymentTransaction.create({
  //     data: {
  //         orderId
  //       paymentIntentId: paymentIntentId,
  //       type,
  //       amountCents: amount,
  //       providerRef: providerRef,
  //       status,
  //       rawPayload: metadata,
  //     },
  //   });

  //   return {
  //     id: tx.id,
  //     created_at: tx.createdAt,
  //   };
  // }


}

// ---------- Payment Service Wrapper ----------
export class PaymentService {
  private providers: Record<string, PaymentProvider>;

  constructor() {
    this.providers = {
      CHAPA: new ChapaIntegration(),
    };
  }

  private getProvider(method: string): PaymentProvider {
    const provider = this.providers[method];
    if (!provider) throw new Error(`Unsupported payment method: ${method}`);
    return provider;
  }

  async createPaymentIntent(method: string, req: CreatePaymentIntentRequest) {
    return this.getProvider(method).createPaymentIntent(req);
  }

  async getPaymentIntent(method: string, id: string) {
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

  async handleWebhook(method: string, event: any) {
    return this.getProvider(method).handleWebhook(event);
  }


}
