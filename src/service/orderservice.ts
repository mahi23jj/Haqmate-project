
import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../utils/apperror.js';
import type { Product } from './productservice.js';
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


// Define the interface for an order response


// Input type for creating an order item


// Implementation of OrderService



export interface OrderService {
    createOrder(
        userId: string,
        product: OrderItemInput,
        location?: string,
        phoneNumber?: string,
        locationChange?: boolean | false,
        phoneChange?: boolean | false
    ): Promise<OrderResponse>;
    // getOrderById(id: string): Promise<OrderResponse>;
    getOrdersByUserId(userId: string): Promise<OrderResponse[]>;
    cancelOrder(id: string): Promise<void>;
    // filter orders by status could be added here
    filterByStatus(status: string): Promise<OrderResponse[]>;

    createMultiOrder(
        userId: string,
        product: OrderItemInput[],
        location?: string,
        phoneNumber?: string,
        locationChange?: boolean,
        phoneChange?: boolean
    ): Promise<OrderResponse>;

}

export class OrderServiceImpl implements OrderService {


    async filterByStatus(status: Status): Promise<OrderResponse[]> {
        const orders = await prisma.order.findMany({
            where: { status },
            include: {
                items: {
                    include: {
                        product: {
                            select: { name: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        // Map Prisma result -> OrderResponse
        return orders.map(order => ({
            id: order.id,
            userId: order.userId,
            phoneNumber: order.phoneNumber,
            location: order.location,
            totalAmount: order.totalAmount,
            status: order.status,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            items: order.items.map(item => ({
                id: item.id,
                quantity: item.quantity,
                price: item.price,
                packagingsize: item.packaging,
                product: {
                    name: item.product.name,
                },
            })),
        }));
    }


    async createOrder(
        userId: string,
        product: OrderItemInput,
        location?: string,
        phoneNumber?: string,
        locationChange?: boolean,
        phoneChange?: boolean
    ): Promise<OrderResponse> {
        // Fetch user data
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { location: true, phoneNumber: true },
        });

        if (!user) throw new Error("User not found");

        // Update location if provided and flagged
        if (location && locationChange) {
            await prisma.user.update({
                where: { id: userId },
                data: { location },
            });
        } else {
            location = user.location ?? "";
        }

        // Update phone number if provided and flagged
        if (phoneNumber && phoneChange) {
            await prisma.user.update({
                where: { id: userId },
                data: { phoneNumber },
            });
        } else {
            phoneNumber = user.phoneNumber ?? "";
        }

        // Fetch product
        const prod = await prisma.teffProduct.findUnique({
            where: { id: product.productId },
        });
        if (!prod) throw new Error("Product not found");

        const quantity = product.quantity ?? 1;
        const totalAmount = prod.pricePerKg * quantity * product.packagingsize;

        // Create order with items
        const order = await prisma.order.create({
            data: {
                userId,
                phoneNumber,
                location,
                totalAmount,
                status: "pending",
                items: {
                    create: {
                        productId: prod.id,
                        packaging: product.packagingsize,
                        quantity,
                        price: prod.pricePerKg,
                    },
                },
            },
            include: {
                items: {
                    include: {
                        product: {
                            select: { name: true }, // Only select name to match OrderResponse
                        },
                    },
                },
            },
        });

        // Map Prisma return type to OrderResponse
        return {
            id: order.id,
            userId: order.userId,
            phoneNumber: order.phoneNumber,
            location: order.location,
            totalAmount: order.totalAmount,
            status: order.status as OrderResponse["status"],
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            items: order.items.map(item => ({
                id: item.id,
                quantity: item.quantity,
                price: item.price,
                packagingsize: item.packaging,
                product: {
                    name: item.product.name,
                },
            })),
        };
    }




    async getOrdersByUserId(userId: string): Promise<OrderResponse[]> {
        const orders = await prisma.order.findMany({
            where: { userId },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return orders as unknown as OrderResponse[];
    }

    async cancelOrder(id: string): Promise<void> {
        const order = await prisma.order.findUnique({
            where: { id },
        });

        if (!order) {
            throw new NotFoundError('Order not found');
        }

        if (order.status === 'cancelled') {
            throw new Error('Order is already cancelled');
        }

        await prisma.order.update({
            where: { id },
            data: { status: 'cancelled' },
        });
    }





async createMultiOrder(
    userId: string,
    product: OrderItemInput[],
    location?: string,
    phoneNumber?: string,
    locationChange?: boolean,
    phoneChange?: boolean
): Promise<any> {

    // 1. Get user info once
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { location: true, phoneNumber: true },
    });

    if (!user) throw new Error("User not found");


    // Fallback to existing values
   if (location && locationChange) {
            await prisma.user.update({
                where: { id: userId },
                data: { location },
            });
        } else {
            location = user.location ?? "";
        }

        // Update phone number if provided and flagged
        if (phoneNumber && phoneChange) {
            await prisma.user.update({
                where: { id: userId },
                data: { phoneNumber },
            });
        } else {
            phoneNumber = user.phoneNumber ?? "";
        }


    // 3. Prepare order items & calculate totalAmount
    let totalAmount = 0;
    const orderItems = [];

    for (const item of product) {
        const prod = await prisma.teffProduct.findUnique({
            where: { id: item.productId },
            select: { id: true, pricePerKg: true }
        });

        if (!prod) throw new Error("Product not found");

        const quantity = item.quantity ?? 1;
        const itemTotal = prod.pricePerKg * quantity * item.packagingsize;
        totalAmount += itemTotal;

        orderItems.push({
            productId: item.productId,
            packaging: item.packagingsize,
            quantity,
            price: itemTotal,
        });
    }

    // 4. Create order
    const order = await prisma.order.create({
        data: {
            userId,
            phoneNumber,
            location,
            totalAmount,
            status: "pending",
            items: { create: orderItems },
        },
        select: {
            id: true,
            userId: true,
            status: true,
            totalAmount: true,
            location: true,
            phoneNumber: true,
            deliveryDate: true,
            createdAt: true,
            updatedAt: true,
            items: {
                select: {
                    // id: true,
                    packaging: true,
                    quantity: true,
                    price: true,
                    product: {
                        select: {
                            id: true,
                            name: true,
                            pricePerKg: true,
                            images: true,
                        }
                    }
                }
            }
        }
    });

    return order;
}


}

