# NearCommerce

NearCommerce is a modular, AI-powered local commerce platform that helps people discover products available at nearby physical stores and plan shopping trips together.

> NearCommerce is focused on discovery and in-person shopping. It does not process in-app payments, digital checkout, or order fulfillment.

## Highlights

- Discover nearby stores and products
- Semantic and multimodal search with graceful text-search fallbacks
- Inventory and product management for store owners
- Real-time shared household shopping lists
- Store and product ratings from verified users
- Role-based access for customers, store owners, and system administrators
- Geospatial search, freshness tracking, and store operating-hour awareness
- Admin moderation and audit logging

## Repository structure

This repository is organized as a `pnpm` workspace managed by Turborepo:

```text
.
├── apps/
│   ├── admin/       # React/Vite System Admin master oversight portal
│   ├── backend/     # Express, Socket.IO, and TypeScript API server
│   ├── mobile/      # React Native / Expo shopper mobile application
│   └── web/         # React/Vite Store Owner inventory dashboard
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
- **React** and **Vite** for web portals
- **Node.js**, **Express**, and **Socket.IO** for the backend
- **PostgreSQL** with `pgvector`, `pg_trgm`, `cube`, and `earthdistance`
- **Redis** for caching and real-time Socket.IO coordination
- **Google Gemini** for AI-assisted embeddings and search capabilities
- **pnpm workspaces** and **Turborepo** for monorepo management
- **Jest** and **Supertest** for backend testing

## Prerequisites

- Node.js 18 or newer
- pnpm 10.33.0
- PostgreSQL with the extensions required by the application
- Redis
- Credentials for any enabled third-party services

## Getting started

1. Clone the repository:

   ```bash
   git clone https://github.com/Ay-dotcode/NearCommerce.git
   cd NearCommerce
   ```

2. Install the pinned package-manager version and dependencies:

   ```bash
   corepack enable
   corepack prepare pnpm@10.33.0 --activate
   pnpm install
   ```

3. Create a local environment file:

   ```bash
   cp .env.example .env
   ```

   Update `.env` with your PostgreSQL, Redis, JWT, Gemini, and SMTP settings. Never commit real credentials.

4. Start the development applications:

   ```bash
   pnpm dev
   ```

   The backend uses port `4000` by default. Set `PORT` in `.env` to use another port.

## Common commands

Run commands across the workspace with Turborepo:

```bash
pnpm dev      # Start development tasks
pnpm build    # Build all applications and packages
pnpm lint     # Type-check/lint all configured workspaces
pnpm test     # Run tests in workspaces that provide them
```

To work on the backend only:

```bash
pnpm --filter @nearcommerce/backend dev
pnpm --filter @nearcommerce/backend build
pnpm --filter @nearcommerce/backend test
```

To run the store owner portal:

```bash
pnpm --filter @nearcommerce/web dev
pnpm --filter @nearcommerce/web build
pnpm --filter @nearcommerce/web lint
pnpm --filter @nearcommerce/web test
```

To run the system admin portal:

```bash
pnpm --filter @nearcommerce/admin dev
pnpm --filter @nearcommerce/admin build
pnpm --filter @nearcommerce/admin lint
pnpm --filter @nearcommerce/admin test
```

## Documentation

- [Software Requirements Specification](./NearCommerce_SRS.md) — product scope, architecture, data model, and planned capabilities
- [Implementation Blueprint](./Implementation.md) — implementation phases, testing strategy, and engineering rules

## Project status

NearCommerce is under active development. Refer to the implementation blueprint and repository issues for current work and planned milestones.

## License

The project is intended to be released under the MIT License. See the repository license file for the authoritative terms.
