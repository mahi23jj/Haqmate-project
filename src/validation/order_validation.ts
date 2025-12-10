import {z} from "zod";
export const createMultiorderSchema = z.object({
    products: z.array(z.object({
        productId: z.string().uuid({message: "Invalid product ID"}),
        quantity: z.number().min(1, {message: "Quantity must be at least 1"}).optional(),
        packagingsize: z.number().min(0.1, {message: "Packaging size must be greater than 0"})
    })),
    shippinglocation: z.string().min(5, {message: "Location is too short"}).max(200, {message: "Location is too long"}),
    phoneNumber: z.string().min(7, {message: "Phone number is too short"}).max(15, {message: "Phone number is too long"}),
})

export type CreateProductInput = z.infer<typeof createMultiorderSchema>;