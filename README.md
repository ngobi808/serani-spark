# Serani Spark — Wholesale Ordering MVP

A B2B wholesale ordering platform: catalogue → cart → guest checkout → M-Pesa STK Push → paid order → WhatsApp-coordinated delivery.

## Structure

```
serani-spark/
├── backend/       Node + Express + TypeScript API
├── frontend/      React + Vite storefront
├── database/      PostgreSQL migrations (run in order, 000 → 007)
└── shared/        TypeScript types shared by both frontend and backend
```

## Recommended environment (works fine on a slow computer)

You do not need to install Postgres, Docker, or run anything heavy locally.

1. **Database**: Create a free project on [Neon](https://neon.tech) or [Supabase](https://supabase.com). Copy the connection string.
2. **Code editor**: Open this repo in [GitHub Codespaces](https://github.com/features/codespaces) (free 60 hrs/month) or Gitpod. Your browser does the work, not your laptop.
3. **Backend hosting**: [Railway](https://railway.app) or [Render](https://render.com) — connect your GitHub repo, point it at `/backend`.
4. **Frontend hosting**: [Vercel](https://vercel.com) or [Netlify](https://netlify.com) — point it at `/frontend`.

## Local setup (if you do work locally)

### 1. Database
```bash
cd backend
cp .env.example .env      # fill in DATABASE_URL from Neon/Supabase
npm install
npm run migrate           # applies database/migrations/*.sql in order
```

### 2. Backend
```bash
cd backend
npm run dev                # http://localhost:4000
```

Create your first admin user manually (no signup endpoint by design):
```sql
-- run this in your Postgres console, with a bcrypt hash of your chosen password
INSERT INTO admin_users (email, password_hash, full_name)
VALUES ('admin@seranispark.co.ke', '<bcrypt-hash>', 'Admin');
```
You can generate a bcrypt hash quickly with `node -e "console.log(require('bcryptjs').hashSync('yourpassword', 10))"` from inside `backend/`.

### 3. Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev                # http://localhost:5173
```

## What's implemented vs. stubbed

**Fully implemented:**
- Product catalogue with search, public/admin field separation (cost price never leaves the backend)
- Cart with MOQ + stock enforcement (client-side UX + server-side source of truth)
- Guest checkout, order creation with server-side price lookups (never trusts frontend prices)
- Stock reservation system (reserve → commit on paid / release on failure or 10-min expiry)
- M-Pesa STK Push initiation + idempotent callback handling
- M-Pesa transaction ceiling check → routes large orders to WhatsApp instead of split payments
- Admin login (JWT), dashboard metrics, product CRUD, order management
- WhatsApp deep links with prefilled order reference

**Needs your input before launch:**
- Real product catalogue, prices, images, stock counts, cost prices (`data_to_confirm_before_launch` in the original spec)
- Daraja sandbox → production credentials in `backend/.env`
- A cron or scheduled call to release expired reservations proactively (currently released lazily on the next checkout attempt — fine for MVP volume, but add `releaseExpiredReservations` as a scheduled job before scaling)
- Admin panel frontend UI (backend API is ready; only the customer storefront UI is built here — see Phase 4 in the timeline)
- Basic input validation hardening with `zod` schemas (dependency is included, not yet wired into every route)

## Deploying

1. Push this repo to GitHub.
2. Railway/Render: new project → deploy `backend/` → set all env vars from `.env.example` → run `npm run migrate` once, then `npm start`.
3. Vercel/Netlify: new project → deploy `frontend/` → set `VITE_API_BASE_URL` to your deployed backend URL + `/api`.
4. Update `MPESA_CALLBACK_URL` in the backend env to point at your live backend domain, and re-register it with Daraja if needed.
5. Point your real domain at the frontend deployment; HTTPS is automatic on both Vercel and Railway/Render.

## Security notes already baked in
- `cost_price_kes` is never returned by any `/api/products*` public endpoint
- Payment status is only ever set from the verified Daraja callback, never from frontend state
- Admin routes require a valid JWT (`requireAdmin` middleware)
- Login and STK-push endpoints are rate-limited
- `helmet` + CORS restricted to `FRONTEND_ORIGIN`
- All SQL uses parameterised queries
