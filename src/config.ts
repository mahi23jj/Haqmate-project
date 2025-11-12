import dotenv from 'dotenv';

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

};

if (!config.databaseUrl) {
  // eslint-disable-next-line no-console
  console.warn('DATABASE_URL is not set. Set it in your environment.');
}
