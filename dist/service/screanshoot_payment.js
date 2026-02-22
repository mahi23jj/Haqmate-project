// import type { Request, Response, NextFunction } from "express";
// import { supabase } from '../config.js';
// // import { OrderStatus } from '../enums/order-status';
// // import { OrderModel } from '../models/order.model';
// import { PrismaClient, type ExtraDistanceLevel, OrderStatus, DeliveryStatus, PaymentStatus, TrackingType } from '@prisma/client';
// import { NotFoundError } from '../utils/apperror.js';
// import { DeliveryServiceImpl } from './delivery.js';
// import { prisma } from '../prisma.js';
// export const submitPaymentScreenshot = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const { orderId } = req.params;
//     if (!orderId) {
//       return res.status(400).json({
//         message: 'Order ID is required'
//       })
//     }
//     if (!req.file) {
//       return res.status(400).json({
//         message: 'Payment screenshot is required'
//       });
//     }
//     const order = await prisma.order.findUnique(
//       {
//         where: { id: orderId },
//       }
//     );
//     if (!order) {
//       return res.status(404).json({
//         message: 'Order not found'
//       });
//     }
//     if (order.status !== OrderStatus.PENDING_PAYMENT) {
//       return res.status(400).json({
//         message: 'Order is not awaiting payment'
//       });
//     }
//     // Generate unique file name
//     const fileExt = req.file.originalname.split('.').pop();
//     const fileName = `payments/${orderId}-${Date.now()}.${fileExt}`;
//     // Upload to Supabase Storage
//     const { error: uploadError } = await supabase.storage
//       .from('payment-screenshots')
//       .upload(fileName, req.file.buffer, {
//         contentType: req.file.mimetype,
//         upsert: false
//       });
//     if (uploadError) {
//       throw uploadError;
//     }
//     // Get public URL
//     const { data } = supabase.storage
//       .from('payment-screenshots')
//       .getPublicUrl(fileName);
//     // Update order
//     // order.paymentProofUrl = data.publicUrl;
//     // order.paymentStatus = PaymentStatus.SCREENSHOT_SENT;
//     await prisma.order.update({
//       where: { id: orderId },
//       data: {
//         paymentProofUrl: data.publicUrl,
//         paymentStatus: PaymentStatus.SCREENSHOT_SENT
//       }
//     })
//     return res.status(200).json({
//       message: 'Payment submitted successfully. Awaiting admin confirmation.',
//       order
//     });
//   } catch (error: any) {
//     return res.status(500).json({
//       message: error.message || 'Internal server error'
//     });
//   }
// };
import { OrderStatus, PaymentStatus, TrackingType, DeliveryStatus } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/apperror.js';
import { cloudinary } from '../config.js';
import { prisma } from '../prisma.js';
import { OrderServiceImpl } from './orderservice.js';
export class mannualpaymentServiceImpl {
    orderServiceImpl = new OrderServiceImpl();
    // --------------------------------
    // Submit payment screenshot
    // --------------------------------
    async submitPaymentScreenshot(orderId, file) {
        if (!orderId) {
            throw new Error('Order ID is required');
        }
        if (!file) {
            throw new Error('Payment screenshot is required');
        }
        const order = await prisma.order.findUnique({
            where: { id: orderId }
        });
        if (!order) {
            throw new NotFoundError('Order not found');
        }
        if (order.status !== OrderStatus.PENDING_PAYMENT) {
            throw new Error('Order is not awaiting payment');
        }
        if (order.paymentMethod !== "Send Screenshot") {
            throw new Error('you are not allowed to upload screenshot');
        }
        // Generate file name
        const fileName = `${orderId}-${Date.now()}`;
        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({
                folder: 'payment-screenshots',
                public_id: fileName,
                resource_type: 'image',
            }, (error, result) => {
                if (error || !result) {
                    reject(error ?? new Error('Cloudinary upload failed'));
                    return;
                }
                resolve(result);
            });
            stream.end(file.buffer);
        });
        const updated = await prisma.order.update({
            where: { id: orderId },
            data: {
                paymentProofUrl: uploadResult.secure_url,
                paymentStatus: PaymentStatus.SCREENSHOT_SENT,
            }
        });
        //this\.orderServiceImpl\.invalidateOrdersCache\(\);
        return updated;
    }
    // --------------------------------
    // Cancel order (already existing)
    // --------------------------------
    //  approve a screenshot
    async approvePayment(orderId) {
        if (!orderId) {
            throw new ValidationError('Order ID is required');
        }
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order)
            throw new NotFoundError('Order not found');
        //this\.orderServiceImpl\.invalidateOrdersCache\(\);
        return prisma.order.update({
            where: { id: orderId },
            data: {
                paymentStatus: PaymentStatus.CONFIRMED,
                status: OrderStatus.TO_BE_DELIVERED,
            }
        });
    }
    async rejectPayment(orderId, reason) {
        if (!orderId) {
            throw new ValidationError('Order ID is required');
        }
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order)
            throw new NotFoundError('Order not found');
        //this\.orderServiceImpl\.invalidateOrdersCache\(\);
        return prisma.order.update({
            where: { id: orderId },
            data: {
                paymentStatus: PaymentStatus.DECLINED,
                status: OrderStatus.CANCELLED,
                cancelReason: "Payment screenshot rejected by admin"
            }
        });
    }
    async scheduleDelivery(orderId, deliveryDate) {
        if (!orderId) {
            throw new ValidationError('Order ID is required');
        }
        const parsedDate = new Date(deliveryDate);
        if (Number.isNaN(parsedDate.getTime())) {
            throw new ValidationError('Valid deliveryDate is required');
        }
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order)
            throw new NotFoundError('Order not found');
        if (order.paymentStatus !== PaymentStatus.CONFIRMED || order.status !== OrderStatus.TO_BE_DELIVERED || order.deliveryStatus !== DeliveryStatus.NOT_SCHEDULED) {
            throw new ValidationError('Order is not awaiting delivery scheduling');
        }
        //this\.orderServiceImpl\.invalidateOrdersCache\(\);
        return prisma.order.update({
            where: { id: orderId },
            data: {
                deliveryDate: parsedDate,
                paymentStatus: PaymentStatus.CONFIRMED,
                status: OrderStatus.TO_BE_DELIVERED,
                deliveryStatus: DeliveryStatus.SCHEDULED,
            }
        });
    }
}
//# sourceMappingURL=screanshoot_payment.js.map