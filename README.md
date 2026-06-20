# Inventory Management System — Backend API

REST API for the Inventory Management System, built with **Node.js, Express, TypeScript, Prisma & PostgreSQL**.

## ✨ Features

- 🔐 **JWT authentication** with role-based access control (`ADMIN`, `STAFF`)
- 📦 **Products** — full CRUD with search, category/supplier filters, low-stock filter, sorting & pagination
- 🗂️ **Categories** & 🏭 **Suppliers** — full CRUD
- 🔁 **Stock movements** — `IN` / `OUT` / `ADJUSTMENT` with atomic quantity updates (transactions) and full history
- 📊 **Dashboard stats** — totals, inventory value, low-stock alerts, recent activity
- ✅ Request validation with **Zod**, centralized error handling, Helmet, CORS, rate-limiting

## 🛠️ Tech Stack

| Concern        | Choice                          |
| -------------- | ------------------------------- |
| Runtime        | Node.js 20                      |
| Framework      | Express 4 + TypeScript          |
| ORM / DB       | Prisma + PostgreSQL             |
| Auth           | JWT (`jsonwebtoken`) + bcryptjs |
| Validation     | Zod                             |

## 🚀 Getting Started (local)

```bash
# 1. Install deps
npm install

# 2. Configure environment
cp .env.example .env
#   -> set DATABASE_URL and JWT_SECRET

# 3. Apply the schema + generate the client
npm run prisma:migrate      # creates tables (dev)
npm run prisma:generate

# 4. (optional) Seed demo data
npm run db:seed

# 5. Start the dev server
npm run dev                 # http://localhost:4000
```

### Demo accounts (after seeding)

| Role  | Email          | Password   |
| ----- | -------------- | ---------- |
| Admin | admin@ims.dev  | admin123   |
| Staff | staff@ims.dev  | staff123   |

## 🐳 Docker

A production image is provided. See the root [`docker-compose.yml`](../docker-compose.yml) to run the API + PostgreSQL together.

```bash
# build just the API image
docker build -t ims-backend .
```

The container entrypoint runs `prisma migrate deploy` on startup and seeds when `RUN_SEED=true`.

## 📚 API Reference

Base URL: `http://localhost:4000/api`

All responses share the shape `{ success: boolean, data?, message?, meta? }`.
Protected routes require an `Authorization: Bearer <token>` header.

### Auth
| Method | Endpoint         | Body                          | Auth |
| ------ | ---------------- | ----------------------------- | ---- |
| POST   | `/auth/register` | `{ name, email, password }`   | —    |
| POST   | `/auth/login`    | `{ email, password }`         | —    |
| GET    | `/auth/me`       | —                             | ✅   |

### Products
| Method | Endpoint         | Notes                                                             | Auth      |
| ------ | ---------------- | ---------------------------------------------------------------- | --------- |
| GET    | `/products`      | `?search=&categoryId=&supplierId=&lowStock=true&sortBy=&order=&page=&limit=` | ✅ |
| GET    | `/products/:id`  | includes recent movements                                        | ✅        |
| POST   | `/products`      | create                                                            | ✅        |
| PUT    | `/products/:id`  | update                                                            | ✅        |
| DELETE | `/products/:id`  | delete                                                            | ✅ ADMIN  |

### Categories — `/categories` · Suppliers — `/suppliers`
Standard CRUD (`GET` list, `GET /:id`, `POST`, `PUT /:id`, `DELETE /:id`). Delete requires **ADMIN**.

### Stock Movements
| Method | Endpoint            | Body / Query                                  | Auth |
| ------ | ------------------- | --------------------------------------------- | ---- |
| GET    | `/stock-movements`  | `?productId=&type=&page=&limit=`              | ✅   |
| POST   | `/stock-movements`  | `{ productId, type: IN\|OUT\|ADJUSTMENT, quantity, note? }` | ✅ |

### Dashboard
| Method | Endpoint            | Auth |
| ------ | ------------------- | ---- |
| GET    | `/dashboard/stats`  | ✅   |

### Health
`GET /api/health` → `{ success: true, status: "ok" }`

## 📁 Project Structure

```
src/
├── config/         # env + prisma client
├── middleware/     # auth, validation, error handling
├── modules/        # feature modules (auth, product, category, supplier, stock, dashboard)
│   └── <module>/   # .controller.ts · .routes.ts · .schema.ts
├── routes/         # route aggregator
├── utils/          # ApiError, asyncHandler, jwt
├── app.ts          # express app factory
└── server.ts       # bootstrap
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
```
