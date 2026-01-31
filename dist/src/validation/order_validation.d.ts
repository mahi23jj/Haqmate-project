import { z } from "zod";
export declare const createMultiorderSchema: z.ZodObject<{
    products: z.ZodArray<z.ZodObject<{
        productId: z.ZodString;
        quantity: z.ZodOptional<z.ZodNumber>;
        packagingsize: z.ZodNumber;
    }, z.core.$strip>>;
    phoneNumber: z.ZodString;
    paymentMethod: z.ZodEnum<{
        Chapa: "Chapa";
        Telebirr: "Telebirr";
        "Send Screenshot": "Send Screenshot";
    }>;
    orderRecived: z.ZodEnum<{
        Delivery: "Delivery";
        Pickup: "Pickup";
    }>;
    idempotencyKey: z.ZodString;
}, z.core.$strip>;
export type CreateProductInput = z.infer<typeof createMultiorderSchema>;
//# sourceMappingURL=order_validation.d.ts.map