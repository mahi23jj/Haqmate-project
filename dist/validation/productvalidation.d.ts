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
export type CreateProductInput = z.infer<typeof createProductSchema>;
//# sourceMappingURL=productvalidation.d.ts.map