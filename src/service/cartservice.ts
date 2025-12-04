import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../utils/apperror.js';
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
    addOrUpdateCart(userId: string, item: CartItem): Promise<void>;
    updateCartItemQuantity(
        userId: string,
        productId: string,
        packaging: number,
        quantity: number
    ): Promise<void>;
    removeItemFromCart(userId: string, productId: string, packaging: number): Promise<void>;
    getCartItems(userId: string): Promise<any>;
    clearCart(userId: string): Promise<void>;

}

export class CartServiceImpl implements CartService {

    async addOrUpdateCart(userId: string, item: CartItem): Promise<void> {
        try {
            const cartItem = await prisma.cart.upsert({
                where: {
                    userId_productId_packaging: {
                        userId,
                        productId: item.productId,
                        packaging: item.packagingsize,
                    },
                },
                update: {
                    quantity: { increment: item.quantity },
                },
                create: {
                    userId,
                    productId: item.productId,
                    quantity: item.quantity,
                    packaging: item.packagingsize,
                },
            });

            console.log('Cart item added or updated:', cartItem);
        } catch (error) {
            console.error('Error adding/updating cart item:', error);
            throw error;
        }
    }


    async updateCartItemQuantity(
        userId: string,
        productId: string,
        packaging: number,
        quantity: number
    ): Promise<void> {
        try {
            // If quantity is 0 → remove from cart
            if (quantity <= 0) {
                await prisma.cart.delete({
                    where: {
                        userId_productId_packaging: {
                            userId,
                            productId,
                            packaging,
                        },
                    },
                });
                console.log("Cart item removed");
                return;
            }

            // Update quantity
            const updatedCart = await prisma.cart.update({
                where: {
                    userId_productId_packaging: {
                        userId,
                        productId,
                        packaging,
                    },
                },
                data: { quantity },
            });

            console.log("Cart item quantity updated:", updatedCart);

        } catch (error: any) {
            // Catch Prisma not-found error
            if (error.code === "P2025") {
                throw new NotFoundError("Cart item not found!");
            }

            console.error("❌ Error updating cart item quantity:", error);
            throw error;
        }
    }


    // async updateItempackaging(userId: string, productId: string, packagingsize: number): Promise<void> {
    //     try {
    //         const packaging = await prisma.packaging.upsert({
    //             where: { sizeKg: packagingsize },
    //             update: {},
    //             create: { sizeKg: packagingsize },
    //         });

    //         const updatedCart = await prisma.cart.updateMany({
    //             where: {
    //                 userId: userId,
    //                 productId: productId,
    //             },
    //             data: {
    //                 packagingId: packaging.id,
    //             },
    //         });

    //         if (updatedCart.count === 0) {
    //             throw new NotFoundError('Cart item not found for update');
    //         }

    //         console.log('Cart item packaging updated:', updatedCart);
    //     } catch (error) {
    //         console.error('❌ Error updating cart item packaging:', error);
    //         throw error;
    //     }
    // }


    async removeItemFromCart(userId: string, productId: string, packaging: number): Promise<void> {
        try {

            const deletedCart = await prisma.cart.deleteMany({
                where: {
                    userId: userId,
                    productId: productId,
                    packaging: packaging,
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

    async getCartItems(userId: string): Promise<any> {
        try {
            const cartItems = await prisma.cart.findMany({
                where: { userId },
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            pricePerKg: true,
                            images: { select: { url: true } },
                            teffType: { select: { name: true } },
                            quality: { select: { id: true, name: true } },
                            discount: true,
                        },
                    },
                },
            });

            const subtotalPrice = cartItems.reduce(
                (total, item) =>
                    total + (item.product.pricePerKg * item.quantity * item.packaging * (1 - (item.product.discount || 0) / 100)),
                0
            );

            const taxprice = 0.15 * subtotalPrice;

            const totalPrice = subtotalPrice + taxprice;

            const formattedCart = cartItems.map(item => ({
                id: item.id,
                quantity: item.quantity,
                packagingSize: item.packaging,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                totalprice: item.quantity * item.product.pricePerKg * item.packaging * (1 - (item.product.discount || 0) / 100),
                product: {
                    id: item.product.id,
                    name: item.product.name,
                    pricePerKg: item.product.pricePerKg,
                    teffType: item.product.teffType.name,
                    quality: item.product.quality?.name ?? null,

                    // 👇 Only the first image
                    image: item.product.images.length > 0
                        ? item.product.images[0]?.url
                        : null
                }
            }));


            return { cart: formattedCart, subtotalPrice , taxprice , totalPrice };
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




