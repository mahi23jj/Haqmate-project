import { Router, request } from "express";
import { CartServiceImpl } from "../service/cartservice.js";
import { authMiddleware } from "../middleware/authmiddleware.js";
import type { Request, Response, NextFunction } from "express";
import { productMiddleware } from "../middleware/ordermiddleware.js";

const router = Router();
router.use(authMiddleware);

const Carts = new CartServiceImpl();


// POST /cart/add - Add or update an item in the cart
router.post("/add_update",
  productMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {

      const userId = req.user;

      const product = req.product;

      const productId = product?.id;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { quantity = 1, packagingsize } = req.body;

      await Carts.addOrUpdateCart(userId, {
        productId,
        quantity,
        packagingsize: packagingsize,
      });
      res.status(200).json({ message: "Item added in cart successfully" });
    } catch (error) {
      next(error);
    }
  });

  router.put("/quantity_update",
  productMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {

      const userId = req.user;

      const product = req.product;

      const productId = product?.id;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { quantity , packagingsize } = req.body;

      await Carts.updateCartItemQuantity(userId, productId, packagingsize, quantity);

      res.status(200).json({ message: "Item quantity updated successfully" });

    } catch (error) {
      next(error);
    }
  });

    router.put("/update/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {

      const cartid = req.params.id ?? '';

      const { updatedproductid , updatedpackagingsize , updatedquantity } = req.body;

      await Carts.updateCartItem( cartid ,updatedproductid , updatedpackagingsize , updatedquantity);

      res.status(200).json({ message: "Item quantity updated successfully" });

    } catch (error) {
      next(error);
    }
  });


// Remove an item from the cart
router.delete("/remove", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { productId, packagingId } = req.body;

    await Carts.removeItemFromCart(userId, productId, packagingId);
    res.status(200).json({ message: "Item removed from cart successfully" });
  }
  catch (error) {
    next(error);
  }
});

// Clear the cart
router.delete("/clear", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    await Carts.clearCart(userId);
    res.status(200).json({ message: "Cart cleared successfully" });
  }
  catch (error) {
    next(error);
  }
})

// GET /cart - Retrieve the current user's cart
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const cartItems = await Carts.getCartItems(userId);

    res.status(200).json(
      {
        status: "success",
        message: "get a cart items",
        data: cartItems,
      }
    );

  } catch (error) {
    next(error);
  }
});

export { router as cartRouter };