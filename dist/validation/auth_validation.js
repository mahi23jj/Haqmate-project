import { z } from "zod";
export const loginSchema = z.object({
    email: z.email({
        message: "Invalid email"
    }),
    // make password to have 1 number , 1 small later , 1 capital letter , 1 specila character at least and 8 characters
    password: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/, { message: "Password must contain at least 1 number , 1 small later , 1 capital letter , 1 specila character at least and 8 characters" }),
    rememberMe: z.boolean().optional()
});
export const forgetpasswordSchema = z.object({
    email: z.email({
        message: "Invalid email"
    }),
    // make password to have 1 number , 1 small later , 1 capital letter , 1 specila character at least and 8 characters
    newPassword: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/, { message: "Password must contain at least 1 number , 1 small later , 1 capital letter , 1 specila character at least and 8 characters" }),
    otp: z.string().regex(/^\d{6}$/, { message: "OTP must be 6 digits" }),
});
export const registerSchema = z.object({
    email: z.email({
        message: "Invalid email"
    }),
    password: z
        .string()
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/, {
        message: "Password must contain at least 1 lowercase, 1 uppercase, 1 number, and be 8+ characters",
    }),
    username: z.string().min(3, { message: "Username must be at least 3 characters" }),
    phoneNumber: z.string().min(9, { message: "Phone number must be at least 9 characters" }),
});
export const adminCreateSchema = z.object({
    email: z.email({
        message: "Invalid email"
    }),
    password: z
        .string()
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/, {
        message: "Password must contain at least 1 lowercase, 1 uppercase, 1 number, and be 8+ characters",
    }),
    username: z.string().min(3, { message: "Username must be at least 3 characters" }),
    phoneNumber: z.string().min(9, { message: "Phone number must be at least 9 characters" }).optional(),
});
export const updatestatus = z.object({
    phoneNumber: z.string().min(9, { message: "Phone number must be at least 9 characters" }).optional(),
    location: z.string().optional(),
});
// confirm password confirmPassword: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/).refine((value) => value === registerSchema.shape.password, { message: "passwords do not match" })
//# sourceMappingURL=auth_validation.js.map