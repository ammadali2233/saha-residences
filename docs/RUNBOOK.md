# Runbook

## Local development
1. Install Node.js 24 LTS, Git and Docker Desktop. Docker must be running.
2. `npm ci`
3. `npx supabase start`. This starts Postgres, Auth, Storage and Studio (http://127.0.0.1:54323) on your machine.
4. Copy `.dev.vars.example` to `.dev.vars` and fill it in from `npx supabase status`. Pick an `ADMIN_PASSWORD` of 15+ characters.
5. `npx supabase db reset` applies every migration plus the sample data in `supabase/seed.sql`.
6. `npm run admin:create` creates your admin login. Public sign-up is off.
7. `npm run dev` starts the site at http://localhost:4321. Sign in at `/admin/login/` and scan the QR code with an authenticator app.

## Checks (quality gates)
| Command | What it proves |
|---|---|
| `npm run build` | Tokens are generated, types are checked, and the site builds with zero errors and warnings |
| `npm test` | Unit tests (tokens now; finance and sync in later phases) |
| `npx supabase test db` | The pgTAP roles-and-permissions matrix (`supabase/tests/`) |
| `npm run test:e2e` | Playwright + axe at 360, 768 and 1440px. Needs `npm run dev` running or startable. |
| `npm run test:auth` | Login, MFA enrollment, wrong-code handling, sign-out. Needs local Supabase and the dev server. |
| `npm run backup:drill` | Dumps local data, rebuilds the database from migrations, restores, and compares row counts |

## Backups and restore
Production backups run nightly at 02:00 PKT (`.github/workflows/backup.yml`).
- Each backup holds roles, schema and data (`public` + `auth` schemas), plus `counts.json`.
- It's encrypted with AES-256 (`BACKUP_PASSPHRASE`) and uploaded to Cloudflare R2 as `db/saha-<timestamp>.tar.gz.gpg` and `db/latest.tar.gz.gpg`.
- Each run pings Healthchecks.io, which alerts you if backups stop. GitHub also emails on any failed run.
- On the 1st of each month, `.github/workflows/restore-drill.yml` restores `latest` onto a fresh database built from our migrations and fails if any row count differs.

**Restoring production after data loss**
1. Download the backup you need from R2. Decrypt it with `gpg -d saha-<timestamp>.tar.gz.gpg > backup.tar.gz`, then run `tar -xzf backup.tar.gz`.
2. Create a new Supabase project, or use the existing one if it's healthy. Link it and run `npx supabase db push` to apply our migrations.
3. Load the data with triggers off: `psql "$DB_URL" --single-transaction -v ON_ERROR_STOP=1 -c "set session_replication_role = replica" -f data.sql`.
4. Compare row counts with `counts.json`. Then sign in. Logins and authenticator factors are restored from the `auth` schema.
5. Point the Worker secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) at the restored project if it changed.

Receipts and photos in Supabase Storage are backed up as files from Phase 5 on. They aren't part of the database dump.

## Staging (live since 2026-10-18)
- Site: https://saha-staging.ammadali33.workers.dev. Worker `saha-staging` on the `ammadali33` Cloudflare account.
- Database: Supabase project `xzgwjrlapwwovltzcfdr`, linked with `npx supabase link --project-ref xzgwjrlapwwovltzcfdr`.
- Worker secrets: `SUPABASE_URL` and `SUPABASE_ANON_KEY` (the publishable key, `sb_publishable_...`).
- Deploy (bash):
  ```bash
  CLOUDFLARE_ENV=staging SITE_URL=https://saha-staging.ammadali33.workers.dev npm run build && npx wrangler deploy
  ```
- Push new migrations: `npx supabase db push`. Add `--include-seed` only when staging should get sample data.
- Check permissions on staging: `npx supabase test db --linked`. It runs in a transaction that rolls back.
- Admin login: created with `node --env-file=.env.staging-admin scripts/create-admin.mjs`. That file holds the Supabase **secret** key, so delete it once the admin exists.

## Setting up staging and production (accounts you create)
These need your own accounts. I can't create them for you.
1. **Supabase:** two projects, `saha-staging` and `saha-prod`, region closest to Pakistan (e.g. Mumbai). Turn on TOTP MFA, turn off public sign-ups, and set the minimum password length to 15.
2. **Cloudflare:** Workers (`saha-staging`, `saha`), an R2 bucket for backups, Web Analytics. Put Access in front of staging.
3. **GitHub:** a private repository. Add the Actions secrets: `PROD_DB_URL`, `BACKUP_PASSPHRASE`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_BUCKET`, `HC_BACKUP_URL`, `HC_DRILL_URL`.
4. **Healthchecks.io:** two checks, nightly backup (daily) and restore drill (monthly).

Secrets live only in Worker secrets (`npx wrangler secret put SUPABASE_URL`, etc.) and GitHub Actions secrets. They never go in the repo.
