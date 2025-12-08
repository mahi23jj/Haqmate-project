import {z} from "zod";
export const createProductSchema = z.object({
    name: z.string().min(1, {message: "Name is required"}).max(50, {message: "Name is too long"}),
    description: z.string().min(1, {message: "Description is required"}).max(500, {message: "Description is too long"}),
    price: z.number().min(0.01, {message: "Price must be greater than 0"}),
    teffType: z.string().min(1, {message: "Teff type is required"}).max(50, {message: "Teff type is too long"}),
    images: z.array(z.string()).min(1, {message: "At least one image is required"}),
    quality: z.string().max(50, {message: "Quality is too long"}).optional(),
    discount: z.number().min(0).max(100).optional(),
    instock: z.boolean(),
})




export type CreateProductInput = z.infer<typeof createProductSchema>;
