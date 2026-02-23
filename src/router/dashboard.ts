import { Router, request } from "express";
import { CartServiceImpl } from "../service/cartservice.js";
import { requireAdmin } from "../middleware/authmiddleware.js";
import type { Request, Response, NextFunction } from "express";
import { productMiddleware } from "../middleware/ordermiddleware.js";
import { DashboardService } from "../service/dashbord.js";
import { OrderStatus } from "@prisma/client";

const router = Router();
router.use(requireAdmin);

const dashboard = new DashboardService();


router.get("/sales", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const now = new Date();
        const defaultStartDate = new Date(now);
        defaultStartDate.setMonth(defaultStartDate.getMonth() - 5);
        defaultStartDate.setDate(1);
        defaultStartDate.setHours(0, 0, 0, 0);

        const defaultEndDate = new Date(now);
        defaultEndDate.setHours(23, 59, 59, 999);

        const statusParam = (req.query.status as string | undefined)?.trim();
        const startDateParam = (req.query.startDate as string | undefined)?.trim();
        const endDateParam = (req.query.endDate as string | undefined)?.trim();

        let statusEnum: OrderStatus = OrderStatus.PENDING_PAYMENT;
        if (statusParam) {
            if (!(statusParam.toUpperCase() in OrderStatus)) {
                return res.status(400).json({ error: "Invalid order status" });
            }
            statusEnum = OrderStatus[
                statusParam.toUpperCase() as keyof typeof OrderStatus
            ];
        }

        const startDate = startDateParam ? new Date(startDateParam) : defaultStartDate;
        const endDate = endDateParam ? new Date(endDateParam) : defaultEndDate;

        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
            return res.status(400).json({ error: "Invalid date format. Use ISO date, e.g. 2026-02-23" });
        }

        if (startDate > endDate) {
            return res.status(400).json({ error: "startDate cannot be after endDate" });
        }

        const salesData = await dashboard.getOrdersByMonth(statusEnum, startDate, endDate);

        res.status(200).json({
            status: "success",
            message: "Sales data retrieved successfully",
            data: salesData,
        });
    } catch (error) {
        next(error);
    }
});

router.get("/recent-orders", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const recentOrders = await dashboard.getRecentOrders(5);
        res.status(200).json({
            status: "success",
            message: "Recent orders retrieved successfully",
            data: recentOrders,
        });
    } catch (error) {
        next(error);
    }
});


router.get("/stats", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const stats = await dashboard.getDashboardData();
        res.status(200).json({
            status: "success",
            message: "Dashboard statistics retrieved successfully",
            data: stats,
        });
    } catch (error) {
        next(error);
    }
});

export { router  as dashboardRouter };