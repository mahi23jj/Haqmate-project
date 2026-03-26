import { Router } from "express";
import { authMiddleware, requireAdmin } from "../middleware/authmiddleware.js";
import { validate } from "../middleware/validate.js";
import { adminCreateSchema, loginSchema, registerSchema, updatestatus } from "../validation/auth_validation.js";
import { locationMiddleware } from "../middleware/ordermiddleware.js";
import { prisma } from '../prisma.js';
import { CartServiceImpl } from "../service/cartservice.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
const signToken = (user) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured");
    }
    return jwt.sign({ sub: user.id, role: user.role, phoneNumber: user.phoneNumber }, process.env.JWT_SECRET, { expiresIn: "7d" });
};
const usersRouter = Router();
usersRouter.get("/me", authMiddleware, async (req, res) => {
    return res.status(200).json({
        success: true,
        user: req.user,
    });
});
usersRouter.post("/login", validate(loginSchema), async (req, res) => {
    const { phoneNumber, password } = req.body;
    try {
        const account = await prisma.account.findFirst({
            where: { providerId: "credentials", accountId: phoneNumber },
            include: {
                user: {
                    select: { id: true, name: true, phoneNumber: true, role: true, areaId: true },
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
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message || "Internal server error" });
    }
});
usersRouter.post("/admin/login", validate(loginSchema), async (req, res) => {
    const { phoneNumber, password } = req.body;
    try {
        const account = await prisma.account.findFirst({
            where: { providerId: "credentials", accountId: phoneNumber },
            include: {
                user: {
                    select: { id: true, name: true, phoneNumber: true, role: true, areaId: true },
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
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message || "Internal server error" });
    }
});
usersRouter.post("/admin/create", authMiddleware, requireAdmin, validate(adminCreateSchema), async (req, res) => {
    const { username, password, phoneNumber, email } = req.body;
    try {
        if (!phoneNumber?.startsWith("+251")) {
            return res.status(400).json({ success: false, error: "Phone number must start with +251" });
        }
        const existingUser = await prisma.user.findFirst({
            where: { OR: [{ phoneNumber }, ...(email ? [{ email }] : [])] },
        });
        if (existingUser) {
            return res.status(400).json({ success: false, error: "Phone number or email already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 12);
        const admin = await prisma.user.create({
            data: {
                name: username,
                email: email || null,
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
                email: true,
                phoneNumber: true,
                role: true,
                areaId: true,
            },
        });
        return res.status(201).json({
            success: true,
            message: "Admin created successfully",
            user: admin,
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message || "Internal server error" });
    }
});
// Signup route with better error handling
usersRouter.post("/signup", locationMiddleware, validate(registerSchema), async (req, res) => {
    const { username, password, phoneNumber } = req.body;
    const locationdate = req.location;
    try {
        // Validate phone number format for Ethiopia
        if (!phoneNumber.startsWith('+251')) {
            return res.status(400).json({
                success: false,
                error: "Phone number must start with +251"
            });
        }
        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { phoneNumber }
        });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: "Phone number already exists"
            });
        }
        const hashedPassword = await bcrypt.hash(password, 12);
        // 1️⃣ Sign up with Better Auth
        const session = await prisma.user.create({
            data: {
                name: username,
                phoneNumber,
                areaId: locationdate.id,
                accounts: {
                    create: {
                        providerId: "credentials",
                        accountId: phoneNumber,
                        password: hashedPassword,
                    },
                }
            }
        });
        // 4️⃣ Return success response
        res.status(201).json({
            success: true,
            message: "Signup successful",
            user: {
                ...session,
            },
            // 
            // token: session,
        });
    }
    catch (error) {
        console.error("Signup error:", error);
        let errorMessage = "Signup failed";
        let statusCode = 400;
        if (error.message) {
            const message = error.message.toLowerCase();
            if (message.includes("email already") || message.includes("duplicate")) {
                errorMessage = "Email already registered";
            }
            else if (message.includes("password") && message.includes("weak")) {
                errorMessage = "Password is too weak";
            }
            else if (message.includes("invalid email")) {
                errorMessage = "Invalid email format";
            }
            else if (message.includes("network") || message.includes("connection")) {
                errorMessage = "Network error";
                statusCode = 503;
            }
            else {
                errorMessage = error.message;
            }
        }
        res.status(statusCode).json({
            success: false,
            error: errorMessage
        });
    }
});
// Admin-only: create an admin user
usersRouter.post("/admin/create", authMiddleware, requireAdmin, validate(adminCreateSchema), async (req, res) => {
    const { username, password, phoneNumber } = req.body;
    try {
        if (!phoneNumber || !phoneNumber.startsWith("+251")) {
            return res.status(400).json({
                success: false,
                error: "Phone number must start with +251",
            });
        }
        const existingPhone = await prisma.user.findUnique({
            where: { phoneNumber },
        });
        if (existingPhone) {
            return res.status(400).json({
                success: false,
                error: "Phone number already exists",
            });
        }
        const hashedPassword = await bcrypt.hash(password, 12);
        const createdAdmin = await prisma.user.create({
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
                email: true,
                phoneNumber: true,
                role: true,
                createdAt: true,
            },
        });
        return res.status(201).json({
            success: true,
            message: "Admin user created successfully",
            user: createdAdmin,
        });
    }
    catch (error) {
        console.error("Admin create error:", error);
        return res.status(400).json({
            success: false,
            error: error.message || "Admin creation failed",
        });
    }
});
// update location and phone number 
usersRouter.put("/user/update-status", validate(updatestatus), locationMiddleware, authMiddleware, async (req, res, next) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const location = req.location;
        const { phoneNumber } = req.body;
        const userId = authUser.id;
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
    }
    catch (error) {
        return res.status(500).json({
            status: "error",
            error: error.message || "Something went wrong",
        });
    }
});
// get user profile
usersRouter.get("/profile", authMiddleware, async (req, res, next) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const userId = authUser.id;
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
    }
    catch (error) {
        return res.status(500).json({
            status: "error",
            error: error.message || "Something went wrong",
        });
    }
});
// update user profile
usersRouter.put("/user/update-profile", 
// validate(updatestatus),
locationMiddleware, authMiddleware, async (req, res, next) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const location = req.location;
        const { name, phoneNumber } = req.body;
        const userId = authUser.id;
        console.log("Incoming body:", req.body);
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
            data: updatedUser,
        });
    }
    catch (error) {
        return res.status(500).json({
            status: "error",
            error: error.message || "Something went wrong",
        });
    }
});
// get user list for admin
usersRouter.get("/admin/users", requireAdmin, async (req, res) => {
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
                area: {
                    select: {
                        name: true,
                    },
                },
                createdAt: true,
            }
        });
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
            user.totalSpent = totalSpent._sum.totalAmount || 0;
            user.orderCount = totalSpent._count.id || 0;
        }));
        return res.status(200).json({
            status: "success",
            data: users,
        });
    }
    catch (error) {
        return res.status(500).json({
            status: "error",
            error: error.message || "Something went wrong",
        });
    }
});
export { usersRouter as UserRouter };
//# sourceMappingURL=user_router.js.map