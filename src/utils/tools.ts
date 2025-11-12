import crypto from "crypto";
import fs from "fs";
 // replace with actual import path
import pmlib from "./";
import { config } from "../config.js";



export function createTimeStamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

export function createNonceStr(length = 16): string {
  return crypto.randomBytes(length).toString("hex");
}


// Fields not participating in signature
const excludeFields = [
  "sign",
  "sign_type",
  "header",
  "refund_info",
  "openType",
  "raw_request",
  "biz_content",
];

/**
 * Sign the request object according to Fabric API rules
 * @param requestObject The full request object including biz_content
 * @returns base64 encoded signature string
 */
export function signRequestObject(requestObject: Record<string, any>): string {
  const fields: string[] = [];
  const fieldMap: Record<string, any> = {};

  // Include top-level fields except excluded ones
  for (const key in requestObject) {
    if (!excludeFields.includes(key)) {
      fields.push(key);
      fieldMap[key] = requestObject[key];
    }
  }

  // Include biz_content fields
  if (requestObject.biz_content && typeof requestObject.biz_content === "object") {
    const biz = requestObject.biz_content;
    for (const key in biz) {
      if (!excludeFields.includes(key)) {
        fields.push(key);
        fieldMap[key] = biz[key];
      }
    }
  }

  // Sort keys alphabetically (ASCII order)
  fields.sort();

  // Create string to sign
  const signStrList: string[] = fields.map((key) => `${key}=${fieldMap[key]}`);
  const signOriginStr = signStrList.join("&");

  console.log("signOriginStr:", signOriginStr);

  // Sign the string using RSA-SHA256
  return signString(signOriginStr, config.PrivateKey);
}

/**
 * Sign the given string using SHA256withRSA and return base64
 * @param text The string to sign
 * @param privateKey Your RSA private key
 */
function signString(text: string, privateKey: string): string {
  const sha256withrsa = new pmlib.rs.KJUR.crypto.Signature({
    alg: "SHA256withRSAandMGF1",
  });

  sha256withrsa.init(privateKey);
  sha256withrsa.updateString(text);

  const sign = pmlib.rs.hextob64(sha256withrsa.sign());
  return sign;
}



// export function signRequestObject(obj: Record<string, any>): string {
//   const sortedKeys = Object.keys(obj).sort();
//   const dataString = sortedKeys.map(k => `${k}=${obj[k]}`).join("&");

//   const privateKey = fs.readFileSync("path/to/private_key.pem", "utf8");
//   const sign = crypto.createSign("RSA-SHA256");
//   sign.update(dataString);
//   sign.end();

//   return sign.sign(privateKey, "base64"); // usually base64 encoding is required
// }

