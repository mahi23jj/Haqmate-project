import {z} from "zod";
export const createProductSchema = z.object({
    name: z.string().min(1, {message: "Name is required"}).max(50, {message: "Name is too long"}),
    description: z.string().min(1, {message: "Description is required"}).max(500, {message: "Description is too long"}),
    price: z.coerce.number().min(0.01, {message: "Price must be greater than 0"}),
    teffType: z.string().min(1, {message: "Teff type is required"}).max(50, {message: "Teff type is too long"}),
    quality: z.string().max(50, {message: "Quality is too long"}).optional(),
    discount: z.coerce.number().min(0).max(100).optional(),
    instock: z.coerce.boolean().default(true).optional(),
})




export type CreateProductInput = z.infer<typeof createProductSchema>;
