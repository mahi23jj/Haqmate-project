import { Router } from 'express';
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
router.get('/', async (req, res, next) => {
    try {
        const userid = req.user;
        const statusParam = req.query.status;
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
        let statusEnum;
        if (statusParam) {
            if (!(statusParam.toUpperCase() in OrderStatus)) {
                return res.status(400).json({ error: 'Invalid order status' });
            }
            statusEnum =
                OrderStatus[statusParam.toUpperCase()];
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
    }
    catch (error) {
        next(error);
    }
});
//
// ----------------------------------------------------
// GET ORDER DETAIL
// ----------------------------------------------------
router.get('/:id', orderMiddleware, async (req, res, next) => {
    try {
        const order = req.order;
        const orderDetail = await orders.getOrderDetail(order.id);
        return res.status(200).json({
            success: true,
            message: 'Order detail fetched successfully',
            data: orderDetail
        });
    }
    catch (error) {
        next(error);
    }
});
//
// ----------------------------------------------------
// CREATE MULTI ORDER
// ----------------------------------------------------
router.post('/multi-create', locationMiddleware, 
// validate(createMultiorderSchema),
async (req, res, next) => {
    try {
        const userId = req.user;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const location = req.location;
        const { products, phoneNumber, orderReceived, paymentMethod, extraDistance, idempotencyKey } = req.body;
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
        });
        return res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: newOrder
        });
    }
    catch (error) {
        next(error);
    }
});
//
// ----------------------------------------------------
// CANCEL ORDER (PROPER HTTP VERB)
// ----------------------------------------------------
router.patch('/:id/cancel', orderMiddleware, async (req, res, next) => {
    try {
        const order = req.order;
        await orders.cancelOrder(order.id);
        return res.status(200).json({
            success: true,
            message: 'Order cancelled successfully'
        });
    }
    catch (error) {
        next(error);
    }
});
//
// ----------------------------------------------------
// ADMIN: GET ALL ORDERS (OPTIONAL STATUS FILTERS)
// ----------------------------------------------------
router.get('/admin/orders', requireAdmin, async (req, res, next) => {
    try {
        const statusParam = req.query.status;
        const paymentStatusParam = req.query.paymentStatus;
        const deliveryStatusParam = req.query.deliveryStatus;
        let statusEnum;
        let paymentStatusEnum;
        let deliveryStatusEnum;
        if (statusParam) {
            if (!(statusParam.toUpperCase() in OrderStatus)) {
                return res.status(400).json({ error: 'Invalid order status' });
            }
            statusEnum = OrderStatus[statusParam.toUpperCase()];
        }
        if (paymentStatusParam) {
            if (!(paymentStatusParam.toUpperCase() in PaymentStatus)) {
                return res.status(400).json({ error: 'Invalid payment status' });
            }
            paymentStatusEnum = PaymentStatus[paymentStatusParam.toUpperCase()];
        }
        if (deliveryStatusParam) {
            if (!(deliveryStatusParam.toUpperCase() in DeliveryStatus)) {
                return res.status(400).json({ error: 'Invalid delivery status' });
            }
            deliveryStatusEnum = DeliveryStatus[deliveryStatusParam.toUpperCase()];
        }
        const ordersList = await orders.getAllOrders(statusEnum, paymentStatusEnum, deliveryStatusEnum);
        return res.status(200).json({
            success: true,
            message: 'Orders fetched successfully',
            data: ordersList
        });
    }
    catch (error) {
        next(error);
    }
});
//
// ----------------------------------------------------
// ADMIN: UPDATE ORDER STATUS
// ----------------------------------------------------
router.patch('/admin/orders/:id/status', requireAdmin, async (req, res, next) => {
    try {
        const { id } = req.params;
        const paymentStatusParam = req.body.paymentStatus;
        const deliveryStatusParam = req.body.deliveryStatus;
        const deliveryDateParam = req.body.deliveryDate;
        let paymentStatusEnum;
        let deliveryStatusEnum;
        let deliveryDate;
        if (!id) {
            return res.status(400).json({ error: 'Order ID is required' });
        }
        if (paymentStatusParam) {
            if (!(paymentStatusParam.toUpperCase() in PaymentStatus)) {
                return res.status(400).json({ error: 'Invalid payment status' });
            }
            paymentStatusEnum = PaymentStatus[paymentStatusParam.toUpperCase()];
        }
        if (deliveryStatusParam) {
            if (!(deliveryStatusParam.toUpperCase() in DeliveryStatus)) {
                return res.status(400).json({ error: 'Invalid delivery status' });
            }
            deliveryStatusEnum = DeliveryStatus[deliveryStatusParam.toUpperCase()];
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
    }
    catch (error) {
        next(error);
    }
});
export { router as OrderRouter };
//# sourceMappingURL=orderroute.js.map