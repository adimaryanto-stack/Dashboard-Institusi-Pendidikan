<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Supabase Backend

This project uses [Supabase](https://supabase.com) as its cloud Postgres database, authentication, and realtime backend.

- **Project:** Dashboard Institusi Pendidikan
- **Database:** Supabase (PostgreSQL) with Row Level Security (RLS)
- **Credentials:** App code reads keys from `.env` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Never hardcode or commit secret keys.

Key patterns:

- Database inserts take an array: `insert([{ ... }])`.
- Use `@supabase/supabase-js` client initialized in `lib/supabase.ts`.
- State management via Zustand store in `lib/store.ts`.
