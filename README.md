# Barber Scheduler (Next.js + Neon + Drizzle)

Production-ready barber scheduling app for Vercel deployment.

## Stack
- Next.js App Router + TypeScript + Tailwind
- Neon PostgreSQL + Drizzle ORM
- Auth.js (Credentials, admin-only)
- PWA + Service Worker + Web Push (VAPID)
- SMS abstraction with default mock provider
- i18n dictionary (pt-BR default, en, es-419)
- Timezone baseline: `America/Sao_Paulo`

## Core architecture
- Multi-tenant schema using `shop_id` in every business table.
- Customers do not authenticate; only admin uses credentials.
- Slot engine (`30m`) computes deterministic availability from:
  - weekly availability rules,
  - existing appointments,
  - ad-hoc time blocks.
- Booking creation is concurrency-safe with DB transaction + advisory lock + overlap query using `tsrange`.

## Data model
Implemented in `lib/db/schema.ts`:
- shops, users, barbers, services, customers, appointments,
- availability_rules, time_blocks,
- push_subscriptions, notification_preferences.

### Important constraints
- UUID PKs.
- users unique by (`shop_id`, `email`).
- customers unique by (`shop_id`, `phone`).
- push_subscriptions unique endpoint.
- indexes for appointments per barber/time and per shop/time.

> Note: true exclusion constraints (GiST over ranges) are ideal in production SQL migrations; this codebase also enforces overlap prevention in booking transactions.

## Availability API
`GET /api/availability?shopId=<uuid>&barberId=<uuid>&startDate=2026-02-23&endDate=2026-02-23&serviceDurationMinutes=60`

Response:
```json
{
  "timezone": "America/Sao_Paulo",
  "slotMinutes": 30,
  "slots": ["2026-02-23T12:00:00.000Z", "2026-02-23T13:00:00.000Z"]
}
```

## Booking API
`POST /api/bookings`
```json
{
  "barberId": "...",
  "serviceId": "...",
  "startsAt": "2026-02-23T15:00:00.000Z",
  "name": "João",
  "phone": "+5511999999999",
  "source": "online"
}
```

Behaviors:
- creates/reuses customer,
- prevents overlapping appointment for same barber,
- sends push notification to admin subscribers,
- logs mock SMS confirmation.

## PWA
- `public/manifest.webmanifest`
- `public/sw.js`
- `components/pwa-register.tsx` registers SW, requests notification permission, subscribes push, and persists subscription in DB.

## Admin routes
- `/admin` dashboard
- `/admin/appointments` status management: scheduled, walk_in, canceled, no_show, completed
- `/admin/barbers`
- `/admin/services`
- `/admin/schedule` manual time blocks
- `/admin/metrics` no-shows, walk-ins vs online, cancellations

## Environment variables
Copy `.env.example` to `.env.local`.

## Run locally
```bash
npm install
npm run db:generate
npm run dev
```

## Deploy to Vercel
1. Add all env vars in Vercel dashboard.
2. Provision Neon DB and set `DATABASE_URL`.
3. Run migrations in CI/CD (or `npm run db:migrate`).
4. Set `NEXTAUTH_URL` to production URL.

## Credentials bootstrapping
Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` then create first admin in SQL with SHA256 password hash matching `lib/auth/config.ts` hash strategy.


## Availability algorithm (server-side)
Implemented in `lib/scheduling/slots.ts` with two layers:
1. `computeAvailableSlots(...)` (server-only orchestration): loads shop hours, barber hours, active appointments, and time blocks from DB.
2. `calculateAvailableStartTimes(...)` (pure deterministic function): calculates valid starts from provided input/data only.

Algorithm steps:
- Normalize requested date range (`startDate`..`endDate`) in `America/Sao_Paulo`.
- Convert service duration to required slot count: `ceil(durationMinutes / slotMinutes)`.
- For each day:
  - Read shop opening windows (rules with `barber_id = null`).
  - Read barber windows (rules with `barber_id = selected barber`).
  - Intersect both window sets.
  - Slide a candidate cursor in `slotMinutes` increments.
  - Keep candidate only if full service interval:
    - fits entirely in an intersected window,
    - does not overlap any `time_blocks`,
    - does not overlap any active appointment (`scheduled`, `walk_in`).
- Return ISO list of valid start instants.

Example request:
`GET /api/availability?shopId=<shop_uuid>&barberId=<barber_uuid>&startDate=2026-03-10&endDate=2026-03-10&serviceDurationMinutes=60&slotMinutes=30`

Example response:
```json
{
  "timezone": "America/Sao_Paulo",
  "slotMinutes": 30,
  "slots": [
    "2026-03-10T12:00:00.000Z",
    "2026-03-10T13:00:00.000Z",
    "2026-03-10T16:30:00.000Z"
  ]
}
```

Edge cases handled:
- Service duration not multiple of slot size (rounded up with `ceil`).
- Multiple-day ranges.
- Partial overlap collisions at interval boundaries (`[start,end)` semantics).
- Shop-level closure blocks (`time_blocks.barber_id` null).
- Barber-specific breaks/emergencies.
- No shop or barber rule on weekday => no availability for that day.
