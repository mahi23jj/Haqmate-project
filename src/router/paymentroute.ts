process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import axios from "axios";
import https from "https";
import { applyFabricToken } from "../service/paymentservice.js";
import { config } from "../config.js";
import * as tools from "../utils/tools.js";
import type { Request, Response, NextFunction } from "express";

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

// 2️⃣ Create payment order
export async function createOrder(req: Request, res: Response) {
  try {
    const { title, amount } = req.body;
    const { token: fabricToken } = await applyFabricToken();

    const createOrderResult = await requestCreateOrder(fabricToken, title, amount);
    
    
    
    const prepayId = createOrderResult.biz_content.prepay_id;

    const rawRequest = createRawRequest(prepayId);

    res.json(rawRequest);
  } catch (error: any) {
    console.error("Create order error:", error.message);
    res.status(500).json({ error: "Create order failed" });
  }
}

async function requestCreateOrder(fabricToken: string, title: string, amount: number) {

    /* try {
        const reqObject = createOrderRequestObject(title, amount);
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
        
    } catch (error) {
    console.error("Error creating order:", error);
    throw error;
        
    } */

    try {
        const reqObject = createOrderRequestObject(title, amount);

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
      httpsAgent: new https.Agent({ rejectUnauthorized: false }), // For sandbox
    }
  );
  return response.data;
} catch (error: any) {
  console.error("Status:", error.response?.status);
  console.error("Response data:", error.response?.data);
  console.error("Sent body:", error.config?.data);
}

}

function createOrderRequestObject(title: string, amount: number) {
  const req: any = {
    timestamp: tools.createTimeStamp(),
    nonce_str: tools.createNonceStr(),
    method: "payment.preorder",
    version: "1.0",
    biz_content: {
      trade_type: "InApp",
      appid: config.merchantAppId,
      merch_code: config.merchantCode,
      merch_order_id: Date.now().toString(),
      title,
      total_amount: amount.toString(),
      trans_currency: "ETB",
      timeout_express: "120m",
      payee_identifier: config.merchantCode,
      payee_identifier_type: "04",
      payee_type: "5000",
    },
  };
  req.sign = tools.signRequestObject(req);
  req.sign_type = "SHA256WithRSA";
  return req;
}

function createRawRequest(prepayId: string) {
  const map: Record<string, string> = {
    appid: config.merchantAppId ?? "",
    merch_code: config.merchantCode ?? "",
    nonce_str: tools.createNonceStr(),
    prepay_id: prepayId,
    timestamp: tools.createTimeStamp(),
  };
  const sign = tools.signRequestObject(map);
  return {
    ...map,
    sign,
    sign_type: "SHA256WithRSA",
  };
}
