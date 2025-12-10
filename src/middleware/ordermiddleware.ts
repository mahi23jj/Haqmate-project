
import type { Request, Response, NextFunction } from "express";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();




export async function orderMiddleware(req: Request, res: Response, next: NextFunction) {
  const id = req.params.id || req.body.id;

  if (!id) {
      return res.status(400).json({ message: "Order id is required" });
  }

  try {
      const order = await prisma.order.findUnique({
          where: { id }
      });

      if (!order) {
          return res.status(404).json({ message: "Order not found" });
      }

      req.order = order;
      next();
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
  }
}








export async function productMiddleware(req: Request, res: Response, next: NextFunction) {
    const productId = req.body.productId || req.params.productId;

    if (!productId) {
        return res.status(400).json({ message: "Product ID is required" });
    }

    try {
        const product = await prisma.teffProduct.findUnique({
            where: { id: productId }
        });

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        req.product = product; // attach to request
        next();
    } catch (error) {
        console.error("❌ Product middleware error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}



export async function locationMiddleware(req: Request, res: Response, next: NextFunction) {
    const location = req.body.location || req.params.location;

    if (!location) {
        return res.status(400).json({ message: "location is required" });
    }

    try {
    const locations = await prisma.area.findUnique({
            where: { id: location }
        });

        if (!locations) {
            return res.status(404).json({ message: "location not found" });
        }

        req.location = locations; // attach to request
        next();
    } catch (error) {
        console.error("❌ Product middleware error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}


// delivery --> integrate order upto payment (at least chapa ) --> profile & about us (use amharic , App Chat Between Customer & Seller mean just make it to call directly.)
// autentication 
// fix ui , 
// backend , languge change and testing
