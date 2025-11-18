import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../utils/apperror.js';
import type { Product } from './productservice.js';
const prisma = new PrismaClient();


export interface Feedback {
    orderid: string;
    userId: string;
    comment: string;
    rating: number;
}

export interface FeedbackResponse {
    id: string;
    rating: number | null;
    message: string | null;
    submittedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    orderId: string;
}

export interface FeedbackFilter {
    tefftype?: string;
    teffquality?: string;
    teffpackaging?: string;
}



export interface FeedbackService {
    createFeedback(feedback: Feedback): Promise<FeedbackResponse>;
    // getFeedbacks(): Promise<Feedback[]>;
    // getFeedbackById(id: number): Promise<Feedback>;
    filterFeedbacks(filters: FeedbackFilter): Promise<any[]>;
    averagerating(): Promise<any>;

}

export class FeedbackServiceimp implements FeedbackService {
    async createFeedback(feedback: Feedback): Promise<FeedbackResponse> {
        try {
            return await prisma.$transaction(async (tx) => {
                // 1️⃣ Create feedback
                const newFeedback = await tx.feedback.create({
                    data: {
                        orderId: feedback.orderid,
                        userId: feedback.userId,
                        message: feedback.comment,
                        rating: feedback.rating,
                        submittedAt: new Date(),
                    },
                });

                // 2️⃣ Fetch all order items for this order
                const orderItems = await tx.orderItem.findMany({
                    where: { orderId: feedback.orderid },
                    include: { product: true },
                });

                // 3️⃣ Prepare bulk insert data for FeedbackAnalytics
                const analyticsData = orderItems.map((item) => ({
                    feedbackId: newFeedback.id,
                    teffTypeId: item.product.teffTypeId,
                    qualityId: item.product.qualityId || null,
                    packagingId: item.packagingId,
                    rating: feedback.rating,
                }));

                // 4️⃣ Bulk insert FeedbackAnalytics
                if (analyticsData.length > 0) {
                    await tx.feedbackAnalytics.createMany({
                        data: analyticsData,
                    });
                }

                // 5️⃣ Return the created feedback
                return newFeedback;
            });
        } catch (error) {
            console.error("❌ Error creating feedback:", error);
            throw new Error("Error creating feedback");
        }
    }


    async filterFeedbacks(filters: FeedbackFilter) {
        try {
            // 1️⃣ Resolve optional teffType and teffQuality IDs
            const [teffType, teffQuality] = await Promise.all([
                filters.tefftype
                    ? prisma.teffType.findUnique({ where: { name: filters.tefftype } })
                    : Promise.resolve(null),
                filters.teffquality
                    ? prisma.teffQuality.findUnique({ where: { name: filters.teffquality } })
                    : Promise.resolve(null),
            ]);

            if (filters.tefftype && !teffType) {
                throw new Error(`TeffType '${filters.tefftype}' not found`);
            }

            if (filters.teffquality && !teffQuality) {
                throw new Error(`TeffQuality '${filters.teffquality}' not found`);
            }

            // 2️⃣ Build dynamic filter
            const whereClause: any = {};
            if (teffType) whereClause.teffTypeId = teffType.id;
            if (teffQuality) whereClause.qualityId = teffQuality?.id;
            if (filters.teffpackaging) whereClause.packagingId = filters.teffpackaging;

            // 3️⃣ Query FeedbackAnalytics
            const feedbackAnalytics = await prisma.feedbackAnalytics.findMany({
                where: whereClause,

                include: {
                    feedback: {
                        include: {
                            user: true,
                        }
                    },
                },
            });

            return feedbackAnalytics;
        } catch (error) {
            console.error(error);
            throw new Error("Error getting feedbacks");
        }
    }

    async averagerating(): Promise<any> {
        try {
            // if both teffquality and tefftype are exist aggrigate by both else only by tefftype

            const stats = await prisma.feedbackAnalytics.groupBy({
                by: ['teffTypeId', 'qualityId'],
                _avg: { rating: true },
                _count: { rating: true },
            });

            const result = await Promise.all(stats.map(async (s) => {
                const teffType = await prisma.teffType.findUnique({ where: { id: s.teffTypeId } });
                const teffQuality = s.qualityId
                    ? await prisma.teffQuality.findUnique({ where: { id: s.qualityId } })
                    : null;

                return {
                    teffType: teffType?.name,
                    teffQuality: teffQuality?.name || null,
                    avgRating: s._avg.rating,
                    count: s._count.rating,
                };
            }));
        } catch (error) {
            console.error(error);
            throw new Error("Error getting feedbacks");

        }
    }


}