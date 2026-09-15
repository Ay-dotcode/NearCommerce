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

Every new feature or service built from this point forward must include:

1. **Unit Tests:** For business logic, validation helpers, token hashing, and utility functions.
2. **Integration / API Tests:** Using `Supertest` against Express route handlers to verify HTTP status codes, Zod request validation, and database interactions.
3. **Running Tests:** Executed via Turborepo filters: `pnpm test --filter @nearcommerce/backend`.

---

## 3. Remaining Execution Plan (Phase by Phase)

### Phase 3: Backend API & Micro-Services (Current Phase)

#### Task 3.1: Core Auth & Email Verification

- **3.1.1 Registration (`/auth/register`):** Accept `RegisterSchema`, hash passwords with `bcrypt`, generate a secure random token, store its SHA-256 hash in `email_verification_tokens` (24h expiry), and dispatch verification email. Ensure prior unexpired tokens are invalidated.
- **3.1.2 Email Verification (`/auth/verify-email`):** Validate SHA-256 token hash, update `users.email_verified_at`. Add rate-limited `/auth/resend-verification`.
- **3.1.3 Support Endpoint (`/support`):** Standardized route providing official support channels.
- **3.1.4 Password Reset:** Implement `/auth/forgot-password` (1h expiry, hashed token) and `/auth/reset-password` (validates token, updates `password_hash`, and revokes all active `user_sessions`).
- _Testing:_ Unit test token hashing logic; integration test registration, verification flow, and progressive rate-limiting.

#### Task 3.2: Domain Micro-Services

- **3.2.1 Resilient Search & Detail Service:** Vector search route utilizing `earthdistance` for <50ms proximity filtering with a 2000ms Gemini circuit breaker fallback to `tsvector`/`pg_trgm`. **Crucial rule:** Must explicitly filter `WHERE is_published = true AND quantity > 0 AND stores.is_suspended = false`.
- **3.2.2 Real-Time Household List Service:** Socket.io server with Redis pub/sub. List item additions use PostgreSQL `ON CONFLICT (list_id, product_id) DO UPDATE SET quantity = household_list_items.quantity + EXCLUDED.quantity, is_checked = false`.
- **3.2.3 Store Timezones:** Evaluate store operating hours against the store's explicit IANA timezone column.
- **3.2.4 Product Freshness Engine:** Flag products unverified for >30 days (`last_verified_at`). Expose "Confirm In-Stock" endpoint.
- **3.2.5 Community Ratings & Trust Gate:** Middleware enforcing `email_verified_at IS NOT NULL` to submit reviews or create stores.
- **3.2.6 System Admin Operations:** Restricted endpoints for pagination, toggling `is_suspended` (instantly busting Redis cache), and hard deletions with pre-deletion row serialization into `admin_audit_logs.snapshot`.

---

### Phase 4: Web Portals (Store Owners & System Admins)

- **Task 4.1 RBAC Routing:** Login screen routing Store Owners to inventory dashboard (passing `X-Store-ID`) and System Admins to master oversight.
- **Task 4.2 Store Owner Dashboard:** Product CRUD forms, dual-mode CSV importer (auto-drafts if image URL missing), and Edge-AI image cropper running ONNX YOLO in a Web Worker (with 3s fallback).
- **Task 4.3 System Admin Dashboard:** Global metrics hub, user/store moderation grids, review management, and read-only audit log ledger with pre-deletion snapshots.

---

### Phase 5: Mobile App (Shoppers)

- **Task 5.1 & 5.2 Navigation & Search:** Expo Router layout, Category Browse, unified search bar with visual fallback, and store cards displaying "Open Now/Closed" status and freshness badges.
- **Task 5.3 & 5.4 Real-Time Lists & Hardware:** Household list synchronization via Socket.io with toast notifications for duplicate additions, location privacy handling, and native map handoff (`geo:` or `maps://`).

---

## 4. How to Resume in a New Chat

When starting your next chat session, simply copy and paste this message:

> _"We are building NearCommerce, a modular local commerce platform using a pnpm/Turborepo monorepo, Node.js/Express, Neon PostgreSQL, and Upstash Redis. Our architecture rules, Zod schemas in `@nearcommerce/api`, and initial database schema are already established and tested. We are currently at **Phase 3, Task 3.1: User Registration & Email Verification**, and we adhere to writing unit and integration tests alongside every feature. Let's start building Task 3.1 with its corresponding tests!"_
