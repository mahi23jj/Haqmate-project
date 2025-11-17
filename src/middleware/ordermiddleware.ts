
import type { Request, Response, NextFunction } from "express";



export async function orderMiddleware(req: Request, res: Response, next: NextFunction) {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ message: "Order id is required" });
    }

    try {

        const order = await req.context?.models.Order.findByPk(id);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        req.order = order;
        next(); // Proceed to next middleware or route handler
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
}
