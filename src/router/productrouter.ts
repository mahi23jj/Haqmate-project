import { Router } from "express";

import { ProductServiceImpl } from "../service/productservice.js";
import { validate } from "../middleware/validate.js";
import { createProductSchema } from '../validation/productvalidation.js'

const router = Router();

const products = new ProductServiceImpl();

// GET /products - Retrieve all products
router.get("/products", async (req, res, next) => {
  try {
    const allProducts = await products.getAllProducts();

    return res.status(201).json({
      status: "success",
      message: "Retrieve all products",
      data: allProducts,
    });

  } catch (error) {
    next(error);
  }
});

// GET /products/:id - Retrieve a product by ID
router.get("/products/:id", async (req, res, next) => {
  try {
    const productId = req.params.id;
    const product = await products.getProductById(productId);

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


// post /products - Create a new product (example, not implemented in service)
router.post(
  "/products",
  validate(createProductSchema),
  async (req, res, next) => {
    try {
      // req.body is now validated and typed
      const { name, description, price, teffType, images, quality } = req.body;

      const newProduct = await products.createProduct({
        name,
        description,
        price,
        teffType,
        images,
        quality,
      });

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