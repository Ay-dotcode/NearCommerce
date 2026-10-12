# Software Requirements Specification (SRS)

## 1. Project Overview & Business Scope

**Project Name:** NearCommerce
**Description:** A full-stack, AI-powered local commerce platform connecting users with nearby physical shops. It enables multimodal (text & image) semantic search, real-time shared household shopping lists, community-driven store ratings, email verification gating, and robust inventory management.
**Business Scope Clarification:** NearCommerce is strictly a **Discovery & Physical Store Visit Platform ("Discover & Physical Visit")**.

- **In-App Payments / Checkout:** None. The app does NOT process digital payments or order fulfillment.
- **Purpose:** Users discover local inventory, compare prices and distance, coordinate physical shopping trips via shared lists, and navigate to physical stores via native maps.
- **Shared Household List:** The "Shared Cart" feature is explicitly defined as a **Shared Household Shopping List**—a real-time collaborative checklist for housemates/families planning physical store visits, NOT an e-commerce checkout cart.

**Architecture Theme:** Extreme Modularity and Reusability. Designed via Monorepo (`pnpm` + `Turborepo`) and Feature-Sliced Design (FSD) so that every service, UI component, and schema is decoupled.
**License:** MIT License

---

## 2. System Architecture & Tech Stack

- **Web Portals (Store Owner & System Admin):** React, TypeScript, Tailwind CSS, Shadcn UI, ONNX Runtime Web (Edge-AI). Hosted on Vercel.
- **Mobile App:** React Native (Expo), AsyncStorage, Socket.io Client. Deployed via App Stores.
- **Backend Server:** Node.js, Express, Socket.io, TypeScript. Hosted on Render.
- **Database & Cache:** PostgreSQL with `pgvector`, `earthdistance`/`cube`, & `pg_trgm` extensions (Neon) and Redis (Upstash).
- **AI Engine & Fallback Pipeline:**
  - _Primary Text Search:_ Google Gemini (`gemini-embedding-001`, truncated to 768 dimensions and re-normalised) generates vector embeddings for semantic search in `pgvector`.
  - _Fallback Text Search:_ If Gemini is unavailable, rate-limited, or exceeds a 2000ms response timeout, text search automatically degrades to PostgreSQL Full-Text Search (`tsvector`) and trigram matching (`pg_trgm`).
  - _Image Search Fallback:_ Photo search uses a Gemini vision model (`gemini-2.5-flash` by default). If it is unavailable, visual search is gracefully disabled in the mobile UI, falling back strictly to text search.

---

## 3. Detailed Task Breakdown & Execution Plan

### Phase 1: Infrastructure, Auth, & Database Core

**Task 1.1: Monorepo & Architecture Setup**

- _Sub-task 1.1.1:_ Initialize `pnpm` workspace (`/apps` for mobile, admin, backend; `/packages` for ui, api, config).
- _Sub-task 1.1.2:_ Configure `Turborepo` pipelines for unified linting, building, and caching.

**Task 1.2: Database Schemas & Indexing**

- _Sub-task 1.2.1:_ Run migration scripts for core entities. Ensure legacy `in_stock` boolean is removed; stock is derived from `quantity > 0`. Incorporate `email_verified_at` column, `email_verification_tokens`, `password_reset_tokens`, `is_suspended` flags, and `admin_audit_logs` (with `snapshot JSONB`).
- _Sub-task 1.2.2:_ Enable `pgvector`, `cube`, `earthdistance`, and `pg_trgm` extensions. Create geospatial GiST indexes.

**Task 1.3: Authentication, Context Access, & Moderation**

- _Sub-task 1.3.1:_ Implement JWT-based auth with SHA-256 hashed refresh tokens. Access tokens are short-lived (15 minutes). Support `CUSTOMER`, `STORE_OWNER`, and `SYSTEM_ADMIN` roles. Login endpoint is rate-limited per IP/email with a progressive lockout on repeated failures.
- _Sub-task 1.3.2 (Store Context & Suspension Enforcement):_ Validate `X-Store-ID` headers against the user's owned stores for all owner operations. A Redis-cached flag (`suspended:{user_id}`, short TTL) is checked on **every** authenticated request and on refresh-token exchange — not just login — so a mid-session suspension takes effect within seconds rather than waiting for token expiry. The cache entry is invalidated immediately whenever `is_suspended` changes.
- _Sub-task 1.3.3 (Account Deletion & List Lifecycle):_ Implement account deletion flow. **Admin Safeguard:** A `SYSTEM_ADMIN` account cannot self-delete or be force-deleted while it holds the `SYSTEM_ADMIN` role (blocked by `admin_audit_logs.admin_id ON DELETE RESTRICT` once it has any logged action); another admin must first demote it to `CUSTOMER`. **Orphan Prevention:** If the deleting user is the _only_ member of a household list, the list is completely deleted. If other members exist, ownership is automatically transferred to the oldest remaining `MEMBER`.

### Phase 2: Shared Library Construction (`@nearcommerce/packages`)

**Task 2.1: UI Component Library (`@nearcommerce/ui`)**

- _Sub-task 2.1.1:_ Build atomic visual components (Buttons, Inputs, Badges, Cards, Modals).
- _Sub-task 2.1.2:_ Create a global design token system (colors, typography, dark mode tokens).

**Task 2.2: Shared API & Validation (`@nearcommerce/api`)**

- _Sub-task 2.2.1:_ Write unified `Zod` schemas for all entities.
- _Sub-task 2.2.2:_ Build an Axios/Fetch HTTP client wrapper with automatic token refresh.

### Phase 3: Backend API & Micro-Services

**Task 3.1: Core API, Auth, & Email Verification (MVP Alignment)**

- _Sub-task 3.1.1 (Registration):_ Accept `RegisterSchema`, hash passwords with bcrypt, insert the user with `email_verified_at = NULL`, issue a hashed 24-hour token in `email_verification_tokens`, and email the verification link. Users can log in immediately; unverified users cannot post reviews. A failed email send never fails registration. Rate-limit registration per IP.
- _Sub-task 3.1.2 (Email Verification Endpoint):_ `/auth/verify-email` accepts the emailed token, sets `email_verified_at`, and deletes the user's tokens. Unknown, expired and reused tokens return 400. The link opens the store-owner portal's `/verify-email` page.
- _Sub-task 3.1.3 (Resend Verification Endpoint):_ `/auth/resend-verification` replaces any earlier token with a fresh one and re-sends the link. It answers identically for unknown and already-verified addresses so it cannot be used to probe registered emails, and is rate-limited.
- _Sub-task 3.1.4 (Support Endpoint):_ Expose a standardized `/support` endpoint providing users and store owners direct access to official support channels.
- _Sub-task 3.1.5 (Password Reset):_ Build `/auth/forgot-password` (issues a hashed token in `password_reset_tokens`, 1h expiry, invalidating any prior unexpired token for that user) and `/auth/reset-password` (validates the token, updates `password_hash`, and revokes all of that user's active `user_sessions`).
- _Sub-task 3.1.6 (Trust Gate Middleware):_ `requireVerifiedEmail` rejects users whose `email_verified_at` is NULL with `403` and code `EMAIL_NOT_VERIFIED`. It guards community reviews. `GET /users/me` exposes `email_verified` so clients can prompt for verification.

**Task 3.2: Domain Micro-Services**

- _Sub-task 3.2.1 (Resilient Search & Detail Service):_ Build vector search route utilizing `earthdistance` for <50ms proximity filtering. Implement 2000ms circuit breaker. **Crucial:** Search queries MUST join to `stores` and `users` to explicitly filter `WHERE is_published = true AND quantity > 0 AND stores.is_suspended = false AND users.is_suspended = false`. The same filter applies to direct store/product detail lookups. Automatically generate 768-dimension vector embeddings via Gemini `gemini-embedding-001` on product creation, edit, and CSV import (a Gemini outage never fails the write; search falls back to text matching).
- _Sub-task 3.2.2 (Real-Time Household List Service):_ Implement Socket.io server with Redis pub/sub. List item additions are serialised per list (`SELECT ... FOR UPDATE` on the list row inside a transaction). Adding a product already on the list adds to its quantity (capped) and sets `is_checked = false`, which is equivalent to `ON CONFLICT (list_id, product_id) DO UPDATE SET quantity = quantity + EXCLUDED.quantity, is_checked = false`; the response carries `already_on_list` so clients can show the toast. Custom items match case-insensitively by name. Supports custom items, member removal, list renaming/deletion, and list owner invite code regeneration (`regenerate-invite-code`).
- _Sub-task 3.2.3 (Store Operating Hours & Timezone Service):_ Store operating hours evaluate against the store's explicit IANA timezone column.
- _Sub-task 3.2.4 (Product Freshness Engine):_ Automatically flag products unverified for > 30 days (`last_verified_at`). Expose a "Confirm In-Stock" endpoint for store owners; price/quantity edits automatically refresh `last_verified_at`.
- _Sub-task 3.2.5 (Community Ratings Service & Gating):_ Build endpoints for submitting store/product ratings (1-5), listing reviews per target, and shopper review management (edit/delete).
- _Sub-task 3.2.6 (System Admin Operations):_ Restricted endpoints for pagination, toggling `is_suspended` for users and stores (instantly busting Redis cache and cascading store visibility), admin demotion to `CUSTOMER`, review deletion, and logging pre-deletion snapshots to `admin_audit_logs`.

### Phase 4: Web Portals (Store Owners & System Admins)

**Task 4.1: Authentication & Routing**

- _Sub-task 4.1.1:_ Login screen with RBAC-aware routing. Store Owners route to their inventory dashboard (passing `X-Store-ID`); System Admins route to the master oversight portal.

**Task 4.2: Store Owner Dashboard (Inventory & Analytics)**

- _Sub-task 4.2.1:_ Product CRUD forms with `quantity` input and a single-click "Confirm Still In Stock" button.
- _Sub-task 4.2.2 (Dual-Mode CSV Importer):_ Supports both creation and updates. If a CSV row contains a public image URL, the product is published immediately. If omitted, it is created as `is_published = false` (Draft) and remains hidden until an image is manually uploaded.
- _Sub-task 4.2.3:_ Edge-AI Image Cropper running ONNX YOLO in a Web Worker, with a graceful 3-second fallback to manual cropping. The product form lets owners choose a photo, crop it, and upload it (`POST /uploads/images`, owner-only, JPEG/PNG/WebP up to 2 MB, validated by file signature). Images are stored in Postgres (`uploaded_images`) and served publicly and cacheably from `GET /images/:id`; the resulting URL becomes the product's `image_url`. Unused uploads are pruned after one hour. Owners can still paste an image URL instead.

**Task 4.3: System Admin Dashboard (Master Oversight)**

- _Sub-task 4.3.1 (Global Metrics Hub):_ Top-level dashboard displaying platform health, total active stores, total flagged items, and new registrations.
- _Sub-task 4.3.2 (User Moderation Panel):_ Searchable data grid (using TanStack Table and Shadcn UI) to view all users. Includes action menus to **Suspend User** (enforced in real time per 1.3.2, not just at login) or **Force Delete Account** (blocked for `SYSTEM_ADMIN` targets per 1.3.3 until demoted).
- _Sub-task 4.3.3 (Store Moderation Panel):_ Data grid listing all stores. Includes action menus to **Suspend Store** (instantly hiding it from search _and_ direct-link access, per 3.2.1) or **Delete Store** (snapshotted to `admin_audit_logs`, then wiping all associated inventory).
- _Sub-task 4.3.4 (Content & Review Moderation):_ Interface to view all community reviews. Admins can permanently delete defamatory or fraudulent reviews; the review's content is preserved in the audit snapshot even after deletion.
- _Sub-task 4.3.5 (Audit Logs):_ A read-only ledger displaying `admin_audit_logs`, including the pre-deletion `snapshot`, tracking exactly which admin performed what suspension or deletion and what was affected.

### Phase 5: Mobile App (Shoppers)

**Task 5.1: Navigation & Home Experience**

- _Sub-task 5.1.1:_ Expo Router layout featuring Category Browse, Search Bar, Household Lists, Favorites, and Settings.
- _Sub-task 5.1.2:_ Store Cards displaying "Open Now / Closed" status badge computed in the store's timezone, and average community review score.

**Task 5.2: Search & Product Discovery**

- _Sub-task 5.2.1:_ Unified Search bar with text and photo search. A photo (camera or library, shrunk on-device) is sent to `POST /search/image`; a Gemini vision model names the product and the normal semantic search runs on that name. If the vision service is unavailable the server answers `503 VISION_UNAVAILABLE` and the app hides photo search and falls back to text search.
- _Sub-task 5.2.2:_ Product Cards displaying price, distance, stock status (derived purely from `quantity > 0`), and Freshness Badge.

**Task 5.3: Real-Time Shared Household Lists**

- _Sub-task 5.3.1:_ UI for list management. If a user adds a product already on the list, the UI displays a clear toast notification: _"Item already on list. Quantity increased to [X] and marked un-checked."_ Owners see a "Regenerate Invite Code" action in list settings.

**Task 5.4: User Preferences & Hardware Privacy**

- _Sub-task 5.4.1 (Location Privacy & Dynamic Island):_ Poll GPS once at session start. Trigger high-visibility notification or Apple Dynamic Island while location is fetched.
- _Sub-task 5.4.2 (Routing Preferences):_ Saved locally via `AsyncStorage`.
- _Sub-task 5.4.3 (Native Map Handoff):_ Deep-link (`geo:` or `maps://`) to native maps.

---

## 4. Complete Database Schema (PostgreSQL)

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- Users & Auth
CREATE TYPE user_role AS ENUM ('CUSTOMER', 'STORE_OWNER', 'SYSTEM_ADMIN');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'CUSTOMER',
    full_name VARCHAR(100) NOT NULL,
    is_suspended BOOLEAN NOT NULL DEFAULT false, -- Used by SYSTEM_ADMIN; enforced live via Redis cache, not just at login
    email_verified_at TIMESTAMP WITH TIME ZONE, -- NULL until verified
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Emails are stored lowercase and unique case-insensitively
CREATE UNIQUE INDEX idx_users_email_lower ON users (LOWER(email));
CREATE INDEX idx_users_created_at ON users (created_at DESC);

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(64) NOT NULL, -- SHA-256 hash
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL, -- SHA-256 hash
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- NEW: Password reset, same hashed-token pattern as email verification
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL, -- SHA-256 hash
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- Short-lived, e.g. 1 hour
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Stores
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    opening_hours JSONB NOT NULL,
    is_suspended BOOLEAN NOT NULL DEFAULT false, -- Hides store from search AND direct-link detail lookups
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stores_earthdistance ON stores USING gist (ll_to_earth(latitude, longitude));

-- Categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    icon_url VARCHAR(512)
);

CREATE TABLE subcategories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    UNIQUE(parent_category_id, name)
);

-- Products & Inventory
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    subcategory_id UUID REFERENCES subcategories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    image_url VARCHAR(512),
    is_published BOOLEAN NOT NULL DEFAULT false, -- True when ready & image exists
    embedding vector(768),
    search_tsv tsvector GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
    ) STORED, -- Full-text fallback when Gemini is unavailable
    last_verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT publish_image_check CHECK (is_published = false OR image_url IS NOT NULL)
);

-- Search indexes: trigram and full-text fallbacks plus the vector index
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX idx_products_search_tsv ON products USING gin (search_tsv);
CREATE INDEX idx_products_embedding ON products USING hnsw (embedding vector_l2_ops);

-- Product photos uploaded by store owners (served from GET /images/:id)
CREATE TABLE uploaded_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type VARCHAR(32) NOT NULL,
    byte_size INTEGER NOT NULL CHECK (byte_size > 0),
    data BYTEA NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_uploaded_images_owner ON uploaded_images(owner_id, created_at);

-- Shared Household Lists
CREATE TYPE member_role AS ENUM ('OWNER', 'MEMBER');

CREATE TABLE household_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    invite_code VARCHAR(10) UNIQUE NOT NULL, -- Regenerable via owner-only endpoint
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE household_list_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES household_lists(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role member_role NOT NULL DEFAULT 'MEMBER',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(list_id, user_id)
);

CREATE TABLE household_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES household_lists(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    custom_item_name VARCHAR(255),
    item_name VARCHAR(255) NOT NULL, -- Display name; copied from the product so it survives product deletion
    quantity INT NOT NULL DEFAULT 1,
    is_checked BOOLEAN NOT NULL DEFAULT false,
    added_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(list_id, product_id) -- Enables safe UPSERT for quantities
);

-- Reviews & Ratings
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    rating INT CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE, -- NULL means never edited
    CONSTRAINT review_target_check CHECK (
        (store_id IS NOT NULL AND product_id IS NULL) OR
        (store_id IS NULL AND product_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX idx_reviews_user_store ON reviews(user_id, store_id) WHERE store_id IS NOT NULL;
CREATE UNIQUE INDEX idx_reviews_user_product ON reviews(user_id, product_id) WHERE product_id IS NOT NULL;

-- Saved Favorites
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT favorite_target_check CHECK (
        (store_id IS NOT NULL AND product_id IS NULL) OR
        (store_id IS NULL AND product_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX idx_favorites_user_store ON favorites(user_id, store_id) WHERE store_id IS NOT NULL;
CREATE UNIQUE INDEX idx_favorites_user_product ON favorites(user_id, product_id) WHERE product_id IS NOT NULL;

-- System Admin Audit Logs
CREATE TABLE admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT, -- Intentional: preserves accountability; see Task 1.3.3 admin-demotion rule
    action VARCHAR(50) NOT NULL, -- e.g., 'SUSPEND_USER', 'DELETE_STORE', 'DELETE_REVIEW'
    target_id UUID NOT NULL,
    target_type VARCHAR(50) NOT NULL, -- e.g., 'USER', 'STORE', 'REVIEW'
    admin_email VARCHAR(255), -- Added by migration 002; not currently written (the ledger joins users for the admin's email)
    admin_name VARCHAR(100),  -- Added by migration 002; not currently written
    reason TEXT,
    snapshot JSONB, -- Pre-mutation copy of the affected row(s); populated on any destructive action
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```
