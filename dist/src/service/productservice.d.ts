import type { CreateProductInput } from '../validation/productvalidation.js';
import { FeedbackServiceImpl } from './feedbackservice.js';
export interface ProductService {
    getpopularProducts(limit?: number): Promise<{
        items: Product[];
    }>;
    getAllProducts(page?: number, limit?: number): Promise<{
        items: Product[];
        total: number;
    }>;
    getProductById(id: string, userId: string): Promise<Product | null>;
    createProduct(data: CreateProductInput): any;
    updatestock(id: string): any;
    searchProduct(query: string, page?: number, limit?: number): Promise<{
        items: Product[];
        total: number;
    }>;
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
    getpopularProducts(limit?: number): Promise<{
        items: Product[];
    }>;
    getAllProducts(page?: number, limit?: number): Promise<{
        items: Product[];
        total: number;
    }>;
    getProductById(id: string, userid: string): Promise<Product>;
    updatestock(id: string): Promise<any>;
    searchProduct(query: string, page?: number, limit?: number): Promise<{
        items: Product[];
        total: number;
    }>;
    createProduct(data: CreateProductInput): Promise<{
        teffType: {
            id: string;
            name: string;
        };
        quality: {
            id: string;
            name: string;
        } | null;
        images: {
            url: string;
            id: string;
            productId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        pricePerKg: number;
        teffTypeId: string;
        qualityId: string | null;
        discount: number | null;
        inStock: boolean;
        orderCount: number;
    }>;
}
//# sourceMappingURL=productservice.d.ts.map