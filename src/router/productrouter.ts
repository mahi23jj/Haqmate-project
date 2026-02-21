import { Router } from "express";
import type { Request, Response, NextFunction } from "express";

import { ProductServiceImpl } from "../service/productservice.js";
import { validate } from "../middleware/validate.js";
import { createProductSchema } from '../validation/productvalidation.js'
import { authMiddleware, requireAdmin } from "../middleware/authmiddleware.js";
import { uploadProductImages } from "../middleware/upload.js";

const router = Router();

const products = new ProductServiceImpl();

// get /products/popular - Retrieve popular products
router.get("/products/popular", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 4, 1), 100);
    const result = await products.getpopularProducts(limit);
    return res.status(201).json({
      status: "success",
      message: "Retrieve popular products",
      data: result.items,
    });
  } catch (error) {
    next(error);
  }
});

// GET /products - Retrieve all products
router.get("/products", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 20, 1), 100);

    const result = await products.getAllProducts(page, limit);

    return res.status(201).json({
      status: "success",
      message: "Retrieve all products",
      data: result.items,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });

  } catch (error) {
    next(error);
  }
});


router.get('/products/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = (req.query.search as string) ?? "";
    const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 20, 1), 100);
    
    const productsList = await products.searchProduct(search, page, limit);

    return res.status(200).json({
      success: true,
      message: 'Products fetched successfully',
      data: productsList.items,
      pagination: {
        page,
        limit,
        total: productsList.total,
        totalPages: Math.ceil(productsList.total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /products/:id - Retrieve a product by ID
router.get("/products/:id",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = req.params.id;

      const userId = req.user;

      if (typeof userId !== "string") {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!productId) {
        return res.status(404).json({ error: "Product not found" });
      }



      const product = await products.getProductById(productId, userId);
      if (product) {
        return res.status(201).json({
          status: "success",
          message: "Retrieve a product by ID",
          data: product,
        });
      }
    } catch (error) {
      next(error);
    }
  });




router.put("/stockupdate/:id",requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = req.params.id;

     if (!productId) {
        return res.status(404).json({ error: "Product not found" });
    } 

    const isstock = await products.updatestock(productId);

    if (isstock) {
      return res.status(200).json(
        {
          status: "success",
          message: "Retrieve a product by ID",
          data: isstock,
        }

      );
    }
  } catch (error) {
    next(error);
  }
});


// post /products - Create a new product (example, not implemented in service)
router.post(
  "/products",
  requireAdmin,
  uploadProductImages.array('images', 6),
  validate(createProductSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // req.body is now validated and typed
      const { name, description, price, teffType, quality, instock } = req.body;
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];

      const newProduct = await products.createProduct({
        name,
        description,
        price,
        teffType,
        quality,
        instock,
      }, files);

      return res.status(201).json({
        status: "success",
        message: "Product created successfully",
        data: newProduct,
      });
    } catch (error) {
      next(error); // passed to global error handler
    }
  }
);

export { router as productRouter };