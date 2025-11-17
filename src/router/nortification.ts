import { Router, request } from "express";
import { authMiddleware } from "../middleware/authmiddleware.js";
import type { Request, Response, NextFunction } from "express";
import  admin  from 'firebase-admin';



const router = Router();
router.use(authMiddleware);

router.post("/send", async (req: Request, res: Response, next: NextFunction) => {
  // TODO: create notification
  const { receivedToken } = req.body;

  const message = {
    notification: {
      title: "New Message",
      body: "You have a new message",
    },
    token: receivedToken,
  }

  try {
    await admin.messaging().send(message);
  } catch (error) {
    console.log(error);
  }

  res.status(200).json({ message: "Notification sent" });

    
})

// implement feedback_request in-app also with notification after build the ui 
