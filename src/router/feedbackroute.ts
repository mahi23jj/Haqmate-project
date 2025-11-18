import { Router, request } from "express";
import { FeedbackServiceimp, type FeedbackFilter } from "../service/feedbackservice.js";
import { authMiddleware } from "../middleware/authmiddleware.js";
import { orderMiddleware } from "../middleware/ordermiddleware.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();
router.use(authMiddleware);

const Feedbacks = new FeedbackServiceimp();


router.post(
    "/",
    orderMiddleware,     // <== validate order before creating feedback
    async (req: Request, res: Response) => {

        const userId = req.user;

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { rating, message } = req.body;

        const order = req.order; // from middleware

        if (!order) {
            return res.status(400).json({ error: "Order not found" });
        }

        const feedback = await Feedbacks.createFeedback({
            userId: userId,
            rating: rating,
            comment: message,
            orderid: order.id
        }
        );

        res.status(201).json(feedback);
    });

router.get("/", async (req: Request, res: Response) => {
    try {
        const { teffType, teffQuality, teffPackaging } = req.query;


        const filters: FeedbackFilter = {};

        if (typeof teffType === "string") filters.tefftype = teffType;
        if (typeof teffQuality === "string") filters.teffquality = teffQuality;
        if (typeof teffPackaging === "string") filters.teffpackaging = teffPackaging;

        const feedbacks = await Feedbacks.filterFeedbacks(filters);

        return res.status(201).json(feedbacks);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Error fetching feedbacks" });
    }
});


router.get("/average", async (req: Request, res: Response) => {

    try {
        const feedbacks = await Feedbacks.averagerating();

        return res.status(201).json(feedbacks);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Error fetching feedbacks" });
    }

    
})


export { router as FeedbackRouter };




