import { Router, request } from "express";
import { OrderServiceImpl } from "../service/orderservice.js";
import { authMiddleware } from "../middleware/authmiddleware.js";
import { orderMiddleware } from "../middleware/ordermiddleware.js";
import type { Request, Response, NextFunction } from "express";

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

        const { productId , packagingsize , quantity,  shippinglocation, phoneNumber, phoneChange, locationChange } = req.body;

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
        return res.status(500).json({ error: "Error featching orders "});
    }

    
})

router.get("/average",orderMiddleware , async (req: Request, res: Response) => {

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

    
})

export { router as OrderRouter };