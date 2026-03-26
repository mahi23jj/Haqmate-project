import type { NextFunction, Request, Response } from "express";
export declare const authMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=authmiddleware.d.ts.map