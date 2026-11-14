# Near Commerce

Near Commerce is a modular, AI-assisted local commerce platform that helps people discover products available at nearby physical stores and plan shopping trips together.

> Near Commerce is focused on discovery and in-person shopping. It does not process in-app payments, digital checkout, or order fulfillment.

## Live Deployments & Applications

| App | Live URL | Platform / Host | Audience |
| --- | --- | --- | --- |
| **Store Owner Portal** | [nearcommerce-owner.pages.dev](https://nearcommerce-owner.pages.dev) | Cloudflare Pages | Store owners managing stores, inventory & YOLO AI crops |
| **System Admin Portal** | [nearcommerce-admin.pages.dev](https://nearcommerce-admin.pages.dev) | Cloudflare Pages | Platform moderators managing users, stores, categories & audit logs |
| **Backend REST & WebSocket API** | [nearcommerce-api.onrender.com](https://nearcommerce-api.onrender.com) | Render (Web Service) | API consumed by mobile and web frontends |
| **Shopper Mobile App (Android APK)** | [Latest GitHub Release](https://github.com/Ay-dotcode/NearCommerce/releases) | GitHub Releases / EAS Update | Shoppers discovering nearby stores, lists & camera search |

## Applications & Packages Overview

```text
.
├── apps/
│   ├── admin/       # System Admin Portal (React 18, Vite, Tailwind CSS, TanStack Query)
│   ├── backend/     # Backend REST & WebSocket API (Node.js, Express, Socket.IO, PostgreSQL, Redis)
│   ├── mobile/      # Shopper Mobile App (React Native, Expo SDK 52, Expo Router, TypeScript)
│   └── web/         # Store Owner Portal (React 18, Vite, Tailwind CSS, ONNX Runtime Web)
├── packages/
│   ├── api/         # Shared Axios client, Zod schemas, JWT refresh, session manager & auth contracts
│   ├── config/      # Shared color palette, Tailwind CSS preset, theme scripts & TypeScript config
│   ├── helpers/     # Shared utility functions (formatting, date/time, category icons, theme logic)
│   └── ui/          # Shared Web UI component library (Modals, Drawers, Skeletons, Tables, Brand Icon)
├── docs/            # Software Requirements Specification (SRS), Blueprint & Deployment Guides
└── samples/         # Sample CSV catalog data for bulk product imports
```

### 1. Shopper Mobile App (`apps/mobile`)
Designed for shoppers on Android and iOS devices:
- **Nearby Discovery:** Geospatial product and store exploration powered by PostgreSQL `earthdistance` queries. Stores display calculated Open/Closed status, operating hours in the store's IANA timezone, distance in kilometers, and community ratings.
- **Multimodal Visual & Hybrid Search:** Search by keywords (Gemini semantic vector embeddings + PostgreSQL trigram fallback) or capture photos via `expo-image-picker` with Google Gemini Vision automatically identifying products.
- **Category Taxonomy Browsing:** Browse hierarchical root categories and subcategories with custom category icons and filters.
- **Real-Time Collaborative Household Lists:** Create shared shopping lists synced in real time over Socket.IO and Redis pub/sub. Includes 6-character alphanumeric invite codes, real-time item check/uncheck status, custom uncataloged items, quantity adjustments, and orphan prevention.
- **Favorites & Saved Items:** Save favorite stores and individual products with quick filtering by type (All, Stores, Products).
- **Ratings & Reviews:** Submit 1-to-5 star ratings and written reviews for both stores and products, with the ability to edit or delete your own reviews.
- **Turn-by-Turn Directions:** One-tap navigation handoff to device-native maps (Google Maps / Apple Maps) using exact store coordinates.
- **Flexible Location Services:** GPS geolocation with manual ZIP/postal code fallback or coordinate inputs.
- **Adjustable Search Radius:** Custom search distance slider (1 to 50 km) and toggle between "Only show shops near me" or nearest-first across all stores.
- **In-App Updater & Self-Installation:** Automatic check against GitHub Releases for new APK versions. Required major updates prompt an update screen; optional updates allow skipping or continuing. Android APKs can download and launch the system package installer directly in-app.
- **Interactive Onboarding & Help:** 7-step onboarding carousel ("How Near Commerce works") replayable at any time from settings, plus an in-app Support bottom sheet.
- **Theme & Motion Preferences:** Automatic system dark/light mode detection with manual override, skeleton loading placeholders, and reduced motion accessibility support.

### 2. Store Owner Portal (`apps/web`)
Dedicated web dashboard for local business owners:
- **Store Profile Management:** Configure store details, street address, operating hours per day of the week, IANA timezone, and one-tap "Use my location" GPS coordinate lookup.
- **Interactive Onboarding Tour:** Guided multi-step walkthrough explaining store configuration, product drafts/publishing, and stock freshness.
- **Product & Inventory CRUD:** Add and edit products with name, price, quantity, category/subcategory taxonomy, description, and image URL.
- **Edge AI Intelligent Image Cropper:** In-browser product image cropping powered by ONNX Runtime Web (`onnxruntime-web`) running a YOLOv8n object detection model inside a Web Worker, with fallback to manual cropping.
- **PostgreSQL Image Hosting:** Direct binary upload endpoint (`BYTEA` storage in Postgres) serving images via `/api/images/:id` with cache headers.
- **Bulk CSV Catalog Importer:** Parse and batch import products via PapaParse. Items with image URLs are published directly; items missing images are safely imported as drafts.
- **Stock Freshness Verification:** Track verified stock freshness with 30-day freshness indicators. One-click "Confirm still in stock" updates verification timestamps without needing full edits.
- **Inventory Views & Filtering:** Filter products by status (All, Published, Draft, Out of Stock, Needs Verification), category chips, and live search; switch between responsive Grid and Table layouts.
- **Product Reviews Dashboard:** Dedicated reviews view showing community star ratings, rating breakdown distribution (1–5 stars), and customer feedback for the store's products.

### 3. System Admin Portal (`apps/admin`)
Administrative and moderation platform:
- **Global Metrics Hub:** Real-time analytics tracking active stores, 30-day new registrations, flagged items, suspended users, role breakdown (Customers, Store Owners, Admins), catalog health metrics, and a 14-day activity chart.
- **User Moderation:** Search and filter users by role and suspension status; view detailed user modal profiles (owned stores, reviews, account dates); suspend/unsuspend accounts (with immediate Redis cache lockout); promote users to `SYSTEM_ADMIN` or demote admins to `CUSTOMER` (password protected); delete accounts with audit snapshots.
- **Root Admin Safeguard:** Root platform owners (seeded or created via CLI) are protected from demotion, suspension, or deletion by promoted admins.
- **Store Moderation:** Audit, suspend, or hard-delete stores with cascading product cleanup and mandatory moderation reason logging.
- **Category & Taxonomy Management:** Full CRUD over root categories and subcategories; one-click "Generate default catalog" to provision standard categories (Dairy, Bakery, Produce, Pantry, etc.).
- **Review Moderation:** Search and audit customer reviews across stores and products; delete abusive or fraudulent reviews with pre-deletion state saved in audit records.
- **Immutable Audit Ledger:** Searchable, paginated audit log with admin identification, timestamps, moderation actions, reasons, and pre-mutation JSON snapshots.
- **Productivity Features:** Global `Ctrl/Cmd + K` Command Palette for quick keyboard navigation, aurora aesthetic backdrop, and page skeletons.

### 4. Backend REST & WebSocket API (`apps/backend`)
Node.js, Express, and Socket.IO micro-architecture:
- **Authentication & Security:** JWT access tokens (15m expiry) and hashed refresh tokens (`user_sessions`); role-based access control (`CUSTOMER`, `STORE_OWNER`, `SYSTEM_ADMIN`); progressive account login lockout on failed attempts; rate limiting on sensitive routes (auth, image search, list join).
- **PostgreSQL & Spatial Queries:** PostgreSQL 15+ utilizing `earthdistance`, `cube`, `pg_trgm`, `uuid-ossp`, and `pgvector` for fast geospatial indexing and similarity matching.
- **Hybrid AI Search Engine:** Google Gemini embedding generation with a 2-second circuit breaker automatically falling back to full-text search (`tsvector`) and trigram matching (`pg_trgm`). Multimodal vision search using Gemini Vision.
- **WebSocket Gateway:** Real-time Socket.IO room coordination backed by `@socket.io/redis-adapter` for multi-instance scaling of shared household list events.
- **Transactional Media Storage:** Embedded binary image uploads (`BYTEA`) stored directly in PostgreSQL with public serving and cache controls.
- **Isolated Integration Test Runner:** Database test runner that creates and runs tests within an isolated temporary schema per test run, leaving existing data untouched.

### 5. Shared Packages (`packages/*`)
- **`@nearcommerce/api`:** Typed HTTP client (Axios), Zod schemas, validation rules, token refresh logic, session manager, and API contracts shared across web, admin, and mobile.
- **`@nearcommerce/config`:** Unified color palette (`palette.cjs`), Tailwind CSS preset (`tailwind-preset.cjs`), brand icon Vite plugin, theme initialization scripts, and shared base TypeScript configurations.
- **`@nearcommerce/helpers`:** Universal helper library including category icon resolution, price/distance/date formatters, class name combiners, theme preference helpers, and client validation helpers.
- **`@nearcommerce/ui`:** Reusable React web component library (Modals, Drawers, Tables, Buttons, Formik-bound input fields, Skeletons, Badges, Brand Icon generator script).

---

## Detailed Features

- **Discovery & Geolocation:** Proximity-based product and store discovery powered by PostgreSQL `earthdistance` (`<50ms` target). Results display distance (km), stock status badges, store hours status (Open/Closed calculated via store IANA timezone), and 30-day freshness indicators. Filter by category, subcategory, and radius. Includes manual ZIP/postal code and coordinate fallback when GPS permission is denied.
- **Hybrid AI & Semantic Search:** Natural-language search using Google Gemini embeddings (`gemini-embedding-001` or model override) normalized and indexed via `pgvector` HNSW index. Employs a 2-second circuit breaker automatically falling back to PostgreSQL full-text (`tsvector`) and trigram (`pg_trgm`) matching if Gemini is slow or unavailable. Suspended stores or owners are automatically filtered out from search results.
- **Multimodal Visual Photo Search:** Shoppers can capture or upload photos from the mobile app (via `expo-image-picker`). Google Gemini Vision analyzes the image, identifies the product name, and transparently initiates geospatial proximity discovery. Gracefully falls back to text search if the vision service is unavailable.
- **Inventory Management:** Full product CRUD, image URL management, stock level tracking, and one-click "Confirm still in stock" verification (updates `last_verified_at = NOW()`). Stale listings (>30 days without stock confirmation) display warning badges to encourage shopper trust.
- **Dual-Mode CSV Catalog Importer:** Batch product upload via CSV (`PapaParse`). Products with valid image URLs are directly published (`is_published: true`), while rows missing images are imported safely as drafts (`is_published: false`).
- **Edge AI Image Cropper & PostgreSQL Image Hosting:** In-browser intelligent product cropping powered by ONNX Runtime Web (`onnxruntime-web`) running YOLOv8n object detection in a dedicated Web Worker (with manual crop fallback). Store owners upload cropped photos directly via binary stream (`/api/uploads/images`), stored safely as `BYTEA` in PostgreSQL with public serving (`/api/images/:id`), avoiding third-party object storage dependencies. Unreferenced uploads are automatically cleaned up.
- **Real-Time Collaborative Household Lists:** Shared shopping lists powered by Socket.IO with Redis pub/sub adapter. Supports unique 6-character alphanumeric invite codes, real-time item check/uncheck sync, custom grocery items (`custom_item_name`), item deletion, list renaming, ownership transfer, member removal, leaving lists, and invite code regeneration. Deleting catalog products preserves custom item visibility (orphan item prevention).
- **Ratings & Reviews System:** 1-to-5 star ratings and written reviews for both stores and individual products. Includes shopper review management (edit/delete own reviews) and open participation (any signed-in shopper can post). Store owners are prohibited from reviewing their own stores or products.
- **System Administration & Moderation:** Comprehensive admin portal featuring global platform analytics and metrics (total users, stores, active products, reviews), user and store suspension toggles (real-time Redis lockout), account hard deletion with pre-deletion state snapshots in `admin_audit_logs`, admin self-demotion (`SYSTEM_ADMIN` to `CUSTOMER`), review moderation, and full category/subcategory taxonomy CRUD.
- **Root Admin Safeguards:** Administrative hierarchy protection distinguishing server-provisioned root administrators from portal-promoted admins, preventing unauthorized demotion or lockout.
- **In-App Mobile Updates:** Integrated release checking against GitHub Releases with support for direct APK downloads and native package installer launching inside the Android app.
- **User Authentication, RBAC & Security:** Role-based access control (`CUSTOMER`, `STORE_OWNER`, `SYSTEM_ADMIN`). Secure password hashing (`bcrypt`), JWT access tokens (15-min expiry) paired with SHA-256 hashed refresh tokens in PostgreSQL, progressive IP and account login lockout (exponential delay after failed attempts), rate limiting on sensitive routes, and customer account self-deletion (`DELETE /api/users/me`).
- **Turn-by-Turn Directions & Native Maps Handoff:** One-tap navigation launching device-native maps (Apple Maps on iOS, Google Maps on Android) straight to the store's saved coordinates (no place lookup by name), so it works even for shops that aren't indexed on Google Maps.
- **Official Support Channel:** Standardized `/support` endpoint providing dedicated support channels for shoppers and store owners.
- **Light & Dark Mode:** All three apps follow the device or browser appearance by default, and each has a Light / Dark / Auto toggle (settings drawer on mobile, header on the portals). The choice is saved and restored on the next visit. Colours come from one shared palette (`packages/config/palette.cjs`) used by the Tailwind preset (web, admin) and the mobile theme; each portal has its own brand colour (shopper blue, store owner teal, admin violet).
- **Skeleton Loading & Blurred Pop-ups:** Pages show skeleton placeholders sized like the real content instead of loading text, and every modal, drawer and bottom sheet blurs the page behind it, built from one shared component per platform.
- **Search Distance Settings:** Shoppers choose how far shops may be (1 to 50 km) in the mobile settings drawer. It is saved on the device and sent as `radius_meters`. Turning **Only show shops near me** off sends `nearby_only=false`: every shop is searched and results are still sorted by distance.
- **Portal Polish:** The store owner portal and admin console animate between pages, show a mouse-following glow, and have back arrows on non-main pages; the app icon always returns to the default page. The admin console adds an aurora background and a Ctrl/Cmd+K command palette. A suspended account that signs in sees a **Contact support** link on every app.
- **Onboarding & Walkthroughs:** Store owners get an interactive tour guiding them through initial store setup, inventory creation, and stock verification. Shoppers get an illustrated 7-step guide on how to search, browse, share lists, and pick location preferences.

---

## Technology Stack

- **Languages:** TypeScript across the entire monorepo
- **Frontend Portals (`web`, `admin`):** React 18, Vite, Tailwind CSS, TanStack Query (React Query), Formik & Yup, Lucide React
- **Mobile Client (`mobile`):** React Native, Expo (SDK 52), Expo Router, React Native Safe Area Context, React Native Toast Message, Expo File System, Expo Intent Launcher
- **Edge AI & Computer Vision:** ONNX Runtime Web (`onnxruntime-web`) for in-browser YOLOv8n object detection, Google Gemini Vision (`@google/generative-ai`)
- **Backend Services (`backend`):** Node.js, Express, Socket.IO with `@socket.io/redis-adapter`
- **Database & Storage:** PostgreSQL 15+ with extensions:
  - `pgvector` (Vector similarity search using HNSW indexing)
  - `earthdistance` & `cube` (Fast geospatial proximity queries)
  - `pg_trgm` (Trigram similarity search and fallback text indexing)
  - `uuid-ossp` (UUID primary keys)
  - `BYTEA` table (`uploaded_images`) for transactional image storage
- **Caching & State:** Redis 6+ / Upstash (Socket.IO pub/sub, real-time suspension enforcement, login rate-limiting)
- **Auth & Security:** JWT (`jsonwebtoken`), `bcrypt` (12 salt rounds), progressive lockout delays
- **Monorepo Tooling:** `pnpm` workspaces (v12.4.2), Turborepo
- **Testing:** Jest, Supertest, React Testing Library, Jest Expo

---

## API Overview

All backend endpoints support optional `/api` prefixes for reverse-proxy compatibility.

| Domain | Method & Path | Auth / Role | Description |
| --- | --- | --- | --- |
| **Auth** | `POST /auth/register` | Public | Create Customer or Store Owner account |
| | `POST /auth/login` | Public | Authenticate user, return access token & set refresh session |
| | `POST /auth/refresh` | Public | Exchange refresh token for new access token |
| | `POST /auth/logout` | Public | Invalidate refresh token session |
| | `POST /auth/forgot-password` | Public | Request password reset guidance / token |
| | `POST /auth/reset-password` | Public | Set new password with valid reset token |
| **Users** | `GET /api/users/me` | Authenticated | Retrieve current authenticated user profile |
| | `DELETE /api/users/me` | Authenticated | Permanently delete authenticated user account |
| **Discovery** | `GET /search` | Public | Geospatial product search with filters (`lat`, `lng`, `radius_meters`, `category_id`, `subcategory_id`, `q`) |
| | `GET /search/stores` | Public | Proximity store search (`lat`, `lng`, `q`, `radius_meters`, `nearby_only`) |
| | `POST /search/image` | Public | Multimodal Gemini Vision photo search |
| | `GET /categories` | Public | Browse full category and subcategory taxonomy tree |
| **Stores** | `GET /api/stores/:storeId` | Public | Public store profile, distance, operating hours, and rating |
| | `GET /api/stores/mine` | `STORE_OWNER` | List stores belonging to the authenticated owner |
| | `POST /api/stores` | `STORE_OWNER` | Create a new store profile |
| | `GET /api/stores/:storeId/manage` | `STORE_OWNER` | Store management details (requires store ownership) |
| | `PATCH /api/stores/:storeId` | `STORE_OWNER` | Update store metadata, coordinates, timezone, and hours |
| | `PUT /api/stores/:storeId` | `STORE_OWNER` | Update store metadata, coordinates, timezone, and hours |
| | `DELETE /api/stores/:storeId` | `STORE_OWNER` | Delete store and cascade associated products |
| | `GET /api/stores/:storeId/product-reviews` | `STORE_OWNER` | Owner view of reviews submitted for products in this store |
| | `GET /api/stores/:storeId/products` | `STORE_OWNER` | List inventory for a specific store |
| | `POST /api/stores/:storeId/products` | `STORE_OWNER` | Create a product listing for a specific store |
| **Products** | `GET /api/products/:productId` | Public | Public product details, stock, store info, and rating |
| | `GET /api/products` | `STORE_OWNER` | List store inventory (filtered by `X-Store-ID` header) |
| | `POST /api/products` | `STORE_OWNER` | Create new product listing |
| | `POST /api/products/import` | `STORE_OWNER` | Bulk CSV import (image URL = published, no image = draft) |
| | `PATCH /api/products/:productId` | `STORE_OWNER` | Update product details (auto-refreshes `last_verified_at`) |
| | `PUT /api/products/:productId` | `STORE_OWNER` | Update product details |
| | `DELETE /api/products/:productId` | `STORE_OWNER` | Remove product listing |
| | `PATCH /api/products/:productId/confirm-stock` | `STORE_OWNER` / `ADMIN` | One-click stock freshness confirmation |
| | `PATCH /api/products/:productId/verify` | `STORE_OWNER` / `ADMIN` | Alias for stock freshness confirmation |
| **Uploads** | `POST /api/uploads/images` | `STORE_OWNER` | Upload binary image (`raw` body <= 2MB, JPEG/PNG/WebP) |
| | `GET /api/images/:id` | Public | Serve stored image binary with appropriate cache headers |
| **Lists** | `GET /lists` | Authenticated | List all household lists the user belongs to |
| | `POST /lists` | Authenticated | Create a new household list (assigns `OWNER` role) |
| | `POST /lists/join` | Authenticated | Join list using 6-character alphanumeric invite code |
| | `GET /lists/my-list` | Authenticated | Fetch primary / first accessible list |
| | `GET /lists/:list_id` | Authenticated | Retrieve list items, members, and details |
| | `PATCH /lists/:list_id` | `OWNER` | Rename household list |
| | `DELETE /lists/:list_id` | `OWNER` | Delete household list |
| | `POST /lists/:list_id/leave` | Authenticated | Leave shared household list |
| | `POST /lists/:list_id/regenerate-invite-code` | `OWNER` | Invalidate and generate a new invite code |
| | `DELETE /lists/:list_id/members/:user_id` | `OWNER` | Remove member from list |
| | `POST /lists/:list_id/items` | Authenticated | Add catalog product or custom item to list |
| | `PATCH /lists/:list_id/items/:item_id` | Authenticated | Toggle `is_checked` or update quantity |
| | `DELETE /lists/:list_id/items/:item_id` | Authenticated | Remove item from list |
| **Favorites** | `GET /api/favorites` | Authenticated | List user's saved stores and products (newest first) |
| | `POST /api/favorites` | Authenticated | Save store or product to favorites |
| | `DELETE /api/favorites/:favoriteId` | Authenticated | Remove store or product from favorites |
| **Reviews** | `GET /api/reviews` | Public / Optional Auth | List reviews for target store or product (`is_mine` badge for authenticated user) |
| | `GET /api/reviews/mine` | Authenticated | List reviews written by authenticated user |
| | `POST /api/reviews` | Authenticated | Submit 1-5 star review (owner self-review prohibited) |
| | `PATCH /api/reviews/:reviewId` | Author | Update review rating or comment |
| | `DELETE /api/reviews/:reviewId` | Author | Delete review |
| **Admin** | `GET /api/admin/metrics` | `SYSTEM_ADMIN` | Platform aggregate counts (users, stores, products, reviews, 14-day activity) |
| | `GET /api/admin/users` | `SYSTEM_ADMIN` | List and search users with role and suspension filters |
| | `GET /api/admin/users/:userId` | `SYSTEM_ADMIN` | Detailed profile with owned stores and reviews |
| | `PATCH /api/admin/users/:userId/promote` | `SYSTEM_ADMIN` | Promote a user to admin (requires actor password confirmation) |
| | `PATCH /api/admin/users/:userId/demote` | `SYSTEM_ADMIN` | Demote an admin user to `CUSTOMER` (requires password confirmation) |
| | `PATCH /api/admin/users/:userId/suspend` | `SYSTEM_ADMIN` | Toggle user suspension status (syncs to Redis immediately) |
| | `DELETE /api/admin/users/:userId` | `SYSTEM_ADMIN` | Hard delete user with audit snapshot |
| | `GET /api/admin/stores` | `SYSTEM_ADMIN` | List stores with suspension status |
| | `PATCH /api/admin/stores/:storeId/suspend` | `SYSTEM_ADMIN` | Toggle store suspension status |
| | `DELETE /api/admin/stores/:storeId` | `SYSTEM_ADMIN` | Hard delete store with audit snapshot |
| | `GET /api/admin/categories` | `SYSTEM_ADMIN` | List category taxonomy for management |
| | `POST /api/admin/categories` | `SYSTEM_ADMIN` | Create root category |
| | `POST /api/admin/categories/generate-defaults` | `SYSTEM_ADMIN` | Provision standard default categories and subcategories |
| | `PATCH /api/admin/categories/:id` | `SYSTEM_ADMIN` | Rename root category or update icon URL |
| | `DELETE /api/admin/categories/:id` | `SYSTEM_ADMIN` | Delete category and cascade subcategories |
| | `POST /api/admin/categories/:id/subcategories` | `SYSTEM_ADMIN` | Add subcategory to category |
| | `PATCH /api/admin/subcategories/:id` | `SYSTEM_ADMIN` | Update subcategory name |
| | `DELETE /api/admin/subcategories/:id` | `SYSTEM_ADMIN` | Delete subcategory |
| | `GET /api/admin/reviews` | `SYSTEM_ADMIN` | List reviews with target filters |
| | `DELETE /api/admin/reviews/:reviewId` | `SYSTEM_ADMIN` | Remove review with audit trail snapshot |
| | `GET /api/admin/audit-logs` | `SYSTEM_ADMIN` | Paginated audit log ledger with pre-change JSON snapshots |
| **Support** | `GET /support` | Public | Retrieve support contact email and official channels |

---

## Prerequisites

- Node.js 20 or newer (developed and tested on Node 22)
- pnpm 12.4.2 (pinned in `package.json`; managed via `corepack`)
- PostgreSQL 15 or newer with `pgvector`, `pg_trgm`, `cube`, `earthdistance`, and `uuid-ossp` extensions enabled.
- Redis 6 or newer (local Redis or cloud Upstash instance)
- Google Gemini API key (optional; search falls back to full-text/trigram matching if omitted)
- Expo Go or an Android/iOS emulator to run the shopper mobile application

---

## Getting Started

1. **Clone the repository and install dependencies:**

   ```bash
   git clone https://github.com/Ay-dotcode/NearCommerce.git
   cd NearCommerce
   corepack enable
   pnpm install
   ```

2. **Configure environment variables:**

   ```bash
   cp .env.example .env
   ```

   Fill in `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` at minimum. The backend and web portals consume this root `.env` (portals only expose `VITE_`-prefixed variables).

3. **Initialize the database schema:**

   ```bash
   pnpm --filter @nearcommerce/backend db:migrate
   ```

   `db:migrate` is safe to run multiple times: it runs only unapplied migration files.

4. **Seed initial demo data (optional):**

   ```bash
   pnpm --filter @nearcommerce/backend seed
   ```

   In development, this provisions:
   - System Admin: `admin@nearcommerce.com` / `Password12++`
   - Store Owner: `joseyowolabi@gmail.com` / `Password12++` (with a sample store and demo grocery products)
   - Standard Catalog: Populates root categories and subcategories

   To add a protected root admin directly:

   ```bash
   pnpm add-admin admin@your-domain.com 'a-long-password' "Full Name"
   ```

   Root admins added via the CLI are safeguarded and cannot be demoted, suspended, or deleted by admins promoted through the web portal.

   If products were created before configuring `GEMINI_API_KEY`, backfill vector embeddings at any time:

   ```bash
   pnpm --filter @nearcommerce/backend embeddings:backfill
   ```

5. **Build shared workspace packages and start services:**

   ```bash
   pnpm --filter @nearcommerce/api build
   pnpm --filter @nearcommerce/ui build
   pnpm dev
   ```

   | App | URL | Description |
   | --- | --- | --- |
   | **Backend API** | `http://localhost:4000` | Express REST & Socket.IO server |
   | **Store Owner Portal** | `http://localhost:3001` | Dashboard, product management, CSV import, YOLO cropping |
   | **Admin Portal** | `http://localhost:3000` | System metrics, user/store moderation, categories, audit logs |

6. **Launch the shopper mobile app:**

   Create `apps/mobile/.env`:

   ```bash
   echo 'EXPO_PUBLIC_API_URL=http://localhost:4000' > apps/mobile/.env
   pnpm --filter @nearcommerce/mobile start
   ```

   - **Physical Device:** Replace `localhost` with your workstation's LAN IP address (e.g., `http://192.168.1.50:4000`).
   - **In-App Updates:** Optional override `EXPO_PUBLIC_APP_DOWNLOAD_URL` can point to custom download locations; defaults to GitHub Release assets.

---

## Database Management & Schema Reset

To completely flush PostgreSQL and Redis, re-run all migrations from scratch, and re-seed clean demo data:

```bash
pnpm clear-db
```

This runs `apps/backend/src/db/clearDb.ts`, which:
1. Flushes all keys from Redis
2. Drops and recreates the PostgreSQL `public` schema and ENUM types
3. Re-applies all migration files in order
4. Seeds default admin and store owner records

---

## Common Commands

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
pnpm --filter @nearcommerce/backend db:migrate
pnpm --filter @nearcommerce/backend seed:catalog
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

# Shared Packages
pnpm --filter @nearcommerce/api test
pnpm --filter @nearcommerce/helpers test
pnpm --filter @nearcommerce/ui test
pnpm --filter @nearcommerce/ui generate:app-icons   # re-render mobile icons from packages/ui/public/icon.svg
```

---

## Testing & Quality Assurance

- **Web, Admin, Mobile, and Helper Tests:** Isolated unit and component tests running via Jest and React Testing Library without requiring external services.
- **Backend Integration Tests:** Supertest integration tests execute against live PostgreSQL and Redis instances.
  - **Isolated Schemas:** Every test run creates a fresh, isolated throwaway schema in PostgreSQL that is migrated before the run and dropped immediately afterward (`apps/backend/test/globalSetup.cjs`). Your actual database tables and records are never affected. Set `KEEP_TEST_SCHEMA=1` to inspect test tables after a run.
  - Rate limiting is automatically disabled and external services are mocked when `NODE_ENV=test`.
- **Pre-test Build Requirement:** Ensure shared packages are compiled before running backend tests or type-checking (`pnpm --filter @nearcommerce/api build`).

---

## Conventions

- **Module Aliases:** Application imports utilize the `@/` alias (e.g., `@/features/auth/...`) rather than deep relative `../../` paths.
- **Shared Packages:** Shared packages in `packages/*` import their own files through `@nearcommerce/<package>/...` aliases and export typed APIs consumed directly by applications.
- **Forms:** Forms use Formik with Yup validation. Shared Formik-bound inputs live in `@nearcommerce/ui` (web, admin) and `apps/mobile/components/ui` (mobile), displaying errors inline.
- **Color Consistency:** Colors derive from `@nearcommerce/config/palette.cjs`. Avoid hardcoding hex values in application views; use theme hooks (`useColors()`) or Tailwind classes that respond to theme mode.
- **Reuse:** Component designs are centralized in `packages/ui` for web applications and `apps/mobile/components/ui` for the mobile app.

---

## Documentation

- [Software Requirements Specification (SRS)](./docs/NearCommerce_SRS.md): Product scope, requirements, data models, and architectural boundaries.
- [Implementation Blueprint](./docs/Implementation.md): Detailed architectural rules, testing guidelines, and phase-by-phase implementation details.
- [Publishing & Deployment Guide](./docs/DEPLOYMENT.md): Production hosting guide (Cloudflare Pages, Render, Neon, Upstash), releasing Android APKs via GitHub Actions, in-app updates, and Expo EAS over-the-air updates.

---

## License

NearCommerce's source code is released under the [MIT License](LICENSE). The bundled YOLOv8n cropper model is the exception: it is AGPL-3.0 and keeps its own terms, see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) before distributing or commercially operating a build that includes it.
