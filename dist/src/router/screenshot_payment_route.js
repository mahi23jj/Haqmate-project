import { Router } from 'express';
import multer from 'multer';
import { mannualpaymentServiceImpl } from '../service/screanshoot_payment.js';
// import { authMiddleware } from '../middleware/auth.js';
const router = Router();
const upload = multer(); // memory storage
const orders = new mannualpaymentServiceImpl();
//router.use();
// -----------------------------
// Submit payment screenshot
// -----------------------------
router.post('/:orderId', upload.single('screenshot'), async (req, res) => {
    try {
        const { orderId } = req.params;
        if (!orderId) {
            throw new Error('Order ID is required');
        }
        if (!req.file) {
            return res.status(400).json({
                message: 'Screenshot file is required'
            });
        }
        const order = await orders.submitPaymentScreenshot(orderId, req.file);
        return res.status(200).json({
            message: 'Payment submitted successfully. Awaiting admin confirmation.',
            order
        });
    }
    catch (error) {
        return res.status(400).json({
            message: error.message || 'Failed to submit payment'
        });
    }
});
// Approve payment screenshot
router.post('/:orderId/approve', async (req, res) => {
    try {
        const { orderId } = req.params;
        if (!orderId) {
            throw new Error('Order ID is required');
        }
        const order = await orders.approvePayment(orderId);
        return res.status(200).json({ message: 'Payment approved', order });
    }
    catch (error) {
        return res.status(400).json({ message: error.message || 'Failed to approve payment' });
    }
});
// Reject payment screenshot
router.post('/:orderId/reject', async (req, res) => {
    try {
        const { orderId } = req.params;
        if (!orderId) {
            throw new Error('Order ID is required');
        }
        const order = await orders.rejectPayment(orderId);
        return res.status(200).json({ message: 'Payment rejected', order });
    }
    catch (error) {
        return res.status(400).json({ message: error.message || 'Failed to reject payment' });
    }
});
// Schedule delivery date and confirm payment
router.post('/:orderId/schedule', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { deliveryDate } = req.body;
        if (!orderId) {
            throw new Error('Order ID is required');
        }
        const order = await orders.scheduleDelivery(orderId, deliveryDate);
        return res.status(200).json({ message: 'Delivery scheduled and payment confirmed', order });
    }
    catch (error) {
        return res.status(400).json({ message: error.message || 'Failed to schedule delivery' });
    }
});
export { router as ScreenshotRouter };
//# sourceMappingURL=screenshot_payment_route.js.map