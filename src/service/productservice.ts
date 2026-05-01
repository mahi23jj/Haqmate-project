import { Prisma, PrismaClient } from '@prisma/client';
import {
  AppError,
  DatabaseError,
  NotFoundError,
  ValidationError
} from '../utils/apperror.js';

import type { CreateProductInput, UpdateProductInput } from '../validation/productvalidation.js';
import { FeedbackServiceImpl } from './feedbackservice.js';
import type { Express } from 'express';
import type { UploadApiResponse } from 'cloudinary';
import { cloudinary } from '../config.js';

import { prisma } from '../prisma.js';

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

export interface ProductService {
  getpopularProducts(limit?: number): Promise<{ items: Product[] }>;
  getAllProducts(page?: number, limit?: number): Promise<{ items: Product[]; total: number }>;
  getProductById(id: string, userId: string, role: 'ADMIN' | 'USER'): Promise<any>;
  createProduct(data: CreateProductInput, files?: Express.Multer.File[]): Promise<any>;
  updateProduct(id: string, data: UpdateProductInput, files?: Express.Multer.File[]): Promise<any>;
  updatestock(id: string): Promise<any>;
  searchProduct(query: string, page?: number, limit?: number): Promise<{ items: Product[]; total: number }>;
  deleteProduct(id: string): Promise<boolean>;
}

export class ProductServiceImpl implements ProductService {

  constructor(
    private feedbackService: FeedbackServiceImpl = new FeedbackServiceImpl()
  ) {}

  // ---------------------------
  // 🔁 UTIL: Map DB → Product
  // ---------------------------
  private mapProduct(prod: any): Product {
    return {
      id: prod.id,
      name: prod.name,
      images: prod.images.map((img: any) => img.url),
      description: prod.description ?? '',
      price: prod.pricePerKg,
      teffType: prod.teffType.name,
      quality: prod.quality?.name,
      createdAt: prod.createdAt,
      updatedAt: prod.updatedAt
    };
  }

  // ---------------------------
  // 📤 Upload helpers
  // ---------------------------
  private uploadToCloudinary(file: Express.Multer.File): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'products', resource_type: 'image' },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve(result);
        }
      );
      stream.end(file.buffer);
    });
  }

  private async uploadFiles(files: Express.Multer.File[] = []): Promise<string[]> {
    if (!files.length) return [];
    const uploaded = await Promise.all(files.map(f => this.uploadToCloudinary(f)));
    return uploaded.map(r => r.secure_url);
  }

  // ---------------------------
  // 🗑 Delete
  // ---------------------------
  async deleteProduct(id: string): Promise<boolean> {
    try {
      const exists = await prisma.teffProduct.findUnique({ where: { id } });
      if (!exists) return false;

      await prisma.$transaction([
        prisma.feedbackAnalytics.deleteMany({ where: { feedback: { productid: id } } }),
        prisma.feedback.deleteMany({ where: { productid: id } }),
        prisma.image.deleteMany({ where: { productId: id } }),
        prisma.cart.deleteMany({ where: { productId: id } }),
        prisma.teffProduct.delete({ where: { id } })
      ]);

      return true;

    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new ValidationError('Product has related records');
      }
      throw new DatabaseError();
    }
  }

  // ---------------------------
  // ⭐ Popular
  // ---------------------------
  async getpopularProducts(limit = 4) {
    const products = await prisma.teffProduct.findMany({
      include: { teffType: true, quality: true, images: true },
      orderBy: { orderCount: 'desc' },
      take: limit
    });

    return { items: products.map(p => this.mapProduct(p)) };
  }

  // ---------------------------
  // 📦 All Products
  // ---------------------------
  async getAllProducts(page = 1, limit = 20) {
    const [products, total] = await Promise.all([
      prisma.teffProduct.findMany({
        include: { teffType: true, quality: true, images: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit
      }),
      prisma.teffProduct.count()
    ]);

    return {
      items: products.map(p => this.mapProduct(p)),
      total
    };
  }

  // ---------------------------
  // 🔍 Get by ID
  // ---------------------------
  async getProductById(id: string, userId: string, role: 'ADMIN' | 'USER') {
    const product = await prisma.teffProduct.findUnique({
      where: { id },
      include: { teffType: true, quality: true, images: true }
    });

    if (!product) throw new NotFoundError('Product not found');

    const feedbackOptions = {
      page: 1,
      limit: 5,
      topOnly: role !== 'ADMIN',
      ...(role !== 'ADMIN' ? { includeUserId: userId } : {})
    };

    const feedback = await this.feedbackService.getFeedbackByProduct(id, feedbackOptions);

    return {
      ...this.mapProduct(product),
      rating: product.rating,
      totalRating: product.totalRating,
      inStock: product.inStock,
      ...feedback
    };
  }

  // ---------------------------
  // 🔄 Toggle Stock
  // ---------------------------
  async updatestock(id: string) {
    const product = await prisma.teffProduct.findUnique({ where: { id } });
    if (!product) throw new NotFoundError('Product not found');

    await prisma.teffProduct.update({
      where: { id },
      data: { inStock: !product.inStock }
    });

    return { message: 'Stock updated' };
  }

  // ---------------------------
  // 🔍 Search
  // ---------------------------
  async searchProduct(query: string, page = 1, limit = 20) {
    const q = query.trim();
    if (!q) return { items: [], total: 0 };

    const where: Prisma.TeffProductWhereInput = {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { teffType: { is: { name: { contains: q, mode: 'insensitive' } } } }
      ]
    };

    const [products, total] = await Promise.all([
      prisma.teffProduct.findMany({
        where,
        include: { teffType: true, quality: true, images: true },
        take: limit,
        skip: (page - 1) * limit
      }),
      prisma.teffProduct.count({ where })
    ]);

    return {
      items: products.map(p => this.mapProduct(p)),
      total
    };
  }

  // ---------------------------
  // ✏️ Update Product
  // ---------------------------
  async updateProduct(id: string, data: UpdateProductInput, files: Express.Multer.File[] = []) {
    const exists = await prisma.teffProduct.findUnique({ where: { id } });
    if (!exists) throw new NotFoundError('Product not found');

    const uploadedUrls = await this.uploadFiles(files);

    const updated = await prisma.$transaction(async (tx) => {

      const updateData: Prisma.TeffProductUpdateInput = {};

      if (data.name) updateData.name = data.name.trim();
      if (data.description) updateData.description = data.description;
      if (data.price) updateData.pricePerKg = data.price;

      if (data.teffType) {
        const t = await tx.teffType.upsert({
          where: { name: data.teffType.trim() },
          update: {},
          create: { name: data.teffType.trim() }
        });
        updateData.teffType = { connect: { id: t.id } };
      }

      await tx.teffProduct.update({
        where: { id },
        data: updateData
      });

      if (uploadedUrls.length) {
        await tx.image.createMany({
          data: uploadedUrls.map(url => ({ url, productId: id }))
        });
      }

      return tx.teffProduct.findUnique({
        where: { id },
        include: { teffType: true, quality: true, images: true }
      });
    });

    return updated;
  }

  // ---------------------------
  // ➕ Create Product
  // ---------------------------
  async createProduct(data: CreateProductInput, files: Express.Multer.File[] = []) {
    const urls = await this.uploadFiles(files);
    if (!urls.length) throw new AppError('Image required', 400);

    const product = await prisma.$transaction(async (tx) => {

      const type = await tx.teffType.upsert({
        where: { name: data.teffType.trim() },
        update: {},
        create: { name: data.teffType.trim() }
      });

      const quality = data.quality
        ? await tx.teffQuality.upsert({
            where: { name: data.quality.trim() },
            update: {},
            create: { name: data.quality.trim() }
          })
        : null;

      const productData: Prisma.TeffProductCreateInput = {
        name: data.name.trim(),
        description: data.description,
        pricePerKg: data.price,
        teffType: { connect: { id: type.id } },
        images: {
          createMany: { data: urls.map(url => ({ url })) }
        }
      };

      if (quality) {
        productData.quality = { connect: { id: quality.id } };
      }

      return tx.teffProduct.create({
        data: productData
      });
    });

    return product;
  }
}
