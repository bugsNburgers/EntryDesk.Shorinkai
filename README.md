# EntryDesk

EntryDesk is a role-based event management dashboard tailored for martial arts and sports events. It streamlines the process of organizing tournaments, managing student rosters, and processing event registrations.

## 🌟 Key Features

### For Organizers
- **Event Management**: Create and manage public or private events.
- **Application Review**: Approve or reject coach applications per event.
- **Entry Management**: View all entries via the dedicated `organizer_entries_view`.
- **Export Capabilities**: Easily export event entries to Excel/CSV.
- **Analytics Dashboard**: Clickable metric cards that deep-link into filtered views for quick insights.

### For Coaches
- **Dojo & Student Roster**: Manage your dojo's information and student profiles.
- **Event Discovery**: Browse public events and submit participation applications.
- **Registration Flow**: Seamlessly register approved students for specific events.
- **Entry Tracking**: Manage entry statuses (draft, submitted, approved, rejected).

### UX & Design
- **Modern UI**: Clean, athletic-inspired design using Tailwind CSS v4 and Radix UI components.
- **Instant Feedback**: Determinate navigation loader overlays for a snappy feel.
- **Optimized Navigation**: "One-step back" behavior using browser history to prevent forced jumps to list pages.

## 🛠 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **UI & Styling**: [React](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/)
- **Backend & Database**: [Supabase](https://supabase.com/)
  - Authentication (Email/Password + Google OAuth)
  - PostgreSQL Database (Tables + RLS Policies)
  - SSR helpers via `@supabase/ssr`

## 🚀 Setup & Local Development

### 1. Prerequisites
- Node.js (v20+ recommended)
- A Supabase project (the free tier works perfectly)

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Copy the template file to create your local environment configuration:
```bash
cp .env.example .env.local
```
Fill in the required values from your Supabase dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BASE_URL` (Defaults to `http://localhost:3000` for local dev)

Rate limiting now uses a Supabase/Postgres RPC (`rate_limit_check`) backed by `public.rate_limits`.
This is created via the migration `supabase/migrations/20260310_postgres_rate_limit.sql`.

### 4. Database Schema Setup
This repository includes the necessary schema, RLS policies, and views in `supabase/migrations/db.sql`.

To apply the schema:
1. Go to your Supabase Dashboard → **SQL Editor**
2. Paste the contents of `supabase/migrations/db.sql` and run it.

*This will generate the required tables (`profiles`, `dojos`, `students`, `events`, etc.), enums, RLS policies, and the `organizer_entries_view`.*

### 5. Authentication Configuration
**Email/Password** works immediately out of the box after setting up your Supabase project.

**Google OAuth (Optional)**:
1. Navigate to Supabase Dashboard → **Authentication** → **Providers** → **Google**.
2. Enable Google and input your OAuth client credentials.
3. Add `http://localhost:3000/auth/callback` to the allowed redirect URLs.

### 6. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

## 👥 Roles & Workflows

### The Profiles Table
Supabase Auth manages users in `auth.users`, while our application's role and profile data lives in `public.profiles`. Profiles are often auto-created during key flows, such as signing up or applying to an event.

### Making an Organizer
To access organizer features, a user must have a row in `public.profiles` with `role = 'organizer'`. You can set this explicitly via the Supabase SQL editor:
```sql
UPDATE public.profiles SET role = 'organizer' WHERE email = 'organizer@example.com';
```

---

Built with ❤️ for the karate community
