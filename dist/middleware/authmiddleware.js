import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth.js";
export async function authMiddleware(req, res, next) {
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
// require admin role middleware
export async function requireAdmin(req, res, next) {
    const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
    });
    if (!session) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const userrole = (session.user.role ?? "").toString().toUpperCase();
    if (userrole !== "ADMIN") {
        return res.status(403).json({ error: "Forbidden - Admins only" });
    }
    req.user = session.user.id;
    next();
}
//# sourceMappingURL=authmiddleware.js.map