import "express";

declare global {
  namespace Express {
      namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      }
    }
    interface Request {
      user?: string;      // your user ID or a user object
      session?: any;      // session info if you attach it  
      context?: {
      models: {
        Order: any; // replace when you have actual types
        product : any;
      };
    };
    order?: any;
    product?: any;
    location?: any;
    }
  }
}
