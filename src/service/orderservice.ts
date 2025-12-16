
import { NotFoundError } from '../utils/apperror.js';
import { DeliveryServiceImpl, type ExtraDistanceLevel } from './delivery.js';
import type { Product } from './telebirr_productservice.js';

import { PrismaClient } from '@prisma/client';



// import { NotFoundError } from "../errors/NotFoundError";
// import { Status, ExtraDistanceLevel } from "@prisma/client";
const prisma = new PrismaClient();

export interface OrderItemInput {
    productId: string;
    quantity?: number;  // optional, default to 1
    packagingsize: number;
}


export enum Status {
    PENDING = 'pending',
    FAILED = 'failed',
    PAID = 'paid',
    DELIVERED = 'delivered',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
    REFUNDED = 'refunded'
}

export interface OrderResponse {
    id: string;
    userId: string;
    phoneNumber: string;
    location: string;
    totalAmount: number;
    status: 'pending' | 'failed' | 'paid' | 'delivered' | 'completed' | 'cancelled' | 'refunded';
    createdAt: Date;
    updatedAt: Date;
    items: {
        id: string;
        quantity: number;
        price: number;
        product: {
            name: string;
        };
        packagingsize: number;
    }[];
}


export interface OrderService {
 /*    createOrder(
        userId: string,
        product: OrderItemInput,
        extraDistance?: ExtraDistanceLevel,
        location?: string,
        phoneNumber?: string,
        locationChange?: boolean | false,
        phoneChange?: boolean | false
    ): Promise<OrderResponse>; */
    // getOrderById(id: string): Promise<OrderResponse>;
    // getOrdersByUserId(userId: string): Promise<OrderResponse[]>;
    cancelOrder(id: string): Promise<void>;
    // filter orders by status could be added here
    getOrdersWithTracking(status?: Status): Promise<any[]>;
    getordersdetail(orderid: string): Promise<any>;

    // createMultiOrder(
    //     userId: string,
    //     product: OrderItemInput[],
    //     location: string,
    //     phoneNumber: string,
    //     PaymentMethod: string,
    //     orderRecived: string,
    //     extraDistance?: ExtraDistanceLevel,
        
    // ): Promise<any>;

      createMultiOrder({
        userId,
        products,
        locationId,
        phoneNumber,
        orderReceived,
        paymentMethod,
        extraDistance
    }: {
        userId: string;
        products: OrderItemInput[];
        locationId: string;  // IMPORTANT: this is areaId
        phoneNumber: string;
        orderReceived: string;
        paymentMethod: string;
        extraDistance?: ExtraDistanceLevel;
    }) : Promise<any>;

    createordertraking(orderid: string): Promise<void>;
    updateordertraking(orderid: string, status: Status): Promise<void>;

}




export class OrderServiceImpl {

    // -------------------------------------------------------
    // 1. Get Orders with Tracking
    // -------------------------------------------------------
    async getOrdersWithTracking(status?: Status) {
        const orders = await prisma.order.findMany({
            where: status ? { status } : {},
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                images: { take: 1, select: { url: true } }
                            }
                        }
                    }
                },
                orderTrackings: {
                    orderBy: { createdAt: "asc" },
                    select: { status: true, title: true, timestamp: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        return orders.map(o => ({
            id: o.id,
            totalAmount: o.totalAmount,
            status: o.status,
            merchantOrderId: o.merchOrderId,
            createdAt: o.createdAt,
            updatedAt: o.updatedAt,
            items: o.items.map(it => ({
                product: {
                    id: it.product.id,
                    name: it.product.name,
                    images: it.product.images
                }
            })),
            tracking: o.orderTrackings
        }));
    }


    // -------------------------------------------------------
    // 2. Get Order Detail
    // -------------------------------------------------------
    async getordersdetail(orderId: string) {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                name: true,
                                images: { take: 1, select: { url: true } }
                            }
                        }
                    }
                },
                orderTrackings: {
                    orderBy: { createdAt: "asc" },
                    select: { status: true, title: true, timestamp: true }
                },
                area: { select: { name: true } }
            }
        });

        if (!order) throw new NotFoundError("Order not found");

        return {
            id: order.id,
            userId: order.userId,
            phoneNumber: order.phoneNumber,
            location: order.area?.name,
            deliveryFee: order.totalDeliveryFee,
            totalAmount: order.totalAmount,
            status: order.status,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            merchantOrderId: order.merchOrderId,
            items: order.items.map(i => ({
                id: i.id,
                quantity: i.quantity,
                price: i.price,
                packaging: i.packaging,
                product: {
                    name: i.product.name,
                    images: i.product.images
                }
            })),
            tracking: order.orderTrackings
        };
    }


    // -------------------------------------------------------
    // 3. Get Orders by User
    // -------------------------------------------------------
    // async getOrdersByUserId(userId: string): Promise<OrderResponse[]> {
    //     return prisma.order.findMany({
    //         where: { userId },
    //         include: {
    //             items: {
    //                 include: { product: true }
    //             }
    //         },
    //         orderBy: { createdAt: "desc" }
    //     });
    // }


    // -------------------------------------------------------
    // 4. Cancel Order
    // -------------------------------------------------------
    async cancelOrder(id: string) {
        const order = await prisma.order.findUnique({ where: { id } });

        if (!order) throw new NotFoundError("Order not found");
        if (order.status === Status.CANCELLED)
            throw new Error("Order already cancelled");

        await prisma.order.update({
            where: { id },
            data: { status: Status.CANCELLED }
        });
    }


    // -------------------------------------------------------
    // 5. Create Multi Order
    // -------------------------------------------------------
    async createMultiOrder(
        
       /*  {
        userId,
        products,
        locationId,
        phoneNumber,
        orderReceived,
        paymentMethod,
        extraDistance
    }:  */
    userId: string,
    products: OrderItemInput[],
    locationId: string, // IMPORTANT: this is areaId
    phoneNumber: string,
    orderReceived: string,
    paymentMethod: string,
    extraDistance?: ExtraDistanceLevel,
    
 /*    {
    } */

) {

        const deliveryService = new DeliveryServiceImpl();
        const deliveryInfo = await deliveryService.deliverycharge(locationId, extraDistance);
        const deliveryFee = deliveryInfo.totalFee;

        // Fetch all products using ONE query
        const productIds = products.map(p => p.productId);
        const dbProducts = await prisma.teffProduct.findMany({
            where: { id: { in: productIds } },
            select: { id: true, pricePerKg: true }
        });

        let total = deliveryFee;
        const orderItems = [];

        for (const item of products) {
            const prod = dbProducts.find(p => p.id === item.productId);
            if (!prod) throw new Error("Invalid product");

            const qty = item.quantity ?? 1;
            const price = prod.pricePerKg * qty * item.packagingsize;

            total += price;

            orderItems.push({
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
                merchOrderId: "MORD" + Date.now(),
                status: Status.PENDING,
                items: { create: orderItems }
            },
            select: {
                id: true,
                userId: true,
                totalAmount: true,
                status: true,
                areaId: true,
                phoneNumber: true,
                createdAt: true,
                updatedAt: true,
                items: true
            }
        });

        // Create initial tracking
        await prisma.orderTracking.create({
            data: {
                orderId: order.id,
                status: Status.PENDING,
                title: "Order Placed",
                timestamp: new Date()
            }
        });

        return order;
    }
}




// export class OrderServiceImpl implements OrderService {


//     async getOrdersWithTracking(status?: Status): Promise<any[]> {
//         const orders = await prisma.order.findMany({
//             where: status ? { status } : {}, // filter if status is provided
//             include: {
//                 items: {
//                     include: {
//                         product: {
//                             select: {
//                                 id: true,
//                                 name: true,
//                                 images: { take: 1, select: { url: true } } // get first image
//                             },
//                         },
//                     },
//                 },
//                 orderTrackings: {  // include order tracking
//                     orderBy: { createdAt: "asc" },
//                     select: {
//                         status: true,
//                         title: true,
//                         timestamp: true,
//                     },
//                 },
              
//             },
//             orderBy: { createdAt: "desc" },
//         });

//         // Map Prisma result -> OrderResponse with tracking
//         return orders.map(order => ({
//             id: order.id,
//             totalAmount: order.totalAmount,
//             status: order.status,
//             merchantOrderId: order.merchOrderId,
//             createdAt: order.createdAt,
//             updatedAt: order.updatedAt,
//             items: order.items.map(item => ({
//                 product: {
//                     id: item.product.id,
//                     name: item.product.name,
//                     images: item.product.images,
//                 },
//             })),

//         }));
//     }


//     async getordersdetail(orderid: string): Promise<any> {

//         const order = await prisma.order.findUnique({
//             where: { id: orderid }, // filter if status is provided
//             include: {
//                 items: {
//                     include: {
//                         product: {
//                             select: {
//                                 name: true,
//                                 images: { take: 1, select: { url: true } }

//                             },
//                         },
//                     },
//                 },
//                 orderTrackings: {  // include order tracking
//                     orderBy: { createdAt: "asc" },
//                     select: {
//                         status: true,
//                         title: true,
//                         timestamp: true,
//                     },
//                 },
//                   area: {
//                     select: {
//                         name: true,
//                     }
//                 }
//             },
//         });

//         // Map Prisma result -> OrderResponse with tracking
//         return {
//             id: order!.id,
//             userId: order!.userId,
//             phoneNumber: order!.phoneNumber,
//             location: order!.area.name,
//             deliveryfee: order!.totalDeliveryFee,
//             totalAmount: order!.totalAmount,
//             status: order!.status,
//             createdAt: order!.createdAt,
//             updatedAt: order!.updatedAt,
//             merchantOrderId: order!.merchOrderId,
//             items: order!.items.map(item => ({
//                 id: item.id,
//                 quantity: item.quantity,
//                 price: item.price,
//                 packagingsize: item.packaging,
//                 product: {
//                     name: item.product.name,
//                     images: item.product.images,
//                 },
//             })),
//             tracking: order!.orderTrackings.map(track => ({
//                 status: track.status,
//                 title: track.title,
//                 timestamp: track.timestamp,
//             })),
//         };

//     }





//     async getOrdersByUserId(userId: string): Promise<OrderResponse[]> {
//         const orders = await prisma.order.findMany({
//             where: { userId },
//             include: {
//                 items: {
//                     include: {
//                         product: true,
//                     },
//                 },
//             },
//             orderBy: { createdAt: 'desc' },
//         });

//         return orders as unknown as OrderResponse[];
//     }

//     async cancelOrder(id: string): Promise<void> {
//         const order = await prisma.order.findUnique({
//             where: { id },
//         });

//         if (!order) {
//             throw new NotFoundError('Order not found');
//         }

//         if (order.status === 'cancelled') {
//             throw new Error('Order is already cancelled');
//         }

//         await prisma.order.update({
//             where: { id },
//             data: { status: 'cancelled' },
//         });
//     }





//     async createMultiOrder(
//         userId: string,
//         product: OrderItemInput[],
//         location: string,
//         phoneNumber: string,
//         PaymentMethod: string,
//         orderRecived: string,
//         extraDistance?: ExtraDistanceLevel,
//     ): Promise<any> {
        
//         // get delivery charge based on extraDistance if needed
//         let deliveryCharge = 0;
//         let deliveryInfo;
//         const deliveryService = new DeliveryServiceImpl();
//         if (extraDistance) {
//             deliveryInfo = await deliveryService.deliverycharge(location, extraDistance);

//         } else {
//             deliveryInfo = await deliveryService.deliverycharge(location);
//         }

//         deliveryCharge = deliveryInfo.totalFee;

//         // 3. Prepare order items & calculate totalAmount
//         let totalAmount = 0;
//         const orderItems = [];

//         for (const item of product) {
//             const prod = await prisma.teffProduct.findUnique({
//                 where: { id: item.productId },
//                 select: { id: true, pricePerKg: true }
//             });

//             if (!prod) throw new Error("Product not found");

//             const quantity = item.quantity ?? 1;
//             const itemTotal = prod.pricePerKg * quantity * item.packagingsize;
//             totalAmount += itemTotal;

//             orderItems.push({
//                 productId: item.productId,
//                 packaging: item.packagingsize,
//                 quantity,
//                 price: itemTotal,
//             });
//         }

//         totalAmount += deliveryCharge;
//         // 4. Create order
//         const order = await prisma.order.create({
//             data: {
//                 userId,
//                 phoneNumber,
//                 areaId:location,
//                 totalDeliveryFee: deliveryCharge,
//                 extraDistanceLevel : extraDistance!,
//                 totalAmount,
//                 orderrecived : orderRecived,
//                 paymentMethod: PaymentMethod,
//                 status: "pending",
//                 merchOrderId: 'MORD' + Date.now().toString(), // Example merch order ID
//                 items: { create: orderItems },
//             },
//             select: {
//                 id: true,
//                 userId: true,
//                 status: true,
//                 totalAmount: true,
//                 areaId: true,
//                 phoneNumber: true,
//                 deliveryDate: true,
//                 createdAt: true,
//                 updatedAt: true,
//                 items: {
//                     select: {
//                         packaging: true,
//                         quantity: true,
//                         price: true,
//                         product: {
//                             select: {
//                                 id: true,
//                                 name: true,
//                                 pricePerKg: true,
//                                 images: true,
//                             }
//                         }
//                     }
//                 }
//             }
//         });

//         // 5. Initialize order tracking immediately
//         const trackingSteps = [
//             { status: Status.PENDING, title: "Order Placed" },
//             { status: Status.PAID, title: "Order Confirmed" },
//             { status: Status.FAILED, title: "Order failed" },
//             { status: Status.DELIVERED, title: "Delivered" },
//             { status: Status.COMPLETED, title: "Order Completed" },
//             { status: Status.CANCELLED, title: "Order Cancelled" },
//             { status: Status.REFUNDED, title: "Order Refunded" }
//         ];



//         // Bulk create tracking entries with timestamp = null
//         await prisma.orderTracking.createMany({
//             data: trackingSteps.map(step => ({
//                 orderId: order.id,
//                 status: step.status,
//                 title: step.title,
//                 timestamp: step.status === Status.PENDING ? new Date() : null, // set initial placed timestamp
//             }))
//         });


//         return order;
//     }




    



// }



// async createordertraking(orderid: string): Promise<void> {
//         const trackingSteps = [
//             { status: Status.PENDING, title: "Order Placed" },
//             { status: Status.PAID, title: "Order Confirmed" },
//             { status: Status.FAILED, title: "Order failed" },
//             { status: Status.DELIVERED, title: "Delivered" },
//             { status: Status.COMPLETED, title: "Order Completed" },
//             { status: Status.CANCELLED, title: "Order Cancelled" },
//             { status: Status.REFUNDED, title: "Order Refunded" }
//         ];



//         // Bulk create tracking entries with timestamp = null
//         await prisma.orderTracking.createMany({
//             data: trackingSteps.map(step => ({
//                 orderId: orderid,
//                 status: step.status,
//                 title: step.title,
//                 timestamp: step.status === Status.PENDING ? new Date() : null, // set initial placed timestamp
//             }))
//         });

//     }


//     async updateordertraking(orderId: string, status: Status) {

//         await prisma.orderTracking.updateMany({
//             where: { orderId, status },
//             data: { timestamp: new Date() }
//         });

//         /* // Optionally update Order table's status field too
//         await prisma.order.update({
//           where: { id: orderId },
//           data: {status }
//         }); */
//     }

