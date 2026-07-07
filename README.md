# FRC 5462 — Sponsor Call Board (Node/Express + Supabase)

A small full-stack app: Express API backed by Supabase (free, hosted Postgres),
serving the sponsor call tracker frontend. Data lives in the cloud, so it's
safe across restarts and redeploys — and this setup can run entirely free.

## Project layout

```
frc5462-backend/
  server.js          # Express app + REST routes
  db.js              # data access layer (talks to Supabase)
  supabase-schema.sql # SQL to create the two tables — run once in Supabase
  .env.example        # copy to .env and fill in your real values
  package.json
  public/index.html   # the frontend (talks to /api/... routes)
```

## Step 1 — Create your free Supabase project

1. Go to https://supabase.com, sign up (free), and create a new project.
2. Once it's created, open the **SQL Editor** (left sidebar) → New query.
3. Paste in everything from `supabase-schema.sql` in this folder, and click
   **Run**. This creates the `businesses` and `calls` tables.
4. Go to **Project Settings → API**. You'll need two values from this page:
   - **Project URL** (looks like `https://xxxxxxxx.supabase.co`)
   - **anon public** key (a long string under "Project API keys")

## Step 2 — Run it locally

```bash
cd frc5462-backend
npm install
cp .env.example .env
```

Open `.env` and paste in your real Project URL and anon key from Step 1.
Then:

```bash
node server.js
```

Open **http://localhost:3000** — add a test business and confirm it shows up
in Supabase's **Table Editor** under the `businesses` table.

## Step 3 — Deploy for free on Render

1. Push this folder to a GitHub repository (Render deploys from Git).
2. Go to https://render.com, sign up free, click **New → Web Service**,
   and connect your repo.
3. Render should auto-detect Node. Set:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
4. Under **Environment**, add the same two variables from your `.env` file:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
5. Deploy. Render gives you a live URL (like `https://frc5462.onrender.com`)
   — that's what you share with your team.

### About Render's free tier

Free web services spin down after about 15 minutes of no traffic, so the
*first* request after a quiet period takes up to a minute to wake back up
— after that it's normal speed. Since none of your data lives on Render's
own disk (it's all in Supabase), this spin-down is harmless: nothing is
lost, it just takes a moment to wake up. That's the tradeoff for $0/month.

If that cold-start delay ever bothers your team, Render's paid Starter tier
($7/month) removes it — but you don't need to decide that now.

## API

| Method | Route              | Body                                                              |
|--------|--------------------|--------------------------------------------------------------------|
| GET    | /api/businesses    | —                                                                   |
| POST   | /api/businesses    | `{ name, contact, phone, email, notes }`                            |
| DELETE | /api/businesses/:id| —                                                                   |
| GET    | /api/calls         | —                                                                   |
| POST   | /api/calls         | `{ businessId, caller, date, outcome, amount, notes }`              |
| DELETE | /api/calls/:id     | —                                                                   |

## Why Supabase instead of the file-based database from before

The earlier version of this project stored data in a local JSON file, which
works fine on your own machine but doesn't survive on free hosting — free
tiers on Render (and most others) reset the filesystem on restart, so that
data would quietly disappear. Supabase's free Postgres tier is a real
persistent database, hosted outside your app, so it survives restarts,
redeploys, and even switching hosting providers entirely.

## Google Sheet Sync

The frontend still has the optional Google Sheet sync panel built in — that
part is unchanged and works independently of the database.
