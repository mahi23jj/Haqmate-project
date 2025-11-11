import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../errors/apperror.js';
const prisma = new PrismaClient();


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
    getAllProducts(): Promise<Product[]>;
    getProductById(id: string): Promise<Product | null>;
    createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): void;
    //   updateProduct(id: number, data: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Product | null>;
    //   deleteProduct(id: number): Promise<boolean>;
}

// Note: Actual implementation would interact with a database using an ORM like Prisma.
// This is just the interface definition as per the request.


export class ProductServiceImpl implements ProductService {

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
                where: { id: id },
                include: {
                    teffType: true,
                    quality: true,
                    images: true,
                },
            });

            if (!prod) {
                throw new NotFoundError('Product not found');
            }

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


        } catch (error) {
            console.error(`❌ Error fetching product with id ${id}:`, error);
            throw new Error('Failed to fetch product');
        }
    }

    async createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
        try {

            let newtype = await prisma.teffType.findFirst({
                where: { name: data.teffType },
            });

            if (!newtype) {
                newtype = await prisma.teffType.create({
                    data: { name: data.teffType },
                });
            }

            const newquality = data.quality ? await prisma.teffQuality.create({
                data: {
                    name: data.quality
                }
            }) : null;

            const productData: any = {
                name: data.name,
                description: data.description,
                pricePerKg: data.price,
                teffType: {
                    connect: { id: newtype.id },
                },
            };
            if (newquality) {
                productData.quality = {
                    connect: { id: newquality.id },
                };
            }

            const newProd = await prisma.teffProduct.create({
                data: productData,
                include: {
                    teffType: true,
                    quality: true,
                    images: true,
                },
            });

            if (data.images && data.images.length > 0) {
                await prisma.image.createMany({
                    data: data.images.map((url) => ({
                        url,
                        productId: newProd.id, // ✅ link image to the created product
                    })),
                });
            }

            if (!newProd) {
                throw new Error('Product creation failed');
            } else {
                console.log('✅ Product created successfully:', newProd);
            }

        } catch (error) {
            console.error('❌ Error creating product:', error);
            throw new Error('Failed to create product');
        }
    }

}
