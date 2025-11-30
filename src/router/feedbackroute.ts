import { Router, request } from "express";
import { FeedbackServiceImpl } from "../service/feedbackservice.js";
import { authMiddleware } from "../middleware/authmiddleware.js";
import { orderMiddleware, productMiddleware } from "../middleware/ordermiddleware.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();
router.use(authMiddleware);

const Feedbacks = new FeedbackServiceImpl();


router.post(
    "/",
    productMiddleware,     // <== validate order before creating feedback
    async (req: Request, res: Response) => {

        const userId = req.user;

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { rating, message } = req.body;

        const product = req.product; // from middleware

        if (!product) {
            return res.status(400).json({ error: "Order not found" });
        }

        const feedback = await Feedbacks.createFeedback({
            userId: userId,
            rating: rating,
            comment: message,
            productId: product.id
        }
        );

        res.status(201).json(
            {
                status: "success",
                message: "Create a feedback",
                data: feedback,
            }
        );
    });

    //674815c2-d74e-454d-8867-cec02dc12891

router.get("/:productId", async (req: Request, res: Response, next: NextFunction) => {
    try {

        const { productId } = req.params;

        if (!productId) {
            return res.status(404).json({ error: "Product not found" });
        }

        const Product = await Feedbacks.getFeedbackByProduct(productId);
        return res.status(200).json(
            {
                status: "success",
                message: "Retrieve a feedback by ID",
                data: Product,
            }
        );

    } catch (error) {
        return res.status(500).json({ error: "Error featching orders " });
    }


})




export { router as FeedbackRouter };




