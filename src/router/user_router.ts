import { fromNodeHeaders } from "better-auth/node";
import { Router } from "express";
import { auth } from "../../lib/auth.js";
import { PrismaClient } from '@prisma/client';
import { validate } from "../middleware/validate.js";
import { forgetpasswordSchema, loginSchema, registerSchema, updatestatus } from "../validation/auth_validation.js";
import { locationMiddleware } from "../middleware/ordermiddleware.js";
import { authMiddleware } from "../middleware/authmiddleware.js";
import { prisma } from '../prisma.js';
import { CartServiceImpl } from "../service/cartservice.js";


const usersRouter = Router();

usersRouter.get("/me", async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers), // <-- reads Authorization header
    });

    if (!session) {
      return res.status(401).json({ error: "No active session found" });
    }

    res.json(session);
  } catch (err: any) {
    console.error("Error fetching session:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//Content-Type: application/json
usersRouter.post("/login",
  validate(loginSchema),
  async (req, res) => {
    const { email, password, rememberMe } = req.body;

    try {
      const session = await auth.api.signInEmail({
        body: { email: email, password: password, rememberMe: rememberMe },
      });


      const value = new CartServiceImpl();

      await value.preloadCartOnLogin(session.user.id);


      res.status(200).json(session);

    } catch (error: any) {
      res
        .status(400)
        .json({ error: error.message || "Invalid email or password" });
    }
  });


// logout 
usersRouter.post("/logout",
  async (req, res) => {
    try {
      await auth.api.signOut({
        headers: fromNodeHeaders(req.headers), // <-- reads Authorization header
      })
    } catch (err: any) {
      console.error("Error fetching session:", err);
    }
  })

//abAB12@#"
// register 
usersRouter.post("/signup",
  locationMiddleware,
  validate(registerSchema),
  async (req, res) => {
    const { username, email, password, phoneNumber } = req.body;

    const locationdate = req.location;



    try {
      // 1️⃣ Sign up with Better Auth
      const session = await auth.api.signUpEmail({
        body: {
          name: username,
          email,
          password
        },
      });

      // 2️⃣ Get user ID from session (Better Auth returns it)
      const userId = session?.user?.id;






      // 3️⃣ Update your Prisma user record with extra fields
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            areaId: locationdate.id,
            phoneNumber,
          },
        });
      }

      // 4️⃣ Return full session (with user info)
      res.status(200).json({
        message: "Signup successful",
        user: {
          ...session.user,
          location: locationdate.name,
          phoneNumber,
        },
        token: session.token,
      });

    } catch (error: any) {
      // console.error("Signup error:", error);
      res.status(400).json({ error: error.message || "Invalid email or password" });
    }


  });



// update location and phone number 
usersRouter.put("/user/update-status",
  validate(updatestatus),
  locationMiddleware,
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.user; // from auth middleware
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const location = req.location;

      const { phoneNumber } = req.body;

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          areaId: location.id,
          phoneNumber,
        },
        include: {
          area: true, // include updated location info if needed
        }
      });

      return res.status(200).json({
        status: "success",
        message: "User status updated successfully",
      });

    } catch (error: any) {
      return res.status(500).json({
        status: "error",
        error: error.message || "Something went wrong",
      });
    }
  });


usersRouter.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // ✅ Delete existing OTPs for this email + flow
    await prisma.verification.deleteMany({
      where: {
        identifier: {
          startsWith:`forget-password-otp-${email}`,

        },
      },
    });

    const response = await auth.api.forgetPasswordEmailOTP({
      body: { email },
    });

    console.log("Reset code sent response:", response);

    res.status(200).json({
      message: "If the email exists, a reset code has been sent.",
    });
  } catch (error: any) {
    console.error("Failed to send reset code:", error);
    res.status(400).json({
      message: "Failed to send reset code. Please try again later.",
    });
  }
});


usersRouter.post("/forgot-password/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    await auth.api.checkVerificationOTP({
      body: {
        email,
        otp,
        type: "forget-password",
      },
    });

    res.status(200).json({
      valid: true,
      message: "OTP verified. You may now reset your password.",
    });
  } catch (err: any) {
    res.status(400).json({
      valid: false,
      error: err.message || "Invalid or expired OTP",
    });
  }
});

usersRouter.post(
  "/forgot-password/reset",
  validate(forgetpasswordSchema),
  async (req, res) => {
    const { email, otp, newPassword } = req.body;

    try {
      await auth.api.resetPasswordEmailOTP({
        body: {
          email,
          otp,
          password: newPassword,
        },
      });

      res.status(200).json({
        message: "Password reset successfully. You can now log in.",
      });
    } catch (err: any) {
      res.status(400).json({
        error: err.message || "Invalid OTP or expired session",
      });
    }
  });


// get user profile
usersRouter.get("/profile",
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.user; // from auth middleware
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          area: true, // include location info
        }
      });

      return res.status(200).json({
        status: "success",
        data: user,
      });


    } catch (error: any) {
      return res.status(500).json({
        status: "error",
        error: error.message || "Something went wrong",
      });
    }
  }
)


// update user profile
usersRouter.put("/user/update-profile",
  // validate(updatestatus),
  locationMiddleware,
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.user; // from auth middleware
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const location = req.location;

      const { name, phoneNumber } = req.body;


      console.log("Incoming body:", req.body);


      await auth.api.updateUser({
        headers: fromNodeHeaders(req.headers),
        body: {
          name: name,
        },
      });

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          areaId: location.id,
          phoneNumber,
          name,
        },
        include: {
          area: true, // include updated location info if needed
        }
      });

      return res.status(200).json({
        status: "success",
        message: "User profile updated successfully",
        data:updatedUser,
      });

    } catch (error: any) {
      return res.status(500).json({
        status: "error",
        error: error.message || "Something went wrong",
      });
    }
  });



export { usersRouter as UserRouter };