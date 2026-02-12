import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";
import { bearer, emailOTP } from "better-auth/plugins";
import { Resend } from "resend";
import { config } from "../config.js";
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
            expiresIn: 60, // ⏱️ 1 minutes (recommended)
            async sendVerificationOTP({ email, otp, type }) {
                console.log("f4e8 OTP requested:", { email, otp, type });
                // Only send for forgot-password flow
                // if (type !== "forget-password") return;
                if (type !== "forget-password") {
                    console.log("f6ab Skipping non-forgot-password OTP");
                    return;
                }
                try {
                    if (!config.RESEND_FROM) {
                        throw new Error("RESEND_FROM is not defined in config.");
                    }
                    await resend.emails.send({
                        from: config.RESEND_FROM, // e.g., "Haqmate <no-reply@haqmate.com>"
                        to: email,
                        subject: "Your password reset code",
                        html: `
                 <!DOCTYPE html>
<html>
  <body style="margin:0; padding:0; background-color:#f4f6f8; font-family: Arial, sans-serif;">
    
    <table align="center" width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 0;">
      <tr>
        <td align="center">
          
          <!-- Email Container -->
          <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; padding:40px; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
            
            <!-- Company Name -->
            <tr>
              <td align="center" style="padding-bottom:20px;">
                <h2 style="margin:0; color:#2e7d32;">Haqmat Teff</h2>
                <p style="margin:5px 0 0 0; font-size:14px; color:#777;">
                  Secure Account Service
                </p>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td>
                <hr style="border:none; border-top:1px solid #eee; margin:20px 0;">
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="color:#333; font-size:15px; line-height:1.6;">
                <p>Hello,</p>

                <p>
                  We received a request to reset your password. 
                  Please use the verification code below to continue:
                </p>

                <!-- OTP Box -->
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
                  This code will expire in a few minutes for security reasons.
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

          <!-- Footer -->
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

              `,
                    });
                    console.log("f195 OTP email sent to:", email);
                }
                catch (err) {
                    console.error("f6ab Failed to send OTP via Resend:", err);
                }
            },
        }),
    ],
    trustedOrigins: [frontendOrigin],
    session: {
    // defaults are fine
    },
});
//# sourceMappingURL=auth.js.map