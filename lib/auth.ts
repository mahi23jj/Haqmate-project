import { config } from "../src/config.js";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from '@prisma/client';
import { bearer } from "better-auth/plugins";

const frontendOrigin = "*";

const prisma = new PrismaClient();

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
  },
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  plugins: [bearer()],
  session: {
    // maxAge: 60 * 60 * 24 * 30, // 30 days
    // updateAge: 60 * 60 * 24, // 24 hours
    // strategy: 'jwt'
  },
  trustedOrigins: [frontendOrigin],
  // other options...
});


