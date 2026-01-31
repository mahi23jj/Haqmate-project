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
import type { Express } from 'express';
import multer from 'multer';
import { NotFoundError, ValidationError } from '../utils/apperror.js';
import { supabase } from '../config.js';

import { prisma } from '../prisma.js';
import { OrderServiceImpl } from './orderservice.js';

type MulterFile = Express.Multer.File;

export class mannualpaymentServiceImpl {

  orderServiceImpl = new OrderServiceImpl();

  // --------------------------------
  // Submit payment screenshot
  // --------------------------------
  async submitPaymentScreenshot(
    orderId: string,
    file: MulterFile
  ) {
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
    const fileExt = file.originalname.split('.').pop();
    const fileName = `payments/${orderId}-${Date.now()}.${fileExt}`;

    // Upload to Supabase
    const { error: uploadError } = await supabase.storage
      .from('payment-screenshots')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data } = supabase.storage
      .from('payment-screenshots')
      .getPublicUrl(fileName);

     


    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentProofUrl: data.publicUrl,
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
  async approvePayment(orderId: string) {
    if (!orderId) {
      throw new ValidationError('Order ID is required');
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError('Order not found');

   //this\.orderServiceImpl\.invalidateOrdersCache\(\);

    return prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: PaymentStatus.CONFIRMED,
        status: OrderStatus.TO_BE_DELIVERED,
      }
    });
  }

  async rejectPayment(orderId: string) {
    if (!orderId) {
      throw new ValidationError('Order ID is required');
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError('Order not found');


    //this\.orderServiceImpl\.invalidateOrdersCache\(\);


    return prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: PaymentStatus.DECLINED,
        status: OrderStatus.CANCELLED,
      }
    });
  }

  async scheduleDelivery(orderId: string, deliveryDate: string | Date) {
    if (!orderId) {
      throw new ValidationError('Order ID is required');
    }

    const parsedDate = new Date(deliveryDate);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new ValidationError('Valid deliveryDate is required');
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError('Order not found');

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

