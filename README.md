# Haqmat E-commerce Backend

Production-focused TypeScript/Node.js backend for a Teff e-commerce platform. It provides authentication, product and cart management, order lifecycle handling, payment integrations, delivery workflows, refunds, feedback, and admin dashboard services.

## Table of Contents

- [Haqmat E-commerce Backend](#haqmat-e-commerce-backend)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Core Features](#core-features)
  - [Tech Stack](#tech-stack)
  - [Project Structure](#project-structure)
  - [Getting Started](#getting-started)
    - [1) Prerequisites](#1-prerequisites)
    - [2) Install dependencies](#2-install-dependencies)
    - [3) Configure environment](#3-configure-environment)
    - [4) Apply database migrations](#4-apply-database-migrations)
    - [5) Run the service](#5-run-the-service)
  - [Environment Variables](#environment-variables)
  - [Available Scripts](#available-scripts)
  - [API Route Groups](#api-route-groups)
  - [Database Notes](#database-notes)
  - [Deployment Notes](#deployment-notes)

## Overview

This service powers the backend domain for Haqmat Teff commerce operations.

Key business areas covered:
- User authentication and account/session handling
- Product catalog and cart operations
- Order placement and tracking
- Payment workflows (including manual screenshot flow and gateway integrations)
- Delivery and area-based delivery fee logic
- Refund request management
- Product feedback and analytics
- App settings and dashboard endpoints

## Core Features

- **Auth & Security**: Better Auth integration, OTP flow (Resend), Helmet, CORS, cookies.
- **Catalog & Cart**: Teff product types/quality support, images, ratings, quantity/packaging cart control.
- **Orders**: Idempotent order creation, status transitions, tracking timeline, delivery scheduling.
- **Payments**: Payment intents/transactions and gateway-facing routes (Chapa, Telebirr, manual proof upload).
- **Refunds**: Structured refund request lifecycle and admin notes.
- **Operations**: Dashboard and app settings endpoints for internal management.

## Tech Stack

- **Runtime**: Node.js, Express 5, TypeScript
- **Database ORM**: Prisma
- **Database**: PostgreSQL
- **Auth**: better-auth + Prisma adapter
- **Email**: Resend
- **Storage/Media**: Cloudinary, Supabase client
- **Caching/Queue-ready**: Redis client
- **Validation/Utilities**: Zod, Axios, Multer, Firebase Admin (project-integrated)

## Project Structure

```text
src/
	app.ts              # Express app composition and route mounting
	server.ts           # Server bootstrap
	config.ts           # Environment config + clients
	router/             # HTTP route modules
	service/            # Business logic
	middleware/         # Auth, validation, upload, error handling
	validation/         # Request validation schemas
prisma/
	schema.prisma       # Data model and enums
	migrations/         # Migration history
```

## Getting Started

### 1) Prerequisites

- Node.js LTS (18+ recommended)
- PostgreSQL database
- npm

### 2) Install dependencies

```bash
npm install
```

### 3) Configure environment

Create a `.env` file in the project root and set the required variables listed below.

### 4) Apply database migrations

For local development:

```bash
npm run prisma:migrate
```

For deployment environments:

```bash
npm run prisma:deploy
```

### 5) Run the service

Development:

```bash
npm run dev
```

Production build + start:

```bash
npm run build
npm start
```

Health check endpoint:

```text
GET /health
```

## Environment Variables

Based on current configuration in `src/config.ts` and auth flow:

```env
# Core
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret

# App / payment integration fields
baseurl=https://...
fabricAppID=...
merchantAppId=...
merchantCode=...
appSecret=...
PRIVATE_KEY_BASE64=...

# Email (OTP)
RESEND_API_KEY=...
RESEND_FROM=Haqmat <no-reply@example.com>

# Supabase
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# Firebase
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# Redis
redis_host=...
redis_port=6379
redis_password=...

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

## Available Scripts

- `npm run dev` — Start development server with `tsx watch`
- `npm run build` — Generate Prisma client and compile TypeScript
- `npm start` — Run compiled server from `dist/`
- `npm run prisma:generate` — Generate Prisma client
- `npm run prisma:migrate` — Run Prisma migrate (dev)
- `npm run prisma:deploy` — Apply migrations in deployment

## API Route Groups

Mounted route groups from `src/app.ts`:

- `/api` → users/auth-related routes
- `/api` → product and settings routes
- `/api/cart` → cart routes
- `/api/order` → order routes
- `/api/feedback` → feedback routes
- `/api/payment` → Chapa payment routes
- `/api/pay` → payment routes
- `/api/manualpayment` → manual screenshot payment routes
- `/api/delivery` → delivery routes
- `/api/refund` → refund routes
- `/api/dashboard` → dashboard routes
- `/apply/h5token`, `/create/order` → Telebirr utility endpoints

## Database Notes

The Prisma schema includes domain models for:

- **Identity/Auth**: `User`, `Session`, `Account`, `Verification`
- **Catalog**: `TeffProduct`, `TeffType`, `TeffQuality`, `Image`
- **Commerce**: `Cart`, `Order`, `OrderItem`, `OrderTracking`
- **Payments**: `PaymentIntent`, `PaymentTransaction`, `IdempotencyKey`
- **Operations**: `area`, `deliveryconfigration`, `AppSettings`, `feedback`, `FeedbackAnalytics`, `RefundRequest`

Status enums are modeled for order/payment/delivery/refund lifecycle consistency.

## Deployment Notes

- Ensure all required environment variables are set in the deployment platform.
- Run `npm run prisma:deploy` before starting the server.
- Use `npm run build` and `npm start` for production runtime.
- Configure CORS origins appropriately for production clients.
