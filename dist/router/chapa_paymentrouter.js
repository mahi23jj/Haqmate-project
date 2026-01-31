import { Router, request } from "express";
import { PaymentService } from "../service/chapa_paymentService.js";
import { config } from "../config.js";
import { authMiddleware } from "../middleware/authmiddleware.js";
// import { validateRequest } from "../validation/common.js";
import { cleanupService } from "../service/IdempotencyService.js";
// import {
//   createPaymentIntentSchema,
//   confirmPaymentIntentSchema,
//   getPaymentIntentSchema,
//   createRefundSchema,
//   getPaymentHistorySchema,
//   getMerchantPaymentsSchema,
//   webhookSchema,
// } from "../validation/payment.js";
const router = Router();
const paymentService = new PaymentService();
router.post("/intents", authMiddleware, 
/*  validateRequest(createPaymentIntentSchema), */
async (req, res, next) => {
    try {
        const { orderId, currency, idempotencyKey, metadata } = req.body;
        const buyerId = req.user;
        if (!buyerId) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const paymentIntent = await paymentService.createPaymentIntent("CHAPA", {
            orderId,
            buyerId,
            currency,
            metadata: { ...metadata },
            idempotencyKey,
        });
        res.status(201).json(paymentIntent);
    }
    catch (error) {
        console.error("Error creating payment intent:", error);
        res.status(500).json({
            error: error instanceof Error
                ? error.message
                : "Failed to create payment intent",
        });
    }
});
router.get("/intents/:id", authMiddleware, 
//   validateRequest(getPaymentIntentSchema),
async (req, res, next) => {
    try {
        const { id } = req.params;
        const buyerId = req.auth.userId;
        if (!buyerId) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const paymentIntent = await paymentService.getPaymentIntent("CHAPA", id);
        if (!paymentIntent) {
            return res.status(404).json({ error: "Payment intent not found" });
        }
        /*    if (paymentIntent.metadata.buyerId !== buyerId) {
             return res.status(403).json({ error: "Access denied" });
           } */
        res.json(paymentIntent);
    }
    catch (error) {
        console.error("Error getting payment intent:", error);
        res.status(500).json({
            error: error instanceof Error
                ? error.message
                : "Failed to get payment intent",
        });
    }
});
// for client link for chapawebhook
router.get("/callback", async (req, res, next) => {
    try {
        const data = req.query; // tx_ref will be here
        console.log("🔥 Callback received:", data);
        await paymentService.handleWebhook("CHAPA", data);
        // Redirect user to success page (optional)
        // return res.redirect("http://localhost:3000/payment-success");
        res.status(200).json({ message: "Webhook processed" });
    }
    catch (err) {
        console.error("Callback error:", err);
        return res.status(500).json({ message: "Webhook handling failed" });
    }
});
// Support POST too (just in case)
router.post("/callback", async (req, res, next) => {
    try {
        const data = req.body; // tx_ref may be here
        console.log("🔥 POST Callback received:", data);
        await paymentService.handleWebhook("CHAPA", data);
        res.status(200).json({ message: "Webhook processed" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Webhook failed" });
    }
});
// router.post(
//   "/intents/:id/confirm",
//   requireAuth,
// //   validateRequest(confirmPaymentIntentSchema),
//   async (req: any, res) => {
//     try {
//       const { id } = req.params;
//       const buyerId = req.auth.userId;
//       if (!buyerId) {
//         return res.status(401).json({ error: "User not authenticated" });
//       }
//       const existingIntent = await paymentService.getPaymentIntent("CHAPA", id);
//       if (!existingIntent) {
//         return res.status(404).json({ error: "Payment intent not found" });
//       }
//       if (existingIntent.metadata.buyerId !== buyerId) {
//         return res.status(403).json({ error: "Access denied" });
//       }
//       const paymentIntent = await paymentService.confirmPaymentIntent(
//         "CHAPA",
//         id
//       );
//       res.json(paymentIntent);
//     } catch (error) {
//       console.error("Error confirming payment intent:", error);
//       res.status(500).json({
//         error:
//           error instanceof Error
//             ? error.message
//             : "Failed to confirm payment intent",
//       });
//     }
//   }
// );
// router.post(
//   "/refunds",
//   requireAuth,
// //   validateRequest(createRefundSchema),
//   async (req: any, res) => {
//     try {
//       const { paymentIntentId, amount, reason, metadata, idempotencyKey } =
//         req.body;
//       const buyerId = req.auth.userId;
//       if (!buyerId) {
//         return res.status(401).json({ error: "User not authenticated" });
//       }
//       const paymentIntent = await paymentService.getPaymentIntent(
//         "CHAPA",
//         paymentIntentId
//       );
//       if (!paymentIntent) {
//         return res.status(404).json({ error: "Payment intent not found" });
//       }
//       const refund = await paymentService.refundPayment("CHAPA", {
//         paymentIntentId,
//         amount: amount || paymentIntent.amount,
//         reason,
//         metadata,
//         idempotencyKey,
//       });
//       res.status(201).json(refund);
//     } catch (error) {
//       console.error("Error creating refund:", error);
//       res.status(500).json({
//         error:
//           error instanceof Error ? error.message : "Failed to create refund",
//       });
//     }
//   }
// );
// router.post(
//   "/refunds/:id/reject",
//   requireAuth,
//   async (req: any, res) => {
//     try {
//       const { id } = req.params;
//       const refund = await paymentService.rejectPaymentRefund("CHAPA", id);
//       res.json(refund);
//     } catch (error) {
//       console.error("Error rejecting refund:", error);
//       res.status(500).json({
//         error:
//           error instanceof Error ? error.message : "Failed to reject refund",
//       });
//     }
//   }
// );
// router.get(
//   "/history",
//   requireAuth,
//   // validateRequest(getPaymentHistorySchema),
//   async (req: any, res) => {
//     try {
//       const { limit, offset } = req.query;
//       const buyerId = req.auth.userId;
//       const role = req.auth.role;
//       console.log("buyerId", buyerId);
//       console.log("role", role);
//       if (!buyerId) {
//         return res.status(401).json({ error: "User not authenticated" });
//       }
//        const payments = await paymentService.getPaymentHistory(
//         "CHAPA",
//         role,
//         buyerId,
//         limit,
//         offset
//       ); 
//       res.json({
//          payments,
//         pagination: { limit, offset },
//       });
//     } catch (error) {
//       console.error("Error getting payment history:", error);
//       res.status(500).json({
//         error:
//           error instanceof Error
//             ? error.message
//             : "Failed to get payment history",
//       });
//     }
//   }
// );
router.post("/admin/cleanup", authMiddleware, async (req, res) => {
    try {
        const cleanupResult = await cleanupService.manualCleanup();
        res.json({
            message: "Cleanup completed successfully",
            cleanup: cleanupResult,
        });
    }
    catch (error) {
        console.error("Error during manual cleanup:", error);
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to run cleanup",
        });
    }
});
export { router as ChapaRouter };
//# sourceMappingURL=chapa_paymentrouter.js.map