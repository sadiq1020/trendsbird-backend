# Trendsbird Backend — E-Commerce Admin Dashboard API

This repository contains the REST API for the Trendsbird e-commerce admin dashboard built with Node.js, Express, TypeScript, Prisma, and PostgreSQL (Neon).

## Setup Steps

1. Clone the repository and navigate to the project directory:
   ```bash
   cd trendsbird-backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables by copying `.env.example` to `.env` and setting your Neon `DATABASE_URL` and secrets:
   ```bash
   cp .env.example .env
   ```
4. Run Prisma database migrations:
   ```bash
   npx prisma migrate dev
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

| Variable | Description | Default / Example |
| --- | --- | --- |
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@ep-...neon.tech/neondb?sslmode=require` |
| `JWT_ACCESS_SECRET` | Secret key for signing access tokens | 32-byte hex string |
| `JWT_REFRESH_SECRET` | Secret key for signing refresh tokens | 32-byte hex string |
| `ACCESS_TOKEN_EXPIRES_IN` | Access token duration | `15m` |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token duration | `30d` |
| `COOKIE_DOMAIN` | Cookie domain setting | `localhost` |
| `FRONTEND_URL` | Frontend origin for CORS | `http://localhost:3000` |
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | HTTP server port | `5000` |

## CSRF Reasoning & Cookie Strategy
In this same-origin dev / modern admin dashboard setup, access and refresh tokens are stored in `HttpOnly`, `SameSite=Lax` cookies with `cors({ origin: FRONTEND_URL, credentials: true })`. `SameSite=Lax` prevents cross-site request forgery for state-changing cross-site requests while eliminating the need for separate CSRF tokens.

## Seeded Credentials

Run `npx prisma db seed` to seed these default accounts into the database:

- **Super Administrator** (Full system access):
  - **Email**: `admin@trendsbird.com`
  - **Password**: `Password123!`
- **Catalog Manager** (Limited catalog access — useful for verifying 403 Forbidden behavior):
  - **Email**: `catalog@trendsbird.com`
  - **Password**: `Password123!`

## Token Strategy

- **Access Token**: Short-lived (~15m), sent via `HttpOnly` cookie.
- **Refresh Token**: Long-lived (~30d), sent via `HttpOnly` cookie. Stored as SHA-256 hash in `RefreshToken` table for server-side revocation and single-use rotation.

## Module Status

| Module | Status | Notes |
| --- | --- | --- |
| Permission | Complete | Full CRUD, standard/custom actions, group hierarchy, cascade role links |
| Role | Complete | Full CRUD, permission grid linkage, grant-all shortcut, user count, lockout guard |
| User | Complete | Explicit role assignment, bcrypt hashing, self-escalation guard, hard delete |
| Auth | Complete | Login rate-limiting, HttpOnly cookies, JWT token rotation, server-side revocation |
| Media | Complete | Single/multi file upload, mime validation, sharp thumbnails, disk cleanup |
| Category | Partial (Scaffolded) | Module stubs created |
| Brand | Partial (Scaffolded) | Module stubs created |
| Attribute | Partial (Scaffolded) | Module stubs created |
| Product | Partial (Scaffolded) | Module stubs created |

## Known Issues

- None at initial scaffolding phase.
