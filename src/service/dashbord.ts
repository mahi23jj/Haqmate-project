import { OrderStatus, PrismaClient } from '@prisma/client';
import { NotFoundError } from '../utils/apperror.js';
import type { Product } from './productservice.js';
import { prisma } from '../prisma.js';



export class DashboardService {
    async getDashboardData(): Promise<any> {
        try {
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const startOfTomorrow = new Date(startOfToday);
            startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

            const [
                totalRevenue,
                totalOrders,
                todayOrders,
                pendingPayments,
                pendingRefunds,
                lowStock,
                totaldelivery,
                todayDeliveries
            ] = await Promise.all([

                await prisma.order.groupBy({
                    by: ['status'],
                    where: { status: 'COMPLETED' },
                    _sum: {
                        totalAmount: true,
                    },
                    _count: {
                        id: true,
                    },
                }),


                // revenueQuery,
                await prisma.order.count(),
                await prisma.order.count({
                    where: {
                        createdAt: {
                            gte: startOfToday,
                            lt: startOfTomorrow,
                        },
                    },
                }),
                await prisma.order.count({ where: { paymentStatus: 'SCREENSHOT_SENT' } }),
                await prisma.refundRequest.count({ where: { status: 'PENDING' } }),
                await prisma.teffProduct.count({ where: { inStock: false } }),

                await prisma.order.groupBy({
                    by: ['status'],
                    where: { status: 'TO_BE_DELIVERED', deliveryStatus: 'SCHEDULED' },
                    _count: {
                        id: true,
                    },
                }),

                await prisma.order.count({
                    where: {
                        deliveryDate: {
                            gte: startOfToday,
                            lt: startOfTomorrow,
                        },
                    },
                })
            ]);

            return {
                totalRevenue: totalRevenue[0]?._sum?.totalAmount || 0,
                totalOrders: totalOrders || 0,
                completedOrders: (totalRevenue[0]?._count.id) || 0,
                todayOrders: todayOrders || 0,
                pendingPayments: pendingPayments || 0,
                pendingRefunds: pendingRefunds || 0,
                lowStock: lowStock || 0,
                totaldelivery: totaldelivery[0]?._count.id || 0,
                todayDeliveries: todayDeliveries || 0
            };


        } catch (error) {
            console.error("❌ Error fetching dashboard data:", error);
            throw new Error("Error fetching dashboard data");
        }
    }

    // get recent orders for dashboard
    async getRecentOrders(limit: number = 5): Promise<any[]> {
        try {
            const recentOrders = await prisma.order.findMany({
                orderBy: { createdAt: 'desc' },
                take: limit,
                include: {
                    user: {
                        select: {
                            name: true,
                        }
                    },
                    items: {
                        include: {

                            product: {
                                select: {
                                    name: true,
                                    pricePerKg: true,
                                }
                            },

                        }
                    }
                }
            });

            return recentOrders.map(order => ({
                id: order.id,
                userName: order.user.name,
                totalAmount: order.totalAmount,
                status: order.status,
                createdAt: order.createdAt,

            }));
        } catch (error) {
            console.error("❌ Error fetching recent orders:", error);
            throw new Error("Error fetching recent orders");
        }

    }


    // statistic for orders by month for the last 6 months
    async getOrdersByMonth(status: OrderStatus, startdate: Date, enddate: Date): Promise<any[]> {
        try {
            const orders = await prisma.order.findMany({
                where: {
                    status,
                    createdAt: {
                        gte: startdate,
                        lte: enddate,
                    }
                },
                select: {
                    createdAt: true,
                    totalAmount: true,
                },
                orderBy: {
                    createdAt: 'asc',
                },
            });

            const monthlyMap = new Map<string, { monthStart: Date; count: number; totalAmount: number }>();

            for (const order of orders) {
                const year = order.createdAt.getFullYear();
                const month = order.createdAt.getMonth();
                const monthStart = new Date(year, month, 1);
                const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

                const existing = monthlyMap.get(monthKey);
                if (existing) {
                    existing.count += 1;
                    existing.totalAmount += order.totalAmount;
                } else {
                    monthlyMap.set(monthKey, {
                        monthStart,
                        count: 1,
                        totalAmount: order.totalAmount,
                    });
                }
            }

            return Array.from(monthlyMap.values())
                .sort((a, b) => a.monthStart.getTime() - b.monthStart.getTime())
                .map((item) => ({
                    month: item.monthStart.toLocaleString('default', { month: 'long', year: 'numeric' }),
                    count: item.count,
                    totalAmount: item.totalAmount,
                }));
        } catch (error) {
            console.error("❌ Error fetching orders by month:", error);
            throw new Error("Error fetching orders by month");
        }
    }
}