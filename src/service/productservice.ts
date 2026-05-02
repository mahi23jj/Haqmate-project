import { Prisma, PrismaClient } from '@prisma/client';
import { AppError, DatabaseError, NotFoundError, ValidationError } from '../utils/apperror.js';
import type { promises } from 'dns';
import type { CreateProductInput, UpdateProductInput } from '../validation/productvalidation.js'
import { FeedbackServiceImpl } from './feedbackservice.js';
import type { Express } from 'express';
import type { UploadApiResponse } from 'cloudinary';
import { cloudinary } from '../config.js';


import { prisma } from '../prisma.js';


export interface ProductService {



  getpopularProducts(limit?: number): Promise<{ items: Product[] }>;
  getAllProducts(page?: number, limit?: number): Promise<{ items: Product[]; total: number }>;
  getProductById(id: string, userId: string, role: 'ADMIN' | 'USER'): Promise<any>;
  createProduct(data: CreateProductInput, files?: Express.Multer.File[]): any;
  updateProduct(id: string, data: UpdateProductInput, files?: Express.Multer.File[]): any;
  updatestock(id: string): any;
  searchProduct(query: string, page?: number, limit?: number): Promise<{ items: Product[]; total: number }>;
  //updateProduct(id: number, data: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Product | null>;
  deleteProduct(id: string): Promise<boolean>;
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

  private uploadToCloudinary(file: Express.Multer.File): Promise<UploadApiResponse> {
    return new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'products',
          resource_type: 'image',
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary upload failed'));
            return;
          }
          resolve(result);
        }
      );

      stream.end(file.buffer);
    });
  }

  private async uploadFilesToCloudinary(files: Express.Multer.File[] = []): Promise<string[]> {
    if (files.length === 0) return [];
    const uploaded = await Promise.all(files.map((file) => this.uploadToCloudinary(file)));
    return uploaded.map((item) => item.secure_url);
  }


  // delete a product by id
  async deleteProduct(id: string): Promise<boolean> {
    try {
      const existing = await prisma.teffProduct.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existing) {
        return false;
      }

      await prisma.$transaction([
        prisma.feedbackAnalytics.deleteMany({
          where: { feedback: { productid: id } },
        }),
        prisma.feedback.deleteMany({
          where: { productid: id },
        }),
        prisma.image.deleteMany({
          where: { productId: id },
        }),
        prisma.cart.deleteMany({
          where: { productId: id },
        }),
        prisma.teffProduct.delete({
          where: { id },
        }),
      ]);

      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return false;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ValidationError('Cannot delete product because it is referenced by related records.');
      }
      console.error('❌ Error deleting product:', error);
      throw new DatabaseError();
    }
  }

  // update a product by id
  // async updateProduct(id: number, data: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Product | null> {
  //   try {
  //     const updated = await prisma.teffProduct.update({
  //       where: { id: String(id) },
  //       data: {
  //         name: data.name,
  //         description: data.description,
  //         pricePerKg: data.price,
  //         // teffType and quality updates would require additional logic to handle relations
  //       },
  //       include: {
  //         teffType: true,
  //         quality: true,
  //         images: true,
  //       },
  //     });
  //     if (!updated) return null;

  //     return {
  //       id: updated.id,
  //       name: updated.name,
  //       images: updated.images.map(img => img.url),
  //       description: updated.description ?? '',
  //       price: updated.pricePerKg,
  //       teffType: updated.teffType.name,
  //       quality: updated.quality?.name,
  //       createdAt: updated.createdAt,
  //       updatedAt: updated.updatedAt,
  //     };
  //   } catch (error) {
  //     console.error('❌ Error updating product:', error);
  //     throw new DatabaseError();
  //   }
  // }

  // get popular product
  async getpopularProducts(limit = 4): Promise<{ items: Product[] }> {
    try {
      const products = await prisma.teffProduct.findMany({
        include: {
          teffType: true,
          quality: true,
          images: true,
        },
        orderBy: {
          orderCount: 'desc',
        },
        take: limit,
      });


      const mappedProducts = products.map((prod) => {
        const baseProduct = {
          id: prod.id,
          name: prod.name,
          images: prod.images.map(img => img.url),
          description: prod.description ?? '',
          price: prod.pricePerKg,
          teffType: prod.teffType.name,
          rating: prod.rating,
          totalRating: prod.totalRating,
          createdAt: prod.createdAt,
          updatedAt: prod.updatedAt,
        };
        return prod.quality?.name
          ? { ...baseProduct, quality: prod.quality.name }
          : baseProduct;
      });

      const payload = { items: mappedProducts };

      // await redisClient.set(cacheKey, JSON.stringify(payload));
      return payload;

      // return products;
    } catch (error) {
      console.error(error);
      throw new Error('Failed to get popular products');
    }
  }

  async getAllProducts(page = 1, limit = 20): Promise<{ items: Product[]; total: number }> {
    try {

      /*      const cacheKey = `all_products:${page}:${limit}`;
     
           const cached = await redisClient.get(cacheKey);
           if (cached) return JSON.parse(cached); */
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
          inStock: prod.inStock,
          rating: prod.rating,
          totalRating: prod.totalRating,
        };
        return prod.quality?.name
          ? { ...baseProduct, quality: prod.quality.name }
          : baseProduct;
      });

      const payload = { items: mappedProducts, total };

      // await redisClient.set(cacheKey, JSON.stringify(payload));
      return payload;


    } catch (error) {
      console.error('❌ Error fetching products:', error);
      throw new Error('Failed to fetch products');
    }
  }



  // async getProductById(id: string, userid: string): Promise<Product> {

  //   const cacheKey = `product:${id}`;
  //   const cached = await redisClient.get(cacheKey);
  //   if (cached) return JSON.parse(cached);

  //   let feedbackData = null;

  async getProductById(
    id: string,
    userId: string,
    role: 'ADMIN' | 'USER'
  ) {
    // const cacheKey = `product:${id}:${role}`;
    // const cached = await redisClient.get(cacheKey);
    // if (cached) return JSON.parse(cached); 


    try {



      const product = await prisma.teffProduct.findUnique({
        where: { id },
        include: {
          teffType: true,
          quality: true,
          images: true,
        },
      });

      if (!product) throw new NotFoundError("Product not found");

      const feedbackOptions: any = {
        page: 1,
        limit: 5,
        topOnly: role !== 'ADMIN',
      };
      if (role !== 'ADMIN') {
        feedbackOptions.includeUserId = userId;
      }
      const feedback = await this.feedbackService.getFeedbackByProduct(id, feedbackOptions);

      const response = {
        id: product.id,
        name: product.name,
        description: product.description ?? "",
        price: Number(product.pricePerKg),
        rating: product.rating,
        totalRating: product.totalRating,
        isStock: product.inStock,
        images: product.images.map(img => img.url),
        teffType: product.teffType.name,
        quality: product.quality?.name ?? null,
        ...feedback
      };

      // await redisClient.set(cacheKey, JSON.stringify(response), { EX: 60 });

      return response;



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
          }
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
        return baseProduct;
        /*     ? { ...baseProduct, quality: prod.quality.name }
            : baseProduct; */
      });

      const payload = { items: mappedProducts, total };



      return payload;

    } catch (error) {
      console.error('❌ Error searching products:', error);
      throw new Error('Failed to search products');
    }
  }

  async updateProduct(
    id: string,
    data: UpdateProductInput,
    files: Express.Multer.File[] = []
  ) {
    try {
      const existing = await prisma.teffProduct.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existing) {
        throw new NotFoundError('Product not found');
      }

      const uploadedUrls = await this.uploadFilesToCloudinary(files);

      const result = await prisma.$transaction(async (tx) => {
        const updateData: Prisma.TeffProductUpdateInput = {};

        if (typeof data.name === 'string') {
          updateData.name = data.name.trim();
        }

        if (typeof data.description === 'string') {
          updateData.description = data.description;
        }

        if (typeof data.price === 'number') {
          updateData.pricePerKg = data.price;
        }

        if (typeof data.teffType === 'string') {
          const teffTypeName = data.teffType.trim();
          const teffType = await tx.teffType.upsert({
            where: { name: teffTypeName },
            update: {},
            create: { name: teffTypeName },
          });

          updateData.teffType = {
            connect: { id: teffType.id },
          };
        }

        if (data.quality !== undefined) {
          const qualityName = data.quality.trim();
          if (!qualityName) {
            updateData.quality = { disconnect: true };
          } else {
            const quality = await tx.teffQuality.upsert({
              where: { name: qualityName },
              update: {},
              create: { name: qualityName },
            });
            updateData.quality = {
              connect: { id: quality.id },
            };
          }
        }

        await tx.teffProduct.update({
          where: { id },
          data: updateData,
        });

        if (uploadedUrls.length > 0) {
          await tx.image.createMany({
            data: uploadedUrls.map((url) => ({
              url,
              productId: id,
            })),
          });
        }

        const updated = await tx.teffProduct.findUnique({
          where: { id },
          include: {
            teffType: true,
            quality: true,
            images: true,
          },
        });

        if (!updated) {
          throw new NotFoundError('Product not found');
        }

        return updated;
      }, { maxWait: 5000, timeout: 15000 });

      return result;
    } catch (error: any) {
      console.error('❌ Error updating product:', error);

      if (error instanceof NotFoundError) {
        throw error;
      }

      if (error.code === 'P2002') {
        throw new AppError('Duplicate field value', 409);
      }

      if (error.code === 'P2003') {
        throw new AppError('Invalid relation reference', 400);
      }

      if (error.code === 'P2025') {
        throw new NotFoundError('Product not found');
      }

      throw new DatabaseError();
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



  async createProduct(data: CreateProductInput, files: Express.Multer.File[] = []) {
    try {
      const uploadedUrls = await this.uploadFilesToCloudinary(files);

      // if (uploadedUrls.length === 0 && data.images && data.images.length > 0) {
      //   uploadedUrls.push(...data.images);
      // }

      if (uploadedUrls.length === 0) {
        throw new AppError('At least one image is required', 400);
      }

      const result = await prisma.$transaction(async (tx) => {

        // 🔹 Normalize inputs
        const teffTypeName = data.teffType.trim();
        const qualityName = data.quality?.trim();

        // 1️⃣ Find or create TeffType
        const newtype = await tx.teffType.upsert({
          where: { name: teffTypeName },
          update: {}, // nothing to update
          create: { name: teffTypeName },
        });



        // 2️⃣ Find or create TeffQuality (if provided)
        let newquality = null;
        if (qualityName) {
          newquality = await tx.teffQuality.upsert({
            where: { name: qualityName },
            update: {},
            create: { name: qualityName },
          });
        }

        // 3️⃣ Prepare product data
        const productData: any = {
          name: data.name.trim(),
          description: data.description,
          pricePerKg: data.price,
          teffType: { connect: { id: newtype.id } },
          inStock: data.instock ?? true,
          discount: data.discount ?? null,
        };

        if (newquality) {
          productData.quality = { connect: { id: newquality.id } };
        }

        if (uploadedUrls.length > 0) {
          productData.images = {
            createMany: {
              data: uploadedUrls.map((url) => ({ url })),
            },
          };
        }

        // 4️⃣ Create product
        const newProd = await tx.teffProduct.create({
          data: productData,
          include: {
            teffType: true,
            quality: true,
            images: true,
          },
        });

        return newProd;
      }, { maxWait: 5000, timeout: 15000 });

    } catch (error: any) {
      console.error('❌ Error creating product:', error);

      // Prisma known errors
      if (error.code === 'P2002') {
        throw new AppError('Duplicate field value', 409);
      }

      if (error.code === 'P2003') {
        throw new AppError('Invalid relation reference', 400);
      }

      if (error.code === 'P2025') {
        throw new AppError('Related record not found', 404);
      }

      throw new DatabaseError();
    }
  }





}



