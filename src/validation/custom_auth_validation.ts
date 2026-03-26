import { z } from "zod";

const phoneRegex = /^\+251\d{9}$/;

// password just check only 6 charachter 

const passwordRegex = /^.{6,}$/;

export const authSignupSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, { message: "Username must be at least 3 characters" }),
  phoneNumber: z
    .string()
    .regex(phoneRegex, { message: "Phone number must be a valid Ethiopian number starting with +251" }),
  password: z
    .string()
    .regex(passwordRegex, {
      message:
        "Password must be 6+ characters",
    }),
  subcity: z.string().optional(),
  Adress: z.string().optional(),
});

export const authLoginSchema = z.object({
  phoneNumber: z
    .string()
    .regex(phoneRegex, { message: "Phone number must be a valid Ethiopian number starting with +251" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export const requestForgotPasswordSchema = z.object({
  phoneNumber: z
    .string()
    .regex(phoneRegex, { message: "Phone number must be a valid Ethiopian number starting with +251" }),
  email: z.string().email({ message: "Invalid email" }),
  type: z.literal("forgot-password"),
});

export const verifyOtpSchema = z.object({
  phoneNumber: z
    .string()
    .regex(phoneRegex, { message: "Phone number must be a valid Ethiopian number starting with +251" }),
  email: z.string().email({ message: "Invalid email" }),
  otp: z.string().regex(/^\d{6}$/, { message: "OTP must be 6 digits" }),
  type: z.literal("forgot-password"),
});

export const resetPasswordSchema = z.object({
  phoneNumber: z
    .string()
    .regex(phoneRegex, { message: "Phone number must be a valid Ethiopian number starting with +251" }),
  email: z.string().email({ message: "Invalid email" }),
  otp: z.string().regex(/^\d{6}$/, { message: "OTP must be 6 digits" }),
  newPassword: z
    .string()
    .regex(passwordRegex, {
      message:
        "Password must be 6+ characters",
    }),
  type: z.literal("forgot-password"),
});
