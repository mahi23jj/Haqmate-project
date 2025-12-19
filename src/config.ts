import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? '',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
  isdev : process.env.NODE_ENV !== 'production',
  baseUrl: process.env.baseurl, // exampleoce
  fabricAppId: process.env.fabricAppID,
  merchantAppId: process.env.merchantAppId,
  merchantCode: process.env.merchantCode,
  appSecret: process.env.appSecret,
  PrivateKey: process.env.PrivateKey || '',
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
  
};


export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // IMPORTANT: service role key
);


if (!config.databaseUrl) {
  // eslint-disable-next-line no-console
  console.warn('DATABASE_URL is not set. Set it in your environment.');
}
