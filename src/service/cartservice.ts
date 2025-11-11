import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../errors/apperror.js';
import type { Product } from './productservice.js';
const prisma = new PrismaClient();


export interface CartItem {
    productId: string;
    quantity: number;
    packagingsize: number
}

export interface Cartorder {
    id: string;
    quantity: number;
    packagingSize: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface CartService {
    addandupdateToCart(userId: string, item: CartItem): Promise<void>;
    updateCartItemQuantity( userId: string, productId: string, packagingId: string, action: 'increment' | 'decrement'): Promise<void>;
    removeItemFromCart(userId: string, productId: string, packagingid: string): Promise<void>;
    updateItempackaging(userId: string, productId: string, packagingsize: number): Promise<void>;
    getCartItems(userId: string): Promise<Cartorder[]>;
    clearCart(userId: string): Promise<void>;
}

export class CartServiceImpl implements CartService {

    async addandupdateToCart(userId: string, item: CartItem): Promise<void> {

        try {
            const packaging = await prisma.packaging.upsert({
                where: { sizeKg: item.packagingsize },
                update: {},
                create: { sizeKg: item.packagingsize },
            });

            const carts = await prisma.cart.upsert({
                where: {
                    userId_productId_packagingId: {
                        userId: userId,
                        productId: item.productId,
                        packagingId: packaging.id,
                    },
                },
                update: {
                    quantity: {
                        increment: item.quantity,
                    },
                },
                create: {
                    userId: userId,
                    productId: item.productId,
                    quantity: item.quantity,
                    packagingId: packaging.id,
                },
            });

            console.log('Cart updated:', carts);

        } catch (error) {
            console.error('❌ Error adding/updating cart item:', error);
            throw error;
        }

    }


    async updateCartItemQuantity( userId: string, productId: string, packagingId: string, action: 'increment' | 'decrement'): Promise<void> {
        // Ensure packaging exists
        const existingCart = await prisma.cart.findUnique({
            where: {
                userId_productId_packagingId: {
                    userId,
                    productId,
                    packagingId: packagingId,
                },
            },
        });

        if (!existingCart) {
            throw new NotFoundError('Cart item not found');
        }

        if (action === 'increment') {
            await prisma.cart.update({
                where: {
                    userId_productId_packagingId: {
                        userId,
                        productId,
                        packagingId: packagingId,
                    },
                },
                data: { quantity: { increment: 1 } },
            });
        } else {
            // decrement
            if (existingCart.quantity <= 1) {
                // remove item if quantity reaches 0
                await prisma.cart.delete({
                    where: {
                        userId_productId_packagingId: {
                            userId,
                            productId,
                            packagingId: packagingId,
                        },
                    },
                });
            } else {
                await prisma.cart.update({
                    where: {
                        userId_productId_packagingId: {
                            userId,
                            productId,
                            packagingId: packagingId,
                        },
                    },
                    data: { quantity: { decrement: 1 } },
                });
            }
        }
    }

    async updateItempackaging(userId: string, productId: string, packagingsize: number): Promise<void> {
        try {
            const packaging = await prisma.packaging.upsert({
                where: { sizeKg: packagingsize },
                update: {},
                create: { sizeKg: packagingsize },
            });

            const updatedCart = await prisma.cart.updateMany({
                where: {
                    userId: userId,
                    productId: productId,
                },
                data: {
                    packagingId: packaging.id,
                },
            });

            if (updatedCart.count === 0) {
                throw new NotFoundError('Cart item not found for update');
            }

            console.log('Cart item packaging updated:', updatedCart);
        } catch (error) {
            console.error('❌ Error updating cart item packaging:', error);
            throw error;
        }
    }

    async removeItemFromCart(userId: string, productId: string, packagingid: string): Promise<void> {
        try {

            const deletedCart = await prisma.cart.deleteMany({
                where: {
                    userId: userId,
                    productId: productId,
                    packagingId: packagingid,
                },
            });

            if (deletedCart.count === 0) {
                throw new NotFoundError('Cart item not found for deletion');
            }

            console.log('Cart item removed:', deletedCart);
        } catch (error) {
            console.error('❌ Error removing cart item:', error);
            throw error;
        }
    }

    async getCartItems(userId: string): Promise<Cartorder[]> {
        try {
            const cartItems = await prisma.cart.findMany({
                where: {
                    userId: userId,
                },
                include: {
                    packaging: true,
                    product: {
                        select: {
                            name: true,
                            pricePerKg: true,
                            description: true,
                            id: true,
                            images: {
                                select: { url: true },
                            },
                            teffType: {
                                select: { name: true },
                            },
                            quality: true,
                        },

                    },
                },
            });

            return cartItems.map(item => ({
                id: item.id,
                product: item.product,
                quantity: item.quantity,
                packagingSize: item.packaging.sizeKg,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt
            }));
        } catch (error) {
            console.error('❌ Error fetching cart items:', error);
            throw error;
        }
    }

    async clearCart(userId: string): Promise<void> {
        try {
            const deletedCarts = await prisma.cart.deleteMany({
                where: {
                    userId: userId,
                },
            });

            console.log(`Cleared ${deletedCarts.count} items from cart for user ${userId}`);
        } catch (error) {
            console.error('❌ Error clearing cart:', error);
            throw error;
        }
    }
}
