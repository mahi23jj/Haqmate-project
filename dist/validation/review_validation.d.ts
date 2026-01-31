import { z } from "zod";
export declare const reviewSchema: z.ZodObject<{
    rating: z.ZodNumber;
    message: z.ZodString;
}, z.core.$strip>;
export type CreateReviewInput = z.infer<typeof reviewSchema>;
//# sourceMappingURL=review_validation.d.ts.map