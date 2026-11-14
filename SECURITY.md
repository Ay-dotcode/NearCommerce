# Security Policy

## Reporting a vulnerability

Please do not open a public issue for security problems. Use GitHub's private vulnerability
reporting (the **Security** tab of this repository, then **Report a vulnerability**) and include
the steps to reproduce, the affected app (`backend`, `web`, `admin` or `mobile`) and the impact
you expect.

## What the project already does

- Passwords are hashed with bcrypt; access tokens are short lived (15 minutes) and refresh
  tokens are stored only as SHA-256 hashes.
- Login attempts are rate limited per IP and per account, with growing delays after failures.
- The API sends security headers (Helmet), answers errors as JSON without stack traces, and can
  restrict browser access to the portals with `CORS_ORIGINS`.
- CI type-checks, lints and tests every change, and Dependabot proposes dependency updates.

## Known open items

- `zod` 3.x still appears in `pnpm audit` only as Expo's own internal dependency (via
  `expo-file-system`). The project's own schemas use zod 4. This clears when Expo upgrades.
- `react-router` 6.x (admin and web) has a moderate advisory fixed only in 7.x, which is a
  major migration tracked separately.
- Production deployments should set `CORS_ORIGINS` (see `.env.example`); when it is empty the
  API accepts requests from any origin.
