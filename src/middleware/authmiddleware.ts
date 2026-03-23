import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma.js";
import { config } from "../config.js";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const jwtSecret = config.jwtSecret;

    if (typeof jwtSecret !== "string" || jwtSecret.length === 0) {
      return res
        .status(500)
        .json({ success: false, error: "JWT_SECRET is not configured" });
    }

    const decoded = jwt.verify(token, jwtSecret);

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      !("sub" in decoded) ||
      typeof decoded.sub !== "string"
    ) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const userId = decoded.sub;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        role: true,
        areaId: true,
      },
    });

    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, error: "Invalid token" });
  }
};

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ success: false, error: "Forbidden" });
  }

  next();
};