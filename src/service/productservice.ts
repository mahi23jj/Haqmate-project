import { Prisma, PrismaClient } from '@prisma/client';
import { AppError, DatabaseError, NotFoundError } from '../utils/apperror.js';
import type { promises } from 'dns';
import type { CreateProductInput } from '../validation/productvalidation.js'
import { FeedbackServiceImpl } from './feedbackservice.js';


import { prisma } from '../prisma.js';
import { redisClient } from '../redis_test.js';

export interface ProductService {




  getAllProducts(page?: number, limit?: number): Promise<{ items: Product[]; total: number }>;
  getProductById(id: string, userId: string): Promise<Product | null>;
  createProduct(data: CreateProductInput): any;
  updatestock(id: string): any;
  searchProduct(query: string, page?: number, limit?: number): Promise<{ items: Product[]; total: number }>;
  //   updateProduct(id: number, data: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Product | null>;
  //   deleteProduct(id: number): Promise<boolean>;
}
export interface Product {
  id: string;
  name: string;
  images: string[];
  description: string;
  price: number;
  teffType: string;
  quality?: string;
  createdAt: Date;
  updatedAt: Date;
}


// Note: Actual implementation would interact with a database using an ORM like Prisma.
// This is just the interface definition as per the request.


export class ProductServiceImpl implements ProductService {

  constructor(
    private feedbackService: FeedbackServiceImpl = new FeedbackServiceImpl()
  ) { }

  async getAllProducts(page = 1, limit = 20): Promise<{ items: Product[]; total: number }> {
    try {

      const cacheKey = `all_products:${page}:${limit}`;

      const cached = await redisClient.get(cacheKey);
      if (cached) return JSON.parse(cached);
      // Fetch products with relations
      const [products, total] = await Promise.all([
        prisma.teffProduct.findMany({
          include: {
            teffType: true,
            quality: true,
            images: true,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: (page - 1) * limit,
        }),
        prisma.teffProduct.count(),
      ]);

      // Map DB data into Product interface
      const mappedProducts = products.map((prod) => {
        const baseProduct = {
          id: prod.id,
          name: prod.name,
          images: prod.images.map(img => img.url),
          description: prod.description ?? '',
          price: prod.pricePerKg,
          teffType: prod.teffType.name,
          createdAt: prod.createdAt,
          updatedAt: prod.updatedAt,
        };
        return prod.quality?.name
          ? { ...baseProduct, quality: prod.quality.name }
          : baseProduct;
      });

      const payload = { items: mappedProducts, total };

      await redisClient.set(cacheKey, JSON.stringify(payload));
      return payload;


    } catch (error) {
      console.error('❌ Error fetching products:', error);
      throw new Error('Failed to fetch products');
    }
  }



  async getProductById(id: string, userid: string): Promise<Product> {

    const cacheKey = `product:${id}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);


    try {

      const prod = await prisma.teffProduct.findUnique({
        where: { id },
        include: {
          teffType: true,
          quality: true,
          images: true,
        },
      });

      if (!prod) {
        throw new NotFoundError("Product not found");
      }

      // Instantiate feedback service

      const feedbackData = await this.feedbackService.gettopfeedbacks(id, userid);








      const baseProduct = {
        id: prod.id,
        name: prod.name,
        images: prod.images.map((img) => img.url),
        description: prod.description ?? "",
        price: prod.pricePerKg,
        teffType: prod.teffType.name,
        createdAt: prod.createdAt,
        updatedAt: prod.updatedAt,
        isstock: prod.inStock,
        discount: prod.discount,
        ...feedbackData,
      };

      const mapped = prod.quality?.name
        ? { ...baseProduct, quality: prod.quality.name }
        : baseProduct;

      await redisClient.set(cacheKey, JSON.stringify(mapped));
      return mapped;

    } catch (error) {
      console.error(`❌ Error fetching product with id ${id}:`, error);
      throw error;
    }
  }


  async updatestock(id: string): Promise<any> {
    // 1. Get current product
    const prod = await prisma.teffProduct.findUnique({
      where: { id },
      select: { inStock: true },
    });

    if (!prod) throw new Error("Stock not found");

    // 2. Update with opposite value
    await prisma.teffProduct.update({
      where: { id },
      data: {
        inStock: !prod.inStock,   // toggle true/false
      },
    });




    const allProductsKeys = await redisClient.keys('all_products:*');
    if (allProductsKeys.length > 0) {
      await redisClient.del(allProductsKeys);
    }
    await redisClient.del(`product:${id}`);
    return { message: "Stock updated" };
  }

  async searchProduct(
    query: string,
    page = 1,
    limit = 20
  ): Promise<{ items: Product[]; total: number }> {
    try {
      const trimmedQuery = (query ?? '').trim().toLowerCase();
      if (!trimmedQuery) return { items: [], total: 0 };

      const cacheKey = `search_products:${trimmedQuery}:${page}:${limit}`;

      // 1️⃣ Redis cache
      const cached = await redisClient.get(cacheKey);
      if (cached) return JSON.parse(cached);

      const whereClause: Prisma.TeffProductWhereInput = {
        OR: [
          {
            name: {
              contains: trimmedQuery,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            description: {
              contains: trimmedQuery,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            teffType: {
              is: {
                name: {
                  contains: trimmedQuery,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
          },
          {
            quality: {
              is: {
                name: {
                  contains: trimmedQuery,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
          },
        ],
      };


      const [products, total] = await Promise.all([
        prisma.teffProduct.findMany({
          where: whereClause,
          include: {
            teffType: true,
            quality: true,
            images: true,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: (page - 1) * limit,
        }),
        prisma.teffProduct.count({ where: whereClause }),
      ]);

      const mappedProducts = products.map((prod) => {
        const baseProduct = {
          id: prod.id,
          name: prod.name,
          images: prod.images.map((img) => img.url),
          description: prod.description ?? '',
          price: prod.pricePerKg,
          teffType: prod.teffType.name,
          createdAt: prod.createdAt,
          updatedAt: prod.updatedAt,
        };
        return prod.quality?.name
          ? { ...baseProduct, quality: prod.quality.name }
          : baseProduct;
      });

      const payload = { items: mappedProducts, total };

      // 3️⃣ Cache (1 min)
      await redisClient.set(cacheKey, JSON.stringify(payload), { EX: 60 });

      return payload;

    } catch (error) {
      console.error('❌ Error searching products:', error);
      throw new Error('Failed to search products');
    }
  }



  //   async searchProduct(query: string, page = 1, limit = 20): Promise<{ items: Product[]; total: number }> {
  //   try {
  //     const trimmedQuery = (query ?? '').trim().toLowerCase();
  //     if (!trimmedQuery) return { items: [], total: 0 };

  //     const cacheKey = `search_products:${trimmedQuery}:${page}:${limit}`;

  //     // 1️⃣ Redis cache check
  //     const cached = await redisClient.get(cacheKey);
  //     if (cached) {
  //       return JSON.parse(cached);
  //     }

  //     // 2️⃣ Prisma search
  //     const whereClause = {
  //       OR: [
  //         {
  //           name: {
  //             contains: trimmedQuery,
  //             mode: 'insensitive',
  //           },
  //         },
  //         {
  //           description: {
  //             contains: trimmedQuery,
  //             mode: 'insensitive',
  //           },
  //         },
  //         {
  //           teffType: {
  //             name: {
  //               contains: trimmedQuery,
  //               mode: 'insensitive',
  //             },
  //           },
  //         },
  //         {
  //           quality: {
  //             name: {
  //               contains: trimmedQuery,
  //               mode: 'insensitive',
  //             },
  //           },
  //         },
  //       ],
  //     };

  //     const [products, total] = await Promise.all([
  //       prisma.teffProduct.findMany({
  //         where: whereClause,
  //         include: {
  //           teffType: true,
  //           quality: true,
  //           images: true,
  //         },
  //         orderBy: { createdAt: 'desc' },
  //         take: limit,
  //         skip: (page - 1) * limit,
  //       }),
  //       prisma.teffProduct.count({ where: whereClause }),
  //     ]);

  //     // 3️⃣ Map to Product interface
  //     const mappedProducts = products.map((prod) => {
  //       const baseProduct = {
  //         id: prod.id,
  //         name: prod.name,
  //         images: prod.images.map((img) => img.url),
  //         description: prod.description ?? '',
  //         price: prod.pricePerKg,
  //         teffType: prod.teffType.name,
  //         createdAt: prod.createdAt,
  //         updatedAt: prod.updatedAt,
  //       };

  //       return prod.quality?.name
  //         ? { ...baseProduct, quality: prod.quality.name }
  //         : baseProduct;
  //     });

  //     // 4️⃣ Cache result (short TTL)
  //     const payload = { items: mappedProducts, total };

  //     await redisClient.set(
  //       cacheKey,
  //       JSON.stringify(payload),
  //       { EX: 60 } // ⏱️ 1 minute cache
  //     );

  //     return payload;
  //   } catch (error) {
  //     console.error('❌ Error searching products:', error);
  //     throw new Error('Failed to search products');
  //   }
  // }



  async createProduct(
    data: CreateProductInput
  ) {
    try {
      const result = await prisma.$transaction(async (tx) => {

        // 1️⃣ Find or create TeffType
        let newtype = await tx.teffType.upsert({
          where: { name: data.teffType },
          update: { name: data.teffType },
          create: { name: data.teffType },
        }
        )

        // 2️⃣ Create TeffQuality if provided
        let newquality = null;
        if (data.quality) {
          newquality = await tx.teffQuality.create({
            data: { name: data.quality },
          });
        }

        // 3️⃣ Prepare product data
        const productData: any = {
          name: data.name,
          description: data.description,
          pricePerKg: data.price,
          teffType: { connect: { id: newtype.id } },
          inStock: data.instock ?? true,
          discount: data.discount ?? null
        };

        if (newquality) {
          productData.quality = { connect: { id: newquality.id } };
        }

        // 4️⃣ Create product
        const newProd = await tx.teffProduct.create({
          data: productData,
          include: { teffType: true, quality: true, images: true },
        });

        // 5️⃣ Create images
        if (data.images && data.images.length > 0) {
          await tx.image.createMany({
            data: data.images.map((url) => ({
              url,
              productId: newProd.id,
            })),
          });
        }

        return newProd; // <-- ✔ IMPORTANT
      });

      const allProductsKeys = await redisClient.keys('all_products:*');
      if (allProductsKeys.length > 0) {
        await redisClient.del(allProductsKeys);
      }
      await redisClient.del(`product:${result.id}`);

      return result; // <-- return transaction result
    }
    catch (error: any) {
      console.error("❌ Error creating product:", error);


      if (error.code === "P2002") {
        throw new AppError("Duplicate field value", 409);
      }

      throw new DatabaseError()

    }
  }




}



