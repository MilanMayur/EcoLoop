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

1. Copy `.env.example` to `.env.local` and add the project URL and anon key. A modern Supabase publishable key is also supported.
2. Run the SQL files in `supabase/migrations` in filename order in the Supabase SQL editor.
3. In Supabase Auth, enable Email authentication and configure the application Site URL.
4. Install dependencies with `pnpm install`.
5. Start the application with `pnpm dev`.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## First administrator

Create the first BBMP account through signup, then approve it once from the Supabase SQL editor:

```sql
update public.profiles
set role = 'admin', approval_status = 'approved', approved_at = now()
where email = 'your-bbmp-email@example.com';
```

Later administrator approvals should use the `review_profile` database function supplied by the migration.

## Languages

EcoLoop supports English (`en`), Kannada (`kn`), and Hindi (`hi`). The language selector is available on public, authentication, and dashboard screens. The preference is stored in the `ecoloop-language` browser cookie and, for signed-in users, in `profiles.preferred_language`.

After updating an existing Supabase project, run [`supabase/migrations/202607180001_add_profile_language.sql`](supabase/migrations/202607180001_add_profile_language.sql) before testing signed-in language persistence.

For the fill-level pickup workflow and photo storage, then run [`supabase/migrations/202607180002_real_world_pickups.sql`](supabase/migrations/202607180002_real_world_pickups.sql). It migrates legacy weights, creates the `pickup-images` Storage bucket, and installs the updated pickup status function.

Finally, run [`supabase/migrations/202607180003_supabase_auth_profiles.sql`](supabase/migrations/202607180003_supabase_auth_profiles.sql) for profile fields, signup profile creation, and the `profile-images` Storage bucket. Add `http://localhost:3000/login` and the production `/login` URL to Supabase Auth redirect URLs so email verification and password recovery return to EcoLoop.

## Motto

**Small Stock. Zero Waste. Smart Market.**
