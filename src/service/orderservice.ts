
import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../errors/apperror.js';
import type { Product } from './productservice.js';
const prisma = new PrismaClient();

export interface OrderItemInput {
    productId: string;
    quantity?: number;  // optional, default to 1
    packagingsize: number;
}

export interface OrderResponse {
    id: string;
    userId: string;
    phoneNumber: string;
    location: string;
    totalAmount: number;
    status: 'pending' | 'paid' | 'delivered' | 'completed' | 'cancelled' | 'refunded';
    createdAt: Date;
    updatedAt: Date;
    items: {
        id: string;
        quantity: number;
        price: number;
        product: {
            name: string;
        };
        packaging: {
            sizeKg: number;
        };
    }[];
}

export interface OrderService {
    createOrder(
        userId: string,
        product: OrderItemInput,
        location?: string,
        phoneNumber?: string,
        locationChange?: boolean,
        phoneChange?: boolean
    ): Promise<OrderResponse>;
    // getOrderById(id: string): Promise<OrderResponse>;
    getOrdersByUserId(userId: string): Promise<OrderResponse[]>;
    cancelOrder(id: string): Promise<void>;
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
    async createOrder(
        userId: string,
        product: OrderItemInput,
        location?: string,
        phoneNumber?: string,
        locationChange?: boolean,
        phoneChange?: boolean
    ): Promise<OrderResponse> {
        // Get user once
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { location: true, phoneNumber: true },
        });

        if (!user) throw new Error("User not found");

        // Update fields only if needed
        if (location && locationChange) {
            await prisma.user.update({
                where: { id: userId },
                data: { location },
            });
        } else {
            location = user.location || "";
        }

        if (phoneNumber && phoneChange) {
            await prisma.user.update({
                where: { id: userId },
                data: { phoneNumber },
            });
        } else {
            phoneNumber = user.phoneNumber || "";
        }

        // Validate product
        const prod = await prisma.teffProduct.findUnique({
            where: { id: product.productId },
        });
        if (!prod) throw new Error("Product not found");

        // Validate packaging
        const packaging = await prisma.packaging.findUnique({
            where: { sizeKg: product.packagingsize },
        });
        if (!packaging) throw new Error("Packaging not found");

        const quantity = product.quantity ?? 1;
        const totalAmount = prod.pricePerKg * quantity * product.packagingsize;

        // Create order and item
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
                        packagingId: packaging.id,
                        quantity,
                        price: prod.pricePerKg,
                    },
                },
            },
            include: {
                items: {
                    include: {
                        product: true,
                        packaging: true,
                    },
                },
            },
        });

        return order as unknown as OrderResponse;
    }

    async getOrdersByUserId(userId: string): Promise<OrderResponse[]> {
        const orders = await prisma.order.findMany({
            where: { userId },
            include: {
                items: {
                    include: {
                        product: true,
                        packaging: true,
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
    ): Promise<OrderResponse> {
        // Get user once
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { location: true, phoneNumber: true },
        });

        if (!user) throw new Error("User not found");

        // Update fields only if needed
        if (location && locationChange) {
            await prisma.user.update({
                where: { id: userId },
                data: { location },
            });
        } else {
            location = user.location || "";
        }

        if (phoneNumber && phoneChange) {
            await prisma.user.update({
                where: { id: userId },
                data: { phoneNumber },
            });
        } else {
            phoneNumber = user.phoneNumber || "";
        }
        let totalAmount = 0;
        // Prepare all resolved order items
        const orderItems = [];

        for (const productItem of product) {
            const prod = await prisma.teffProduct.findUnique({
                where: { id: productItem.productId },
            });
            if (!prod) throw new Error("Product not found");

            const packaging = await prisma.packaging.findUnique({
                where: { sizeKg: productItem.packagingsize },
            });
            if (!packaging) throw new Error("Packaging not found");

            const quantity = productItem.quantity ?? 1;
            const itemTotal = prod.pricePerKg * quantity * productItem.packagingsize;
            totalAmount += itemTotal;

            orderItems.push({
                productId: productItem.productId,
                packagingId: packaging.id,
                quantity,
                price: prod.pricePerKg,
            });
        }

        // Now safely create the order
        const order = await prisma.order.create({
            data: {
                userId,
                phoneNumber,
                location,
                totalAmount,
                status: "pending",
                items: {
                    create: orderItems, // resolved values, not promises
                },
            },
            include: {
                items: {
                    include: {
                        product: true,
                        packaging: true,
                    },
                },
            },
        });


        return order as unknown as OrderResponse;
    }

}

