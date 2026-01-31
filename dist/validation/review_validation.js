import { z } from "zod";
export const reviewSchema = z.object({
    rating: z.number().min(1, { message: "Rating must be at least 1" }).max(5, { message: "Rating must be at most 5" }),
    message: z.string().min(1, { message: "Message must be at least 1 character" }).max(500, { message: "Message must be at most 500 characters" })
});
//# sourceMappingURL=review_validation.js.map