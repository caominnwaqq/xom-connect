# Xom Connect

Hyper-local community app built with Next.js + Supabase, optimized for mobile-first social sharing in nearby neighborhoods.

Xom Connect lets residents post borrow/giveaway/SOS/service requests, discover nearby posts by distance, and interact through comments.

## Project Status

Active development (MVP+).

What is production-ready:
- Authentication flow (signup/login/logout/refresh/verify email)
- Profile management and location persistence
- Public and authenticated feed modes
- Nearby feed powered by PostGIS
- Comment read/write flow

What is partially implemented:
- Like/repost actions are UI-only
- Chat schema exists, chat product flow is not shipped yet

## Why This Project

- Real neighborhood utility: users see what people near them actually need
- Distance-aware discovery: prioritize nearby relevance over global noise
- Privacy-aware backend: RLS policies on key tables
- Developer-friendly architecture: clear separation between app routes, UI components, and Supabase helpers

## Core Features

### 1. Auth and Account
- Email/password signup and login
- Email verification and email-change confirmation flow via auth confirm page
- Login rate-limiting by IP + email combination
- Friendly error mapping for common auth failures

### 2. Profile and Location
- Update display name, phone, and email
- Save user location in users.location as PostGIS geography point
- Resend email-change verification with cooldown handling

### 3. Feed Experience
- Global feed:
  - Guest mode reads public active posts
  - Auth mode includes owner visibility via RLS
- Nearby feed:
  - Radius options: 500m, 1km, 2km
  - Auth users query around profile location
  - Guest users query around client geolocation cell

### 4. Posts
- Create post with type, title, description, optional image
- Upload images to Supabase Storage bucket post-images
- Edit and delete owner posts

### 5. Comments
- Read comments publicly for active posts
- Authenticated users can create comments
- Comment interaction is presented in modal UX

### 6. Map and Geo
- Leaflet map rendering nearby markers
- Distance formatting for feed cards
- Geo utility for public nearby cell-based querying

## Tech Stack

Frontend:
- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- Lucide icons

Backend and Data:
- Next.js Route Handlers
- Supabase Auth, Postgres, Storage
- PostGIS for spatial queries

Mapping:
- Leaflet + react-leaflet

## Architecture Overview

Request flow:
1. UI in app routes and client components
2. Calls internal API routes under app/api
3. API routes use Supabase clients (server or user-token context)
4. Postgres + RLS + PostGIS execute data and spatial logic

Design highlights:
- Private API paths require bearer token and validate with requireUser helper
- Public paths avoid token dependency and remain cache-friendly
- Geo querying is centralized through get_nearby_posts RPC

## Repository Structure

Important directories:
- app: Next.js pages and API route handlers
- src/components: feature UI components
- src/hooks: reusable client hooks (geolocation, nearby posts)
- lib: auth/geo/supabase/data helpers
- supabase: schema and migration scripts

Selected structure:

```text
app/
  api/
    auth/
    comments/
    feed/
  auth/confirm/
  feed/
  post/
  profile/

src/
  components/
    auth/
    feed/
    map/
    posts/
  hooks/

lib/
  auth/
  geo/
  supabase/

supabase/
  schema.sql
  migrations/
```

## UI Routes

| Route | Purpose |
|---|---|
| / | Redirects to /feed |
| /feed | Global + nearby feed, composer entry |
| /post | Create post page |
| /post/[postId]/edit | Edit post page for owner |
| /profile | Sign in/up and profile management |
| /auth/confirm | Email confirmation redirect handler |

## API Overview

Auth endpoints:
- POST /api/auth/signup
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/refresh
- POST /api/auth/verify-email

Feed endpoints:
- GET /api/feed
- GET /api/feed/nearby
- GET /api/feed/public
- GET /api/feed/public/nearby

Comment endpoints:
- GET /api/comments?postId=...
- POST /api/comments

## Database and Supabase

Main schema file:
- supabase/schema.sql

Includes:
- Extensions: pgcrypto, postgis
- Enums: post_type, post_status
- Tables: users, posts, comments, chats, messages
- Triggers: updated_at sync, handle_new_user
- Storage bucket: post-images
- RPC functions:
  - get_nearby_posts(user_lat, user_lng, radius_meters)
  - create_post_with_location(...)

Available migrations:
- supabase/migrations/20260316_drop_karma_score.sql
- supabase/migrations/20260318_add_comments_and_public_user_visibility.sql

## Local Development Setup

Requirements:
- Node.js 20+
- npm
- A Supabase project

1. Install dependencies

```bash
npm install
```

2. Create .env.local in project root

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Fallback supported:
- NEXT_PUBLIC_SUPABASE_ANON_KEY

3. Run SQL bootstrap
- Open Supabase SQL Editor
- Execute full supabase/schema.sql

4. Start the app

```bash
npm run dev
```

5. Open local URL
- http://localhost:3000

## Environment Variables

| Name | Required | Description |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Yes | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Recommended | Public client key |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Optional fallback | Used if publishable key is absent |

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Deployment

Target:
- Vercel

Set these environment variables in project settings:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY

## Engineering Highlights

- Mobile-first shell with fixed max width and bottom navigation
- Clean Supabase client split by execution context:
  - browser client
  - server client
  - config resolver
- Auth-aware and public-aware feed endpoints
- JWT validation helper for protected APIs
- PostGIS-backed nearby retrieval for both auth and guest modes
- Graceful setup error messaging from backend to UI

## Current Gaps

- Like/repost persistence is not implemented
- Cursor pagination is not implemented
- Login rate-limit store is in-memory only
- Chat and message product flow is not implemented yet
- App metadata and branding are still default-level

## Roadmap and Growth Potential

Short term:
- Persist interactions (likes/reposts)
- Add pagination and feed performance tuning
- Expand nearby filters by type/time/status

Mid term:
- Ship realtime chat using chats/messages schema
- Add notifications for comments and activity
- Add moderation/reporting workflows

Long term:
- Full PWA capabilities (offline + install + sync)
- Neighborhood trust/reputation model
- Demand heatmaps and local insight analytics

## Contribution Guidelines

Contributions are welcome.

Recommended flow:
1. Fork repository
2. Create feature branch
3. Keep changes focused and well-described
4. Open pull request with context, screenshots, and test notes

Before opening PR:
- Run lint and build locally
- Ensure schema/API changes are documented in README and SQL migration notes

## License

No open-source license file is defined yet.

If you plan to publish this repository publicly, add a LICENSE file (for example MIT or Apache-2.0) before broad distribution.
