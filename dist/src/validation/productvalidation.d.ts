import { z } from "zod";
export declare const createProductSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    price: z.ZodNumber;
    teffType: z.ZodString;
    images: z.ZodArray<z.ZodString>;
    quality: z.ZodOptional<z.ZodString>;
    discount: z.ZodOptional<z.ZodNumber>;
    instock: z.ZodBoolean;
}, z.core.$strip>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
//# sourceMappingURL=productvalidation.d.ts.map