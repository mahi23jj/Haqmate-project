import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { mannualpaymentServiceImpl } from '../service/screanshoot_payment.js';
import { requireAdmin } from '../middleware/authmiddleware.js';
// import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const upload = multer(); // memory storage
const orders = new mannualpaymentServiceImpl();

//router.use();

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

      if (!req.file) {
        return res.status(400).json({
          message: 'Screenshot file is required'
        });
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

// Approve payment screenshot
router.post('/:orderId/approve', 
  requireAdmin,
  async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      throw new Error('Order ID is required');
    }
    const order = await orders.approvePayment(orderId);
    return res.status(200).json({ message: 'Payment approved', order });
  } catch (error: any) {
    return res.status(400).json({ message: error.message || 'Failed to approve payment' });
  }
});

// Reject payment screenshot
router.post('/:orderId/reject', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    if (!orderId) {
      throw new Error('Order ID is required');
    }
    const order = await orders.rejectPayment(orderId , reason);
    return res.status(200).json({ message: 'Payment rejected', order });
  } catch (error: any) {
    return res.status(400).json({ message: error.message || 'Failed to reject payment' });
  }
});

// Schedule delivery date and confirm payment
router.post('/:orderId/schedule', requireAdmin , async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    const { deliveryDate } = req.body;

    if (!orderId) {
      throw new Error('Order ID is required');
    }
    const order = await orders.scheduleDelivery(orderId, deliveryDate);
    return res.status(200).json({ message: 'Delivery scheduled and payment confirmed', order });
  } catch (error: any) {
    return res.status(400).json({ message: error.message || 'Failed to schedule delivery' });
  }
});

export { router as ScreenshotRouter };
