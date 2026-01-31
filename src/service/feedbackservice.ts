
import { PrismaClient } from '@prisma/client';

import { prisma } from '../prisma.js';
import { redisClient } from '../redis_test.js';

export interface Feedback {
  productId: string;
  userId: string;
  comment: string;
  rating: number;
}

export interface FeedbackResponse {
    id: string;
    userId: string;
    productid: string;
    rating: number | null;
    message: string | null;
    submittedAt: Date | null;
    
}


export interface FeedbackService {
  createFeedback(feedback: Feedback): Promise<FeedbackResponse>;
  getFeedbackByProduct(productId: string , page?: number, limit?: number): Promise<any>;
  gettopfeedbacks(productId: string, userId?: string): Promise<any>;
}

export class FeedbackServiceImpl implements FeedbackService {
  
  // ✅ Create a feedback for a specific product
async createFeedback(feedback: Feedback): Promise<FeedbackResponse> {
  try {
    // Check if feedback already exists
    const existing = await prisma.feedback.findUnique({
      where: {
        userId_productid: {
          userId: feedback.userId,
          productid: feedback.productId
        }
      }
    });

    if (existing) {
       const error: any = new Error("You have already submitted a review for this product.");
        error.statusCode = 409; // Conflict
        throw error;
    }

    // Create if not exist
    const newFeedback = await prisma.feedback.create({
      data: {
        productid: feedback.productId,
        userId: feedback.userId,
        message: feedback.comment,
        rating: feedback.rating,
        submittedAt: new Date(),
      },
    });

   
    await redisClient.del(`product:${feedback.productId}`);
    
    return newFeedback;

  } catch (error) {
    console.error("❌ Error creating feedback:", error);
     throw error;
}

}



    // ✅ Get all feedbacks for a product + stats
    async getFeedbackByProduct(productId: string, page: number, limit: number): Promise<any> {
      try {
        // 1️⃣ Fetch all feedbacks for the product
        const feedbacks = await prisma.feedback.findMany({
          where: { productid: productId },
          orderBy: { submittedAt: 'desc' }, // latest first
          select: {
            id: true,
            productid: true,
            // include all use information
            user: {
              select: {
                id: true,
                name: true,
              }
            },
            message: true,
            rating: true,
            submittedAt: true,
          },
          skip: (page - 1) * limit,
          take: limit,
        });

        // 2️⃣ Aggregate average rating & total ratings
        const stats = await prisma.feedback.aggregate({
          where: { productid: productId },
          _avg: { rating: true },
          _count: { rating: true },
        });

        return {
          feedback:feedbacks,
          averageRating: stats._avg.rating ?? null,
          totalRatings: stats._count.rating,
        };
      } catch (error) {
        console.error('❌ Error getting feedbacks:', error);
        throw new Error('Error getting feedbacks');
      }
    }


  async gettopfeedbacks(Productid : string, userId?: string): Promise<any> {
    try {
      // Fetch top 2 feedbacks with highest ratings
      const topFeedbacks = await prisma.feedback.findMany({
        where: { productid : Productid},
        orderBy: [
        {  rating: 'desc' },
        { submittedAt: 'desc' }
        ],
        take: 2,
        select: {
          id: true,
          user:{
            select: {
              id: true,
              name: true,
            }
          },
          rating: true,
          message: true,
          submittedAt: true,
        },
       
      });

      // Fetch requesting user's feedback (if exists) so it can be appended as a 3rd item
      let userFeedback = null;
      if (userId) {
        userFeedback = await prisma.feedback.findFirst({
          where: { productid: Productid, userId },
          select: {
            id: true,
            user: {
              select: { id: true, name: true }
            },
            rating: true,
            message: true,
            submittedAt: true,
          },
        });
      }

            const stats = await prisma.feedback.aggregate({
        where: { productid: Productid },
        _avg: { rating: true },
        _count: { rating: true },
      });

     const feedback = [...topFeedbacks];

    if (
      userFeedback &&
      !feedback.some((fb) => fb.user.id === userFeedback.user.id)
    ) {
      feedback.push(userFeedback);
    }

    return {
      feedback,
      averageRating: stats._avg.rating ?? 0,
      totalRatings: stats._count.rating ?? 0,
    };
    } catch (error) {
      console.error('❌ Error fetching top feedbacks:', error);
      throw new Error('Error fetching top feedbacks');
    }
  }



}




// import { PrismaClient } from '@prisma/client';
// import { NotFoundError } from '../utils/apperror.js';
// import type { Product } from './productservice.js';
// import { prisma } from '../prisma.js';


// export interface Feedback {
//     productid: string;
//     userId: string;
//     comment: string;
//     rating: number;
// }

// export interface FeedbackResponse {
//     id: string;
//     rating: number | null;
//     message: string | null;
//     submittedAt: Date | null;
//     createdAt: Date;
//     updatedAt: Date;
//     userId: string;
//     productid: string;
// }

// export interface FeedbackFilter {
//     tefftype?: string;
//     teffquality?: string;
//     teffpackaging?: string;
// }



// export interface FeedbackService {
//     createFeedback(feedback: Feedback): Promise<FeedbackResponse>;
//     // getFeedbacks(): Promise<Feedback[]>;
//     // getFeedbackById(id: number): Promise<Feedback>;
//     getfeedbackbyproduct(id: String): Promise<any[]>;
//     averagerating(): Promise<any>;

// }

// export class FeedbackServiceimp implements FeedbackService {
//     async createFeedback(feedback: Feedback): Promise<FeedbackResponse> {
//         try {
//             return await prisma.$transaction(async (tx) => {
//                 // 1️⃣ Create feedback
//                 const newFeedback = await tx.feedback.create({
//                     data: {
//                         productid : feedback.productid,
//                         userId: feedback.userId,
//                         message: feedback.comment,
//                         rating: feedback.rating,
//                         submittedAt: new Date(),
//                     },
//                 });


//                 return newFeedback;
//             });
//         } catch (error) {
//             console.error("❌ Error creating feedback:", error);
//             throw new Error("Error creating feedback");
//         }
//     }


//     async getfeedbackbyproduct(id: String) {
//         try {

//          const feedbacks = prisma.feedback.findMany({
//                 where: {
//                     productid : id

//                 }
//          })

//          const stats = await prisma.feedback.groupBy({
//               by : ['productid'],
//               _avg: {
//                   rating: true
//               },
//               _count : {
//                 // number of people who rate 
//                   rating : true
//               }
//          })


//             return {
//                 ...feedbacks,
                
            
            
//             };


//         } catch (error) {
//             console.error(error);
//             throw new Error("Error getting feedbacks");
//         }
//     }

//     async averagerating(): Promise<any> {
//         try {
//             // if both teffquality and tefftype are exist aggrigate by both else only by tefftype

//             const stats = await prisma.feedbackAnalytics.groupBy({
//                 by: ['teffTypeId', 'qualityId'],
//                 _avg: { rating: true },
//                 _count: { rating: true },
//             });

//             const result = await Promise.all(stats.map(async (s) => {
//                 const teffType = await prisma.teffType.findUnique({ where: { id: s.teffTypeId } });
//                 const teffQuality = s.qualityId
//                     ? await prisma.teffQuality.findUnique({ where: { id: s.qualityId } })
//                     : null;

//                 return {
//                     teffType: teffType?.name,
//                     teffQuality: teffQuality?.name || null,
//                     avgRating: s._avg.rating,
//                     count: s._count.rating,
//                 };
//             }));
//         } catch (error) {
//             console.error(error);
//             throw new Error("Error getting feedbacks");

//         }
//     }


// }