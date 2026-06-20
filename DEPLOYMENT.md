# Deploying the Inventory Management System

Stack: **Neon** (PostgreSQL) · **Render** (API) · **Vercel** (web app). All free tiers.

Deploy in this order — each step produces a URL the next step needs.

---

## 1. Database — Neon (~3 min)

1. Sign up at https://neon.tech → **New Project**.
2. Copy the **connection string** (it looks like
   `postgresql://USER:PASSWORD@ep-xxx.aws.neon.tech/neondb?sslmode=require`).
3. Keep it handy — it's your `DATABASE_URL`.

> Neon's free tier is plenty for this app. `sslmode=require` is already in the string.

---

## 2. Backend API — Render (~5 min)

This repo includes [`render.yaml`](./render.yaml), so Render configures itself.

1. Push this repo to GitHub (already done).
2. Render → **New + → Blueprint** → connect `inventory-management-backend`.
3. Render reads `render.yaml` and asks for the two secrets:
   - **DATABASE_URL** → paste the Neon string from step 1.
   - **CORS_ORIGIN** → put a placeholder for now (e.g. `*`); you'll tighten it in step 4.
   - `JWT_SECRET` is generated automatically.
4. Click **Apply**. Render runs:
   - build: `npm install --include=dev && npx prisma generate && npm run build`
   - start: `npx prisma migrate deploy && node dist/server.js`  ← migrations auto-apply
5. When live, note the URL, e.g. `https://ims-backend-xxxx.onrender.com`.
   Verify: open `https://ims-backend-xxxx.onrender.com/api/health` → `{"success":true,...}`.

**Seed demo data (optional, once):** Render → your service → **Shell** →
```bash
npm run db:seed
```
Gives you `admin@ims.dev / admin123` and sample products.

> Free Render services sleep after ~15 min idle; the first request then takes ~50s to wake. Fine for a demo.

---

## 3. Frontend — Vercel (~5 min)

This repo includes [`vercel.json`](../frontend/vercel.json) (Vite preset + SPA routing).

1. Vercel → **Add New → Project** → import `inventory-management-frontend`.
2. Framework preset: **Vite** (auto-detected).
3. **Environment Variables** → add:
   - `VITE_API_URL` = `https://ims-backend-xxxx.onrender.com/api`  ← your Render URL + `/api`
4. **Deploy**. You'll get `https://your-app.vercel.app`.

> `VITE_API_URL` is baked in at build time. If you change it later, redeploy.

---

## 4. Wire CORS (~1 min)

1. Render → backend → **Environment** → set
   `CORS_ORIGIN` = `https://your-app.vercel.app` (your real Vercel URL).
2. Save → Render redeploys automatically.

Done. Open the Vercel URL and sign in.

---

## Environment variables reference

### Backend (Render)
| Key | Value |
| --- | --- |
| `DATABASE_URL` | Neon connection string (`…?sslmode=require`) |
| `JWT_SECRET` | long random string (Render auto-generates) |
| `JWT_EXPIRES_IN` | `7d` |
| `CORS_ORIGIN` | your Vercel URL (comma-separate multiple) |
| `NODE_ENV` | `production` |

### Frontend (Vercel)
| Key | Value |
| --- | --- |
| `VITE_API_URL` | `https://<render-app>.onrender.com/api` |

---

## Troubleshooting

- **CORS error in browser** → `CORS_ORIGIN` on Render must exactly match the Vercel origin (no trailing slash).
- **Login 404 / calls hit the Vercel domain** → `VITE_API_URL` missing at build time; set it and redeploy the frontend.
- **500 "database does not exist" / table errors** → migrations didn't run; check the Render deploy log for `prisma migrate deploy`.
- **First request hangs ~50s** → Render free tier cold start; subsequent requests are fast.
