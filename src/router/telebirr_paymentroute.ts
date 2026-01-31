process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import axios from "axios";
import https from "https";
import { applyFabricToken, verifyWebhookSignature } from "../service/telebirr_paymentservice.js";
import { config } from "../config.js";
import * as tools from "../utils/tools.js";
import { type Request, type Response, type NextFunction, Router } from "express";
import { PrismaClient , OrderStatus, PaymentStatus } from '@prisma/client';


import { prisma } from '../prisma.js';
const router = Router();




router.post("/telebirr/webhook", async (req: Request, res: Response) =>  {
  const signature = req.headers["x-signature"]; // Telebirr header
   const rawBody = req.body; 
   //const rawBody = req.rawbody; ??????

  const TELEBIRR_PUBLIC_KEY = `
-----BEGIN PUBLIC KEY-----
YOUR_PUBLIC_KEY_HERE
-----END PUBLIC KEY-----
`;

  const valid = verifyWebhookSignature(rawBody, signature, TELEBIRR_PUBLIC_KEY);

  if (!valid) {
    console.log("❌ Telebirr: Invalid signature");
    return res.status(400).send("Invalid signature");
  }

  console.log("✅ Telebirr signature OK");
  const payload = req.body;


   const merchOrderId = payload.merch_order_id;

    // 2. Find order
    const order = await prisma.order.findUnique({
      where: { id: merchOrderId },
    });

    if (!order) return res.status(404).send("Order not found");

    // 3. Check payment status
    if (payload.trade_status === "SUCCESS") {
      await prisma.order.update({
        where: { id:merchOrderId },
        data: { paymentStatus : PaymentStatus.CONFIRMED , status : OrderStatus.TO_BE_DELIVERED }
      });

      // await prisma.orderTracking.update({
      //   data: {
      //     orderId: order.id,
      //     title: "Paid",
          
      //     timestamp: new Date()
      //   }
      // });
    }

    if (payload.trade_status === "FAILED") {
      await prisma.order.update({
        where: { id:merchOrderId },
        data: { paymentStatus : PaymentStatus.FAILED }
      });
    }

    res.send("SUCCESS");

  // process payment
  // save to DB etc.

  return res.send("success");
});


// {
//   try {
//     const payload = req.body;

//     // 1. Verify signature
//     const isValid = verifyWebhookSignature(payload);

//     if (!isValid) {
//       console.log("Invalid signature");
//       return res.status(400).send("Invalid signature");
//     }

   
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("webhook failed");
//   }
// });


// 1️⃣ Authenticate user and get authToken
export async function authToken(req: Request, res: Response) {
  try {
    const appToken = req.body.authToken;
    const { token: fabricToken } = await applyFabricToken();

    const result = await requestAuthToken(fabricToken, appToken);
    res.json(result);
  } catch (error: any) {
    console.error("Auth token error:", error.message);
    res.status(500).json({ error: "Auth token failed" });
  }
}

async function requestAuthToken(fabricToken: string, appToken: string) {
  const reqObject = createAuthRequestObject(appToken);
  const response = await axios.post(
    `${config.baseUrl}/payment/v1/auth/authToken`,
    reqObject,
    {
      headers: {
        "Content-Type": "application/json",
        "X-APP-Key": config.fabricAppId,
        Authorization: fabricToken,
      },
    }
  );


  return response.data;
}

function createAuthRequestObject(appToken: string) {
  const req: any = {
    timestamp: tools.createTimeStamp(),
    method: "payment.authtoken",
    nonce_str: tools.createNonceStr(),
    version: "1.0",
    biz_content: {
      access_token: appToken,
      trade_type: "InApp",
      appid: config.merchantAppId,
      resource_type: "OpenId",
    },
  };
  req.sign = tools.signRequestObject(req);
  req.sign_type = "SHA256WithRSA";
  return req;
}
// ---------------------------
// Create Order Controller
// ---------------------------
export const createOrder = async (req: Request, res: Response) => {
  try {
    const userId = req.user;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const orderId = req.body.orderId;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        totalAmount: true,
        merchOrderId: true,
        status: true,
      },
    });

    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.userId !== userId)
      return res.status(403).json({ error: "Order does not belong to this buyer" });
    if (order.status !== OrderStatus.PENDING_PAYMENT)
      return res.status(400).json({ error: `Order not eligible for payment. Status: ${order.status}` });

    const amount = order.totalAmount.toString();
    const title = `Order Payment - ${order.merchOrderId}`;

    const { token: fabricToken } = await applyFabricToken();

    const createOrderResult = await requestCreateOrder(
      fabricToken,
      title,
      amount,
      order.merchOrderId
    );

    const prepayId = createOrderResult.biz_content.prepay_id;

    const rawRequest = createRawRequest(prepayId);

    return res.status(200).json(rawRequest);
  } catch (error: any) {
    console.error("Error in createOrder:", error.message);
    return res.status(500).json({ message: "Order creation failed" });
  }
};


// ---------------------------
// Request Create Order
// ---------------------------
export const requestCreateOrder = async (
  fabricToken: string,
  title: string,
  amount: string,
  merchOrderId: string
) => {
  try {
    const reqObject = createRequestObject(title, amount , merchOrderId);

    console.log("Request Object:", reqObject);

    const response = await axios.post(
      `${config.baseUrl}/payment/v1/merchant/preOrder`,
      reqObject,
      {
        headers: {
          "Content-Type": "application/json",
          "X-APP-Key": config.fabricAppId,
          Authorization: fabricToken,

        },
      }
    );

    console.log("Create orders response:", response.data);

    return response.data;
  } catch (error: any) {
    console.error("Error while requesting create order:", error.message);
    throw error;
  }
};

// ---------------------------
// Create Request Object
// ---------------------------
function createRequestObject(title: string, amount: string , merchOrderId: string) {

  console.log(tools.createNonceStr())
  console.log('time stamp example: ',tools.createTimeStamp())
  const req: any = {
    timestamp: tools.createTimeStamp(),
    nonce_str: tools.createNonceStr(),
    method: "payment.preorder",
    version: "1.0",
  };
  

  const biz: any = {
    trade_type: "InApp",
    appid: config.merchantAppId,
    merch_code: config.merchantCode,
    merch_order_id: merchOrderId,
    title: title,
    total_amount: amount,
    trans_currency: "ETB",
    timeout_express: "120m",
    payee_identifier: config.merchantCode,
    payee_identifier_type: "04",
    payee_type: "5000",
  };

  console.log("Request Object:", req);

  req.biz_content = biz;
  req.sign = tools.signRequestObject(req);

  console.log("Request Object with sign:", req.sign);
  req.sign_type = "SHA256WithRSA";

  console.log("Signed Request:", req);

  return req;
}

// ---------------------------
// Create Raw Request for Mobile SDK
// ---------------------------
function createRawRequest(prepayId: string) {
  const map = {
    appid: config.merchantAppId,
    merch_code: config.merchantCode,
    nonce_str: tools.createNonceStr(),
    prepay_id: prepayId,
    timestamp: tools.createTimeStamp(),
  };

  const sign = tools.signRequestObject(map);

  const rawRequest = [
    `appid=${map.appid}`,
    `merch_code=${map.merch_code}`,
    `nonce_str=${map.nonce_str}`,
    `prepay_id=${map.prepay_id}`,
    `timestamp=${map.timestamp}`,
    `sign=${sign}`,
    `sign_type=SHA256WithRSA`,
  ].join("&");

  console.log("rawRequest =", rawRequest);

  return rawRequest;
}


// 2️⃣ Create payment order
// export async function createOrder(req: Request, res: Response) {
//   try {
//     const { title, amount } = req.body;
//     const { token: fabricToken } = await applyFabricToken();

//     const createOrderResult = await requestCreateOrder(fabricToken, title, amount);
    
    
    
//     const prepayId = createOrderResult.biz_content.prepay_id;

//     const rawRequest = createRawRequest(prepayId);

//     res.json(rawRequest);
//   } catch (error: any) {
//     console.error("Create order error:", error.message);
//     res.status(500).json({ error: "Create order failed" });
//   }
// }

// async function requestCreateOrder(fabricToken: string, title: string, amount: number) {

//     /* try {
//         const reqObject = createOrderRequestObject(title, amount);
//         const response = await axios.post(
//           `${config.baseUrl}/payment/v1/merchant/preOrder`,
//           reqObject,
//           {
//             headers: {
//               "Content-Type": "application/json",
//               "X-APP-Key": config.fabricAppId,
//               Authorization: fabricToken,
//             },
//           }
//         );
      
//         console.log("Create orders response:", response.data);
//         return response.data;
        
//     } catch (error) {
//     console.error("Error creating order:", error);
//     throw error;
        
//     } */

//     try {
//         const reqObject = createOrderRequestObject(title, amount);

//         console.log("Request Object:", reqObject);
        
//   const response = await axios.post(
//     `${config.baseUrl}/payment/v1/merchant/preOrder`,
//     reqObject,
//     {
//       headers: {
//         "Content-Type": "application/json",
//         "X-APP-Key": config.fabricAppId,
//         Authorization: fabricToken,
//       },
//       httpsAgent: new https.Agent({ rejectUnauthorized: false }), // For sandbox
//     }
//   );
//   return response.data;
// } catch (error: any) {
//   console.error("Status:", error.response?.status);
//   console.error("Response data:", error.response?.data);
//   console.error("Sent body:", error.config?.data);
// }

// }

// function createOrderRequestObject(title: string, amount: number) {
//   const req: any = {
//     timestamp: tools.createTimeStamp(),
//     nonce_str: tools.createNonceStr(),
//     method: "payment.preorder",
//     version: "1.0",
//     biz_content: {
//       trade_type: "InApp",
//       appid: config.merchantAppId,
//       merch_code: config.merchantCode,
//       merch_order_id: Date.now().toString(),
//       title,
//       total_amount: amount.toString(),
//       trans_currency: "ETB",
//       timeout_express: "120m",
//       payee_identifier: config.merchantCode,
//       payee_identifier_type: "04",
//       payee_type: "5000",
//     },
//   };
//   req.sign = tools.signRequestObject(req);
//   req.sign_type = "SHA256WithRSA";
//   return req;
// }

// function createRawRequest(prepayId: string) {
//   const map: Record<string, string> = {
//     appid: config.merchantAppId ?? "",
//     merch_code: config.merchantCode ?? "",
//     nonce_str: tools.createNonceStr(),
//     prepay_id: prepayId,
//     timestamp: tools.createTimeStamp(),
//   };
//   const sign = tools.signRequestObject(map);

//   console.log("raw request", sign);
  
//   return {
//     ...map,
//     sign,
//     sign_type: "SHA256WithRSA",
//   };
// }
