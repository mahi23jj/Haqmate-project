import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

export const config = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM: process.env.RESEND_FROM,
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? '',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
  isdev: process.env.NODE_ENV !== 'production',
  baseUrl: process.env.baseurl, // exampleoce
  fabricAppId: process.env.fabricAppID,
  merchantAppId: process.env.merchantAppId,
  merchantCode: process.env.merchantCode,
  appSecret: process.env.appSecret,
  PrivateKey: Buffer
    .from(process.env.PRIVATE_KEY_BASE64!, 'base64')
    .toString('utf8'),
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
  Redis_Host: process.env.redis_host || '',
  Redis_Port: process.env.redis_port ? parseInt(process.env.redis_port) : 6379,
  Redis_Password: process.env.redis_password || '',
};


export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // IMPORTANT: service role key
);


if (!config.databaseUrl) {
  // eslint-disable-next-line no-console
  console.warn('DATABASE_URL is not set. Set it in your environment.');
}
