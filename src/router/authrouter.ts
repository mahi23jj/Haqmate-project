import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Resend } from "resend";
import { prisma } from "../prisma.js";
import { validate } from "../middleware/validate.js";
import {
    authLoginSchema,
    authSignupSchema,
    requestForgotPasswordSchema,
    resetPasswordSchema,
    verifyOtpSchema,
} from "../validation/custom_auth_validation.js";
import { config } from "../config.js";
import { CartServiceImpl } from "../service/cartservice.js";
// import { locationMiddleware } from "../middleware/ordermiddleware.js";

const authRouter = Router();
const resend = new Resend(config.RESEND_API_KEY);
const OTP_EXPIRY_SECONDS = 60;

const signToken = (user: { id: string; role: string; phoneNumber: string | null }) => {
    if (!config.jwtSecret) {
        throw new Error("JWT secret is not configured");
    }

    return jwt.sign(
        { sub: user.id, role: user.role, phoneNumber: user.phoneNumber },
        config.jwtSecret,
        { expiresIn: "7d" }
    );
};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const otpIdentifier = (phoneNumber: string, email: string) =>
    `forgot-password-otp:${phoneNumber}:${email.toLowerCase()}`;

const buildOtpHtml = (otp: string) => `
<!DOCTYPE html>
<html>
  <body style="margin:0; padding:0; background-color:#f4f6f8; font-family: Arial, sans-serif;">
    <table align="center" width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 0;">
      <tr>
        <td align="center">
          <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; padding:40px; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
            <tr>
              <td align="center" style="padding-bottom:20px;">
                <h2 style="margin:0; color:#2e7d32;">Haqmat Teff</h2>
                <p style="margin:5px 0 0 0; font-size:14px; color:#777;">
                  Secure Account Service
                </p>
              </td>
            </tr>

            <tr>
              <td>
                <hr style="border:none; border-top:1px solid #eee; margin:20px 0;">
              </td>
            </tr>

            <tr>
              <td style="color:#333; font-size:15px; line-height:1.6;">
                <p>Hello,</p>
                <p>
                  We received a request to reset your password.
                  Please use the verification code below to continue:
                </p>

                <div style="text-align:center; margin:30px 0;">
                  <span style="
                    display:inline-block;
                    padding:15px 30px;
                    font-size:28px;
                    letter-spacing:6px;
                    font-weight:bold;
                    color:#2e7d32;
                    background:#f1f8f4;
                    border-radius:6px;
                  ">
                    ${otp}
                  </span>
                </div>

                <p>
                  This code will expire in ${OTP_EXPIRY_SECONDS / 60} minute for security reasons.
                </p>

                <p>
                  If you did not request a password reset, please ignore this email.
                </p>

                <p style="margin-top:30px;">
                  Best regards,<br>
                  <strong>Haqmat Teff Team</strong>
                </p>
              </td>
            </tr>
          </table>

          <table width="500" cellpadding="0" cellspacing="0" style="margin-top:20px;">
            <tr>
              <td align="center" style="font-size:12px; color:#999;">
                © ${new Date().getFullYear()} Haqmat Teff. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

const sendForgotPasswordOtp = async (email: string, otp: string) => {
    if (!config.RESEND_FROM) {
        throw new Error("RESEND_FROM is not configured");
    }

    await resend.emails.send({
        from: config.RESEND_FROM,
        to: email,
        subject: "Your password reset code",
        html: buildOtpHtml(otp),
    });
};

authRouter.post("/signup", validate(authSignupSchema), async (req: Request, res: Response, next: NextFunction) => {
    const { username, phoneNumber, password, subcity, Adress } = req.body;

    try {
        const existingUser = await prisma.user.findUnique({
            where: { phoneNumber },
            select: { id: true },
        });

        if (existingUser) {
            return res.status(409).json({ success: false, error: "Phone number already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const createdUser = await prisma.user.create({
            data: {
                name: username,
                phoneNumber,
                subcity,
                Adress,
                accounts: {
                    create: {
                        providerId: "credentials",
                        accountId: phoneNumber,
                        password: hashedPassword,
                    },
                },
            },
            select: {
                id: true,
                name: true,
                phoneNumber: true,
                role: true,
            },
        });

        const token = signToken(createdUser);

        return res.status(201).json({
            success: true,
            message: "Signup successful",
            token,
            tokenType: "Bearer",
            expiresIn: "7d",
            user: createdUser,
        });
    } catch (error) {
        next(error);
    }
});

authRouter.post("/admin/signup", async (req: Request, res: Response, next: NextFunction) => {
    const { username, phoneNumber, password } = req.body;

    try {
        const existingUser = await prisma.user.findUnique({
            where: { phoneNumber },
            select: { id: true },
        });

        if (existingUser) {
            return res.status(409).json({ success: false, error: "Phone number already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const createdUser = await prisma.user.create({
            data: {
                name: username,
                phoneNumber,
                role: "ADMIN",
                accounts: {
                    create: {
                        providerId: "credentials",
                        accountId: phoneNumber,
                        password: hashedPassword,
                    },
                },
            },
            select: {
                id: true,
                name: true,
                phoneNumber: true,
                role: true,
            },
        });

        const token = signToken(createdUser);

        return res.status(201).json({
            success: true,
            message: "Signup successful",
            token,
            tokenType: "Bearer",
            expiresIn: "7d",
            user: createdUser,
        });
    } catch (error) {
        next(error);
    }
});

authRouter.post("/login", validate(authLoginSchema), async (req: Request, res: Response, next: NextFunction) => {
    const { phoneNumber, password } = req.body;

    try {
        const account = await prisma.account.findFirst({
            where: { providerId: "credentials", accountId: phoneNumber },
            include: {
                user: {
                    select: { id: true, name: true, phoneNumber: true, role: true },
                },
            },
        });

        if (!account || !account.password) {
            return res.status(400).json({ success: false, error: "Invalid phone number or password" });
        }

        const isValidPassword = await bcrypt.compare(password, account.password);
        if (!isValidPassword) {
            return res.status(400).json({ success: false, error: "Invalid phone number or password" });
        }

        const token = signToken(account.user);

        const cartService = new CartServiceImpl();
        await cartService.preloadCartOnLogin(account.user.id);

        return res.status(200).json({
            success: true,
            token,
            tokenType: "Bearer",
            expiresIn: "7d",
            user: account.user,
        });
    } catch (error) {
        next(error);
    }
});

authRouter.post("/admin/login", validate(authLoginSchema), async (req: Request, res: Response, next: NextFunction) => {
    const { phoneNumber, password } = req.body;

    try {
        const account = await prisma.account.findFirst({
            where: { providerId: "credentials", accountId: phoneNumber },
            include: {
                user: {
                    select: { id: true, name: true, phoneNumber: true, role: true },
                },
            },
        });

        if (!account || !account.password) {
            return res.status(400).json({ success: false, error: "Invalid phone number or password" });
        }

        const isValidPassword = await bcrypt.compare(password, account.password);
        if (!isValidPassword) {
            return res.status(400).json({ success: false, error: "Invalid phone number or password" });
        }

        if (account.user.role !== "ADMIN") {
            return res.status(403).json({ success: false, error: "Forbidden - Admins only" });
        }

        const token = signToken(account.user);

        return res.status(200).json({
            success: true,
            token,
            tokenType: "Bearer",
            expiresIn: "7d",
            user: account.user,
        });
    } catch (error) {
        next(error);
    }
});

authRouter.post(
    "/request-forgot-password",
    validate(requestForgotPasswordSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        const { phoneNumber, email, type } = req.body;

        if (type !== "forgot-password") {
            return res.status(400).json({ success: false, error: "Unsupported OTP request type" });
        }

        try {
            const account = await prisma.account.findFirst({
                where: { providerId: "credentials", accountId: phoneNumber },
                include: {
                    user: { select: { id: true } },
                },
            });

            if (!account) {
                return res.status(404).json({ success: false, error: "User not found" });
            }

            const normalizedEmail = email.toLowerCase();

            /*      if (account.user.email && account.user.email.toLowerCase() !== normalizedEmail) {
                     return res.status(400).json({ success: false, error: "Provided email does not match this phone number" });
                 } */


            await prisma.user.update({
                where: { id: account.user.id },
                data: { email: normalizedEmail },
            });


            const otp = generateOtp();
            const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);

            await prisma.verification.upsert({
                where: { identifier: otpIdentifier(phoneNumber, normalizedEmail) },
                create: {
                    identifier: otpIdentifier(phoneNumber, normalizedEmail),
                    value: otp,
                    expiresAt,
                },
                update: {
                    value: otp,
                    expiresAt,
                },
            });

            await sendForgotPasswordOtp(normalizedEmail, otp);

            return res.status(200).json({
                success: true,
                message: "OTP sent successfully",
                expiresInSeconds: OTP_EXPIRY_SECONDS,
            });
        } catch (error) {
            next(error);
        }
    }
);

authRouter.post("/verify-otp", validate(verifyOtpSchema), async (req: Request, res: Response, next: NextFunction) => {
    const { phoneNumber, email, otp, type } = req.body;

    if (type !== "forgot-password") {
        return res.status(400).json({ success: false, error: "Unsupported OTP verification type" });
    }

    try {
        const verification = await prisma.verification.findUnique({
            where: { identifier: otpIdentifier(phoneNumber, email) },
        });

        if (!verification) {
            return res.status(400).json({ success: false, error: "Invalid OTP" });
        }

        if (verification.expiresAt.getTime() < Date.now()) {
            await prisma.verification.delete({ where: { id: verification.id } });
            return res.status(400).json({ success: false, error: "OTP expired" });
        }

        if (verification.value !== otp) {
            return res.status(400).json({ success: false, error: "Invalid OTP" });
        }

        return res.status(200).json({ success: true, message: "OTP verified" });
    } catch (error) {
        next(error);
    }
});

authRouter.post("/reset-password", validate(resetPasswordSchema), async (req: Request, res: Response, next: NextFunction) => {
    const { phoneNumber, email, otp, newPassword, type } = req.body;

    if (type !== "forgot-password") {
        return res.status(400).json({ success: false, error: "Unsupported password reset type" });
    }

    try {
        const account = await prisma.account.findFirst({
            where: { providerId: "credentials", accountId: phoneNumber },
            include: {
                user: { select: { email: true } },
            },
        });

        if (!account) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        if (!account.user.email || account.user.email.toLowerCase() !== email.toLowerCase()) {
            return res.status(400).json({ success: false, error: "Email does not match this account" });
        }

        const verification = await prisma.verification.findUnique({
            where: { identifier: otpIdentifier(phoneNumber, email) },
        });

        if (!verification) {
            return res.status(400).json({ success: false, error: "Invalid OTP" });
        }

        if (verification.expiresAt.getTime() < Date.now()) {
            await prisma.verification.delete({ where: { id: verification.id } });
            return res.status(400).json({ success: false, error: "OTP expired" });
        }

        if (verification.value !== otp) {
            return res.status(400).json({ success: false, error: "Invalid OTP" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        await prisma.account.update({
            where: { id: account.id },
            data: { password: hashedPassword },
        });

        await prisma.verification.delete({ where: { id: verification.id } });

        return res.status(200).json({
            success: true,
            message: "Password reset successfully",
        });
    } catch (error) {
        next(error);
    }
});

export { authRouter };
