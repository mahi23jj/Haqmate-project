import { Router, request } from "express";
import { CartServiceImpl } from "../service/cartservice.js";
import { authMiddleware } from "../middleware/authmiddleware.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();
router.use(authMiddleware);

const Carts = new CartServiceImpl();


// POST /cart/add - Add or update an item in the cart
router.post("/add", async (req:Request, res:Response, next:NextFunction) => {
  try {

     const  userId = req.user;

     if (!userId) {
       return res.status(401).json({ error: "Unauthorized" });
     }

    const { productId, quantity = 1 , packagingsize } = req.body;
 
    await Carts.addandupdateToCart(userId, {
      productId,
      quantity,
      packagingsize: packagingsize,
    });
    res.status(200).json({ message: "Item added in cart successfully" });
  } catch (error) {
    next(error);
  }
});

router.put("/update-quantity", async (req:Request, res:Response, next:NextFunction) => {
  try {
     const  userId = req.user;
     
     if (!userId) {
       return res.status(401).json({ error: "Unauthorized" });
     }
    const { productId, packagingId, action } = req.body;
    
    await Carts.updateCartItemQuantity(userId, productId, packagingId, action);
    res.status(200).json({ message: "Item quantity updated successfully" });
  } catch (error) {
    next(error);
  }
});

router.put("/update-packaging", async (req:Request, res:Response, next:NextFunction) => {
  try {
     const  userId = req.user;
     
     if (!userId) {
       return res.status(401).json({ error: "Unauthorized" });
     }
    const { productId, packagingsize } = req.body;
    
    await Carts.updateItempackaging(userId, productId, packagingsize);
    res.status(200).json({ message: "Item packaging updated successfully" });
  } catch (error) {
    next(error);
  }
});

// Remove an item from the cart
router.delete("/remove", async (req:Request, res:Response, next:NextFunction) => {
  try {
     const  userId = req.user;
        
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
router.delete("/clear", async (req:Request, res:Response, next:NextFunction) => {
  try {
     const  userId = req.user;
            
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
router.get("/", async (req:Request, res:Response, next:NextFunction) => {
  try {
     const  userId = req.user;
           
           if (!userId) {
           return res.status(401).json({ error: "Unauthorized" });
           }
    const cartItems = await Carts.getCartItems(userId);
    res.json(cartItems);
  } catch (error) {
    next(error);
  }
});

export { router as cartRouter };