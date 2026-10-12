# NearCommerce: Master Implementation Blueprint

## 1. Project Overview & Architecture Rules

- **Project Name:** NearCommerce — A high-performance, modular local commerce platform.
- **Scope:** Discovery & Physical Store Visit Platform strictly **WITHOUT** in-app payments or digital checkouts.
- **Architecture:** Monorepo using **pnpm workspaces** and **Turborepo**, structured with **Feature-Sliced Design (FSD)** principles.
- **Tech Stack:**
  - **Backend:** Node.js, Express, Socket.io, TypeScript.
  - **Database & Cache:** PostgreSQL with `pgvector`, `earthdistance`, and `pg_trgm` (Neon) + Redis (Upstash).
  - **Web Portals:** React, TypeScript, Tailwind CSS, Shadcn UI, ONNX Runtime Web (Vercel).
  - **Mobile App:** React Native with Expo, AsyncStorage, Socket.io Client.
- **Testing Stack:** **Jest** and **Supertest** for backend unit/integration tests; **React Testing Library** for frontend components.

---

## 2. Testing Strategy & Workflow

Every new feature or service built must include:

1. **Unit Tests:** For business logic, validation helpers, token hashing, and utility functions.
2. **Integration / API Tests:** Using `Supertest` against Express route handlers to verify HTTP status codes, Zod request validation, and database interactions.
3. **Running Tests:** Executed via Turborepo filters: `pnpm test`.

---

## 3. Implementation Plan & Missing Flow Backlog

### Phase 3: Backend API & Micro-Services

#### Task 3.1: Core Auth & Email Verification

- **3.1.1 Registration (`/auth/register`):** Accept `RegisterSchema` (strictly `CUSTOMER` or `STORE_OWNER`, blocking `SYSTEM_ADMIN` escalation), hash passwords with `bcrypt`, insert the user unverified, issue a hashed 24h token and email the link (a send failure is logged, not fatal). Rate-limit registration per IP.
- **3.1.2 Email Verification (`/auth/verify-email`):** Validates the emailed token, sets `email_verified_at`, deletes the user's tokens. Web page at `/verify-email`.
- **3.1.3 Resend Verification (`/auth/resend-verification`):** Replaces the token and re-sends. Same response for unknown or verified addresses. Web (banner and register screen) and mobile (Settings) can request it.
- **3.1.4 Support Endpoint (`/support`):** Standardized route providing official support channels for users and store owners.
- **3.1.5 Password Reset Flow:** Implement `/auth/forgot-password` (1h expiry, hashed token in DB) and `/auth/reset-password` (validates token, updates `password_hash`, and revokes all active `user_sessions`). Includes password reset UI screens in web and mobile apps.
- **3.1.6 Trust Gate (`requireVerifiedEmail` middleware):** Returns `403 EMAIL_NOT_VERIFIED` for unverified users; guards reviews. `GET /users/me` reports `email_verified`.

#### Task 3.2: Domain Micro-Services & Schema Refinements

- **3.2.1 Resilient Search & Detail Service:** Vector search route utilizing `earthdistance` for <50ms proximity filtering with 2000ms Gemini circuit breaker fallback (`pg_trgm` & `tsvector`). **Filter Enforcement:** Explicitly filter `WHERE p.is_published = true AND p.quantity > 0 AND s.is_suspended = false AND u.is_suspended = false` by joining `users u` on `s.owner_id = u.id` so suspending a user hides all owned stores and products.
- **3.2.2 Product Embeddings Pipeline:** Automatically invoke Gemini `gemini-embedding-001` (truncated to 768 dimensions and re-normalised) to update `products.embedding` on product creation, update, and CSV import.
- **3.2.3 Real-Time Household List Operations:** Socket.io server with Redis pub/sub.
  - Implement custom item addition (`custom_item_name`), item deletion, list renaming, list deletion, member removal, and owner invite code regeneration (`regenerate-invite-code`).
  - **Orphan Item Prevention:** When adding a product to a list, copy `product.name` into `custom_item_name` so deletion of a product preserves item visibility.
- **3.2.4 Store Timezones & Freshness Engine:** Evaluate operating hours against explicit store IANA timezone. Automatically reset `last_verified_at = NOW()` whenever price or quantity is edited.
- **3.2.5 Community Ratings & Review Management:** Endpoints for store/product reviews (1-5), per-target listing, and shopper review edit/delete endpoints.
- **3.2.6 System Admin Operations:** Admin endpoints for user/store suspension, hard deletion with `admin_audit_logs.snapshot` pre-deletion serialization, and an **Admin Demotion Endpoint** (demoting `SYSTEM_ADMIN` to `CUSTOMER` to satisfy the audit log ON DELETE RESTRICT safeguard).
- **3.2.7 Search Database Indexes:** Add a GIN trigram index (`CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops)`), a GIN index on the generated `search_tsv` column, and an HNSW vector index (`vector_l2_ops`) for performance targets.

---

### Phase 4: Web Portals (Store Owners & System Admins)

- **Task 4.1 RBAC Routing & Customer Guidance:**
  - Login screen routing Store Owners to inventory dashboard (passing `X-Store-ID`) and System Admins to master oversight.
  - Render helpful guidance and redirect links when a `CUSTOMER` role attempts to log into the Store Owner portal.
- **Task 4.2 Store Owner Dashboard & Operations:**
  - Product CRUD forms with automatic freshness verification on edit.
  - Store creation onboarding modal for new store owners with zero stores, plus a multi-store switcher component.
  - Dual-mode CSV importer (auto-drafts if image URL missing) and Edge-AI image cropper running ONNX YOLO in a Web Worker (with 3s fallback), wired into the product form with owner-only image upload and hosting.
  - Add explicit Logout, Store Deletion, and Support buttons to the dashboard layout.
- **Task 4.3 System Admin Dashboard:**
  - Global metrics hub, user/store moderation grids (with User Demote button), review moderation grid, and read-only audit log ledger with pre-deletion snapshots.
  - Category & Subcategory CRUD administration panel.

---

### Phase 5: Mobile App (Shoppers)

- **Task 5.1 & 5.2 Navigation, Search & Favorites:**
  - Expo Router layout, Category & Subcategory drill-down browse screen.
  - Unified text search with graceful AI fallback.
  - Favorite Heart/Bookmark toggle on Store Detail and Product Detail screens to manage saved items.
  - Manual location/ZIP code fallback modal when location permission is denied.
- **Task 5.3 Real-Time Household Lists:**
  - Household list UI supporting item deletion, custom items, list rename/delete, leave list, and member management.
- **Task 5.4 Shopper Reviews & Settings:**
  - Product review submission and review listing UI on product/store detail screens.
  - Shopper review edit/delete controls.
  - Account deletion confirmation flow calling `/users/me` delete endpoint.
  - Password Reset screen (`/(auth)/forgot-password`).

---

## 4. How to Resume in a New Chat

When starting your next chat session, copy and paste this message:

> _"We are building NearCommerce, a modular local commerce platform using a pnpm/Turborepo monorepo, Node.js/Express, Neon PostgreSQL, and Upstash Redis. Our SRS and Implementation Blueprint have been reconciled with the implemented behaviour (email verification, photo upload and hosting, photo search). All test suites across the monorepo pass cleanly. Let me know where we should begin on our remaining backlog!"_
