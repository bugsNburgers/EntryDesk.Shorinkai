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

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack)
- **UI & Styling**: [React](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/)
- **Backend & Database**: PostgreSQL (Neon / standard PostgreSQL via `postgres.js`)
  - Direct parameterized SQL queries with zero ORM overhead
  - Strict server-level ownership checks & lockdown on closed event registrations
  - Custom session management with bcrypt hashing (12 rounds) and `HttpOnly` secure cookies
  - Google Identity Services (GIS) one-tap authentication

## 🚀 Setup & Local Development

### 1. Prerequisites
- Node.js (v20+ recommended)
- A PostgreSQL database (Neon, Supabase Postgres, AWS RDS, or local PostgreSQL)

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Copy the template file to create your local environment configuration:
```bash
cp .env.example .env.local
```
Fill in the required values:
- `DATABASE_URL`: Your PostgreSQL connection string (e.g., from Neon Console)
- `GOOGLE_CLIENT_ID` & `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuth 2.0 Web Client ID
- `NEXT_PUBLIC_BASE_URL`: Defaults to `http://localhost:3000` for local dev

### 4. Database Schema Setup
This repository includes the complete schema and views in `src/lib/db/schema.sql`.

To apply the schema:
1. Open your PostgreSQL SQL Editor (e.g. Neon Console SQL Editor or `psql`)
2. Run the entire contents of [`src/lib/db/schema.sql`](src/lib/db/schema.sql).

*This creates the `users`, `profiles`, `sessions`, `dojos`, `students`, `events`, `event_days`, `event_categories`, `entries`, `coach_event_applications`, and `organizer_entries_view`.*

### 5. Creating Authorized Users (Zero Public Signups)
EntryDesk enforces strict zero public signups. Only pre-authorized users can log in.

To create an authorized user with email and password:
```bash
node scripts/create-user.mjs <email> <password> <coach|organizer|admin> [fullName]
```
Example:
```bash
node scripts/create-user.mjs admin@entrydesk.com SecurePassword123 organizer "Tournament Organizer"
```

For Google Sign-In, users attempting first login will be safely recorded in the database with `is_active = FALSE`. An administrator can approve them directly in SQL:
```sql
UPDATE users SET role = 'organizer', is_active = TRUE WHERE email = 'user@example.com';
```

### 6. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

Built with ❤️ for the karate community
