
// import { NotFoundError } from '../utils/apperror.js';
// import { DeliveryServiceImpl, type ExtraDistanceLevel } from './delivery.js';
// import type { Product } from './telebirr_productservice.js';

// import { PrismaClient } from '@prisma/client';



// // import { NotFoundError } from "../errors/NotFoundError";
// // import { Status, ExtraDistanceLevel } from "@prisma/client";
// const prisma = new PrismaClient();

// export interface OrderItemInput {
//     productId: string;
//     quantity?: number;  // optional, default to 1
//     packagingsize: number;
// }


// export enum Status {
//     PENDING_PAYMENT = 'PENDING_PAYMENT',
//     TO_BE_DELIVERED = 'TO_BE_DELIVERED',    // Order is ongoing (payment or delivery)
//     COMPLETED = 'COMPLETED',
//     CANCELLED = 'cancelled',
// }

// export interface OrderResponse {
//     id: string;
//     userId: string;
//     phoneNumber: string;
//     location: string;
//     totalAmount: number;
//     status: 'pending' | 'failed' | 'paid' | 'delivered' | 'completed' | 'cancelled' | 'refunded';
//     createdAt: Date;
//     updatedAt: Date;
//     items: {
//         id: string;
//         quantity: number;
//         price: number;
//         product: {
//             name: string;
//         };
//         packagingsize: number;
//     }[];
// }


// export const ORDER_TRACKING_STEPS = [
//   { status: "pending_payment", title: "Order Placed" },
//   { status: "paid", title: "Payment Confirmed" },
//   { status: "scheduled", title: "Scheduled for Delivery" },
//   { status: "out_for_delivery", title: "Out for Delivery" },
//   { status: "delivered", title: "Delivered" },
//   { status: "completed", title: "Completed" }
// ] as const;



// export interface OrderService {
//     cancelOrder(id: string): Promise<void>;
//     getOrdersWithTracking(status?: Status): Promise<any[]>;
//     getordersdetail(orderid: string): Promise<any>;
//     createMultiOrder({
//         userId,
//         products,
//         locationId,
//         phoneNumber,
//         orderReceived,
//         paymentMethod,
//         extraDistance
//     }: {
//         userId: string;
//         products: OrderItemInput[];
//         locationId: string;  // IMPORTANT: this is areaId
//         phoneNumber: string;
//         orderReceived: string;
//         paymentMethod: string;
//         extraDistance?: ExtraDistanceLevel;
//     }): Promise<any>;

//    /*  createordertraking(orderid: string): Promise<void>;
//     updateordertraking(orderid: string, status: Status): Promise<void>; */
// }




// export class OrderServiceImpl {

//     // -------------------------------------------------------
//     // 1. Get Orders with Tracking
//     // -------------------------------------------------------
//     async getOrdersWithTracking(status?: Status) {
//         const orders = await prisma.order.findMany({
//             where: status ? { status } : {},
//             include: {
//                 items: {
//                     include: {
//                         product: {
//                             select: {
//                                 id: true,
//                                 name: true,
//                                 images: { take: 1, select: { url: true } }
//                             }
//                         }
//                     }
//                 },
//                 orderTrackings: {
//                     orderBy: { createdAt: "asc" },
//                     select: { status: true, title: true, timestamp: true }
//                 }
//             },
//             orderBy: { createdAt: "desc" }
//         });

//         return orders.map(o => ({
//             id: o.id,
//             totalAmount: o.totalAmount,
//             status: o.status,
//             merchantOrderId: o.merchOrderId,
//             createdAt: o.createdAt,
//             updatedAt: o.updatedAt,
//             items: o.items.map(it => ({
//                 product: {
//                     id: it.product.id,
//                     name: it.product.name,
//                     images: it.product.images
//                 }
//             })),
//             tracking: o.orderTrackings
//         }));
//     }


//     // -------------------------------------------------------
//     // 2. Get Order Detail
//     // -------------------------------------------------------
//     async getordersdetail(orderId: string) {
//         const order = await prisma.order.findUnique({
//             where: { id: orderId },
//             include: {
//                 items: {
//                     include: {
//                         product: {
//                             select: {
//                                 name: true,
//                                 images: { take: 1, select: { url: true } }
//                             }
//                         }
//                     }
//                 },
//                 orderTrackings: {
//                     orderBy: { createdAt: "asc" },
//                     select: { status: true, title: true, timestamp: true }
//                 },
//                 area: { select: { name: true } }
//             }
//         });

//         if (!order) throw new NotFoundError("Order not found");

//         return {
//             id: order.id,
//             userId: order.userId,
//             phoneNumber: order.phoneNumber,
//             location: order.area?.name,
//             deliveryFee: order.totalDeliveryFee,
//             totalAmount: order.totalAmount,
//             status: order.status,
//             createdAt: order.createdAt,
//             updatedAt: order.updatedAt,
//             merchantOrderId: order.merchOrderId,
//             items: order.items.map(i => ({
//                 id: i.id,
//                 quantity: i.quantity,
//                 price: i.price,
//                 packaging: i.packaging,
//                 product: {
//                     name: i.product.name,
//                     images: i.product.images
//                 }
//             })),
//             tracking: order.orderTrackings
//         };
//     }


//     // -------------------------------------------------------
//     // 3. Get Orders by User
//     // -------------------------------------------------------
//     // async getOrdersByUserId(userId: string): Promise<OrderResponse[]> {
//     //     return prisma.order.findMany({
//     //         where: { userId },
//     //         include: {
//     //             items: {
//     //                 include: { product: true }
//     //             }
//     //         },
//     //         orderBy: { createdAt: "desc" }
//     //     });
//     // }


//     // -------------------------------------------------------
//     // 4. Cancel Order
//     // -------------------------------------------------------
//     async cancelOrder(id: string) {
//         const order = await prisma.order.findUnique({ where: { id } });

//         if (!order) throw new NotFoundError("Order not found");
//         if (order.status === Status.CANCELLED)
//             throw new Error("Order already cancelled");

//         await prisma.order.update({
//             where: { id },
//             data: { status: Status.CANCELLED }
//         });
//     }


//     // -------------------------------------------------------
//     // 5. Create Multi Order
//     // -------------------------------------------------------
//     async createMultiOrder(
//         userId: string,
//         products: OrderItemInput[],
//         locationId: string, // IMPORTANT: this is areaId
//         phoneNumber: string,
//         orderReceived: string,
//         paymentMethod: string,
//         extraDistance?: ExtraDistanceLevel,

//         /*    {
//            } */

//     ) {

//         const deliveryService = new DeliveryServiceImpl();
//         const deliveryInfo = await deliveryService.deliverycharge(locationId, extraDistance);
//         const deliveryFee = deliveryInfo.totalFee;

//         // Fetch all products using ONE query
//         const productIds = products.map(p => p.productId);
//         const dbProducts = await prisma.teffProduct.findMany({
//             where: { id: { in: productIds } },
//             select: { id: true, pricePerKg: true }
//         });

//         let total = deliveryFee;
//         const orderItems = [];

//         for (const item of products) {
//             const prod = dbProducts.find(p => p.id === item.productId);
//             if (!prod) throw new Error("Invalid product");

//             const qty = item.quantity ?? 1;
//             const price = prod.pricePerKg * qty * item.packagingsize;

//             total += price;

//             orderItems.push({
//                 productId: prod.id,
//                 quantity: qty,
//                 packaging: item.packagingsize,
//                 price
//             });
//         }

//         // Create order
//         const order = await prisma.order.create({
//             data: {
//                 userId,
//                 phoneNumber,
//                 areaId: locationId,
//                 orderrecived: orderReceived,
//                 paymentMethod,
//                 totalDeliveryFee: deliveryFee,
//                 extraDistanceLevel: extraDistance ?? null,
//                 totalAmount: total,
//                 merchOrderId: "MORD" + Date.now(),
//                 status: Status.PENDING_PAYMENT,

//                 // status: Status.PENDING_PAYMENT,


//                 items: { create: orderItems }
//             },
//             select: {
//                 id: true,
//                 userId: true,
//                 totalAmount: true,
//                 status: true,
//                 areaId: true,
//                 phoneNumber: true,
//                 createdAt: true,
//                 updatedAt: true,
//                 items: true
//             }
//         });

//         // Create initial tracking
//        /*  await prisma.orderTracking.create({
//             data: {
//                 orderId: order.id,
//                 status: Status.PENDING,
//                 title: "Order Placed",
//                 timestamp: new Date()
//             }
//         });
//  */

//     await prisma.orderTracking.createMany({
//     data: ORDER_TRACKING_STEPS.map(step => ({
//       orderId,
//       status: step.status,
//       title: step.title,
//       timestamp: step.status === "pending_payment" ? new Date() : null
//     }))
//   });
//         return order;
//     }
// }





// // await prisma.$transaction([
// //   prisma.order.update({
// //     where: { id: orderId },
// //     data: { status: OrderStatus.PAID }
// //   }),
// //   prisma.orderTracking.update({
// //     where: {
// //       orderId_status: {
// //         orderId,
// //         status: OrderStatus.PAID
// //       }
// //     },
// //     data: { timestamp: new Date() }
// //   })
// // ]);


import { PrismaClient, type ExtraDistanceLevel, OrderStatus, DeliveryStatus, PaymentStatus, TrackingType } from '@prisma/client';
import { NotFoundError } from '../utils/apperror.js';
import { DeliveryServiceImpl } from './delivery.js';

const prisma = new PrismaClient();

export interface OrderItemInput {
    productId: string;
    quantity?: number; // optional, default to 1
    packagingsize: number;
}

export interface OrderResponse {
    id: string;
    userId: string;
    phoneNumber: string;
    location: string;
    totalAmount: number;
    status: OrderStatus;
    createdAt: Date;
    updatedAt: Date;
    items: {
        id: string;
        quantity: number;
        price: number;
        packaging: number;
        product: {
            id: string;
            name: string;
            images?: { url: string }[];
        };
    }[];
    tracking: {
        status: string;
        title: string;
        timestamp: Date | null;
    }[];
}



export class OrderServiceImpl {

    // ---------------------------
    // 1. Get Orders with Tracking
    // ---------------------------
    async getOrdersWithTracking(status?: OrderStatus): Promise<OrderResponse[]> {
        const orders = await prisma.order.findMany({
            where: status ? { status } : {},
            include: {
                items: {
                    include: {
                        product: {
                            select: { id: true, name: true, images: { take: 1, select: { url: true } } }
                        }
                    }
                },
                orderTrackings: {
                    orderBy: { createdAt: 'asc' },
                    select: { type: true, title: true, timestamp: true }
                },
                area: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return orders.map(o => ({
            id: o.id,
            userId: o.userId,
            phoneNumber: o.phoneNumber,
            location: o.area?.name ?? '',
            totalAmount: o.totalAmount,
            status: o.status,
            createdAt: o.createdAt,
            updatedAt: o.updatedAt,
            items: o.items.map(it => ({
                id: it.id,
                quantity: it.quantity,
                price: it.price,
                packaging: it.packaging,
                product: {
                    id: it.product.id,
                    name: it.product.name,
                    images: it.product.images
                }
            })),
            tracking: o.orderTrackings.map(t => ({

                status: t.type,
                timestamp: t.timestamp,
                title: t.title

            }))
        }));
    }

    // ---------------------------
    // 2. Get Order Detail
    // ---------------------------
    async getOrderDetail(orderId: string): Promise<OrderResponse> {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: {
                        product: {
                            select: { id: true, name: true, images: { take: 1, select: { url: true } } }
                        }
                    }
                },
                orderTrackings: {
                    orderBy: { createdAt: 'asc' },
                    select: { type: true, title: true, timestamp: true }
                },
                area: { select: { name: true } }
            }
        });

        if (!order) throw new NotFoundError('Order not found');

        return {
            id: order.id,
            userId: order.userId,
            phoneNumber: order.phoneNumber,
            location: order.area?.name ?? '',
            totalAmount: order.totalAmount,
            status: order.status,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            items: order.items.map(i => ({
                id: i.id,
                quantity: i.quantity,
                price: i.price,
                packaging: i.packaging,
                product: {
                    id: i.product.id,
                    name: i.product.name,
                    images: i.product.images
                }
            })),
            tracking: order.orderTrackings.map(t => ({

                status: t.type,
                timestamp: t.timestamp,
                title: t.title

            }))
        };
    }

    // ---------------------------
    // 3. Cancel Order
    // ---------------------------
    async cancelOrder(orderId: string): Promise<void> {
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) throw new NotFoundError('Order not found');
        if (order.status === OrderStatus.CANCELLED) throw new Error('Order already cancelled');

        await prisma.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.CANCELLED }
        });

        // Add tracking
        await prisma.orderTracking.create({
            data: {
                orderId,
                type: TrackingType.CANCELLED,
                message: 'user requested to cancel order',
                title: 'Order Cancelled',
                timestamp: new Date()
            }
        });
    }

    // ---------------------------
    // 4. Create Multi Order
    // ---------------------------
    async createMultiOrder(
        userId: string,
        products: OrderItemInput[],
        locationId: string, // areaId
        phoneNumber: string,
        orderReceived: string,
        paymentMethod: string,
        extraDistance?: ExtraDistanceLevel
    ): Promise<any> {

        const deliveryService = new DeliveryServiceImpl();
        const deliveryInfo = await deliveryService.deliverycharge(locationId);
        const deliveryFee = deliveryInfo.totalFee;

        // Fetch all products in one query
        const productIds = products.map(p => p.productId);
        const dbProducts = await prisma.teffProduct.findMany({
            where: { id: { in: productIds } },
            select: { id: true, pricePerKg: true }
        });

        let total = deliveryFee;
        const orderItemsData = [];

        for (const item of products) {
            const prod = dbProducts.find(p => p.id === item.productId);
            if (!prod) throw new Error('Invalid product');

            const qty = item.quantity ?? 1;
            const price = prod.pricePerKg * qty * item.packagingsize;
            total += price;

            orderItemsData.push({
                productId: prod.id,
                quantity: qty,
                packaging: item.packagingsize,
                price
            });
        }

        // Create order
        const order = await prisma.order.create({
            data: {
                userId,
                phoneNumber,
                areaId: locationId,
                orderrecived: orderReceived,
                paymentMethod,
                totalDeliveryFee: deliveryFee,
                extraDistanceLevel: extraDistance ?? null,
                totalAmount: total,
                merchOrderId: 'MORD' + Date.now(),
                status: OrderStatus.PENDING_PAYMENT,
                deliveryStatus: DeliveryStatus.NOT_SCHEDULED,
                paymentStatus: PaymentStatus.PENDING,
                items: { create: orderItemsData }
            },
            include: {
                items: {
                    include: {
                        product: { select: { id: true, name: true, images: { take: 1, select: { url: true } } } }
                    }
                }
            }
        });

        // Create initial tracking steps
      

        return {
            id: order.id,
            userId: order.userId,
            phoneNumber: order.phoneNumber,
            location: '', // can fetch area separately if needed
            totalAmount: order.totalAmount,
            status: order.status,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            items: order.items.map(it => ({
                id: it.id,
                quantity: it.quantity,
                price: it.price,
                packaging: it.packaging,
                product: it.product
            })),
          /*   tracking: ORDER_TRACKING_STEPS.map(step => ({
                status: step.status,
                title: step.title,
                timestamp: step.status === 'PENDING_PAYMENT' ? new Date() : null
            })) */
        };
    }
}
