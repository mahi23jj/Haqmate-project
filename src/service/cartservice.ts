import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../utils/apperror.js';
import type { Product } from './productservice.js';
import { prisma } from '../prisma.js';


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
    preloadCartOnLogin(userId: string): Promise<any>;
    fetchProductsFromCacheOrDb(productIds: string[]): Promise<any>;
    addToCart(userId: string, item: CartItem): Promise<void>;
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

    async preloadCartOnLogin(userId: string): Promise<any> {
        const cartItems = await prisma.cart.findMany({
            where: { userId },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        pricePerKg: true,
                        discount: true,
                        images: { take: 1, select: { url: true } },
                        teffType: { select: { name: true } },
                        quality: { select: { name: true } }
                    }
                }
            }
        });

        if (cartItems.length === 0) {
            return { cart: [], subtotalPrice: 0 };
        }

        let subtotalPrice = 0;
        const formattedCart = cartItems.map(item => {
            const priceAfterDiscount = item.product.pricePerKg * item.quantity * item.packaging * (1 - (item.product.discount || 0) / 100);
            subtotalPrice += priceAfterDiscount;

            return {
                id: item.id,
                quantity: item.quantity,
                packagingSize: item.packaging,
                totalPrice: priceAfterDiscount,
                product: {
                    id: item.product.id,
                    name: item.product.name,
                    pricePerKg: item.product.pricePerKg,
                    teffType: item.product.teffType.name,
                    quality: item.product.quality?.name ?? null,
                    image: item.product.images[0]?.url ?? null,
                    discount: item.product.discount ?? 0,
                }
            };
        });

        return { cart: formattedCart, subtotalPrice };
    }

    async fetchProductsFromCacheOrDb(productIds: string[]): Promise<any> {
        return prisma.teffProduct.findMany({
            where: { id: { in: productIds } },
            select: {
                id: true,
                name: true,
                pricePerKg: true,
                discount: true,
                images: { take: 1, select: { url: true } },
                teffType: { select: { name: true } },
                quality: { select: { name: true } }
            }
        }).then(dbProducts => dbProducts.map(p => ({
            id: p.id,
            name: p.name,
            pricePerKg: p.pricePerKg,
            discount: p.discount,
            image: p.images[0]?.url ?? null,
            teffType: p.teffType.name,
            quality: p.quality?.name ?? null
        })));
    }


    async addToCart(
        userId: string,
        item: CartItem
    ): Promise<void> {
        const { productId, quantity, packagingsize } = item;

        const existsInDB = await prisma.cart.findUnique({
            where: {
                userId_productId_packaging: {
                    userId,
                    productId,
                    packaging: packagingsize
                }
            }
        });

        if (existsInDB) {
            // just only update quantity if it chnaged if not throw error
            if (existsInDB.quantity === quantity) {
                throw new Error("Item already exists in cart");
            } else {
                await prisma.cart.update({
                    where: {
                        userId_productId_packaging: {
                            userId,
                            productId,
                            packaging: packagingsize
                        }
                    }
                    , data: {
                        quantity: quantity
                    }
                })
                return;
            }
        }

        await prisma.cart.create({
            data: {
                userId,
                productId,
                quantity,
                packaging: packagingsize
            }
        });
    }


    /*  async addToCart(
         userId: string,
         item: CartItem
     ): Promise<void> {
 
         const cacheKey = `cart:${userId}`;
 
         // 1️⃣ Load cart from Redis or DB
         let cached = await redisClient.get(cacheKey);
         let cartData;
 
         if (!cached) {
             cartData = await this.preloadCartOnLogin(userId);
         } else {
             cartData = JSON.parse(cached);
         }
 
         const { productId, quantity, packagingsize } = item;
 
         // 2️⃣ Check existence in Redis (FAST)
         const exists = cartData.cart.some(
             (i: any) =>
                 i.productId === productId &&
                 i.packaging === packagingsize
         );
 
         if (exists) {
             throw new Error("Item already exists in cart");
         }
 
         // 3️⃣ Create new cart item in Redis
         cartData.cart.push({
             id: crypto.randomUUID(), // temp Redis ID
             productId,
             packaging: packagingsize,
             quantity
         });
 
         cartData.updatedAt = Date.now();
 
         // 4️⃣ Save Redis
         await redisClient.set(
             cacheKey,
             JSON.stringify(cartData),
             { EX: 300 }
         );
 
         // 5️⃣ Async DB sync (fire & forget)
         this.syncCreateCartToDB(userId, item)
             .catch(err => console.error("❌ Cart DB sync failed:", err));
     }
 
 
     async syncCreateCartToDB(
         userId: string,
         item: CartItem
     ) {
         await prisma.cart.create({
             data: {
                 userId,
                 productId: item.productId,
                 quantity: item.quantity,
                 packaging: item.packagingsize
             }
         });
     }
  */

    // async updateCartItemQuantity(
    //     userId: string,
    //     productId: string,
    //     packaging: number,
    //     quantity: number
    // ): Promise<void> {

    //     const cartKey = `cart:${userId}`;

    //     // 1️⃣ Update Redis immediately (FAST)
    //     if (quantity <= 0) {
    //         // remove item
    //         await redisClient.hDel(
    //             cartKey,
    //             `${productId}:${packaging}`
    //         );
    //     } else {
    //         await redisClient.hSet(
    //             cartKey,
    //             `${productId}:${packaging}`,
    //             JSON.stringify({ productId, packaging, quantity })
    //         );
    //     }

    //     // Optional TTL
    //     await redisClient.expire(cartKey, 300);

    //     // 2️⃣ DB sync (NON-BLOCKING)
    //     (async () => {
    //         try {
    //             if (quantity <= 0) {
    //                 await prisma.cart.delete({
    //                     where: {
    //                         userId_productId_packaging: {
    //                             userId,
    //                             productId,
    //                             packaging
    //                         }
    //                     }
    //                 });
    //             } else {
    //                 await prisma.cart.upsert({
    //                     where: {
    //                         userId_productId_packaging: {
    //                             userId,
    //                             productId,
    //                             packaging
    //                         }
    //                     },
    //                     update: { quantity },
    //                     create: {
    //                         userId,
    //                         productId,
    //                         packaging,
    //                         quantity
    //                     }
    //                 });
    //             }
    //         } catch (err) {
    //             console.error("❌ Cart DB sync failed:", err);
    //         }
    //     })();
    // }

    async updateCartItemQuantity(
        userId: string,
        productId: string,
        packaging: number,
        quantity: number
    ): Promise<void> {
        try {
            if (quantity <= 0) {
                await prisma.cart.delete({
                    where: {
                        userId_productId_packaging: { userId, productId, packaging }
                    }
                });
                return;
            }

            await prisma.cart.upsert({
                where: {
                    userId_productId_packaging: { userId, productId, packaging }
                },
                update: { quantity },
                create: { userId, productId, packaging, quantity }
            });
        } catch (err) {
            console.error("❌ Cart DB update failed:", err);
            throw err;
        }
    }




    // async updateCartItemQuantity(
    //     userId: string,
    //     productId: string,
    //     packaging: number,
    //     quantity: number
    // ): Promise<void> {
    //     try {
    //         // If quantity is 0 → remove from cart
    //         if (quantity <= 0) {
    //             await prisma.cart.delete({
    //                 where: {
    //                     userId_productId_packaging: {
    //                         userId,
    //                         productId,
    //                         packaging,
    //                     },
    //                 },
    //             });
    //             console.log("Cart item removed");
    //             return;
    //         }

    //         // Update quantity
    //         const updatedCart = await prisma.cart.update({
    //             where: {
    //                 userId_productId_packaging: {
    //                     userId,
    //                     productId,
    //                     packaging,
    //                 },
    //             },
    //             data: { quantity },
    //         });

    //         console.log("Cart item quantity updated:", updatedCart);

    //     } catch (error: any) {
    //         // Catch Prisma not-found error
    //         if (error.code === "P2025") {
    //             throw new NotFoundError("Cart item not found!");
    //         }

    //         console.error("❌ Error updating cart item quantity:", error);
    //         throw error;
    //     }
    // }

    async updateCartItem(
        userId: string,
        cartId: string,
        newProductId?: string,
        newPackaging?: number,
        newQuantity?: number
    ): Promise<void> {
        const existing = await prisma.cart.findUnique({ where: { id: cartId } });
        if (!existing) throw new NotFoundError("Cart item not found");

        const productId = newProductId ?? existing.productId;
        const packaging = newPackaging ?? existing.packaging;
        const quantity = newQuantity ?? existing.quantity;

        // Check for duplicate row with same (user, product, packaging)
        const duplicate = await prisma.cart.findUnique({
            where: {
                userId_productId_packaging: {
                    userId,
                    productId,
                    packaging,
                },
            },
            select: { id: true, quantity: true },
        });

        if (duplicate && duplicate.id !== cartId) {
            // Merge quantities into the existing duplicate and remove current row
            await prisma.$transaction([
                prisma.cart.update({
                    where: { id: duplicate.id },
                    data: { quantity: { increment: quantity } },
                }),
                prisma.cart.delete({ where: { id: cartId } }),
            ]);
            return;
        }

        // No duplicate conflict, safe to update
        await prisma.cart.update({
            where: { id: cartId },
            data: { productId, packaging, quantity },
        });
    }


    async removeItemFromCart(cartid: string): Promise<void> {
        try {

            const deletedCart = await prisma.cart.deleteMany({
                where: {
                    id: cartid
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
            // 1️⃣ Try cache first
            /*      const cached = await redisClient.get(`carts:${userId}`);
                 if (cached) return JSON.parse(cached); */

            // 2️⃣ Fetch cart + product + user info in parallel
            const [cartItems, userInfo] = await Promise.all([
                prisma.cart.findMany({
                    where: { userId },
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                pricePerKg: true,
                                discount: true,
                                images: { select: { url: true } },
                                teffType: { select: { name: true } },
                                quality: { select: { id: true, name: true } },
                            },
                        },
                    },
                }),
                prisma.user.findUnique({
                    where: { id: userId },
                    select: {
                        area: { select: { id: true, name: true, baseFee: true } },
                        phoneNumber: true,
                    },
                }),
            ]);

            if (!cartItems || !userInfo) {
                return { cart: [], subtotalPrice: 0, ...userInfo };
            }

            // 3️⃣ Compute subtotal and format cart in a single pass
            let subtotalPrice = 0;
            const formattedCart = cartItems.map(item => {
                const priceAfterDiscount =
                    item.product.pricePerKg *
                    item.quantity *
                    item.packaging *
                    (1 - (item.product.discount || 0) / 100);

                subtotalPrice += priceAfterDiscount;

                return {
                    id: item.id,
                    quantity: item.quantity,
                    packagingSize: item.packaging,
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt,
                    totalPrice: priceAfterDiscount,
                    product: {
                        id: item.product.id,
                        name: item.product.name,
                        pricePerKg: item.product.pricePerKg,
                        discount: item.product.discount || 0,
                        teffType: item.product.teffType?.name ?? null,
                        quality: item.product.quality?.name ?? null,
                        image:
                            item.product.images.length > 0
                                ? item.product.images[0]!.url
                                : null,
                    },
                };
            });

            // Optional: calculate tax/totalPrice if needed
            // const taxPrice = 0.15 * subtotalPrice;
            // const totalPrice = subtotalPrice + taxPrice;

            const cartObj = { cart: formattedCart, subtotalPrice, ...userInfo };

            // 4️⃣ Cache the result for 1 hour
            // await redisClient.setEx(`carts:${userId}`, 60 * 60, JSON.stringify(cartObj));

            return cartObj;
        } catch (error) {
            console.error('❌ Error fetching cart items:', error);
            throw error;
        }
    }


    /*  async getCartItems(userId: string): Promise<any> {
         try {
  */
    /*    // 1️⃣ Try cache first
       const cached = await redisClient.get(`cart:${userId}`);
       if (cached) {
           return JSON.parse(cached);
       }

       // 2️⃣ Cache miss → preload cart from DB
       await this.preloadCartOnLogin(userId);

       // 3️⃣ Read again from cache (SAFE)
       const fresh = await redisClient.get(`cart:${userId}`);
       if (!fresh) {
           throw new Error('Failed to preload cart into cache');
       }

       return JSON.parse(fresh);


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

       const userinfo = await prisma.user.findUnique({
           where: { id: userId },
           select: {
               area: {
                   select: {
                       id: true,
                       name: true,
                       baseFee: true,
                   }
               },
               phoneNumber: true
           }
       })

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



       return { cart: formattedCart, subtotalPrice, ...userinfo }; 
   } catch (error) {
       console.error('❌ Error fetching cart items:', error);
       throw error;
   }
}
*/

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




