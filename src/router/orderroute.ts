import { Router, request } from "express";
import { OrderServiceImpl } from "../service/orderservice.js";
import { authMiddleware } from "../middleware/authmiddleware.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();
router.use(authMiddleware);

const orders = new OrderServiceImpl();

// POST /order/create - Create a new order
// router.post("/create", async (req:Request, res:Response, next:NextFunction) => {
//   try {
//      const  userId = req.user;

//      if (!userId) {
//        return res.status(401).json({ error: "Unauthorized" });
//      }

//     const { items, totalAmount, shippingAddress } = req.body;
 
//     const newOrder = await orders.createOrder(userId, {
//       items,
//       totalAmount,
//       shippingAddress,
//     });
//     res.status(201).json(newOrder);
//   } catch (error) {
//     next(error);
//   }
// });