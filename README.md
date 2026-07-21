# EcoLoop

EcoLoop is an AI-assisted civic-tech platform connecting market vendors, authorised recycling partners, drivers, and BBMP operations in one circular-waste workflow.

> **Small Stock. Zero Waste. Smart Market.**

## Features

- **Vendors:** smart stock, fill-level pickup requests, photo uploads, status tracking, and sustainability insights.
- **Recycling partners:** driver and fleet management, batched assignments, live collection monitoring, and facility delivery.
- **Drivers:** assigned jobs, live location, collection stages, actual-weight recording, and vehicle unloading.
- **BBMP:** market, pickup, partner, analytics, report, tracking, and Help Centre oversight.
- **AI Copilot:** inventory analysis, recommendations, explanations, reports, and contextual chat through a secure server route.
- **Languages:** English, Kannada, and Hindi on public, authentication, and dashboard screens.

## Technology

- Next.js 16, React 19, TypeScript, and Tailwind CSS
- Supabase Auth, Postgres, Storage, Realtime, RPC functions, and Row Level Security
- Leaflet for live pickup and driver tracking
- OpenAI through a server-only Next.js API route

The frontend connects directly to Supabase for authorized application data. Sensitive operations, including driver invitations and AI requests, use server-side routes. There is no n8n backend.

## Local setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Server-only: driver invitations
SUPABASE_SERVICE_ROLE_KEY=

# Server-only: AI features
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6
```

A Supabase publishable key can be used as `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never put the service-role or OpenAI key in a `NEXT_PUBLIC_` variable, commit `.env.local`, or expose either key in browser code.

### 3. Apply the Supabase schema

In **Supabase Dashboard → SQL Editor**, run every file in [`supabase/migrations`](supabase/migrations) in filename order:

| Migration | Purpose |
| --- | --- |
| `202607170001_ecoloop_frontend_backend.sql` | Core profiles, markets, inventory, pickups, notifications, analytics, policies, and functions |
| `202607180001_add_profile_language.sql` | Saved language preference |
| `202607180002_real_world_pickups.sql` | Fill levels, actual weights, pickup photos, and Storage |
| `202607180003_supabase_auth_profiles.sql` | Auth profiles, signup fields, and profile-image Storage |
| `202607180004_sync_profile_email.sql` | Profile email synchronization |
| `202607200001_driver_enums.sql` | Driver workflow enum values |
| `202607200002_smart_driver_assignment.sql` | Drivers, batching, automatic assignment, and workflow RPCs |
| `202607200003_pickup_status_compatibility.sql` | Pickup status compatibility for existing projects |
| `202607200004_link_vendor_markets.sql` | Vendor-to-market linking and data backfill |
| `202607200005_live_driver_tracking.sql` | Realtime driver locations and access policies |
| `202607200006_assignment_operating_hours.sql` | Assignment hours: 06:00–21:00 Asia/Kolkata |
| `202607200007_support_requests.sql` | Help Centre requests and BBMP-only support access |
| `202607200008_vehicle_load_lifecycle.sql` | Reserved/collected loads and facility unloading |
| `202607210001_role_based_pickup_cancellation.sql` | Role-based cancellation, audit logging, notifications, and assignment release |
| `202607210002_standard_bin_weight_estimates.sql` | Supported fill levels and editable 120 kg-bin collection estimates |

Migrations are incremental. Existing projects should run only pending files while preserving this order.

#### Help Centre setup

If EcoLoop displays **“Help Centre is not configured in Supabase”**, run the complete [`202607200007_support_requests.sql`](supabase/migrations/202607200007_support_requests.sql) file, then run `202607200008_vehicle_load_lifecycle.sql` if it is pending and refresh the application.

The support migration creates `support_requests`, its request-creation function, indexes, grants, and Row Level Security policies. Signed-in users can create and view their own requests; approved BBMP administrators can view and manage all requests.

### 4. Configure Supabase Auth

Enable Email authentication, configure the Site URL, and add these redirect URLs plus their production equivalents:

```text
http://localhost:3000/login
http://localhost:3000/signup
```

Supabase handles email verification and password-reset messages.

### 5. Run on port 3000

```bash
pnpm dev -- --port 3000
```

Open [http://localhost:3000](http://localhost:3000).

## First BBMP administrator

Create the first BBMP account through signup, then approve it once in the SQL Editor:

```sql
update public.profiles
set role = 'admin',
    approval_status = 'approved',
    approved_at = now()
where email = 'your-bbmp-email@example.com';
```

Use the migration-provided `review_profile` function for later approvals.

## Pickup and vehicle-load lifecycle

```text
Vendor request
  → batching window
  → automatic assignment during operating hours
  → driver starts and arrives
  → actual weight becomes collected vehicle load
  → driver continues until capacity is reached
  → load is delivered to a destination facility
  → current vehicle load returns to available capacity
```

Vendor fill level is for planning only. Waste analytics use recycler-recorded **actual weight**, never a vendor estimate.

## Commands

```bash
pnpm dev -- --port 3000  # Development server
pnpm lint                # ESLint
pnpm build               # Production build and type checking
pnpm start               # Run the production build
```

## Security

- Browser code uses only the Supabase URL and publishable/anon key.
- Row Level Security and scoped RPC functions enforce database authorization.
- Service-role and OpenAI keys remain server-only.
- Pickup and completion photos live in Supabase Storage; database rows store URLs.
- AI input is validated and provider requests pass through `/api/ai`.
