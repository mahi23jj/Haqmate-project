import type { CreateProductInput, UpdateProductInput } from '../validation/productvalidation.js';
import { FeedbackServiceImpl } from './feedbackservice.js';
export interface ProductService {
    getpopularProducts(limit?: number): Promise<{
        items: Product[];
    }>;
    getAllProducts(page?: number, limit?: number): Promise<{
        items: Product[];
        total: number;
    }>;
    getProductById(id: string, userId: string, role: 'ADMIN' | 'USER'): Promise<any>;
    createProduct(data: CreateProductInput, files?: Express.Multer.File[]): any;
    updateProduct(id: string, data: UpdateProductInput, files?: Express.Multer.File[]): any;
    updatestock(id: string): any;
    searchProduct(query: string, page?: number, limit?: number): Promise<{
        items: Product[];
        total: number;
    }>;
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
export declare class ProductServiceImpl implements ProductService {
    private feedbackService;
    constructor(feedbackService?: FeedbackServiceImpl);
    private uploadToCloudinary;
    private uploadFilesToCloudinary;
    deleteProduct(id: string): Promise<boolean>;
    getpopularProducts(limit?: number): Promise<{
        items: Product[];
    }>;
    getAllProducts(page?: number, limit?: number): Promise<{
        items: Product[];
        total: number;
    }>;
    getProductById(id: string, userId: string, role: 'ADMIN' | 'USER'): Promise<{
        feedback: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            productid: string;
            rating: number;
            message: string | null;
            submittedAt: Date;
        }[];
        averageRating: number | null;
        totalRatings: number;
        total: number;
        id: string;
        name: string;
        description: string;
        price: number;
        rating: number | null;
        totalRating: number;
        isStock: boolean;
        images: string[];
        teffType: string;
        quality: string | null;
    }>;
    updatestock(id: string): Promise<any>;
    searchProduct(query: string, page?: number, limit?: number): Promise<{
        items: Product[];
        total: number;
    }>;
    updateProduct(id: string, data: UpdateProductInput, files?: Express.Multer.File[]): Promise<{
        teffType: {
            name: string;
            id: string;
        };
        quality: {
            name: string;
            id: string;
        } | null;
        images: {
            id: string;
            productId: string;
            url: string;
        }[];
    } & {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rating: number | null;
        description: string | null;
        pricePerKg: number;
        teffTypeId: string;
        qualityId: string | null;
        discount: number | null;
        inStock: boolean;
        totalRating: number;
        orderCount: number;
    }>;
    createProduct(data: CreateProductInput, files?: Express.Multer.File[]): Promise<{
        teffType: {
            name: string;
            id: string;
        };
        quality: {
            name: string;
            id: string;
        } | null;
        images: {
            id: string;
            productId: string;
            url: string;
        }[];
    } & {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rating: number | null;
        description: string | null;
        pricePerKg: number;
        teffTypeId: string;
        qualityId: string | null;
        discount: number | null;
        inStock: boolean;
        totalRating: number;
        orderCount: number;
    }>;
}
//# sourceMappingURL=productservice.d.ts.map