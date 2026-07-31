# Project Setup Prompt — Trends Bird Backend Assignment

Set up a new Node.js backend project called `trendsbird-backend` with the following exact specifications. Do not substitute any of the fixed technology choices below.

## Tech Stack (fixed)

- Runtime: Node.js (current LTS)
- Language: TypeScript (strict mode)
- Framework: Express
- Database: PostgreSQL, hosted on Neon
- ORM: Prisma
- Validation: Zod
- Auth: custom-built JWT access + refresh tokens (short-lived access ~15min, long-lived refresh ~30 days), stored as HttpOnly cookies. Do NOT use any third-party auth library (no Better-Auth, Passport, Auth.js, Clerk, etc.) — this must be hand-implemented since it is directly evaluated.
- Password hashing: bcrypt
- File uploads: multer
- Image thumbnails: sharp
- Slug generation: slugify
- Rate limiting: express-rate-limit (apply to the login route)
- Dev tooling: tsx for dev server, dotenv for env vars, cors + cookie-parser + helmet + morgan

## Project Purpose

This is a REST API for an e-commerce **admin dashboard only** (no storefront, no cart, no checkout). It implements a role-based access control (RBAC) system plus a product catalog domain (categories, brands, attributes, products with variants, and a shared media library). Access control correctness is the single most heavily weighted grading criterion, so guards must be airtight: every route protected by default, explicit opt-out only for login/refresh/logout.

## Auth Model (important constraints)

- There is NO public registration endpoint. Accounts are only created via the authenticated User module (by someone holding `user:create`).
- Auth routes needed: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/session`.
- On login: verify email+password, return the same generic error for wrong email or wrong password, issue access + refresh tokens as HttpOnly cookies, and persist a hashed refresh token server-side (in a `RefreshToken` table) so it can be revoked.
- On refresh: validate the refresh token against the DB record (not just JWT signature verification), then rotate — invalidate the old refresh token and issue + store a new one.
- On logout: delete/revoke the server-side refresh token record and clear both cookies. A cleared cookie without server-side revocation does not count as logout.
- `GET /auth/session` returns the current user, their role, and a flat array of permission name strings (e.g. `["product:create", "product:read", ...]`) — the frontend will use this list to decide what to render.
- Inactive users (`active: false`) must be rejected on both login and refresh.
- Cookie config: use `SameSite=Lax` for a same-origin dev setup, `cors({ origin: FRONTEND_URL, credentials: true })`, and document this CSRF reasoning in the README rather than implementing a separate CSRF token scheme.
- Two middleware guards, applied globally then per-route:
  1. **Auth guard** — verifies the access token cookie; returns 401 if missing/malformed/expired/wrongly signed, or if the user is inactive.
  2. **Permission guard** — reads a required permission string declared on the route, checks it against the current user's role's permissions; returns 403 if missing.

## Database Schema

Use exactly this Prisma schema (do not restructure the relations, though you may add indexes):

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum MediaType {
  IMAGE
  VIDEO
}

enum AttributeType {
  DROPDOWN
  RADIO
  CHECKBOX
  COLOR_SWATCH
  IMAGE_SWATCH
}

enum StockStatus {
  IN_STOCK
  OUT_OF_STOCK
  LOW_STOCK
}

model PermissionGroup {
  id          String       @id @default(uuid())
  name        String       @unique
  description String?
  permissions Permission[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model Permission {
  id          String            @id @default(uuid())
  name        String            @unique
  description String?
  groupId     String
  group       PermissionGroup   @relation(fields: [groupId], references: [id])
  roles       RolePermission[]
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
}

model Role {
  id          String            @id @default(uuid())
  name        String            @unique
  description String?
  status      Boolean           @default(true)
  permissions RolePermission[]
  users       User[]
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
}

model RolePermission {
  roleId       String
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permissionId String
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
}

model User {
  id            String         @id @default(uuid())
  name          String
  email         String         @unique
  password      String
  phone         String?
  gender        String?
  avatar        String?
  active        Boolean        @default(true)
  roleId        String
  role          Role           @relation(fields: [roleId], references: [id])
  refreshTokens RefreshToken[]
  uploadedMedia Media[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model RefreshToken {
  id        String   @id @default(uuid())
  tokenHash String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  revoked   Boolean  @default(false)
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model Media {
  id            String            @id @default(uuid())
  fileName      String
  storedPath    String
  publicUrl     String
  mimeType      String
  type          MediaType
  size          Int
  width         Int?
  height        Int?
  thumbnailPath String?
  altText       String?
  title         String?
  uploadedById  String
  uploadedBy    User              @relation(fields: [uploadedById], references: [id])
  attachments   MediaAttachment[]
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
}

model MediaAttachment {
  id      String @id @default(uuid())
  mediaId String
  media   Media  @relation(fields: [mediaId], references: [id], onDelete: Cascade)

  productId String?
  product   Product? @relation(fields: [productId], references: [id], onDelete: Cascade)

  variantId String?
  variant   ProductVariant? @relation(fields: [variantId], references: [id], onDelete: Cascade)

  attributeValueId String?
  attributeValue   AttributeValue? @relation(fields: [attributeValueId], references: [id], onDelete: Cascade)

  isThumbnail Boolean @default(false)
  isGallery   Boolean @default(true)
  sortOrder   Int     @default(0)
}

model Category {
  id          String            @id @default(uuid())
  name        String
  slug        String            @unique
  description String?
  image       String?
  parentId    String?
  parent      Category?         @relation("CategoryTree", fields: [parentId], references: [id])
  children    Category[]        @relation("CategoryTree")
  active      Boolean           @default(true)
  sortOrder   Int               @default(0)
  products    ProductCategory[]
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
}

model Brand {
  id          String    @id @default(uuid())
  name        String    @unique
  slug        String    @unique
  logo        String?
  status      Boolean   @default(true)
  description String?
  products    Product[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Attribute {
  id        String           @id @default(uuid())
  name      String           @unique
  slug      String           @unique
  type      AttributeType
  values    AttributeValue[]
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt
}

model AttributeValue {
  id             String                          @id @default(uuid())
  value          String
  slug           String
  referenceValue String?
  attributeId    String
  attribute      Attribute                       @relation(fields: [attributeId], references: [id], onDelete: Cascade)
  attachments    MediaAttachment[]
  variantLinks   ProductVariantAttributeValue[]
  createdAt      DateTime                        @default(now())
  updatedAt      DateTime                        @updatedAt

  @@unique([attributeId, value])
}

model Product {
  id               String    @id @default(uuid())
  name             String
  slug             String    @unique
  sku              String?   @unique
  shortDescription String?
  longDescription  String?
  hasVariants      Boolean   @default(false)

  price       Decimal? @db.Decimal(10, 2)
  salePrice   Decimal? @db.Decimal(10, 2)
  stock       Int?
  stockStatus StockStatus?

  weight    Decimal? @db.Decimal(10, 2)
  active    Boolean  @default(true)
  featured  Boolean  @default(false)
  sortOrder Int      @default(0)

  brandId String?
  brand   Brand?  @relation(fields: [brandId], references: [id])

  categories ProductCategory[]
  variants   ProductVariant[]
  media      MediaAttachment[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ProductCategory {
  productId  String
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  categoryId String
  category   Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@id([productId, categoryId])
}

model ProductVariant {
  id        String @id @default(uuid())
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  sku       String  @unique

  price       Decimal @db.Decimal(10, 2)
  salePrice   Decimal? @db.Decimal(10, 2)
  stock       Int
  stockStatus StockStatus

  lowStockThreshold Int?
  weight            Decimal? @db.Decimal(10, 2)
  active            Boolean  @default(true)

  attributeValues ProductVariantAttributeValue[]
  media           MediaAttachment[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ProductVariantAttributeValue {
  variantId        String
  variant          ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)
  attributeValueId String
  attributeValue   AttributeValue @relation(fields: [attributeValueId], references: [id])

  @@id([variantId, attributeValueId])
}
```

Notes to respect:
- `MediaAttachment` is intentionally polymorphic: exactly one of `productId` / `variantId` / `attributeValueId` must be set — enforce this in the service layer, not the DB.
- `Product.sku/price/salePrice/stock/stockStatus` are only meaningful when `hasVariants` is false — enforce via Zod, not DB constraints.
- `RefreshToken.tokenHash` stores a hash of the token, never the raw value.

## Folder Structure

Use a module-per-feature structure:

```
src/
  config/
    env.ts
  prisma/
    client.ts
  common/
    middlewares/
      auth.guard.ts
      permission.guard.ts
      error-handler.ts
      validate.ts
    utils/
      response.ts
      slug.ts
      asyncHandler.ts
  modules/
    auth/
    permission/
    role/
    user/
    media/
    category/
    brand/
    attribute/
    product/
  app.ts
  server.ts
prisma/
  schema.prisma
  seed.ts
```

Each module folder should contain `*.routes.ts`, `*.controller.ts`, `*.service.ts`, `*.schema.ts` (Zod schemas), and `*.interface.ts` (TypeScript types, typically `z.infer<typeof someSchema>` re-exports plus any service-layer return types that don't need runtime validation), keeping routing, business logic, validation, and typing clearly separated.

## Environment Variables

Use these exact values in `.env` (and mirror the variable names, with placeholder values, in `.env.example`):

```
DATABASE_URL="postgresql://<user>:<password>@<endpoint>.neon.tech/<dbname>?sslmode=require"
JWT_ACCESS_SECRET=<paste output of: openssl rand -hex 32>
JWT_REFRESH_SECRET=<paste output of: openssl rand -hex 32>
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=30d
COOKIE_DOMAIN=localhost
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
PORT=5000
```

## Git & Tooling

- Run `git init`, add a `.gitignore` covering `node_modules`, `.env`, `dist`, and make an initial commit immediately after scaffolding. Continue committing incrementally per module going forward — a single giant commit is explicitly penalized by the assignment.
- Add an `"engines"` field in `package.json` pinning the current Node LTS version, plus a matching `.nvmrc`.
- Generate a bare `README.md` with these section headers, ready to fill in as modules are built: Setup Steps, Environment Variables, Seeded Credentials, Token Strategy, Module Status (table: module / complete / partial / not attempted), Known Issues.

## Coding Standards

- One consistent success response shape and one consistent error response shape, produced centrally (via a shared response util + a centralized error-handling middleware). Never leak stack traces, raw Prisma errors, or internal paths.
- Every request body, query param, and route param validated with Zod before reaching business logic.
- Multi-table writes (e.g. creating a product with categories + variants + media) wrapped in a Prisma transaction.
- Return 400/422 for validation failures, 404 for missing records, 409 for conflicts (duplicate slug/SKU), 401 for auth failures, 403 for permission failures. Never a raw 500 for predictable bad input.
- No secrets committed; provide `.env.example` listing every variable used.

## What to Scaffold Right Now

1. Initialize the TypeScript + Express project with the folder structure above.
2. Install all dependencies listed in the tech stack.
3. Set up `prisma/schema.prisma` with the schema above and run the initial migration against the Neon `DATABASE_URL`.
4. Set up `src/app.ts` and `src/server.ts` with helmet, cors (credentials: true), cookie-parser, morgan, and the centralized error handler wired in.
5. Do NOT implement business logic yet — stop after the project boots successfully and the database migration succeeds. I will direct you module by module afterward, starting with Permission, then Role, then User, then Auth.
