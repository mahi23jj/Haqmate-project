import { config } from "../config.js";
import {rs} from "./sign-util-lib.js";

// Fields not participating in signature
const excludeFields: string[] = [
  "sign",
  "sign_type",
  "header",
  "refund_info",
  "openType",
  "raw_request",
  "biz_content",
];

interface BizContent {
  [key: string]: any;
}

interface RequestObject {
  [key: string]: any;
  biz_content?: BizContent;
}

function signRequestObject(requestObject: RequestObject): string {
  const fields: string[] = [];
  const fieldMap: { [key: string]: any } = {};

  for (const key in requestObject) {
    if (excludeFields.includes(key)) continue;
    fields.push(key);
    fieldMap[key] = requestObject[key];
  }

  // Include biz_content fields in signature
  if (requestObject.biz_content) {
    const biz: BizContent = requestObject.biz_content;
    for (const key in biz) {
      if (excludeFields.includes(key)) continue;
      fields.push(key);
      fieldMap[key] = biz[key];
    }
  }

  // Sort by ASCII
  fields.sort();

  const signStrList: string[] = fields.map((key) => `${key}=${fieldMap[key]}`);
  const signOriginStr: string = signStrList.join("&");
  console.log("signOriginStr", signOriginStr);

  return signString(signOriginStr, config.PrivateKey);
}

const signString = (text: string, privateKey: string): string => {
  const sha256withrsa = new rs.KJUR.crypto.Signature({
    alg: "SHA256withRSAandMGF1",
  });
  sha256withrsa.init(privateKey);
  sha256withrsa.updateString(text);
  const sign: string = rs.hextob64(sha256withrsa.sign());
  console.log("privateKey:");
  console.log("sign:", sign);
  return sign;
};

function createTimeStamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

// Create a 32-character random string
function createNonceStr(): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let str = "";
  for (let i = 0; i < 32; i++) {
    const index = Math.floor(Math.random() * chars.length);
    str += chars[index];
  }
  return str;
}

export { signString, signRequestObject, createTimeStamp, createNonceStr };

