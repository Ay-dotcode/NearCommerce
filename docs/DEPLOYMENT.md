# Publishing NearCommerce

This guide takes the project from "runs on my computer" to "live on the internet, and every push to
`main` updates it". Everything below can be done on free plans, with the limits listed in each section.
Prices and free-tier limits change, so check each provider's pricing page before relying on them.

> **Status of the automation:** the commands in the workflows (tests, migrations, `start`, the web
> builds) were all run locally, and the YAML files were validated. The workflows themselves have **not**
> been run on GitHub yet, so expect to fix a small thing or two the first time (a wrong secret name is the
> usual one). Start with the manual first deploy in each step, then let the workflow take over.

## 1. Where each part goes

| Part                                                             | Goes to                        | Cost                            | Updated by                                               |
| ---------------------------------------------------------------- | ------------------------------ | ------------------------------- | -------------------------------------------------------- |
| Store-owner portal (`apps/web`) and admin console (`apps/admin`) | Cloudflare Pages               | Free plan                       | `ci-cd.yml` on every push to `main`                      |
| API (`apps/backend`)                                             | Render (web service)           | Free plan                       | `ci-cd.yml`: migrates the database, then triggers Render |
| Database (Postgres with pgvector)                                | Neon                           | Free plan                       | `db:migrate` in `ci-cd.yml`                              |
| Redis (shared lists, lockouts)                                   | Upstash                        | Free plan                       | nothing to update                                        |
| Android app                                                      | GitHub Releases (APK file)     | Free                            | `release-android.yml` when you push a `v*` tag           |
| Android app, future                                              | Google Play                    | **US$25 once**, see section 3   | same build, `production` profile                         |
| Mobile app code changes                                          | Expo EAS Update (over the air) | Free plan                       | `ci-cd.yml` on every push to `main`                      |
| iPhone app                                                       | Apple App Store / TestFlight   | **US$99 a year**, see section 3 | not set up                                               |

### Free-plan limits you will notice

- **Render (API):** a free web service goes to sleep after 15 minutes without traffic and takes roughly a
  minute to wake. The first request after a quiet period is slow, and real-time shared lists drop their
  connection while it sleeps. Free Render databases are deleted after 30 days, so this guide uses Neon
  for the database instead.
- **Neon (database):** the free plan has a small storage allowance (0.5 GB per project at the time of
  writing; a September 2026 changelog reports it was raised to 1 GB) and the database pauses after
  5 minutes idle, so the first query after a pause is slower. **Product photos are stored inside this
  database** (up to 2 MB each), so a few hundred photos will fill it. Move images to object storage
  (the README explains how the URLs can stay the same) before you have many real stores.
- **Expo (builds and updates):** the free plan allows 15 Android and 15 iOS builds a month in a
  low-priority queue that can wait an hour or more, a build is cancelled after 45 minutes, and over-the-air
  updates reach up to 1,000 monthly active users.

## 2. One-time setup

### 2.1 Database (Neon)

1. Create a free account at neon.com and a project. Copy the connection string (it ends in `sslmode=require`).
2. From your computer, create the tables and the first accounts:

   ```bash
   export DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
   pnpm --filter @nearcommerce/backend db:migrate
   export SEED_ADMIN_EMAIL="you@example.com" SEED_ADMIN_PASSWORD="a-long-random-password"
   pnpm --filter @nearcommerce/backend seed:admin
   ```

   `db:migrate` is safe to run any number of times: it only runs files it has not run before. (The
   extensions the schema needs, `vector`, `cube`, `earthdistance` and `pg_trgm`, are available on Neon.)

### 2.2 Redis (Upstash)

Create a free Redis database at upstash.com and copy its `rediss://...` URL.

### 2.3 API (Render)

1. At render.com choose **New → Blueprint** and pick this repository. It reads `render.yaml`.
2. Fill in the values it asks for: `DATABASE_URL` (Neon), `REDIS_URL` (Upstash), and the email settings.
   `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are generated for you. `GEMINI_API_KEY` is optional
   (without it, search falls back to plain text matching).
3. After the first deploy, note the address (for example `https://nearcommerce-api.onrender.com`). This is
   your **API URL**.
4. In the service's **Settings → Deploy Hook**, copy the hook URL. The workflow uses it to deploy only after
   the tests pass.

### 2.4 Portals (Cloudflare Pages)

1. Create a free Cloudflare account. Find your **Account ID** (right side of the dashboard home).
2. Create two Pages projects (the names become `<name>.pages.dev`):

   ```bash
   npx wrangler login
   npx wrangler pages project create nearcommerce-owner --production-branch main
   npx wrangler pages project create nearcommerce-admin --production-branch main
   ```

3. Create an API token (**My Profile → API Tokens**) with the permission **Account → Cloudflare Pages → Edit**.
4. Go back to Render and set `FRONTEND_URL` to the owner portal address
   (`https://nearcommerce-owner.pages.dev`) so email links point to it.

### 2.5 GitHub settings

In the repository: **Settings → Secrets and variables → Actions**.

**Variables**

| Name                       | Value                                                          |
| -------------------------- | -------------------------------------------------------------- |
| `API_URL`                  | your Render address                                            |
| `CLOUDFLARE_PROJECT_WEB`   | `nearcommerce-owner`                                           |
| `CLOUDFLARE_PROJECT_ADMIN` | `nearcommerce-admin`                                           |
| `DEPLOY_ENABLED`           | `true` (turn it on last; until then pushes only run the tests) |

**Secrets**

| Name                                            | Where it comes from                         |
| ----------------------------------------------- | ------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | step 2.4                                    |
| `DATABASE_URL`                                  | the Neon connection string                  |
| `RENDER_DEPLOY_HOOK_URL`                        | step 2.3                                    |
| `EXPO_TOKEN`                                    | expo.dev → Account settings → Access tokens |

### 2.6 Mobile app (Expo)

1. Create a free account at expo.dev, then on your computer:

   ```bash
   npm install -g eas-cli
   cd apps/mobile
   eas login
   eas init              # creates the project and writes its id into app.json
   eas update:configure  # adds the over-the-air update address to app.json
   ```

2. In `apps/mobile/eas.json`, replace both `https://REPLACE-WITH-YOUR-API-URL` with your API URL.
3. The app's identifier is `com.nearcommerce.app` (in `app.json`). **Change it now if you want a different
   one**: it cannot be changed after the app is on a store.
4. Commit those changes, then build the first installable app:

   ```bash
   git tag v1.0.0 && git push origin v1.0.0
   ```

   (or run `eas build --platform android --profile preview` yourself). When the build finishes, the
   workflow attaches `NearCommerce-v1.0.0.apk` to a GitHub Release. EAS creates and stores the signing key
   for you; run `eas credentials` once and download a backup of it, because every future update must use the
   same key.

5. On an Android phone, open the Release page, download the APK and install it (Android asks you to allow
   installing from that source). Optionally, **Obtainium** (a free app) can watch the Release page and
   update the app for the user.

## 3. Google Play, Apple, and the free alternatives

**Google Play is not free**, but it is cheap: a one-time US$25 registration fee, not per app and not yearly.
The catch is for personal accounts created after 13 November 2023: before you can publish to everyone,
you must run a closed test with at least 12 testers who stay opted in for 14 continuous days. Organisation
accounts are exempt. Plan on about three to four weeks the first time, and recruit the testers early
(friends and the store owners you already work with are ideal).

When you are ready: pay the fee, create the app in Play Console, run the workflow manually with the
`production` profile (this makes an `.aab` bundle), upload it to a closed-testing track, and later
`eas submit` can upload future releases for you.

**Apple** charges US$99 a year, and there is no free way to put an app on other people's iPhones. Until
then, iPhone users can use the web version, or you can test on your own iPhone for free with a
development build.

**Free ways to give Android users the app right now**

- **GitHub Releases APK (set up in this repository).** Free, no review, works on any Android phone.
  Users install from a link and must allow installs from that source.
- **Samsung Galaxy Store.** A free-to-reach alternative store on Samsung phones; check Samsung's current
  signup terms and review rules yourself, since I have not verified them.
- **F-Droid.** Free, but only accepts open-source apps built from public source with no proprietary
  services; check that your licence and dependencies qualify before investing time.
- **Amazon Appstore:** no longer an option on regular Android phones. Amazon shut it down for Android on
  20 August 2025 (it remains only on Fire tablets and Fire TV).

## 4. How updates reach people after launch

| You change                                                                          | What happens when you push to `main`                                                                                                                                            |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Portals (`apps/web`, `apps/admin`, `packages/ui`...)                                | Tests, build, publish to Cloudflare Pages: live in about a minute                                                                                                               |
| API (`apps/backend`)                                                                | Tests, database migration, Render redeploys                                                                                                                                     |
| Mobile screens, logic, styles (JavaScript only)                                     | Tests, then an over-the-air update: installed apps get it the next time they are opened                                                                                         |
| Mobile **native** changes (new native library, `app.json` plugins, new permissions) | Over-the-air updates cannot carry these. Bump `version` in `app.json`, push a new `v*` tag to build a new APK. Phones on the old version keep working with their old JavaScript |

`app.json` uses `"runtimeVersion": {"policy": "appVersion"}`, which is what keeps a JavaScript update from
reaching an app whose native part is too old for it.

## 5. Before real shoppers use it

- Use strong `JWT_*` secrets (Render generates them for you) and never commit a `.env` file.
- The API currently accepts requests from any website (`cors({ origin: true })` in `apps/backend/src/app.ts`).
  Restrict it to your two portal addresses once they are live.
- Set up a real email provider (`SMTP_*`): password-reset emails will not send without one (there are no verification emails).
- Keep `main` protected so only code whose tests pass can be merged.
