import { Router, request } from "express";
import { OrderServiceImpl, Status } from "../service/orderservice.js";
import { authMiddleware } from "../middleware/authmiddleware.js";
import { locationMiddleware, orderMiddleware, productMiddleware } from "../middleware/ordermiddleware.js";
import type { Request, Response, NextFunction } from "express";
import { createMultiorderSchema } from "../validation/order_validation.js";
import { validate } from "../middleware/validate.js";
import { paymentServiceImpl } from "../service/payment_service.js";

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



export { router as PaymentRouter };

