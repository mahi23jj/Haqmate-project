import axios from "axios";
import { config } from "../config.js";

export interface FabricTokenResponse {
  token: string;
  expires_in?: number;
}

export async function applyFabricToken(): Promise<FabricTokenResponse> {
  try {
    const response = await axios.post(
      `${config.baseUrl}/payment/v1/token`,
      { appSecret: config.appSecret },
      {
        headers: {
          "Content-Type": "application/json",
          "X-APP-Key": config.fabricAppId,
        },
      }
    );

    console.log("Fabric token applied successfully:", response.data);
    
    return response.data;
  } catch (error: any) {
    console.error("Error applying Fabric token:", error.message);
    throw error;
  }
}


