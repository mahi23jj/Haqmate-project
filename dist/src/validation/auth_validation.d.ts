import { z } from "zod";
export declare const loginSchema: z.ZodObject<{
    email: z.ZodEmail;
    password: z.ZodString;
    rememberMe: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const forgetpasswordSchema: z.ZodObject<{
    email: z.ZodEmail;
    newPassword: z.ZodString;
    otp: z.ZodString;
}, z.core.$strip>;
export declare const registerSchema: z.ZodObject<{
    email: z.ZodEmail;
    password: z.ZodString;
    username: z.ZodString;
    phoneNumber: z.ZodString;
}, z.core.$strip>;
export declare const updatestatus: z.ZodObject<{
    phoneNumber: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
//# sourceMappingURL=auth_validation.d.ts.map