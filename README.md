# NearCommerce

NearCommerce is a modular, AI-assisted local commerce platform that helps people discover products available at nearby physical stores and plan shopping trips together.

> NearCommerce is focused on discovery and in-person shopping. It does not process in-app payments, digital checkout, or order fulfillment.

## What's in the box

| App                 | Path           | Audience                               | Default port    |
| ------------------- | -------------- | -------------------------------------- | --------------- |
| Backend API         | `apps/backend` | Express + Socket.IO + TypeScript       | 4000            |
| Store owner portal  | `apps/web`     | Store owners manage inventory          | 3001            |
| System admin portal | `apps/admin`   | Admins moderate users, stores, reviews | 3000            |
| Shopper app         | `apps/mobile`  | Customers (React Native / Expo)        | Expo dev server |

Shared code lives in `packages/`: `@nearcommerce/api` (HTTP client, schemas, shared session manager, validation rules), `@nearcommerce/ui` (the React components used by both portals, plus the single brand icon in `packages/ui/public/icon.svg`) and `@nearcommerce/config` (the colour palette, the Tailwind preset and the shared TypeScript config).

### Features

- **Discovery & Geolocation:** Proximity-based product and store discovery powered by PostgreSQL `earthdistance` (`<50ms` target). Results display distance (km), stock status badges, store hours status (Open/Closed calculated via store IANA timezone), and 30-day freshness indicators. Filter by category, subcategory, and radius. Includes manual ZIP/postal code and coordinate fallback when GPS permission is denied.
- **Hybrid AI & Semantic Search:** Natural-language search using Google Gemini embeddings (`gemini-embedding-001` or model override) normalized and indexed via `pgvector` HNSW index. Employs a 2-second circuit breaker automatically falling back to PostgreSQL full-text (`tsvector`) and trigram (`pg_trgm`) matching if Gemini is slow or unavailable. Suspended stores or owners are automatically filtered out from search results.
- **Multimodal Visual Photo Search:** Shoppers can capture or upload photos from the mobile app (via `expo-image-picker`). Google Gemini Vision analyzes the image, identifies the product name, and transparently initiates geospatial proximity discovery. Gracefully falls back to text search if the vision service is unavailable.
- **Inventory Management:** Full product CRUD, image URL management, stock level tracking, and one-click "Confirm still in stock" verification (updates `last_verified_at = NOW()`). Stale listings (>30 days without stock confirmation) display warning badges to encourage shopper trust.
- **Dual-Mode CSV Catalog Importer:** Batch product upload via CSV (`PapaParse`). Products with valid image URLs are directly published (`is_published: true`), while rows missing images are imported safely as drafts (`is_published: false`).
- **Edge AI Image Cropper & PostgreSQL Image Hosting:** In-browser intelligent product cropping powered by ONNX Runtime Web (`onnxruntime-web`) running YOLOv8n object detection in a dedicated Web Worker (with manual crop fallback). Store owners upload cropped photos directly via binary stream (`/api/uploads/images`), stored safely as `BYTEA` in PostgreSQL with public serving (`/api/images/:id`), avoiding third-party object storage dependencies. Unreferenced uploads are automatically cleaned up.
- **Real-Time Collaborative Household Lists:** Shared shopping lists powered by Socket.IO with Redis pub/sub adapter. Supports unique 6-character alphanumeric invite codes, real-time item check/uncheck sync, custom grocery items (`custom_item_name`), item deletion, list renaming, ownership transfer, member removal, leaving lists, and invite code regeneration. Deleting catalog products preserves custom item visibility (orphan item prevention).
- **Ratings & Reviews System:** 1-to-5 star ratings and written reviews for both stores and individual products. Includes shopper review management (edit/delete own reviews) and trust gating (only email-verified accounts can post). Store owners are prohibited from reviewing their own stores or products.
- **System Administration & Moderation:** Comprehensive admin portal featuring global platform analytics and metrics (total users, stores, active products, reviews), user and store suspension toggles (real-time Redis lockout), account hard deletion with pre-deletion state snapshots in `admin_audit_logs`, admin self-demotion (`SYSTEM_ADMIN` to `CUSTOMER`), review moderation, and full category/subcategory taxonomy CRUD.
- **User Authentication, RBAC & Security:** Role-based access control (`CUSTOMER`, `STORE_OWNER`, `SYSTEM_ADMIN`). Secure password hashing (`bcrypt`), JWT access tokens (15-min expiry) paired with SHA-256 hashed refresh tokens in PostgreSQL, progressive IP and account login lockout (exponential delay after failed attempts), rate limiting on sensitive routes, email verification via Nodemailer, password reset tokens (1h expiry), and customer account deletion (`DELETE /api/users/me`).
- **Turn-by-Turn Directions & Native Maps Handoff:** One-tap navigation launching device-native maps (Apple Maps on iOS, Google Maps on Android) with address/coordinate geocoding and "avoid tolls" preference support.
- **Official Support Channel:** Standardized `/support` endpoint providing dedicated support channels for shoppers and store owners.
- **Light & Dark Mode:** All three apps follow the device or browser appearance by default, and each has a Light / Dark / Auto toggle (settings drawer on mobile, header on the portals). The choice is saved and restored on the next visit. Colours come from one shared palette (`packages/config/palette.cjs`) used by the Tailwind preset (web, admin) and the mobile theme; each portal has its own brand colour (shopper blue, store owner teal, admin violet).
- **Skeleton Loading & Blurred Pop-ups:** Pages show skeleton placeholders sized like the real content instead of loading text, and every modal, drawer and bottom sheet blurs the page behind it, built from one shared component per platform.
- **Search Distance:** Shoppers choose how far shops may be (1 to 50 km) in the mobile settings drawer (a drawer from the right; on the Favorites tab a sideways swipe also opens it). It is saved on the device and sent as `radius_meters`. Turning **Only show shops near me** off sends `nearby_only=false`: every shop is searched and results are still sorted by distance.
- **Portal polish:** The store owner portal and admin console animate between pages, show a mouse-following glow, and have back arrows on non-main pages; the app icon always returns to the default page. The admin console adds an aurora background and a Ctrl/Cmd+K command palette. A suspended account that signs in sees a **Contact support** link on every app.
- **One-time email links:** Password-reset and email-verification links work exactly once (they are claimed atomically, so two simultaneous uses cannot both succeed). The reset email also contains a reset code for the mobile app, which accepts either the code or the pasted link.

### Good to know

- Semantic search and visual photo search require a valid `GEMINI_API_KEY`. Without one, text search falls back seamlessly to PostgreSQL full-text and trigram matching, and the mobile photo search button gracefully disables or falls back.
- Uploaded product images are stored directly in PostgreSQL (up to 2 MB each). For large-scale production deployments, the storage layer can be pointed to S3/Cloud Storage while retaining the same `/api/images/:id` URLs.
- The bundled cropper model (`apps/web/public/models/yolo.onnx`) is an Ultralytics YOLOv8n export. Note that Ultralytics models are licensed under AGPL-3.0; verify licensing requirements before commercial distribution.
- In development mode, email verification and password reset tokens are logged to the backend console if SMTP credentials are not configured, enabling full local testing without an external mail provider.
- Categories are created automatically: an empty catalog is filled with the standard categories on first start, and admins can add anything missing with **Generate default catalog** (or `pnpm --filter @nearcommerce/backend seed:catalog`). Category icons are derived from the name, so admins only type a name.
- `samples/nearcommerce-sample-products.csv` is a ready-to-import product list for the store owner CSV importer.

## Repository structure

This monorepo is managed with `pnpm` workspaces and Turborepo:

```text
.
├── apps/
│   ├── admin/       # React 18, Vite, Tailwind CSS, TanStack Query admin portal
│   ├── backend/     # Express, Socket.IO, TypeScript, PostgreSQL, Redis REST & WebSocket API
│   ├── mobile/      # React Native, Expo Router, TanStack Query, Expo Image Picker mobile app
│   └── web/         # React 18, Vite, Tailwind CSS, ONNX Runtime Web store owner dashboard
├── packages/
│   ├── api/         # Shared Axios client, Zod schemas, session manager, JWT refresh & types
│   ├── config/      # Shared colour palette, Tailwind preset & TypeScript configuration
│   └── ui/          # Shared web components (Modal, Drawer, Skeleton, fields...) & the brand icon
├── samples/         # Sample CSV for the product importer
├── .env.example     # Root environment configuration template
├── Documents/       # Implementation blueprint and Software Requirements Specification
├── package.json     # Root monorepo scripts & package manager configuration
├── pnpm-workspace.yaml
└── turbo.json       # Turborepo pipeline configuration
```

## Technology stack

- **Languages:** TypeScript across the entire monorepo
- **Frontend Portals:** React 18, Vite, Tailwind CSS, TanStack Query (React Query), Formik & Yup, Lucide React
- **Mobile Client:** React Native, Expo (SDK 52), Expo Router, React Native Safe Area Context, React Native Toast Message
- **Edge AI & Computer Vision:** ONNX Runtime Web (`onnxruntime-web`) for in-browser YOLOv8n object detection, Google Gemini Vision (`@google/generative-ai`)
- **Backend Services:** Node.js, Express, Socket.IO with `@socket.io/redis-adapter`
- **Database & Storage:** PostgreSQL 15+ with extensions:
  - `pgvector` (Vector similarity search using HNSW indexing)
  - `earthdistance` & `cube` (Fast geospatial proximity queries)
  - `pg_trgm` (Trigram similarity search and fallback text indexing)
  - `uuid-ossp` (UUID primary keys)
  - `BYTEA` table (`uploaded_images`) for transactional image storage
- **Caching & State:** Redis 6+ / Upstash (Socket.IO pub/sub, real-time suspension enforcement, login rate-limiting)
- **Email & Auth:** Nodemailer (SMTP), JWT (`jsonwebtoken`), `bcrypt` (12 salt rounds)
- **Monorepo Tooling:** `pnpm` workspaces, Turborepo
- **Testing:** Jest, Supertest, React Testing Library, Jest Expo

## API Overview

All backend endpoints support optional `/api` prefixes for reverse-proxy compatibility.

| Domain        | Method & Path                                  | Auth / Role             | Description                                                                |
| ------------- | ---------------------------------------------- | ----------------------- | -------------------------------------------------------------------------- |
| **Auth**      | `POST /auth/register`                          | Public                  | Create Customer or Store Owner account                                     |
|               | `POST /auth/login`                             | Public                  | Authenticate user, return access token & set refresh session               |
|               | `POST /auth/refresh`                           | Public                  | Exchange refresh token for new access token                                |
|               | `POST /auth/logout`                            | Public                  | Invalidate refresh token session                                           |
|               | `POST /auth/verify-email`                      | Public                  | Validate email verification token                                          |
|               | `POST /auth/resend-verification`               | Public                  | Resend verification link with rate limiting                                |
|               | `POST /auth/forgot-password`                   | Public                  | Send password reset token to email                                         |
|               | `POST /auth/reset-password`                    | Public                  | Set new password with valid token                                          |
| **Users**     | `GET /api/users/me`                            | Authenticated           | Retrieve current authenticated user profile & verification status          |
|               | `DELETE /api/users/me`                         | Authenticated           | Permanently delete authenticated user account                              |
| **Discovery** | `GET /search`                                  | Public                  | Geospatial product search with filters (lat, lng, radius, category, query) |
|               | `GET /search/stores`                           | Public                  | Proximity store search (lat, lng, query, radius)                           |
|               | `POST /search/image`                           | Public                  | Multimodal Gemini Vision photo search                                      |
|               | `GET /categories`                              | Public                  | Browse full category and subcategory taxonomy tree                         |
| **Stores**    | `GET /api/stores/:storeId`                     | Public                  | Public store profile, distance, operating hours, and rating                |
|               | `GET /api/stores/mine`                         | `STORE_OWNER`           | List stores belonging to the authenticated owner                           |
|               | `POST /api/stores`                             | `STORE_OWNER`           | Create a new store profile                                                 |
|               | `GET /api/stores/:storeId/manage`              | `STORE_OWNER`           | Store management details (requires store ownership)                        |
|               | `PATCH /api/stores/:storeId`                   | `STORE_OWNER`           | Update store metadata, coordinates, timezone, and hours                    |
|               | `DELETE /api/stores/:storeId`                  | `STORE_OWNER`           | Delete store and cascade associated products                               |
| **Products**  | `GET /api/products/:productId`                 | Public                  | Public product details, stock, store info, and rating                      |
|               | `GET /api/products`                            | `STORE_OWNER`           | List store inventory (via `X-Store-ID` header)                             |
|               | `POST /api/products`                           | `STORE_OWNER`           | Create new product listing                                                 |
|               | `POST /api/products/import`                    | `STORE_OWNER`           | Bulk CSV import (image URL = published, no image = draft)                  |
|               | `PATCH /api/products/:productId`               | `STORE_OWNER`           | Update product details (auto-refreshes `last_verified_at`)                 |
|               | `DELETE /api/products/:productId`              | `STORE_OWNER`           | Remove product listing                                                     |
|               | `PATCH /api/products/:productId/confirm-stock` | `STORE_OWNER` / `ADMIN` | One-click stock freshness confirmation                                     |
| **Uploads**   | `POST /api/uploads/images`                     | `STORE_OWNER`           | Upload binary image (`raw` body <= 2MB, JPEG/PNG/WebP)                     |
|               | `GET /api/images/:id`                          | Public                  | Serve stored image binary with appropriate cache headers                   |
| **Lists**     | `GET /lists`                                   | Authenticated           | List all household lists the user belongs to                               |
|               | `POST /lists`                                  | Authenticated           | Create a new household list (assigns `OWNER` role)                         |
|               | `POST /lists/join`                             | Authenticated           | Join list using 6-character alphanumeric invite code                       |
|               | `GET /lists/:list_id`                          | Authenticated           | Retrieve list items, members, and details                                  |
|               | `PATCH /lists/:list_id`                        | `OWNER`                 | Rename household list                                                      |
|               | `DELETE /lists/:list_id`                       | `OWNER`                 | Delete household list                                                      |
|               | `POST /lists/:list_id/leave`                   | Authenticated           | Leave shared household list                                                |
|               | `POST /lists/:list_id/regenerate-invite-code`  | `OWNER`                 | Invalidate and generate a new invite code                                  |
|               | `DELETE /lists/:list_id/members/:user_id`      | `OWNER`                 | Remove member from list                                                    |
|               | `POST /lists/:list_id/items`                   | Authenticated           | Add catalog product or custom item to list                                 |
|               | `PATCH /lists/:list_id/items/:item_id`         | Authenticated           | Toggle `is_checked` or update quantity                                     |
|               | `DELETE /lists/:list_id/items/:item_id`        | Authenticated           | Remove item from list                                                      |
| **Favorites** | `GET /api/favorites`                           | Authenticated           | List user's saved stores and products (newest first)                       |
|               | `POST /api/favorites`                          | Authenticated           | Save store or product to favorites                                         |
|               | `DELETE /api/favorites/:favoriteId`            | Authenticated           | Remove store or product from favorites                                     |
| **Reviews**   | `GET /api/reviews`                             | Public / Optional Auth  | List reviews for target store or product                                   |
|               | `GET /api/reviews/mine`                        | Authenticated           | List reviews written by authenticated user                                 |
|               | `POST /api/reviews`                            | Verified Email          | Submit 1-5 star review (owner self-review prohibited)                      |
|               | `PATCH /api/reviews/:reviewId`                 | Author                  | Update review rating or comment                                            |
|               | `DELETE /api/reviews/:reviewId`                | Author                  | Delete review                                                              |
| **Admin**     | `GET /api/admin/metrics`                       | `SYSTEM_ADMIN`          | Platform aggregate counts (users, stores, products, reviews)               |
|               | `GET /api/admin/users`                         | `SYSTEM_ADMIN`          | List and search users with role and suspension filters                     |
|               | `PATCH /api/admin/users/:userId/suspend`       | `SYSTEM_ADMIN`          | Toggle user suspension status (syncs to Redis)                             |
|               | `PATCH /api/admin/users/:userId/demote`        | `SYSTEM_ADMIN`          | Demote admin user to `CUSTOMER`                                            |
|               | `DELETE /api/admin/users/:userId`              | `SYSTEM_ADMIN`          | Hard delete user with audit snapshot                                       |
|               | `GET /api/admin/stores`                        | `SYSTEM_ADMIN`          | List stores with suspension status                                         |
|               | `PATCH /api/admin/stores/:storeId/suspend`     | `SYSTEM_ADMIN`          | Toggle store suspension status                                             |
|               | `DELETE /api/admin/stores/:storeId`            | `SYSTEM_ADMIN`          | Hard delete store with audit snapshot                                      |
|               | `GET /api/admin/categories`                    | `SYSTEM_ADMIN`          | List category taxonomy for management                                      |
|               | `POST /api/admin/categories`                   | `SYSTEM_ADMIN`          | Create root category                                                       |
|               | `PATCH /api/admin/categories/:id`              | `SYSTEM_ADMIN`          | Rename root category or update icon URL                                    |
|               | `DELETE /api/admin/categories/:id`             | `SYSTEM_ADMIN`          | Delete category and cascade subcategories                                  |
|               | `POST /api/admin/categories/:id/subcategories` | `SYSTEM_ADMIN`          | Add subcategory to category                                                |
|               | `PATCH /api/admin/subcategories/:id`           | `SYSTEM_ADMIN`          | Update subcategory name                                                    |
|               | `DELETE /api/admin/subcategories/:id`          | `SYSTEM_ADMIN`          | Delete subcategory                                                         |
|               | `GET /api/admin/reviews`                       | `SYSTEM_ADMIN`          | List reviews with target filters                                           |
|               | `DELETE /api/admin/reviews/:reviewId`          | `SYSTEM_ADMIN`          | Remove review with audit trail snapshot                                    |
|               | `GET /api/admin/audit-logs`                    | `SYSTEM_ADMIN`          | Paginated audit log ledger with pre-change JSON snapshots                  |
| **Support**   | `GET /support`                                 | Public                  | Retrieve support contact email and official channels                       |

## Prerequisites

- Node.js 20 or newer (developed and tested on Node 22)
- pnpm 12.4.2 (pinned in `package.json`; managed via `corepack`)
- PostgreSQL 15 or newer with `pgvector`, `pg_trgm`, `cube`, `earthdistance`, and `uuid-ossp` extensions available. The database user must possess permissions to execute `CREATE EXTENSION`.
- Redis 6 or newer (local Redis or cloud Upstash instance)
- Google Gemini API key (optional; search falls back to full-text/trigram matching if omitted)
- SMTP credentials (optional for local development; verification and reset links log directly to stdout when unset)
- Expo Go or an Android/iOS emulator to run the shopper mobile application

## Getting started

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/Ay-dotcode/NearCommerce.git
   cd NearCommerce
   corepack enable
   pnpm install
   ```

2. Create your environment configuration file:

   ```bash
   cp .env.example .env
   ```

   Fill in `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` at minimum. In production, configure `FRONTEND_URL` (for email links) and `PUBLIC_API_URL` (for image URLs). The backend and web portals consume this root `.env` (portals only expose `VITE_`-prefixed variables).

3. Initialize the database schema. Execute the migrations sequentially:

   ```bash
   for f in apps/backend/src/db/migrations/*.sql; do
     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
   done
   ```

   > Upgrading an existing database? Apply only new migration files (e.g. `006_uploaded_images.sql`).

4. Seed initial demo data (optional):

   ```bash
   pnpm --filter @nearcommerce/backend seed
   ```

   In development, this provisions:
   - System Admin: `admin@nearcommerce.com` / `Password12++`
   - Store Owner: `joseyowolabi@gmail.com` / `Password12++` (with a sample store and demo grocery products)

   In production (`NODE_ENV=production`), seeds require explicit `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_OWNER_EMAIL`, and `SEED_OWNER_PASSWORD` environment variables.

   If products are created prior to configuring `GEMINI_API_KEY`, backfill vector embeddings at any time:

   ```bash
   pnpm --filter @nearcommerce/backend embeddings:backfill
   ```

5. Build the shared workspace packages, then start all services:

   ```bash
   pnpm --filter @nearcommerce/api build
   pnpm --filter @nearcommerce/ui build
   pnpm dev
   ```

   | App                    | URL                     | Description                                                   |
   | ---------------------- | ----------------------- | ------------------------------------------------------------- |
   | **Backend API**        | `http://localhost:4000` | Express REST & Socket.IO server                               |
   | **Store Owner Portal** | `http://localhost:3001` | Dashboard, product management, CSV import, YOLO cropping      |
   | **Admin Portal**       | `http://localhost:3000` | System metrics, user/store moderation, categories, audit logs |

6. Launch the mobile app. Expo uses its own environment configuration, so create `apps/mobile/.env`:

   ```bash
   echo 'EXPO_PUBLIC_API_URL=http://localhost:4000' > apps/mobile/.env
   pnpm --filter @nearcommerce/mobile start
   ```

   - **Physical Device:** Replace `localhost` with your workstation's LAN IP address (e.g. `http://192.168.1.50:4000`).
   - **Camera / Photo Search:** Runs via `expo-image-picker`. Compatible directly with Expo Go and custom development builds.

## Database Management & Schema Reset

To completely flush PostgreSQL and Redis, re-run all migrations from scratch, and re-seed clean demo data in a single command:

```bash
pnpm clear-db
```

This runs `apps/backend/src/db/clearDb.ts`, which:

1. Flushes all keys from Redis
2. Drops and recreates the PostgreSQL `public` schema and ENUM types
3. Re-applies all migration files in `apps/backend/src/db/migrations/` in order
4. Seeds default admin and store owner records

## Common commands

```bash
pnpm dev       # Start all applications in parallel via Turborepo
pnpm build     # Build all packages and applications
pnpm lint      # Type-check all workspaces
pnpm test      # Run all unit and integration test suites
pnpm clear-db  # Reset database & cache, re-apply migrations, and re-seed
```

Per-app workspace commands:

```bash
# Backend API
pnpm --filter @nearcommerce/backend dev
pnpm --filter @nearcommerce/backend build
pnpm --filter @nearcommerce/backend test
pnpm --filter @nearcommerce/backend embeddings:backfill

# Store Owner Portal
pnpm --filter @nearcommerce/web dev
pnpm --filter @nearcommerce/web build
pnpm --filter @nearcommerce/web test

# Admin Portal
pnpm --filter @nearcommerce/admin dev
pnpm --filter @nearcommerce/admin build
pnpm --filter @nearcommerce/admin test

# Shopper Mobile App
pnpm --filter @nearcommerce/mobile start
pnpm --filter @nearcommerce/mobile test
pnpm --filter @nearcommerce/ui test         # shared components
pnpm --filter @nearcommerce/ui generate:app-icons   # re-render the mobile icons from packages/ui/public/icon.svg
```

## Testing

- **Web, Admin, and Mobile Tests:** Fully isolated unit and component tests running via Jest and React Testing Library without requiring external services.
- **Backend Tests:** Integration tests utilizing Supertest against live PostgreSQL and Redis instances.
  - Always run integration tests against a **separate test database** (e.g. `DATABASE_URL=postgresql://.../nearcommerce_test`) to prevent mutating development data.
  - Rate limiting is automatically disabled and email sending is mocked when `NODE_ENV=test`.
- **Pre-test Build Requirement:** Always ensure shared packages are compiled before running backend tests or type-checking (`pnpm --filter @nearcommerce/api build`).

## Conventions

- **Module Aliases:** Application imports utilize the `@/` alias (e.g., `@/features/auth/...`) rather than deep relative `../../` paths.
- **Shared Packages:** Shared packages in `packages/*` import their own files through `@nearcommerce/<package>/...` aliases (configured in each package and app) and export typed APIs consumed directly by the applications.
- **Comments:** Clean inline comments use `//` for concise explanations of non-obvious business rules and safeguards.
- **Forms:** Every form uses Formik. Shared Formik-bound inputs live in `@nearcommerce/ui` (web, admin) and `apps/mobile/components/ui` (mobile); the mobile forms show errors inline instead of in pop-ups.
- **Colours:** Never hard-code colours. Tailwind classes such as `bg-white` and `text-slate-900` switch with the theme; mobile screens read `useColors()`.
- **Reuse:** Define a component once. Shared UI belongs in `packages/ui` (web, admin) or `apps/mobile/components/ui` (mobile).

## Documentation

- [Software Requirements Specification (SRS)](./NearCommerce_SRS.md): Complete product requirements, data models, architectural boundaries, and performance benchmarks.
- [Implementation Blueprint](./Implementation.md): Detailed architectural rules, testing guidelines, and phase-by-phase implementation details.

## License

This project is intended to be released under the MIT License. See the repository license file for authoritative terms.
