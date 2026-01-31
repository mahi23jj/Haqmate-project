export interface FabricTokenResponse {
    token: string;
    expires_in?: number;
}
export declare function applyFabricToken(): Promise<FabricTokenResponse>;
/**
 * Verify Telebirr webhook signature
 *
 * @param {string} rawBody - Raw JSON string of webhook payload
 * @param {string} signature - Base64 string from Telebirr headers
 * @param {string} telebirrPublicKey - PEM formatted public key
 * @returns {boolean}
 */
export declare function verifyWebhookSignature(rawBody: any, signature: any, telebirrPublicKey: any): boolean;
//# sourceMappingURL=paymentservice.d.ts.map