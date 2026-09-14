# Software Requirements Specification (SRS)

## 1. Project Overview & Business Scope
**Project Name:** NearCommerce  
**Description:** A full-stack, AI-powered local commerce platform connecting users with nearby physical shops. It enables multimodal (text & image) semantic search, real-time shared household shopping lists, community-driven store ratings, email verification gating, and robust inventory management.  
**Business Scope Clarification:** NearCommerce is strictly a **Discovery & Physical Store Visit Platform ("Discover & Physical Visit")**. 
*   **In-App Payments / Checkout:** None. The app does NOT process digital payments or order fulfillment.
*   **Purpose:** Users discover local inventory, compare prices and distance, coordinate physical shopping trips via shared lists, and navigate to physical stores via native maps.
*   **Shared Household List:** The "Shared Cart" feature is explicitly defined as a **Shared Household Shopping List**—a real-time collaborative checklist for housemates/families planning physical store visits, NOT an e-commerce checkout cart.

**Architecture Theme:** Extreme Modularity and Reusability. Designed via Monorepo (`pnpm` + `Turborepo`) and Feature-Sliced Design (FSD) so that every service, UI component, and schema is decoupled.
**License:** MIT License  

---

## 2. System Architecture & Tech Stack

*   **Web Portals (Store Owner & System Admin):** React, TypeScript, Tailwind CSS, Shadcn UI, ONNX Runtime Web (Edge-AI). Hosted on Vercel.
*   **Mobile App:** React Native (Expo), AsyncStorage, Socket.io Client. Deployed via App Stores.
*   **Backend Server:** Node.js, Express, Socket.io, TypeScript. Hosted on Render.
*   **Database & Cache:** PostgreSQL with `pgvector`, `earthdistance`/`cube`, & `pg_trgm` extensions (Neon) and Redis (Upstash).
*   **AI Engine & Fallback Pipeline:** 
    *   *Primary Text Search:* Google Gemini 1.5 Flash generates vector embeddings for semantic search in `pgvector`.
    *   *Fallback Text Search:* If Gemini is unavailable, rate-limited, or exceeds a 2000ms response timeout, text search automatically degrades to PostgreSQL Full-Text Search (`tsvector`) and trigram matching (`pg_trgm`).
    *   *Image Search Fallback:* If Gemini Vision is unavailable, visual search is gracefully disabled in the mobile UI, falling back strictly to text search.

---

## 3. Detailed Task Breakdown & Execution Plan

### Phase 1: Infrastructure, Auth, & Database Core
**Task 1.1: Monorepo & Architecture Setup**
*   *Sub-task 1.1.1:* Initialize `pnpm` workspace (`/apps` for mobile, admin, backend; `/packages` for ui, api, config).
*   *Sub-task 1.1.2:* Configure `Turborepo` pipelines for unified linting, building, and caching.

**Task 1.2: Database Schemas & Indexing**
*   *Sub-task 1.2.1:* Run migration scripts for core entities. Ensure legacy `in_stock` boolean is removed; stock is derived from `quantity > 0`. Incorporate `email_verified_at` column, `email_verification_tokens` table, `is_suspended` flags, and `admin_audit_logs`.
*   *Sub-task 1.2.2:* Enable `pgvector`, `cube`, `earthdistance`, and `pg_trgm` extensions. Create geospatial GiST indexes.

**Task 1.3: Authentication, Context Access, & Moderation**
*   *Sub-task 1.3.1:* Implement JWT-based auth with SHA-256 hashed refresh tokens. Support `CUSTOMER`, `STORE_OWNER`, and `SYSTEM_ADMIN` roles.
*   *Sub-task 1.3.2 (Store Context):* Validate `X-Store-ID` headers against the user's owned stores for all owner operations.
*   *Sub-task 1.3.3 (Account Deletion & List Lifecycle):* Implement account deletion flow. **Orphan Prevention:** If the deleting user is the *only* member of a list, the list is completely deleted. If other members exist, ownership is automatically transferred to the oldest remaining `MEMBER`.

### Phase 2: Shared Library Construction (`@nearcommerce/packages`)
**Task 2.1: UI Component Library (`@nearcommerce/ui`)**
*   *Sub-task 2.1.1:* Build atomic visual components (Buttons, Inputs, Badges, Cards, Modals).
*   *Sub-task 2.1.2:* Create a global design token system (colors, typography, dark mode tokens).

**Task 2.2: Shared API & Validation (`@nearcommerce/api`)**
*   *Sub-task 2.2.1:* Write unified `Zod` schemas for all entities.
*   *Sub-task 2.2.2:* Build an Axios/Fetch HTTP client wrapper with automatic token refresh.

### Phase 3: Backend API & Micro-Services
**Task 3.1: Core API, Auth, & Email Verification**
*   *Sub-task 3.1.1:* Build user registration. Upon signup, generate a verification token, store its SHA-256 hash in `email_verification_tokens` (24h expiry), and dispatch an email.
*   *Sub-task 3.1.2:* Build verification endpoint (`/auth/verify-email`) to validate token hashes and set `email_verified_at`. Add a rate-limited `/auth/resend-verification` endpoint.
*   *Sub-task 3.1.3:* Expose a standardized `/support` endpoint providing users and store owners direct access to official support channels.

**Task 3.2: Domain Micro-Services**
*   *Sub-task 3.2.1 (Resilient Search Service):* Build vector search route utilizing `earthdistance` for <50ms proximity filtering. Implement 2000ms circuit breaker. **Crucial:** Query MUST explicitly filter with `WHERE is_published = true AND quantity > 0 AND is_suspended = false` to prevent drafts, out-of-stock items, or suspended stores from leaking into searches.
*   *Sub-task 3.2.2 (Real-Time Household List Service):* Implement Socket.io server with Redis pub/sub. List item additions use PostgreSQL `ON CONFLICT (list_id, product_id) DO UPDATE SET quantity = household_list_items.quantity + EXCLUDED.quantity, is_checked = false` to seamlessly bump quantities and reset completion status.
*   *Sub-task 3.2.3 (Store Operating Hours & Timezone Service):* Store operating hours evaluate against the store's explicit IANA timezone column.
*   *Sub-task 3.2.4 (Product Freshness Engine):* Automatically flag products unverified for > 30 days (`last_verified_at`). Expose a "Confirm In-Stock" endpoint for store owners.
*   *Sub-task 3.2.5 (Community Ratings Service & Gating):* Build endpoints for submitting store/product ratings (1-5). **Trust Gate:** Middleware enforces that `email_verified_at IS NOT NULL` to submit a review or create a store. Browsing, searching, and shared lists remain fully accessible without verification.
*   *Sub-task 3.2.6 (System Admin Operations):* Build heavily guarded endpoints restricted to `SYSTEM_ADMIN`. Endpoints include fetching paginated lists of all users/stores/reviews, toggling `is_suspended` statuses, forcing hard deletions, and logging every action to `admin_audit_logs`.

### Phase 4: Web Portals (Store Owners & System Admins)
**Task 4.1: Authentication & Routing**
*   *Sub-task 4.1.1:* Login screen with RBAC-aware routing. Store Owners route to their inventory dashboard (passing `X-Store-ID`); System Admins route to the master oversight portal.

**Task 4.2: Store Owner Dashboard (Inventory & Analytics)**
*   *Sub-task 4.2.1:* Product CRUD forms with `quantity` input and a single-click "Confirm Still In Stock" button.
*   *Sub-task 4.2.2 (Dual-Mode CSV Importer):* Supports both creation and updates. If a CSV row contains a public image URL, the product is published immediately. If omitted, it is created as `is_published = false` (Draft) and remains hidden until an image is manually uploaded.
*   *Sub-task 4.2.3:* Edge-AI Image Cropper running ONNX YOLO in a Web Worker, with a graceful 3-second fallback to manual cropping.

**Task 4.3: System Admin Dashboard (Master Oversight)**
*   *Sub-task 4.3.1 (Global Metrics Hub):* Top-level dashboard displaying platform health, total active stores, total flagged items, and new registrations.
*   *Sub-task 4.3.2 (User Moderation Panel):* Searchable data grid (using TanStack Table and Shadcn UI) to view all users. Includes action menus to **Suspend User** (blocking login) or **Force Delete Account**.
*   *Sub-task 4.3.3 (Store Moderation Panel):* Data grid listing all stores. Includes action menus to **Suspend Store** (instantly hiding it from mobile searches) or **Delete Store** (wiping all associated inventory).
*   *Sub-task 4.3.4 (Content & Review Moderation):* Interface to view all community reviews. Admins can permanently delete defamatory or fraudulent reviews.
*   *Sub-task 4.3.5 (Audit Logs):* A read-only ledger displaying the `admin_audit_logs`, tracking exactly which admin performed what suspension or deletion.

### Phase 5: Mobile App (Shoppers)
**Task 5.1: Navigation & Home Experience**
*   *Sub-task 5.1.1:* Expo Router layout featuring Category Browse, Search Bar, Household Lists, Favorites, and Settings.
*   *Sub-task 5.1.2:* Store Cards displaying "Open Now / Closed" status badge computed in the store's timezone, and average community review score.

**Task 5.2: Search & Product Discovery**
*   *Sub-task 5.2.1:* Unified Search bar. Disables visual tools gracefully upon AI service failure.
*   *Sub-task 5.2.2:* Product Cards displaying price, distance, stock status (derived purely from `quantity > 0`), and Freshness Badge.

**Task 5.3: Real-Time Shared Household Lists**
*   *Sub-task 5.3.1:* UI for list management. If a user adds a product already on the list, the UI displays a clear toast notification: *"Item already on list. Quantity increased to [X] and marked un-checked."*

**Task 5.4: User Preferences & Hardware Privacy**
*   *Sub-task 5.4.1 (Location Privacy & Dynamic Island):* Poll GPS once at session start. Trigger high-visibility notification or Apple Dynamic Island while location is fetched.
*   *Sub-task 5.4.2 (Routing Preferences):* Saved locally via `AsyncStorage`.
*   *Sub-task 5.4.3 (Native Map Handoff):* Deep-link (`geo:` or `maps://`) to native maps.

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
    is_suspended BOOLEAN NOT NULL DEFAULT false, -- Used by SYSTEM_ADMIN
    email_verified_at TIMESTAMP WITH TIME ZONE, -- NULL until verified
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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
    is_suspended BOOLEAN NOT NULL DEFAULT false, -- Used by SYSTEM_ADMIN to hide stores
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stores_earthdistance ON stores USING gist (ll_to_earth(latitude, longitude));

-- Categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    icon_url VARCHAR(512)
);

CREATE TABLE subcategories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL
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
    last_verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT publish_image_check CHECK (is_published = false OR image_url IS NOT NULL)
);

-- Shared Household Lists
CREATE TYPE member_role AS ENUM ('OWNER', 'MEMBER');

CREATE TABLE household_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    invite_code VARCHAR(10) UNIQUE NOT NULL,
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
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action VARCHAR(50) NOT NULL, -- e.g., 'SUSPEND_USER', 'DELETE_STORE', 'DELETE_REVIEW'
    target_id UUID NOT NULL,
    target_type VARCHAR(50) NOT NULL, -- e.g., 'USER', 'STORE', 'REVIEW'
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```
