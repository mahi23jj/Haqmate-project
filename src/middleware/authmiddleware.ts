import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../../lib/auth.js";
import type { Request, Response, NextFunction } from "express";

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    // Example: Check for an authorization header
    const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
    });
    if (!session) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    // Attach session to request object for further use
    req.session = session;

    // get user info and attach to req
    const user = session.user.id;


     
   

    req.user = user;

    next();
}       