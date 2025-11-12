import express from 'express';
import cors from "cors";
import { toNodeHandler } from 'better-auth/node';
import { auth } from '../lib/auth.js';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { usersRouter } from './router/user_router.js';
import { config } from './config.js';
import { productRouter } from './router/productrouter.js';
import { cartRouter } from './router/cartrouter.js';
import { createOrder } from './router/paymentroute.js';

export const app = express();



if (config.isdev) {
  app.use(cors({
    origin: (origin, cb) => cb(null, true), // Allow all origins
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }));
} else {
  // production CORS settings
  //   app.use(cors({
  //   origin: ["https://teff-store.com"], // only your deployed frontend
  //   credentials: true,
  // }));
}



app.use(helmet());
app.use(cookieParser());

// parse JSON for your own routes (after auth)
app.use(express.json());

// Example route (protected demonstration done via authClient or session logic)
app.get('/health', (req, res) => res.json({ ok: true }));


// Auth routes with better-auth
// app.all("/api/auth/*", toNodeHandler(auth));
app.use('/api', usersRouter);
app.use('/api', productRouter);
app.use('/api/cart', cartRouter);
app.post('/api/v1/createOrder',createOrder)

// parse JSON for your own routes (after auth)
app.use(express.json());

// General error handler for other routes
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res
      .status(err.status || 500)
      .json({ error: err.message || "Internal Server Error" });
  }
);



