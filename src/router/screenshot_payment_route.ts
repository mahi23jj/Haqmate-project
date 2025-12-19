import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { mannualpaymentServiceImpl } from '../service/screanshoot_payment.js';
// import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const upload = multer(); // memory storage
const orders = new mannualpaymentServiceImpl();

router.use();

// -----------------------------
// Submit payment screenshot
// -----------------------------
router.post(
  '/:orderId',
  upload.single('screenshot'),
  async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;

     if (!orderId) {
      throw new Error('Order ID is required');
    }

      const order = await orders.submitPaymentScreenshot(
        orderId,
        req.file!
      );

      return res.status(200).json({
        message: 'Payment submitted successfully. Awaiting admin confirmation.',
        order
      });
    } catch (error: any) {
      return res.status(400).json({
        message: error.message || 'Failed to submit payment'
      });
    }
  }
);

export { router as ScreenshotRouter };
