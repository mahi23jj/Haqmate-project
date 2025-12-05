import { Router, request } from "express";
import { OrderServiceImpl, Status } from "../service/orderservice.js";
import { authMiddleware } from "../middleware/authmiddleware.js";
import { orderMiddleware } from "../middleware/ordermiddleware.js";
import type { Request, Response, NextFunction } from "express";
import { createMultiorderSchema } from "../validation/order_validation.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.use(authMiddleware);

const orders = new OrderServiceImpl();

// POST /order/create - Create a new order
router.post("/create", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user;

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { productId, packagingsize, quantity, shippinglocation, phoneNumber, phoneChange, locationChange } = req.body;

        const items = { productId, packagingsize, quantity };

        const newOrder = await orders.createOrder(userId, items, shippinglocation, phoneNumber, phoneChange, locationChange);
        res.status(201).json(newOrder);
    } catch (error) {
        next(error);
    }
});


router.get("/me", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user;

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const order = await orders.getOrdersByUserId(userId);
        res.status(200).json(order);

    } catch (error) {
        return res.status(500).json({ error: "Error featching orders " });
    }


})

router.get("/average", orderMiddleware, async (req: Request, res: Response) => {

    try {

        const order = req.order;

        if (!order) {
            return res.status(400).json({ error: "Order not found" });
        }


        await orders.cancelOrder(order.id);

        return res.status(201).json('Order cancelled successfully');
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Error fetching feedbacks" });
    }
}
)


router.get(
    "/filterbystatus/:status",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const status = req.params.status as string;

            // change string to Status enum
            const statusEnum = Status[status.toUpperCase() as keyof typeof Status];

            // // Optional: vidate status
            const validStatuses: Status[] = [
                Status.PENDING,
                Status.FAILED,
                Status.PAID,
                Status.DELIVERED,
                Status.COMPLETED,
                Status.CANCELLED,
                Status.REFUNDED
            ];

            if (!validStatuses.includes(statusEnum)) {
                return res.status(400).json({ error: "Invalid status value" });
            }

            const ordersList = await orders.filterByStatus(statusEnum);
            res.status(200).json(ordersList);
        } catch (error) {
            next(error);
        }
  }
);


router.post(
    "/multi-create",
    validate(createMultiorderSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const {
                products,
                shippinglocation,
                phoneNumber,
                locationChange,
                phoneChange,
            } = req.body;

            // Basic validation
            if (!Array.isArray(products) || products.length === 0) {
                return res.status(400).json({ error: "Products array is required" });
            }

            const newOrder = await orders.createMultiOrder(
                userId,
                products,
                shippinglocation,
                phoneNumber,
                locationChange,   // ← Correct placement
                phoneChange       // ← Correct placement
            );

            res.status(201).json(newOrder);
        } catch (error) {
            next(error);
        }
    }
);



export { router as OrderRouter };