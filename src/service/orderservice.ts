
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

import { prisma } from '../prisma.js';

// const prisma = new PrismaClient();

export interface OrderItemInput {
    productId: string;
    quantity?: number; // optional, default to 1
    packagingsize: number;
}

export interface OrderResponse {
    id: string;
    userId: string;
    merchOrderId: string;
    phoneNumber: string;
    location: string;
    totalAmount: number;
    idempotencyKey: string;
    orderrecived: string;
    paymentMethod: string;
    paymentProofUrl?: string;
    refundstatus: string;
    cancelReason?: string;
    deliveryFee: number;
    deliverystatus: DeliveryStatus;
    paymentstatus: PaymentStatus;
    deliveryDate?: Date | null;
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

export const ORDER_TRACKING_STEPS = [
    { status: TrackingType.PAYMENT_SUBMITTED, title: 'Order Placed' },
    { status: TrackingType.PAYMENT_CONFIRMED, title: 'Payment Confirmed' },
    { status: TrackingType.DELIVERY_SCHEDULED, title: 'Scheduled for Delivery' },
    { status: TrackingType.CONFIRMED, title: 'Completed' },
    { status: TrackingType.CANCELLED, title: 'Cancelled' }
] as const;


export class OrderServiceImpl {



    async getOrdersWithTracking(userId: any, status?: OrderStatus, page = 1, limit = 20): Promise<{ items: any[]; total: number }> {
        // Fetch directly from Prisma (cache removed)
        const whereClause = status ? { status } : {};
        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where: { ...whereClause, userId },
                select: {
                    id: true,
                    userId: true,
                    status: true,
                    deliveryStatus: true,
                    idempotencyKey: true,
                    paymentStatus: true,
                    Refundstatus: true,
                    merchOrderId: true,
                    orderrecived: true,
                    paymentMethod: true,
                    totalAmount: true,
                    createdAt: true,
                    updatedAt: true,
                    deliveryDate: true,
                    items: {
                        include: {
                            product: {
                                select: { id: true, name: true, images: { take: 1, select: { url: true } } }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: (page - 1) * limit
            }),
            prisma.order.count({ where: whereClause }),
        ]);

        // Transform data
        const result = orders.map(o => ({
            id: o.id,
            userId: o.userId,
            deliverystatus: o.deliveryStatus,
            idempotencyKey: o.idempotencyKey,
            paymentstatus: o.paymentStatus,
            refundstatus: o.Refundstatus,
            merchOrderId: o.merchOrderId,
            orderrecived: o.orderrecived,
            paymentMethod: o.paymentMethod,
            totalAmount: o.totalAmount,
            deliverydate: o.deliveryDate,
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
            }))
        }));

        return { items: result, total };
    }

    // ---------------------------
    // 1. Get Orders with Tracking
    // ---------------------------
    async updateTrackingStep(orderId: string, type: TrackingType, message?: string) {
        await prisma.orderTracking.updateMany({
            where: { orderId, type },
            data: {
                timestamp: new Date(),
                message: message ?? '',
            }
        });
    }


    // update order status and add tracking step
    async updateOrderStatus(orderId: string, paymentStatus?: PaymentStatus, deliveryStatus?: DeliveryStatus, deliveryDate?: Date | null) {
        const order = await prisma.order.findUnique({ where: { id: orderId } });

        if (!order) throw new NotFoundError('Order not found');

        const data: any = {};

        if (paymentStatus) {
            data.paymentStatus = paymentStatus;
            if (paymentStatus === PaymentStatus.CONFIRMED) {
                data.status = OrderStatus.TO_BE_DELIVERED;
                await this.updateTrackingStep(orderId, TrackingType.PAYMENT_CONFIRMED);
            } else if (paymentStatus === PaymentStatus.DECLINED) {
                data.status = OrderStatus.CANCELLED;
                await this.updateTrackingStep(orderId, TrackingType.CANCELLED, "Payment declined");

            }

        }
        if (deliveryStatus) {
            data.deliveryStatus = deliveryStatus;

            if (deliveryStatus === DeliveryStatus.SCHEDULED) {
                await this.updateTrackingStep(orderId, TrackingType.DELIVERY_SCHEDULED);
            } else if (deliveryStatus === DeliveryStatus.DELIVERED) {
                data.status = OrderStatus.COMPLETED;
                await this.updateTrackingStep(orderId, TrackingType.CONFIRMED, "Order delivered");
            }
        }
        if (deliveryDate !== undefined && deliveryDate !== null) {
            data.deliveryDate = deliveryDate;
        }

        if (data.deliveryStatus === DeliveryStatus.SCHEDULED && deliveryDate == null) {
            throw new Error('Delivery date is required when delivery status is scheduled');
        }


        await prisma.order.update({
            where: { id: orderId },
            data
        });
    }

    // assign delivery base fee and delivery fee per kg based on area





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
            deliverystatus: order.deliveryStatus,
            idempotencyKey: order.idempotencyKey,
            paymentstatus: order.paymentStatus,
            refundstatus: order.Refundstatus,
            merchOrderId: order.merchOrderId,
            orderrecived: order.orderrecived,
            paymentMethod: order.paymentMethod,
            deliveryFee: order.totalDeliveryFee,
            cancelReason: order.cancelReason ?? '',
            paymentProofUrl: order.paymentProofUrl ?? '',
            deliveryDate: order.deliveryDate,
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
        await this.updateTrackingStep(order.id, TrackingType.CANCELLED, "User requested cancellation");
    }

    // get all order for admin and enable filter by status , paymen status and delivery status
    async getAllOrders(status?: OrderStatus, paymentStatus?: PaymentStatus, deliveryStatus?: DeliveryStatus) {
        const whereClause: any = {};
        if (status) whereClause.status = status;
        if (paymentStatus) whereClause.paymentStatus = paymentStatus;
        if (deliveryStatus) whereClause.deliveryStatus = deliveryStatus;

        const orders = await prisma.order.findMany({
            where: whereClause,
            include: {
                user: { select: { id: true, name: true, email: true } },
                items: {
                    include: {
                        product: {
                            select: { id: true, name: true, images: { take: 1, select: { url: true } } }
                        }
                    }
                },
                area: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return orders.map(o => ({
            id: o.id,
            userId: o.userId,
            userName: o.user.name,
            phoneNumber: o.phoneNumber,
            location: o.area?.name,
            totalAmount: o.totalAmount,
            idempotencyKey: o.idempotencyKey,
            paymentstatus: o.paymentStatus,
            refundstatus: o.Refundstatus,
            merchOrderId: o.merchOrderId,
            orderrecived: o.orderrecived,
            paymentMethod: o.paymentMethod,
            deliveryFee: o.totalDeliveryFee,
            paymentProofUrl: o.paymentProofUrl ?? null,
            deliverystatus: o.deliveryStatus,
            deliveryDate: o.deliveryDate,
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
        }));
    }






    // ---------------------------
    // 4. Create Multi Order
    // ---------------------------

    async createMultiOrder({
        userId,
        products,
        locationId,      // maps to areaId
        phoneNumber,
        orderReceived,   // from request, string 'Delivery' | 'Pickup'
        paymentMethod,
        idempotencyKey,
        extraDistance,
    }: {
        userId: string;
        products: OrderItemInput[];
        locationId: string;
        phoneNumber: string;
        orderReceived: string;
        paymentMethod: string;
        idempotencyKey: string;
        extraDistance?: ExtraDistanceLevel;
    }): Promise<{ id: string; totalAmount: number }> {

        if (!idempotencyKey) throw new Error("idempotencyKey is required");

        console.log("Creating multi order for userId:", userId);

        // Check for duplicate
        const existingOrder = await prisma.order.findUnique({ where: { idempotencyKey } });
        if (existingOrder) return { id: existingOrder.id, totalAmount: existingOrder.totalAmount };

        const deliveryService = new DeliveryServiceImpl();
        const productIds = products.map(p => p.productId);

        console.log("Fetching prices for products:", products);

        // Fetch prices (directly from DB)
        async function getProductPrices(ids: string[]) {
            const dbProducts = await prisma.teffProduct.findMany({
                where: { id: { in: ids } },
                select: { id: true, pricePerKg: true }
            });
            return dbProducts.map(p => ({ id: p.id, pricePerKg: Number(p.pricePerKg) }));
        }


        const [deliveryInfo, dbProducts] = await Promise.all([
            deliveryService.deliverycharge(locationId),
            getProductPrices(productIds)
        ]);

        console.log('products', dbProducts);

        const productMap = new Map(dbProducts.map(p => [p.id, p]));
        let total = deliveryInfo.totalFee;

        const orderItemsData: {
            productId: string;
            quantity: number;
            packaging: number;
            price: number;
        }[] = [];

        const updatePromises = products.map(item => {
            const prod = productMap.get(item.productId);
            if (!prod) throw new Error(`Invalid product ${item.productId}`);

            const qty = item.quantity ?? 1;
            const price = prod.pricePerKg * qty * item.packagingsize;
            total += price; // note: total += in loop might need to be handled carefully for concurrency

            orderItemsData.push({
                productId: prod.id,
                quantity: qty,
                packaging: item.packagingsize,
                price,
            });

            // return the update promise
            return prisma.teffProduct.update({
                where: { id: item.productId },
                data: { orderCount: { increment: qty } },
            });
        });

        // Wait for all updates in parallel
        await Promise.all(updatePromises);


        /*    const orderItemsData = products.map(item => {
               const prod = productMap.get(item.productId);
               if (!prod) throw new Error(`Invalid product ${item.productId}`);
   
               await prisma.teffProduct.update({
                   where: { id: item.productId },
                   data: { orderCount: { increment: item.quantity ?? 1 } },
               });
   
   
               const qty = item.quantity ?? 1;
               const price = prod.pricePerKg * qty * item.packagingsize;
               total += price;
               return { productId: prod.id, quantity: qty, packaging: item.packagingsize, price };
           }); */

        const trackingData = ORDER_TRACKING_STEPS.map(step => ({
            type: step.status,
            title: step.title,
            timestamp: step.status === TrackingType.PAYMENT_SUBMITTED ? new Date() : null
        }));

        // Create order transaction
        const order = await prisma.$transaction(async tx => {
            const createdOrder = await tx.order.create({
                data: {
                    user: { connect: { id: userId } },
                    area: { connect: { id: locationId } },
                    phoneNumber,
                    // areaId: locationId,
                    orderrecived: orderReceived,      // must match schema field name
                    paymentMethod,
                    totalDeliveryFee: deliveryInfo.totalFee,
                    extraDistanceLevel: extraDistance ?? null,
                    totalAmount: total,
                    merchOrderId: 'MORD' + Date.now(),
                    status: OrderStatus.PENDING_PAYMENT,
                    deliveryStatus: DeliveryStatus.NOT_SCHEDULED,
                    paymentStatus: PaymentStatus.PENDING,
                    idempotencyKey,
                    items: { createMany: { data: orderItemsData } },
                    orderTrackings: { createMany: { data: trackingData } },
                }
            });

            await tx.cart.deleteMany({
                where: { userId },
            });

            // Tracking already created via nested createMany
            return createdOrder;
        });

        // after order created clear cart


        return { id: order.id, totalAmount: total };
    }

    //     async createMultiOrder(
    //         userId: string,
    //         products: OrderItemInput[],
    //         locationId: string,
    //         phoneNumber: string,
    //         orderReceived: string,
    //         paymentMethod: string,
    //         idempotencyKey: string,
    //         extraDistance?: ExtraDistanceLevel,
    //     ): Promise<{ id: any; totalAmount: number }> {

    //         if (!idempotencyKey) {
    //             throw new Error("idempotencyKey is required");
    //         }


    //         const existingOrder = await prisma.order.findUnique({
    //             where: { idempotencyKey: idempotencyKey }
    //         });

    //         if (existingOrder) {
    //             return existingOrder; // 🔁 user clicked twice
    //         }

    //         //improve this with Parallelize independent operations 


    //         // 1. Calculate delivery fee outside transaction
    //         const deliveryService = new DeliveryServiceImpl();
    //         const productIds = products.map(p => p.productId);

    //         const [deliveryInfo, dbProducts] = await Promise.all([
    //   deliveryService.deliverycharge(locationId),
    //   prisma.teffProduct.findMany({
    //     where: { id: { in: productIds } },
    //     select: { id: true, pricePerKg: true }
    //   })
    // ]);

    // const deliveryInfo = await deliveryService.deliverycharge(locationId);

    // 2. Fetch product prices outside transaction
    /*   const dbProducts = await prisma.teffProduct.findMany({
        where: { id: { in: productIds } },
        select: { id: true, pricePerKg: true }
        });
        
    const deliveryFee = deliveryInfo.totalFee;
    let total = deliveryFee;
    const orderItemsData = products.map(item => {
        const prod = dbProducts.find(p => p.id === item.productId);
        if (!prod) throw new Error('Invalid product');

        const qty = item.quantity ?? 1;
        const price = prod.pricePerKg * qty * item.packagingsize;
        total += price;

        return {
            productId: prod.id,
            quantity: qty,
            packaging: item.packagingsize,
            price
        };
    });




    // 3. Create order + tracking inside transaction
    const order = await prisma.$transaction(async (tx) => {
        const createdOrder = await tx.order.create({
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
                idempotencyKey: idempotencyKey,
                items: { create: orderItemsData }
            },
            include: { items: true }
        });

        await tx.orderTracking.createMany({
            data: ORDER_TRACKING_STEPS.map(step => ({
                orderId: createdOrder.id,
                type: step.status,
                title: step.title,
                timestamp: step.status === TrackingType.PAYMENT_SUBMITTED ? new Date() : null
            }))
        });

        return createdOrder;
    });

    return { id: order.id, totalAmount: total };
}
*/



}
