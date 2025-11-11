import { Router } from "express";

import { ProductServiceImpl } from "../service/productservice.js";

const router = Router();

const products = new ProductServiceImpl();

// GET /products - Retrieve all products
router.get("/products", async (req, res, next) => {
  try {
    const allProducts = await products.getAllProducts();
    res.json(allProducts);
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
      res.json(product);
    } else {
      res.status(404).json({ error: "Product not found" });
    }
  } catch (error) {
    next(error);
  }
});


// post /products - Create a new product (example, not implemented in service)
router.post("/products", async (req, res, next) => {
  try {
    const newProductData = req.body;
    const newProduct = await products.createProduct(newProductData);
    res.status(201).json(newProduct);
  } catch (error) {
    next(error);
  }
});

export { router as productRouter };