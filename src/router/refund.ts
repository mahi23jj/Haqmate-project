import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { OrderServiceImpl } from '../service/orderservice.js';
import { authMiddleware, requireAdmin } from '../middleware/authmiddleware.js';
import { locationMiddleware, orderMiddleware } from '../middleware/ordermiddleware.js';
import { validate } from '../middleware/validate.js';
import { createMultiorderSchema } from '../validation/order_validation.js';
import { OrderStatus, RefundStatus } from '@prisma/client';
import { RefundService } from '../service/refund.js';
import { prisma } from '../prisma.js';

const router = Router();
        const refundService = new RefundService();

// 🔐 All order routes require auth
router.use();


router.post('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orderId, reason, accountName, accountNumber } = req.body;
const userId = req.user as string | undefined; // Assuming auth middleware sets req.user to the authenticated user's ID

if (!userId) { 
    return res.status(401).json({ error: 'Unauthorized' }); 
}

// get phone number from user profile if not provided in request
const userphoneNumber = await prisma.user.findUnique({
    where: { id: userId },
    select: { phoneNumber: true },
}).then((user: { phoneNumber: any; } | null) => user?.phoneNumber);


        if (!orderId || !reason || !accountName || !accountNumber) {
            return res.status(400).json({ error: 'Missing required fields' });
        }


        const result = await refundService.processRefund(userId, orderId, reason, accountName, accountNumber, userphoneNumber);

        return res.status(200).json({
            success: true,
            message: 'Refund request processed successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
});


router.get('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
    const status  = (req.query.status as string ) ?? "" ;

    if (!status) {
        return res.status(400).json({ error: 'Status is required' });
    }

    // Convert status string to RefundStatus enum
    let statusEnum: RefundStatus | undefined;
    if (status.toUpperCase() in RefundStatus) {
        statusEnum = RefundStatus[status.toUpperCase() as keyof typeof RefundStatus];
    } else {
        return res.status(400).json({ error: 'Invalid refund status' });
    }

    const refundStatus = await refundService.getRefundRequests(statusEnum);

    return res.status(200).json({
        success: true,
        message: 'Refund status retrieved successfully',
        data: refundStatus
    });
    } catch (error) {
        next(error);
    }
});


// update refund status by admin
router.put('/:id/status', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refundId = req.params.id;
        const { status , reason} = req.body;

        if (!refundId || !status) {
            return res.status(400).json({ error: 'Refund ID and status are required' });
        }

        // Convert status string to RefundStatus enum
        let statusEnum: RefundStatus | undefined;
        if (status.toUpperCase() in RefundStatus) {
            statusEnum = RefundStatus[status.toUpperCase() as keyof typeof RefundStatus];
        } else {
            return res.status(400).json({ error: 'Invalid refund status' });
        }

        const updatedRefund = await refundService.updateRefundStatus(refundId, statusEnum, reason);

        return res.status(200).json({
            success: true,
            message: 'Refund status updated successfully',
            data: updatedRefund 
        });
    } catch (error) {
        next(error);
    }
}
)


export {router as refundrouter} ;