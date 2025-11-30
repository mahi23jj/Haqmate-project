import type { Request, Response, NextFunction } from "express";

export const validate = (schema: any) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      status: "fail",
      errors: result.error.format(),
    })
  }

  req.body = result.data;
  next();
};
