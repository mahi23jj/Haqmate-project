import type { CreateProductInput } from '../validation/productvalidation.js';
import { FeedbackServiceImpl } from './feedbackservice.js';
export interface ProductService {
    getAllProducts(): Promise<Product[]>;
    getProductById(id: string): Promise<Product | null>;
    createProduct(data: CreateProductInput & {
        images?: string[];
    }): any;
    updatestock(id: string): any;
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
    getAllProducts(): Promise<Product[]>;
    getProductById(id: string): Promise<Product>;
    updatestock(id: string): Promise<any>;
    createProduct(data: CreateProductInput & {
        images?: string[];
    }): Promise<{
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
        rating: number | null;
        totalRating: number;
        orderCount: number;
    }>;
}
//# sourceMappingURL=telebirr_productservice.d.ts.map