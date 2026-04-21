# Rihla — Muslim Community Carpool App

A carpool platform built for the Muslim community. Rihla connects riders and drivers for trips to masjids, MSA events, and community errands — think Uber, but built around the ummah.

Built for a Muslim hackathon by **Ayman Azahar** and **Omar Medhat**.

---

## Features

- **Ride matching** — Drivers post rides, riders request seats. Matched by context (masjid, event, errand), location, and gender preference.
- **Live GPS tracking** — Drivers share real-time location during a ride. Riders see a live map with ETA and progress.
- **Salah finder** — Find nearby masjids sorted by distance, with drive time estimates and today's prayer times.
- **Events & Errands** — Browse community events and errands. Organizations can post events directly.
- **Natural language ride creation** — Type or speak naturally ("going to Jumu'ah at ICA tonight") and the app fills in the form using AI.
- **Friends system** — Add friends by name search or invite link. Built for trust-based carpooling.
- **Gender visibility policy** — Riders and drivers only see same-gender matches, respecting Islamic preferences.
- **In-ride chat** — Messaging between driver and passengers on each ride.

---

## Tech Stack

| Layer | Library |
|-------|---------|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Router | Wouter |
| Server state | TanStack React Query v5 |
| Database + Auth | Supabase (Postgres + Auth + Realtime) |
| Maps | Google Maps JS API v2 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Forms | react-hook-form + zod |
| AI | Claude (via Supabase Edge Function) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project
- A Google Maps API key (Maps, Places, Geocoding, Directions APIs enabled)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/aymanazahar32/rihla.git
cd rihla/frontend

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env
# Fill in your keys (see Environment Variables below)

# 4. Set up the database
# Run frontend/supabase-schema.sql in your Supabase SQL Editor
# Then run frontend/add-friendships.sql for the friends feature

# 5. Start the dev server
npm run dev
# App runs at http://localhost:5173
```

### Environment Variables

Create a `.env` file in `frontend/` with:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

Find your Supabase values at: **Supabase Dashboard → Project → Settings → API**

---

## User Roles

| Role | Description |
|------|-------------|
| **Rider** | Books seats on rides. Requires gender, age, university, and student ID. |
| **Driver** | Posts rides and uses live GPS mode. Requires car details and driver's license. |
| **Organization** | Posts community events. MSA chapters, masjids, community orgs. |

Users register with a `.edu` email and choose their role during profile setup. Drivers can also upgrade from the account menu.

---

## Project Structure

```
rihla/
├── frontend/
│   ├── src/
│   │   ├── pages/          # One file per route
│   │   ├── components/     # Shared UI components
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # API client, Supabase, Maps, utilities
│   ├── supabase-schema.sql # Main DB schema — run in Supabase SQL Editor
│   └── add-friendships.sql # Friends feature schema
└── supabase/
    └── functions/
        └── parse-ride-intent/  # Edge function for AI ride parsing
```

---

## Database Setup

Run these SQL files in order in your **Supabase SQL Editor**:

1. `frontend/supabase-schema.sql` — main schema (profiles, rides, events, masjids, errands)
2. `frontend/add-friendships.sql` — friends and invite tokens

After running the schema, enable Realtime for live driver tracking:
```sql
alter table rides replica identity full;
alter publication supabase_realtime add table rides;
```

---

## Contributing

This project uses a branch-per-contributor workflow.

```bash
# Create your branch
git checkout -b your_name_branch

# Make changes, then commit
git add .
git commit -m "feat: your feature" -m "- bullet point description"

# Push
git push -u origin your_name_branch
```

Open a pull request into `main` when ready for review.
