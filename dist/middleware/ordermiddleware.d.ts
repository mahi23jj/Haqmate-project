import type { Request, Response, NextFunction } from "express";
export declare function orderMiddleware(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
export declare function productMiddleware(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
export declare function locationMiddleware(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=ordermiddleware.d.ts.map