import { z } from "zod";
export declare const createProductSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    price: z.ZodCoercedNumber<unknown>;
    teffType: z.ZodString;
    quality: z.ZodOptional<z.ZodString>;
    discount: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    instock: z.ZodOptional<z.ZodDefault<z.ZodCoercedBoolean<unknown>>>;
}, z.core.$strip>;
export declare const updateProductSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    price: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    teffType: z.ZodOptional<z.ZodString>;
    quality: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
//# sourceMappingURL=productvalidation.d.ts.map