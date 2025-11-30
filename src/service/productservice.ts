import { PrismaClient } from '@prisma/client';
import { AppError, DatabaseError, NotFoundError } from '../utils/apperror.js';
import type { promises } from 'dns';
import type { CreateProductInput } from '../validation/productvalidation.js'
import { FeedbackServiceImpl } from '../service/feedbackservice.js';


const prisma = new PrismaClient();

export interface ProductService {




  getAllProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | null>;
  createProduct(data: CreateProductInput): any;
  updatestock(id: string): any;
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

  async getAllProducts(): Promise<Product[]> {
    try {
      // Fetch products with relations
      const products = await prisma.teffProduct.findMany({
        include: {
          teffType: true,
          quality: true,
          images: true,
        },
      });

      // Map DB data into Product interface
      return products.map((prod) => {
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
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      throw new Error('Failed to fetch products');
    }
  }


  async getProductById(id: string): Promise<Product> {
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

      const feedbackData = await this.feedbackService.gettopfeedbacks(id);
       




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
        discount : prod.discount,
        ... feedbackData,
      };

      return prod.quality?.name
        ? { ...baseProduct, quality: prod.quality.name }
        : baseProduct;
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
          instock: true,
          discount : data.discount ?? null
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
