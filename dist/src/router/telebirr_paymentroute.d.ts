import { type Request, type Response } from "express";
export declare function authToken(req: Request, res: Response): Promise<void>;
export declare const createOrder: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const requestCreateOrder: (fabricToken: string, title: string, amount: string, merchOrderId: string) => Promise<any>;
//# sourceMappingURL=telebirr_paymentroute.d.ts.map