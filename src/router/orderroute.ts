



import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { OrderServiceImpl } from '../service/orderservice.js';
import { authMiddleware } from '../middleware/authmiddleware.js';
import { locationMiddleware, orderMiddleware } from '../middleware/ordermiddleware.js';
import { validate } from '../middleware/validate.js';
import { createMultiorderSchema } from '../validation/order_validation.js';
import { OrderStatus } from '@prisma/client';

const router = Router();
const orders = new OrderServiceImpl();

// 🔐 All order routes require auth
router.use(authMiddleware);

//
// ----------------------------------------------------
// GET ALL ORDERS (OPTIONAL STATUS FILTER)
// ----------------------------------------------------
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const statusParam = req.query.status as string | undefined;
    let statusEnum: OrderStatus | undefined;

    if (statusParam) {
      if (!(statusParam.toUpperCase() in OrderStatus)) {
        return res.status(400).json({ error: 'Invalid order status' });
      }

      statusEnum =
        OrderStatus[statusParam.toUpperCase() as keyof typeof OrderStatus];
    }

    const ordersList = await orders.getOrdersWithTracking(statusEnum);

    return res.status(200).json({
      success: true,
      message: 'Orders fetched successfully',
      data: ordersList
    });
  } catch (error) {
    next(error);
  }
});

//
// ----------------------------------------------------
// GET ORDER DETAIL
// ----------------------------------------------------
router.get(
  '/:id',
  orderMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = req.order;

      const orderDetail = await orders.getOrderDetail(order.id);

      return res.status(200).json({
        success: true,
        message: 'Order detail fetched successfully',
        data: orderDetail
      });
    } catch (error) {
      next(error);
    }
  }
);

//
// ----------------------------------------------------
// CREATE MULTI ORDER
// ----------------------------------------------------
router.post(
  '/multi-create',
  locationMiddleware,
  validate(createMultiorderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const location = req.location;

      const {
        products,
        phoneNumber,
        orderReceived,
        paymentMethod,
        extraDistance
      } = req.body;

      if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ error: 'Products array is required' });
      }

      const newOrder = await orders.createMultiOrder(
        userId,
        products,
        location.id,
        phoneNumber,
        orderReceived,
        paymentMethod,
        extraDistance
      );

      return res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: newOrder
      });
    } catch (error) {
      next(error);
    }
  }
);

//
// ----------------------------------------------------
// CANCEL ORDER (PROPER HTTP VERB)
// ----------------------------------------------------
router.patch(
  '/:id/cancel',
  orderMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = req.order;

      await orders.cancelOrder(order.id);

      return res.status(200).json({
        success: true,
        message: 'Order cancelled successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as OrderRouter };
