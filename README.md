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

Shared code lives in `packages/` (`@nearcommerce/api` for the HTTP client, schemas and token refresh; `@nearcommerce/ui` for shared components; `@nearcommerce/config` for shared TypeScript config).

### Features

- **Discovery:** geospatial product and store search with distance, stock status and freshness badges, category browsing, favorites, and store operating-hours awareness.
- **Search:** semantic search using Gemini embeddings in `pgvector`, with automatic fallback to PostgreSQL full-text and trigram matching when Gemini is unavailable or slower than 2 seconds.
- **Inventory:** product CRUD, one-click "Confirm still in stock", stale-listing flagging (30 days), and a CSV importer that creates or updates products (rows with an image URL are published, rows without become drafts).
- **Household lists:** shared shopping lists with invite codes, owner and member roles, and live updates over Socket.IO.
- **Reviews:** store and product ratings with editing and deletion by their author. Store owners cannot review their own store or products.
- **Moderation:** admins suspend or delete users and stores, delete reviews, and every action is written to an audit log with a pre-change snapshot.
- **Accounts:** role-based access (`CUSTOMER`, `STORE_OWNER`, `SYSTEM_ADMIN`), refresh-token sessions, password reset by email, progressive login lockout, and account deletion.
- **Directions:** hand off to the phone's native maps app from a store or product (the "avoid tolls" preference is honoured on Android).

### Known gaps

These are described in the SRS but are not finished:

- **Image search:** the mobile search bar shows the SRS fallback ("Image search is unavailable") because vision search is not implemented.
- **Image cropper:** `EdgeImageCropper` (ONNX YOLO in a Web Worker) exists and is tested but is not used by the product form yet. Products currently take an image URL, and there is no image upload or hosting.
- **Email verification:** disabled for the MVP. New accounts are verified on registration.

## Repository structure

This is a `pnpm` workspace managed by Turborepo:

```text
.
├── apps/
│   ├── admin/       # React/Vite system admin portal
│   ├── backend/     # Express, Socket.IO, and TypeScript API server
│   ├── mobile/      # React Native / Expo shopper app
│   └── web/         # React/Vite store owner dashboard
├── packages/        # Shared libraries and configuration
├── .env.example     # Environment variable template
├── Implementation.md
├── NearCommerce_SRS.md
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Technology stack

- **TypeScript** across the monorepo
- **React**, **Vite**, and **Tailwind CSS** for the web portals; **TanStack Query** everywhere data is fetched
- **React Native** with **Expo Router** for the mobile app
- **Node.js**, **Express**, and **Socket.IO** for the backend
- **PostgreSQL** with the `pgvector`, `pg_trgm`, `cube`, `earthdistance`, and `uuid-ossp` extensions
- **Redis** for the real-time suspension flag, login lockout counters, and the Socket.IO adapter
- **Google Gemini** for embeddings (`gemini-embedding-001` by default)
- **pnpm workspaces** and **Turborepo** for monorepo management
- **Jest**, **Supertest**, and **Testing Library** for tests

## Prerequisites

- Node.js 20 or newer (developed on 22)
- pnpm 12.4.2 (pinned in `package.json`; `corepack` installs it for you)
- PostgreSQL 15 or newer with the `vector` (pgvector) extension available. Creating the extensions needs a role that is allowed to run `CREATE EXTENSION`.
- Redis 6 or newer
- A Gemini API key (optional; without it, search uses text matching only)
- SMTP credentials (optional in development; outside production the backend also prints the password-reset token to its console)
- Expo Go or an emulator/simulator to run the mobile app

## Getting started

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/Ay-dotcode/NearCommerce.git
   cd NearCommerce
   corepack enable
   pnpm install
   ```

2. Create your environment file:

   ```bash
   cp .env.example .env
   ```

   Fill in `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` at minimum. The backend and both web portals read this root `.env` (the portals only see `VITE_`-prefixed keys). Never commit real credentials.

3. Create the database schema. There is no migration runner yet; apply the SQL files in order:

   ```bash
   for f in apps/backend/src/db/migrations/*.sql; do
     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
   done
   ```

4. Seed demo data (optional):

   ```bash
   pnpm --filter @nearcommerce/backend seed
   ```

   In development this creates `admin@nearcommerce.com` (system admin) and `joseyowolabi@gmail.com` (store owner with a sample store), both with the password `Password12++`. With `NODE_ENV=production` the seeds refuse to run unless you set the `SEED_*` variables from `.env.example`. If you add products before setting `GEMINI_API_KEY`, run `pnpm --filter @nearcommerce/backend embeddings:backfill` afterwards.

5. Build the shared packages once, then start everything:

   ```bash
   pnpm --filter @nearcommerce/api build
   pnpm --filter @nearcommerce/ui build
   pnpm dev
   ```

   | URL                   | App                |
   | --------------------- | ------------------ |
   | http://localhost:4000 | API                |
   | http://localhost:3001 | Store owner portal |
   | http://localhost:3000 | Admin portal       |

6. Run the mobile app. Expo reads its own env file, so create `apps/mobile/.env`:

   ```bash
   echo 'EXPO_PUBLIC_API_URL=http://localhost:4000' > apps/mobile/.env
   pnpm --filter @nearcommerce/mobile start
   ```

   `localhost` only works in an emulator or simulator on the same machine. On a physical device use your computer's LAN address (for example `http://192.168.1.20:4000`).

## Common commands

```bash
pnpm dev      # Start development tasks
pnpm build    # Build all applications and packages
pnpm lint     # Type-check all configured workspaces
pnpm test     # Run tests in workspaces that provide them
```

Per-app commands:

```bash
pnpm --filter @nearcommerce/backend dev
pnpm --filter @nearcommerce/backend build
pnpm --filter @nearcommerce/backend test

pnpm --filter @nearcommerce/web dev        # also: build, lint, test
pnpm --filter @nearcommerce/admin dev      # also: build, lint, test
pnpm --filter @nearcommerce/mobile test
```

## Testing

- **Web, admin, and mobile** tests run without any services.
- **Backend** tests are integration tests that talk to a real PostgreSQL and Redis through `DATABASE_URL` and `REDIS_URL`. They create and delete their own rows, but use a **separate, disposable database** (for example `nearcommerce_test`) with the migrations applied, never your development data. Run them with `NODE_ENV=test` (Jest sets this itself); in that mode rate limiters are skipped and no emails are sent.
- Build `packages/api` before type-checking or testing the backend (`pnpm --filter @nearcommerce/api build`).

## Conventions

- Imports use the `@/` alias (for example `@/features/auth/...`) instead of relative `../` paths. The shared `packages/*` use relative imports because the apps consume their source directly.
- One- and two-line comments use `//`.

## Documentation

- [Software Requirements Specification](./NearCommerce_SRS.md): product scope, architecture, data model, and planned capabilities
- [Implementation Blueprint](./Implementation.md): implementation phases, testing strategy, and engineering rules

## License

The project is intended to be released under the MIT License. See the repository license file for the authoritative terms.
