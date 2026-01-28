import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";
import { bearer, emailOTP } from "better-auth/plugins";
import { Resend } from "resend";
import { config } from "../src/config.js";

const prisma = new PrismaClient();
const frontendOrigin = "*";

/* ---------------- RESEND CLIENT ---------------- */
const resend = new Resend(config.RESEND_API_KEY);

/* ---------------- BETTER AUTH ---------------- */
export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
  },

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  plugins: [
    bearer(),

    emailOTP({

      expiresIn: 60 , // ⏱️ 1 minutes (recommended)
      async sendVerificationOTP({ email, otp, type }) {
        console.log("📨 OTP requested:", { email, otp, type });


        // Only send for forgot-password flow
        // if (type !== "forget-password") return;

        if (type !== "forget-password") {
          console.log("❌ Skipping non-forgot-password OTP");
          return;
        }


        try {
          if (!config.RESEND_FROM) {
            throw new Error("RESEND_FROM is not defined in config.");
          }
          /*   await resend.emails.send({
              from: config.RESEND_FROM, // e.g., "Haqmate <no-reply@haqmate.com>"
              to: email,
              subject: "Your password reset code",
              html: `
                <div style="font-family: Arial, sans-serif">
                  <h2>Password Reset Code</h2>
                  <p>Use the code below to reset your password:</p>
                  <h1 style="letter-spacing: 4px">${otp}</h1>
                  <p>This code expires in a few minutes.</p>
                </div>
              `,
            }); */

          console.log("✅ OTP email sent to:", email);
        } catch (err) {
          console.error("❌ Failed to send OTP via Resend:", err);
        }
      },
    }),
  ],

  trustedOrigins: [frontendOrigin],

  session: {
    // defaults are fine
  },
});
