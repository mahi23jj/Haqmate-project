// import { Router, Request, Response } from "express";
// import { DeliveryServiceImpl } from "../services/delivery.service";
// import authMiddleware from "../middleware/auth";
import { Router, request } from "express";
import { CartServiceImpl } from "../service/cartservice.js";
import { authMiddleware } from "../middleware/authmiddleware.js";
import type { Request, Response, NextFunction } from "express";
import { productMiddleware } from "../middleware/ordermiddleware.js";
import { DeliveryServiceImpl } from "../service/delivery.js";

const router = Router();
// router.use(authMiddleware);

const Delivery = new DeliveryServiceImpl();

// 📌 Create location
router.post("/location", async (req: Request, res: Response) => {
  const { location, km } = req.body;

  try {
    const result = await Delivery.createlocation(location, km);
    res.status(201).json({ status: "success", data: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 📌 Get all locations
router.get("/location", async (req: Request, res: Response) => {
  const query = (req.query.query as string) ?? "";  // safe
  const normalizedQuery = query.toLowerCase();      // safe
  const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 20, 1), 100);

  try {
    const locations = await Delivery.getLocations(normalizedQuery, page, limit);

    return res.status(200).json({
      status: "success",
      data: locations.items,
      pagination: {
        page,
        limit,
        total: locations.total,
        totalPages: Math.ceil(locations.total / limit),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      status: "error",
      error: error.message || "Error fetching locations",
    });
  }
});


// 📌 Get one location
// router.get("/:id", async (req: Request, res: Response) => {
//   try {
//     const location = await Delivery.getlocationbyid(req.params.id);
//     res.status(200).json({ status: "success", data: location });
//   } catch (error: any) {
//     res.status(400).json({ error: error.message });
//   }
// });

// // 📌 Update location
// router.put("/:id", async (req: Request, res: Response) => {
//   const { location, km } = req.body;

//   try {
//     const updated = await Delivery.updatelocation(req.params.id, location, km);
//     res.status(200).json({ status: "success", data: updated });
//   } catch (error: any) {
//     res.status(400).json({ error: error.message });
//   }
// });

// // 📌 Delete location
// router.delete("/:id", async (req: Request, res: Response) => {
//   try {
//     const deleted = await Delivery.deletelocation(req.params.id);
//     res.status(200).json({ status: "success", data: deleted });
//   } catch (error: any) {
//     res.status(400).json({ error: error.message });
//   }
// });

// 📌 Calculate Delivery Charge
router.post("/charge", async (req: Request, res: Response) => {
  const { location, extraDistance } = req.body;

  try {
    const charge = await Delivery.deliverycharge(location, extraDistance);
    res.status(200).json({ status: "success", data: charge });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export { router as DeliveryRouter };
