import type { Request, Response, NextFunction } from "express";
import { supabase } from '../config.js';
// import { OrderStatus } from '../enums/order-status';
// import { OrderModel } from '../models/order.model';


import { PrismaClient, type ExtraDistanceLevel, OrderStatus, DeliveryStatus, PaymentStatus, TrackingType } from '@prisma/client';
import { NotFoundError } from '../utils/apperror.js';
import { DeliveryServiceImpl } from './delivery.js';

const prisma = new PrismaClient();

export const submitPaymentScreenshot = async (
  req: Request,
  res: Response
) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        message: 'Order ID is required'
      })
    }

    if (!req.file) {
      return res.status(400).json({
        message: 'Payment screenshot is required'
      });
    }

    const order = await prisma.order.findUnique(
      {
        where: { id: orderId },
      }
    );

    if (!order) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      return res.status(400).json({
        message: 'Order is not awaiting payment'
      });
    }

    // Generate unique file name
    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `payments/${orderId}-${Date.now()}.${fileExt}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('payment-screenshots')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data } = supabase.storage
      .from('payment-screenshots')
      .getPublicUrl(fileName);

    // Update order
    // order.paymentProofUrl = data.publicUrl;
    // order.paymentStatus = PaymentStatus.SCREENSHOT_SENT;


    

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentProofUrl: data.publicUrl,
        paymentStatus: PaymentStatus.SCREENSHOT_SENT
      }
    })


    return res.status(200).json({
      message: 'Payment submitted successfully. Awaiting admin confirmation.',
      order
    });



  } catch (error: any) {
    return res.status(500).json({
      message: error.message || 'Internal server error'
    });
  }
};
