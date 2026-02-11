import { v2 as cloudinary } from 'cloudinary';
export declare const config: {
    RESEND_API_KEY: string | undefined;
    RESEND_FROM: string | undefined;
    nodeEnv: string;
    port: number;
    databaseUrl: string;
    jwtSecret: string;
    isdev: boolean;
    baseUrl: string | undefined;
    fabricAppId: string | undefined;
    merchantAppId: string | undefined;
    merchantCode: string | undefined;
    appSecret: string | undefined;
    PrivateKey: string;
    GOOGLE_APPLICATION_CREDENTIALS: string;
    Redis_Host: string;
    Redis_Port: number;
    Redis_Password: string;
    CLOUDINARY_CLOUD_NAME: string;
    CLOUDINARY_API_KEY: string;
    CLOUDINARY_API_SECRET: string | undefined;
};
export declare const supabase: import("@supabase/supabase-js").SupabaseClient<any, "public", "public", any, any>;
export { cloudinary };
//# sourceMappingURL=config.d.ts.map