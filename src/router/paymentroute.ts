import { Router, request } from "express";
import { OrderServiceImpl } from "../service/orderservice.js";
import { authMiddleware } from "../middleware/authmiddleware.js";
import { locationMiddleware, orderMiddleware, productMiddleware } from "../middleware/ordermiddleware.js";
import type { Request, Response, NextFunction } from "express";
import { createMultiorderSchema } from "../validation/order_validation.js";
import { validate } from "../middleware/validate.js";
import { paymentServiceImpl } from "../service/payment_service.js";

import { PaymentStatus, PrismaClient } from '@prisma/client';


const prisma = new PrismaClient();

const router = Router();
router.use(authMiddleware);

const pay = new paymentServiceImpl();




router.post(
    "/",
    locationMiddleware,
    validate(createMultiorderSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const location = req.location;

            const {
                products,
                phoneNumber,
                orderRecived,
                paymentMethod,
            } = req.body;

            // Basic validation
            if (!Array.isArray(products) || products.length === 0) {
                return res.status(400).json({ error: "Products array is required" });
            }

            const newOrder = await pay.placeorderandpay(
                {
                    userId,
                    products,
                    locationId: location.id,
                    phoneNumber,
                    orderReceived: orderRecived,
                    paymentMethod
                });

            return res.status(200).json({
                status: "success",
                message: "payment successful",
                data: newOrder,
            });

            // res.status(201).json(newOrder);
        } catch (error) {
            next(error);
        }
    }
);


router.post("/orders/:orderId/refund", async (req, res) => {
    const { orderId } = req.params;
    const { accountName, accountNumber, reason } = req.body;
    const userId = req.user;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    // get phone number from user
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { phoneNumber: true },
    })

    if (!user) {
        return res.status(404).json({ error: "User not found" });

    }


    const refund = await prisma.refundRequest.create({
        data: {
            orderId,
            userId,
            accountName,
            accountNumber,
            phoneNumber: user.phoneNumber,
            reason,
        }
    });

    await prisma.order.update({
        where: { id: orderId },
        data: { hasRefundRequest: true , paymentStatus: PaymentStatus.REFUNDED},
    });

    res.json({ message: "Refund request submitted", refund });
});


router.patch("/refunds/:refundId", async (req, res) => {
    const { refundId } = req.params;
    const { status, adminNote } = req.body; // status = APPROVED | REJECTED

    const refund = await prisma.refundRequest.update({
        where: { id: refundId },
        data: { status, adminNote }
    });

    // if (status === "APPROVED") {
    //     await prisma.order.update({
    //         where: { id: refund.orderId },
    //         data: { paymentStatus: PaymentStatus.REFUNDED, refundAmount }
    //     });
    // }

    res.json({ message: "Refund processed", refund });
});




export { router as PaymentRouter };

