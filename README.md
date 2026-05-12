# Aslams ERP/POS (Next.js)

Internal dashboard: inventory, POS shell, accounts, settings, **Roles & access**, etc. Uses **Next.js 16** (App Router) and **Better Auth** with a MongoDB adapter. Auth API routes live under **`/api/auth/*`** in this app (not on the Express backend).

## Documentation

- **Production env (ERP + server `.env`):** [../docs/production-configuration.md](../docs/production-configuration.md#erp-app--server-env-at-do_deploy_pathenv)
- **Deploy:** [../docs/deployment.md](../docs/deployment.md)
- **RBAC UI:** [../docs/roles-and-sections.md](../docs/roles-and-sections.md)

## Local development

```bash
cd erp-app
npm install
# Create .env — see ../.env.erp-app.prod.example for variable names (use localhost URLs)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables (summary)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Express API base URL ending in `/api` (axios in `src/lib/api.ts`). |
| `MONGO_URI` | MongoDB (shared with backend / Better Auth). |
| `BETTER_AUTH_SECRET` | Must match backend `BETTER_AUTH_SECRET`. |
| `BETTER_AUTH_URL` | Public URL of this ERP app. |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Optional; defaults to `window.location.origin` in the browser. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional Google OAuth. |

## Docker

Image is built from `Dockerfile` in this directory; production compose file is `../docker-compose.erp-app.prod.yml`.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Next dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server (port from `PORT` or default) |
| `npm run lint` | ESLint (`eslint .`, Next 16 has no `next lint`) |
