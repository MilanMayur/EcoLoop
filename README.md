# EcoLoop

EcoLoop is a civic-tech circular-waste platform for vendors, authorised recycling partners, and BBMP operations.

## Architecture

- Next.js 16, React 19, TypeScript, and Tailwind CSS
- Supabase Auth for signup, login, sessions, and email confirmation
- Supabase Postgres queried directly from the browser
- Row Level Security for vendor, recycler, and admin authorization
- Postgres RPC functions for atomic or privileged actions
- No n8n workflow server and no custom API gateway

The browser uses only the Supabase URL and publishable key. Never add a secret or service-role key to a `NEXT_PUBLIC_` environment variable.

## Local setup

1. Copy `.env.example` to `.env.local` and add the project URL and publishable key.
2. Run [`supabase/migrations/202607170001_ecoloop_frontend_backend.sql`](supabase/migrations/202607170001_ecoloop_frontend_backend.sql) in the Supabase SQL editor.
3. In Supabase Auth, enable Email authentication and configure the application Site URL.
4. Install dependencies with `pnpm install`.
5. Start the application with `pnpm dev`.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

## First administrator

Create the first BBMP account through signup, then approve it once from the Supabase SQL editor:

```sql
update public.profiles
set role = 'admin', approval_status = 'approved', approved_at = now()
where email = 'your-bbmp-email@example.com';
```

Later administrator approvals should use the `review_profile` database function supplied by the migration.

## Motto

**Small Stock. Zero Waste. Smart Market.**
