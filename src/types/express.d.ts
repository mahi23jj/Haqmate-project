import "express";

declare global {
  namespace Express {
    interface Request {
      user?: string;      // your user ID or a user object
      session?: any;      // session info if you attach it
    }
  }
}
