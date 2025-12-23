import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../utils/apperror.js';
import type { Product } from './productservice.js';
import { prisma } from '../prisma.js';
import { redisClient } from '../redis_test.js';


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
            select: { productId: true, quantity: true, packaging: true }
        });

        /* if (cartItems.length === 0) {
            await redisClient.setEx(`cart:${userId}`, 60 * 60, JSON.stringify({ cart: [], subtotalPrice: 0 }));
            return;
        } */


        if (cartItems.length === 0) {
            const emptyCart = { cart: [], subtotalPrice: 0 };
            await redisClient.setEx(`cart:${userId}`, 60 * 60, JSON.stringify(emptyCart));
            return emptyCart; // ✅ return object instead of undefined
        }

        // Fetch product details in batch (price cache included)
        const productIds = cartItems.map(item => item.productId);
        const products = await this.fetchProductsFromCacheOrDb(productIds);

        let subtotalPrice = 0;
        const formattedCart = cartItems.map(item => {
            const prod = products.find((p: { id: string; }) => p.id === item.productId);
            if (!prod) throw new Error(`Product not found: ${item.productId}`);

            const priceAfterDiscount = prod.pricePerKg * item.quantity * item.packaging * (1 - (prod.discount || 0) / 100);
            subtotalPrice += priceAfterDiscount;

            return {
                id: item.productId,
                quantity: item.quantity,
                packagingSize: item.packaging,
                totalPrice: priceAfterDiscount,
                product: {
                    id: prod.id,
                    name: prod.name,
                    pricePerKg: prod.pricePerKg,
                    teffType: prod.teffType,
                    quality: prod.quality ?? null,
                    image: prod.image ?? null
                }
            };
        });

        const cartObj = { cart: formattedCart, subtotalPrice };
        await redisClient.setEx(`cart:${userId}`, 60 * 60, JSON.stringify(cartObj));
        return cartObj; // ✅ make sure we return
    }

    async fetchProductsFromCacheOrDb(productIds: string[]): Promise<any> {
        const products: any[] = [];
        const missingIds: string[] = [];

        // 1️⃣ Try fetching from Redis hash 'products'
        const redisResults = await Promise.all(productIds.map(id => redisClient.hGet('products', id)));

        redisResults.forEach((res, i) => {
            if (res) products.push(JSON.parse(res));
            else missingIds.push(productIds[i]!);
        });

        // 2️⃣ Fetch missing products from DB
        if (missingIds.length > 0) {
            const dbProducts = await prisma.teffProduct.findMany({
                where: { id: { in: missingIds } },
                select: {
                    id: true,
                    name: true,
                    pricePerKg: true,
                    discount: true,
                    images: { take: 1, select: { url: true } },
                    teffType: { select: { name: true } },
                    quality: { select: { name: true } }
                }
            });

            for (const p of dbProducts) {
                await redisClient.hSet('products', p.id, JSON.stringify({
                    id: p.id,
                    name: p.name,
                    pricePerKg: p.pricePerKg,
                    discount: p.discount,
                    image: p.images[0]?.url ?? null,
                    teffType: p.teffType.name,
                    quality: p.quality?.name ?? null
                }));
                products.push({
                    id: p.id,
                    name: p.name,
                    pricePerKg: p.pricePerKg,
                    discount: p.discount,
                    image: p.images[0]?.url ?? null,
                    teffType: p.teffType.name,
                    quality: p.quality?.name ?? null
                });
            }
        }

        return products;
    }



    // async addOrUpdateCart(userId: string, item: CartItem): Promise<any> {
    //     try {
    //         const cartItem = await prisma.cart.upsert({
    //             where: {
    //                 userId_productId_packaging: {
    //                     userId,
    //                     productId: item.productId,
    //                     packaging: item.packagingsize,
    //                 },
    //             },
    //             update: {
    //                 quantity: { increment: item.quantity },
    //             },
    //             create: {
    //                 userId,
    //                 productId: item.productId,
    //                 quantity: item.quantity,
    //                 packaging: item.packagingsize,
    //             },
    //         });

    //         console.log('Cart item added or updated:', cartItem);
    //     } catch (error) {
    //         console.error('Error adding/updating cart item:', error);
    //         throw error;
    //     }
    // }

    async addToCart(
        userId: string,
        item: CartItem
    ): Promise<void> {
        const cacheKey = `cart:${userId}`;
        const { productId, quantity, packagingsize } = item;

        // 1️⃣ Check Redis cache first
        let cached = await redisClient.get(cacheKey);
        let cartData: { cart: any[]; subtotalPrice?: number } = cached
            ? JSON.parse(cached)
            : { cart: [] };

        // 2️⃣ Check if item exists in cache
        let existsInCache = cartData.cart.some(
            (i) => i.productId === productId && i.packaging === packagingsize
        );

        // 3️⃣ If not in cache, check DB
        if (!existsInCache) {
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
                throw new Error("Item already exists in cart");
            }
        } else {
            throw new Error("Item already exists in cart");
        }

        // 4️⃣ Item does not exist → add to Redis immediately
        cartData.cart.push({
            id: crypto.randomUUID(), // temp Redis ID
            productId,
            packaging: packagingsize,
            quantity
        });
        //   cartData.updatedAt = Date.now();

        await redisClient.set(cacheKey, JSON.stringify(cartData));

        // 5️⃣ Async DB sync
        (async () => {
            try {
                await prisma.cart.create({
                    data: {
                        userId,
                        productId,
                        quantity,
                        packaging: packagingsize
                    }
                });
            } catch (err: any) {
                // Handle unique constraint in case of race conditions
                if (err.code === "P2002") {
                    console.warn("Cart item already created in DB concurrently.");
                } else {
                    console.error("❌ Cart DB sync failed:", err);
                }
            }
        })();
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
        const cartKey = `cart:${userId}`;

        // 1️⃣ Load cart from Redis
        const cached = await redisClient.get(cartKey);
        if (!cached) return; // cache miss, could reload from DB if needed

        const cartData = JSON.parse(cached);

        // 2️⃣ Update cart in memory
        const index = cartData.cart.findIndex(
            (i: any) => i.productId === productId && i.packaging === packaging
        );

        if (index === -1) return; // item not found

        if (quantity <= 0) {
            // remove item
            cartData.cart.splice(index, 1);
        } else {
            cartData.cart[index].quantity = quantity;
        }

        cartData.updatedAt = Date.now();

        // 3️⃣ Save back to Redis
        await redisClient.set(cartKey, JSON.stringify(cartData), { EX: 300 });

        // 4️⃣ Async DB sync
        (async () => {
            try {
                if (quantity <= 0) {
                    await prisma.cart.delete({
                        where: {
                            userId_productId_packaging: { userId, productId, packaging }
                        }
                    });
                } else {
                    await prisma.cart.upsert({
                        where: {
                            userId_productId_packaging: { userId, productId, packaging }
                        },
                        update: { quantity },
                        create: { userId, productId, packaging, quantity }
                    });
                }
            } catch (err) {
                console.error("❌ Cart DB sync failed:", err);
            }
        })();
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

        const cacheKey = `cart:${userId}`;

        // 1️⃣ Read cart from Redis
        let cached = await redisClient.get(cacheKey);
        let cartData;

        if (!cached) {
            cartData = await this.preloadCartOnLogin(userId);
        } else {
            cartData = JSON.parse(cached);
        }

        const items = cartData.cart;
        const item = items.find((i: any) => i.id === cartId);

        if (!item) throw new NotFoundError("Cart item not found");

        const productId = newProductId ?? item.productId;
        const packaging = newPackaging ?? item.packaging;
        const quantity = newQuantity ?? item.quantity;

        // 2️⃣ Merge detection in Redis
        const duplicate = items.find(
            (i: any) =>
                i.id !== cartId &&
                i.productId === productId &&
                i.packaging === packaging
        );

        if (duplicate) {
            duplicate.quantity += quantity;
            cartData.cart = items.filter((i: any) => i.id !== cartId);
        } else {
            item.productId = productId;
            item.packaging = packaging;
            item.quantity = quantity;
        }

        cartData.updatedAt = Date.now();

        // 3️⃣ Save back to Redis (instant)
        await redisClient.set(
            cacheKey,
            JSON.stringify(cartData),
            { EX: 300 }
        );

        // 4️⃣ Async DB sync (DO NOT await)
        this.syncCartItemToDB(userId, cartId, productId, packaging, quantity)
            .catch(err => console.error("❌ Cart DB sync failed:", err));
    }



    async syncCartItemToDB(
        userId: string,
        cartId: string,
        productId: string,
        packaging: number,
        quantity: number
    ) {
        await prisma.$transaction(async (tx) => {

            try {
                await tx.cart.update({
                    where: { id: cartId },
                    data: { productId, packaging, quantity }
                });
                return;
            } catch (e: any) {
                if (e.code !== "P2002") throw e;
            }

            // merge case
            const duplicate = await tx.cart.findUnique({
                where: {
                    userId_productId_packaging: {
                        userId,
                        productId,
                        packaging
                    }
                }
            });

            if (!duplicate) throw new Error("Duplicate missing");

            await tx.cart.update({
                where: { id: duplicate.id },
                data: { quantity: { increment: quantity } }
            });

            await tx.cart.delete({ where: { id: cartId } });
        });
    }



    /*  async updateCartItem(
    userId: string,
    cartId: string,
    newProductId?: string,
    newPackaging?: number,
    newQuantity?: number
  ): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
  
            const cacheKey = `cart:${userId}`;
  
             const cached = await redisClient.get(cacheKey);
  
            if (cached) {
              const cart = JSON.parse(cached);
            }
  
  
  
        // 1️⃣ Get current cart row (minimal fields)
        const old = await tx.cart.findUnique({
          where: { id: cartId },
          select: { userId: true, productId: true, packaging: true, quantity: true }
        });
  
        if (!old) throw new NotFoundError("Cart item not found");
  
        const productId = newProductId ?? old.productId;
        const packaging = newPackaging ?? old.packaging;
        const quantity  = newQuantity ?? old.quantity;
  
        // 2️⃣ Try update directly (fast path)
        try {
          await tx.cart.update({
            where: { id: cartId },
            data: { productId, packaging, quantity }
          });
        } catch (e: any) {
          // 3️⃣ Unique constraint hit → merge instead
          if (e.code !== "P2002") throw e;
  
          const duplicate = await tx.cart.findUnique({
            where: {
              userId_productId_packaging: {
                userId: old.userId,
                productId,
                packaging
              }
            }
          });
  
          if (!duplicate) throw e;
  
          await tx.cart.update({
            where: { id: duplicate.id },
            data: { quantity: { increment: quantity } }
          });
  
          await tx.cart.delete({ where: { id: cartId } });
        }
  
        // 4️⃣ Invalidate Redis cart cache
        await redisClient.del(`cart:${old.userId}`);
      });
  
    } catch (error: any) {
      console.error("❌ Error updating cart item:", error);
      throw error;
    }
  } */

    // async updateCartItem(
    //     cartid: string,
    //     newproductId?: string,
    //     newpackaging?: number,
    //     newquantity?: number
    // ): Promise<void> {
    //     try {
    //         // 1️⃣ Fetch the cart item you're about to update
    //         const oldItem = await prisma.cart.findUnique({
    //             where: { id: cartid },
    //         });

    //         if (!oldItem) throw new NotFoundError("Cart item not found");

    //         const finalProductId = newproductId ?? oldItem.productId;
    //         const finalPackaging = newpackaging ?? oldItem.packaging;

    //         // 2️⃣ Check if another cart row already has (same userId, productId, packaging)
    //         const duplicate = await prisma.cart.findFirst({
    //             where: {
    //                 userId: oldItem.userId,
    //                 productId: finalProductId,
    //                 packaging: finalPackaging,
    //                 NOT: { id: cartid }, // don't match itself
    //             },
    //         });

    //         // MERGE case → if same productId + packaging already exists
    //         if (duplicate) {
    //             await prisma.cart.update({
    //                 where: { id: duplicate.id },
    //                 data: {
    //                     quantity: duplicate.quantity + (newquantity ?? oldItem.quantity),
    //                 },
    //             });

    //             // Delete the old row (because values moved to duplicate)
    //             await prisma.cart.delete({ where: { id: cartid } });

    //             console.log("Cart items merged instead of duplicate created.");
    //             return;
    //         }

    //         // 3️⃣ Normal update (no duplicate conflict)
    //         const updated = await prisma.cart.update({
    //             where: { id: cartid },
    //             data: {
    //                 productId: finalProductId,
    //                 packaging: finalPackaging,
    //                 quantity: newquantity ?? oldItem.quantity,
    //             },
    //         });

    //         console.log("Cart item updated:", updated);

    //     } catch (error: any) {
    //         if (error.code === "P2025") {
    //             throw new NotFoundError("Cart item not found!");
    //         }

    //         console.error("❌ Error updating cart item:", error);
    //         throw error;
    //     }
    // }





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
        // 1️⃣ Try cache first
        const cached = await redisClient.get(`carts:${userId}`);
        if (cached) return JSON.parse(cached);

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
        await redisClient.setEx(`carts:${userId}`, 60 * 60, JSON.stringify(cartObj));

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




