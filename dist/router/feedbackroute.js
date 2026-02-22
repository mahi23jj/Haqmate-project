import { Router, request } from "express";
import { FeedbackServiceImpl } from "../service/feedbackservice.js";
import { authMiddleware } from "../middleware/authmiddleware.js";
import { orderMiddleware, productMiddleware } from "../middleware/ordermiddleware.js";
import { validate } from "../middleware/validate.js";
import { reviewSchema } from "../validation/review_validation.js";
const router = Router();
router.use(authMiddleware);
const Feedbacks = new FeedbackServiceImpl();
router.post("/", productMiddleware, validate(reviewSchema), // <== validate order before creating feedback
async (req, res) => {
    try {
        const userId = req.user;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { rating, message } = req.body;
        const product = req.product; // from middleware
        if (!product) {
            return res.status(400).json({ error: "Product not found" });
        }
        const feedback = await Feedbacks.createFeedback({
            userId: userId,
            rating: rating,
            comment: message,
            productId: product.id
        });
        res.status(201).json({
            status: "success",
            message: "Create a feedback",
            data: feedback,
        });
    }
    catch (err) {
        console.error("❌ Error creating feedback:", err);
        return res.status(err.statusCode || 500).json({
            status: "error",
            message: err.message || "Failed to create feedback",
        });
    }
});
//674815c2-d74e-454d-8867-cec02dc12891
router.get("/:productId", async (req, res, next) => {
    try {
        const { productId } = req.params;
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
        // const userId = req.user;
        if (!productId) {
            return res.status(404).json({ error: "Product not found" });
        }
        const Product = await Feedbacks.getFeedbackByProduct(productId, { page, limit });
        return res.status(200).json({
            status: "success",
            message: "Retrieve a feedback by ID",
            data: Product,
            pagination: {
                page,
                limit,
                total: Product.total,
                totalPages: Math.ceil(Product.total / limit),
            },
        });
    }
    catch (error) {
        return res.status(500).json({ error: "Error featching orders " });
    }
});
export { router as FeedbackRouter };
//# sourceMappingURL=feedbackroute.js.map