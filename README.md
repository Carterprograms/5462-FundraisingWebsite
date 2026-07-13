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

## Login & Accounts

The site now requires an account to view or edit anything — nobody can see
sponsor data or make changes without logging in first.

**How it works:**
- Everyone has their own username and password (never shared).
- Every business/call add and edit is tagged with who did it.
- **Members** can add and edit businesses and calls, but **cannot delete**
  anything. **Admins** can do everything, including deleting entries and
  changing the Google Sheet sync URL. This is the main protection against
  sabotage — deleting things is the one action locked to trusted people.
- The **first account ever created** on a fresh board automatically becomes
  admin. Everyone who signs up after that becomes a regular member.
- New accounts require a **team invite code** — set your own in the SQL
  schema (see below) and only share it with your actual team.

**One-time setup after running the schema:**

1. Open `supabase-schema.sql` and find this line near the bottom:
   ```sql
   insert into settings (key, value) values ('inviteCode', 'change-me')
   ```
   Change `'change-me'` to whatever invite code you want to give your team,
   *before* running the SQL in Supabase.
2. Generate a `JWT_SECRET` (see `.env.example` for the exact command) and
   add it to your `.env` file locally, and to Render's environment
   variables when you deploy.
3. Sign up as the first user — that account becomes admin automatically.
   Share the invite code with the rest of the team so they can sign up too
   (they'll all be regular members).

**Promoting someone else to admin:** there's no UI for this yet — open
Supabase's Table Editor, find the `users` table, and change that person's
`role` from `member` to `admin` directly.

**Changing the invite code later:** update the `settings` table in Supabase
directly (the row where `key = 'inviteCode'`), or re-run the insert line
from the schema with `on conflict (key) do update set value = '...'`
instead of `do nothing`.

## Google Sheet Sync

This is a **shared setting for the whole team**, stored in your Supabase
database (a small `settings` table) — not per-browser. Whoever sets it up
first does so once, in the "Google Sheet Sync" panel in the app, and every
add and delete from anyone on the team syncs automatically from then on.
The actual sync request is sent by the server itself, not by each person's
browser, which is what makes it consistent for everyone.
