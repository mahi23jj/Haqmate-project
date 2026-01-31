import axios from "axios";
import { config } from "../config.js";
import crypto from "crypto";
export async function applyFabricToken() {
    try {
        const response = await axios.post(`${config.baseUrl}/payment/v1/token`, { appSecret: config.appSecret }, {
            headers: {
                "Content-Type": "application/json",
                "X-APP-Key": config.fabricAppId,
            },
        });
        console.log("Fabric token applied successfully:", response.data);
        return response.data;
    }
    catch (error) {
        console.error("Error applying Fabric token:", error.message);
        throw error;
    }
}
/**
 * Verify Telebirr webhook signature
 *
 * @param {string} rawBody - Raw JSON string of webhook payload
 * @param {string} signature - Base64 string from Telebirr headers
 * @param {string} telebirrPublicKey - PEM formatted public key
 * @returns {boolean}
 */
export function verifyWebhookSignature(rawBody, signature, telebirrPublicKey) {
    try {
        const verifier = crypto.createVerify("RSA-SHA256");
        // Telebirr requires RAW BODY, not parsed JSON
        verifier.update(rawBody, "utf8");
        verifier.end();
        // signature is base64 — Telebirr standard
        return verifier.verify(telebirrPublicKey, signature, "base64");
    }
    catch (e) {
        console.error("Telebirr Signature Verification Failed:", e);
        return false;
    }
}
//# sourceMappingURL=paymentservice.js.map