



import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { OrderServiceImpl } from '../service/orderservice.js';
import { authMiddleware, requireAdmin } from '../middleware/authmiddleware.js';
import { locationMiddleware, orderMiddleware } from '../middleware/ordermiddleware.js';
import { validate } from '../middleware/validate.js';
import { createMultiorderSchema } from '../validation/order_validation.js';
import { DeliveryStatus, OrderStatus, PaymentStatus } from '@prisma/client';

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

    const userid = req.user;
    const statusParam = req.query.status as string | undefined;
    const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 20, 1), 100);
    let statusEnum: OrderStatus | undefined;

    if (statusParam) {
      if (!(statusParam.toUpperCase() in OrderStatus)) {
        return res.status(400).json({ error: 'Invalid order status' });
      }

      statusEnum =
        OrderStatus[statusParam.toUpperCase() as keyof typeof OrderStatus];
    }

    const ordersList = await orders.getOrdersWithTracking(userid, statusEnum, page, limit);

    return res.status(200).json({
      success: true,
      message: 'Orders fetched successfully',
      data: ordersList.items,
      pagination: {
        page,
        limit,
        total: ordersList.total,
        totalPages: Math.ceil(ordersList.total / limit),
      }
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
  // validate(createMultiorderSchema),
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
        extraDistance,
        idempotencyKey
      } = req.body;



      console.log('products', req.body);

      if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ error: 'Products array is required' });
      }

      console.log('elements of orderrecived $ $', orderReceived);


      const newOrder = await orders.createMultiOrder({
        userId,
        locationId: location.id,
        products,
        phoneNumber,
        orderReceived: orderReceived,
        paymentMethod,
        extraDistance,
        idempotencyKey
      }



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


//
// ----------------------------------------------------
// ADMIN: GET ALL ORDERS (OPTIONAL STATUS FILTERS)
// ----------------------------------------------------
router.get('/admin/orders', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const statusParam = req.query.status as string | undefined;
    const paymentStatusParam = req.query.paymentStatus as string | undefined;
    const deliveryStatusParam = req.query.deliveryStatus as string | undefined;

    let statusEnum: OrderStatus | undefined;
    let paymentStatusEnum: PaymentStatus | undefined;
    let deliveryStatusEnum: DeliveryStatus | undefined;

    if (statusParam) {
      if (!(statusParam.toUpperCase() in OrderStatus)) {
        return res.status(400).json({ error: 'Invalid order status' });
      }
      statusEnum = OrderStatus[statusParam.toUpperCase() as keyof typeof OrderStatus];
    }

    if (paymentStatusParam) {
      if (!(paymentStatusParam.toUpperCase() in PaymentStatus)) {
        return res.status(400).json({ error: 'Invalid payment status' });
      }
      paymentStatusEnum = PaymentStatus[paymentStatusParam.toUpperCase() as keyof typeof PaymentStatus];
    }

    if (deliveryStatusParam) {
      if (!(deliveryStatusParam.toUpperCase() in DeliveryStatus)) {
        return res.status(400).json({ error: 'Invalid delivery status' });
      }
      deliveryStatusEnum = DeliveryStatus[deliveryStatusParam.toUpperCase() as keyof typeof DeliveryStatus];
    }

    const ordersList = await orders.getAllOrders(statusEnum, paymentStatusEnum, deliveryStatusEnum);

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
// ADMIN: UPDATE ORDER STATUS
// ----------------------------------------------------
router.patch('/admin/orders/:id/status', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const paymentStatusParam = req.body.paymentStatus as string | undefined;
    const deliveryStatusParam = req.body.deliveryStatus as string | undefined;
    const deliveryDateParam = req.body.deliveryDate as string | undefined;

    let paymentStatusEnum: PaymentStatus | undefined;
    let deliveryStatusEnum: DeliveryStatus | undefined;
    let deliveryDate: Date | null | undefined;

    if(!id) {
      return res.status(400).json({ error: 'Order ID is required' });
      }

    if (paymentStatusParam) {
      if (!(paymentStatusParam.toUpperCase() in PaymentStatus)) {
        return res.status(400).json({ error: 'Invalid payment status' });
      }
      paymentStatusEnum = PaymentStatus[paymentStatusParam.toUpperCase() as keyof typeof PaymentStatus];
    }

    if (deliveryStatusParam) {
      if (!(deliveryStatusParam.toUpperCase() in DeliveryStatus)) {
        return res.status(400).json({ error: 'Invalid delivery status' });
      }
      deliveryStatusEnum = DeliveryStatus[deliveryStatusParam.toUpperCase() as keyof typeof DeliveryStatus];
    }

    if (deliveryDateParam !== undefined) {
      const parsedDate = new Date(deliveryDateParam);
      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'Invalid delivery date' });
      }
      deliveryDate = parsedDate;
    }

    await orders.updateOrderStatus(id, paymentStatusEnum, deliveryStatusEnum, deliveryDate);

    return res.status(200).json({
      success: true,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    next(error);
  }
});
  







export { router as OrderRouter };
