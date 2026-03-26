import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { authMiddleware, requireAdmin } from "../middleware/authmiddleware.js";
import { validate } from "../middleware/validate.js";
import { adminCreateSchema, loginSchema, registerSchema, updatestatus } from "../validation/auth_validation.js";
import { prisma } from '../prisma.js';
import { CartServiceImpl } from "../service/cartservice.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const signToken = (user: { id: string; role: string; phoneNumber: string | null }) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    { sub: user.id, role: user.role, phoneNumber: user.phoneNumber },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const usersRouter = Router();

usersRouter.get("/me", authMiddleware, async (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
});








// update location and phone number 
usersRouter.put("/user/update-status",
  validate(updatestatus),

  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = req.user;
      if (!authUser) {
        return res.status(401).json({ error: "Unauthorized" });
      }



      const { phoneNumber, Adress, subcity } = req.body;
      const userId = authUser.id;

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          phoneNumber,
          Adress,
          subcity,
        },

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


// get user profile
usersRouter.get("/profile",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = req.user;
      if (!authUser) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const userId = authUser.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },

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

  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = req.user;
      if (!authUser) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const location = req.location;

      const { name, phoneNumber, Adress, subcity } = req.body;
      const userId = authUser.id;


      console.log("Incoming body:", req.body);
      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          phoneNumber,
          name,
          Adress,
          subcity,
        },

      });

      return res.status(200).json({
        status: "success",
        message: "User profile updated successfully",
        data: updatedUser,
      });

    } catch (error: any) {
      return res.status(500).json({
        status: "error",
        error: error.message || "Something went wrong",
      });
    }
  });

// get user list for admin
usersRouter.get("/admin/users", requireAdmin, async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: "USER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        subcity: true,
        Adress: true,
        createdAt: true,
      }
    })

    await Promise.all(users.map(async (user) => {
      const totalSpent = await prisma.order.aggregate({
        where: {
          userId: user.id,
          status: { in: ["COMPLETED", "TO_BE_DELIVERED"] },

        },
        _sum: {
          totalAmount: true,
        },
        _count: {
          id: true,
        },
      });


      (user as any).totalSpent = totalSpent._sum.totalAmount || 0;
      (user as any).orderCount = totalSpent._count.id || 0;
    }));





    return res.status(200).json({
      status: "success",
      data: users,
    });
  } catch (error: any) {
    return res.status(500).json({
      status: "error",
      error: error.message || "Something went wrong",
    });
  }
});

export { usersRouter as UserRouter };