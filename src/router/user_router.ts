import { fromNodeHeaders } from "better-auth/node";
import { Router } from "express";
import { auth } from "../../lib/auth.js";
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const usersRouter = Router();

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
usersRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const session = await auth.api.signInEmail({
      body: { email, password , rememberMe: true},
    });

    res.json(session);

    console.log(session.token);
  } catch (error: any) {
    res
      .status(400)
      .json({ error: error.message || "Invalid email or password" });
  }
});

usersRouter.post("/signup", async (req, res) => {
  const { name, email, password, location, phoneNumber, rememberMe = false } = req.body;

  try {
    // 1️⃣ Sign up with Better Auth
    const session = await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
        rememberMe,
      },
    });

    // 2️⃣ Get user ID from session (Better Auth returns it)
    const userId = session?.user?.id;

    // 3️⃣ Update your Prisma user record with extra fields
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          location,
          phoneNumber,
        },
      });
    }

    // 4️⃣ Return full session (with user info)
    res.json({
      message: "Signup successful",
      user: {
        ...session.user,
        location,
        phoneNumber,
      },
      token: session.token,
    });

  } catch (error: any) {
    console.error("Signup error:", error);
    res.status(400).json({ error: error.message || "Invalid email or password" });
  }
});
