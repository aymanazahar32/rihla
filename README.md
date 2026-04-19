# Rihla

Vite/React frontend for rides to events, masjids, and errands, backed directly by Supabase.

## Run

Frontend:

```bash
cd frontend
npm run dev
```

## Supabase Setup

- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `frontend/.env`.
- Run [frontend/supabase-schema.sql](/home/ayman/rihla/rihla/frontend/supabase-schema.sql:1) in your Supabase SQL editor before using the app.
- The frontend talks directly to Supabase for auth and data.
