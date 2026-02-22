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

## Production environment variables
Use real values in Vercel Project Settings:

- `DATABASE_URL`: Neon Postgres connection string (prefer pooled endpoint).
- `NEXTAUTH_SECRET`: long random secret (`openssl rand -base64 32`).
- `NEXTAUTH_URL`: your public app URL (e.g. `https://barber.example.com`).
- `ADMIN_EMAIL`: initial admin email used for bootstrap.
- `ADMIN_PASSWORD`: initial admin password used for bootstrap/seed only (rotate after first setup).
- `VAPID_PUBLIC_KEY`: Web Push public key generated from VAPID pair.
- `VAPID_PRIVATE_KEY`: Web Push private key (keep secret).
- `VAPID_SUBJECT`: contact mailto URL, e.g. `mailto:ops@barber.example.com`.
- `SMS_PROVIDER`: `mock` for non-prod/testing or `noop` to disable SMS sends.

### Generate VAPID keys
```bash
pnpm dlx web-push generate-vapid-keys
```

## Run locally
```bash
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm dev
```

If you see `relation "shops" does not exist`, your database schema was not migrated yet. Run `pnpm db:migrate`.

## Deploy to Vercel
1. Add all env vars in Vercel dashboard.
2. Provision Neon DB and set `DATABASE_URL`.
3. Run migrations in CI/CD (or `pnpm db:migrate`).
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


## Concurrency hardening for booking creation
Booking creation now prevents double-booking at **two layers**:

1. **Application-level guard (`app/api/bookings/route.ts`)**
   - runs inside a DB transaction,
   - acquires `pg_advisory_xact_lock(hashtext(barberId))` to serialize booking attempts per barber,
   - runs an overlap query using `tstzrange(...) && tstzrange(...)` with `FOR UPDATE`,
   - returns HTTP `409` when the slot is already taken.

2. **Database-level guard (`drizzle/0001_appointments_overlap_guard.sql`)**
   - adds `CHECK (starts_at < ends_at)`,
   - adds GiST exclusion constraint:
     `exclude using gist (barber_id with =, tstzrange(starts_at, ends_at, '[)') with &&)`
     filtered to active statuses (`scheduled`, `walk_in`).

This dual strategy ensures correctness even under concurrent requests and race conditions.


## Schema audit: constraints and indexes
Updated in `lib/db/schema.ts`.

### Tenant-safety (`shop_id`) and required relationships
- Every business table includes `shop_id` (`users`, `barbers`, `services`, `customers`, `appointments`, `availability_rules`, `time_blocks`, `push_subscriptions`, `notification_preferences`).
- Composite foreign keys enforce same-tenant references:
  - `appointments(shop_id, barber_id) -> barbers(shop_id, id)`
  - `appointments(shop_id, service_id) -> services(shop_id, id)`
  - `appointments(shop_id, customer_id) -> customers(shop_id, id)`
  - `availability_rules(shop_id, barber_id) -> barbers(shop_id, id)`
  - `time_blocks(shop_id, barber_id) -> barbers(shop_id, id)`
  - `push_subscriptions(shop_id, user_id) -> users(shop_id, id)`
  - `notification_preferences(shop_id, user_id) -> users(shop_id, id)`

### Enums validation
- `appointment_status`: `scheduled`, `walk_in`, `canceled`, `no_show`, `completed`.
- `appointment_source`: `online`, `walk_in`.
- `user_role`: `admin`.

### Overlap and integrity constraints
- Appointment overlap is prevented by GiST exclusion constraint migration (`drizzle/0001_appointments_overlap_guard.sql`) for active statuses.
- `appointments_valid_range_ck`: `starts_at < ends_at`.
- `time_blocks_valid_range_ck`: `starts_at < ends_at`.
- `availability_weekday_ck`: `weekday` in `[0..6]`.
- `availability_minute_range_ck`: minute window must be valid and inside day.
- `services_duration_slots_ck`: service duration slots > 0.
- `services_price_cents_ck`: price >= 0.

### Scheduling-focused indexes
- `appointments_shop_start_idx` for shop calendar/day views.
- `appointments_barber_time_idx` for barber timeline lookups.
- `appointments_shop_barber_status_start_idx` for active-slot overlap probes.
- `time_blocks_shop_time_idx` and `time_blocks_shop_barber_time_idx` for closure/break scans.
- `availability_shop_barber_weekday_idx` and `availability_shop_weekday_idx` for rule lookup.
- `services_shop_active_idx`, `barbers_shop_active_idx` for active catalog lookups.


## Admin calendar data source
Single endpoint: `GET /api/admin/calendar?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&serviceDurationMinutes=30&slotMinutes=30`

Response includes exactly:
- `appointments` (includes walk-ins and all statuses in range)
- `timeBlocks` (includes barber-specific and shop-wide closures/exceptions)
- `availabilityOverlays` (per barber):
  - computed `workingWindows` from intersection of shop + barber rules,
  - `blockedWindows`,
  - `availableStarts` from the **same pure function** used by availability API.

Consistency guarantees:
- Uses shared scheduling primitives from `lib/scheduling/slots.ts` (`calculateAvailableStartTimes`, range/window helpers).
- Active-slot logic is identical to booking availability (`scheduled` + `walk_in` block availability).
- Calendar overlays and `/api/availability` are derived with the same overlap semantics (`[start,end)`) and timezone baseline (`America/Sao_Paulo`).


## Access control and tenant isolation
Refactored access checks use `lib/auth/access.ts`:
- `requireAdminAccessPage()` for server components/actions (`/admin/*`) with redirect on failure.
- `requireAdminAccessApi()` for route handlers with explicit `401/403` responses.

Isolation strategy:
- Admin-only APIs are session-gated (`/api/admin/calendar`, `/api/push/notify`, `/api/push/subscribe`).
- Admin pages and server actions resolve `shopId` from the authenticated session and scope every query/update by that `shopId`.
- Public endpoints do not call admin helpers and cannot read admin data.
- Cross-tenant writes are blocked at DB level by composite foreign keys and unique tenant constraints in schema.


## SMS abstraction layer
Implemented in `lib/sms/provider.ts` using an interface-first design.

### Interface
- `SmsProvider` with:
  - `name`
  - `send(message: SmsMessage)`

### Mock implementation
- `MockSmsProvider` logs outgoing SMS and returns accepted result.
- `NoopSmsProvider` supports disabling SMS safely in some environments.

### Provider selection
- `createSmsProvider()` reads `SMS_PROVIDER` (`mock` by default).
- This allows swapping to a real provider later without changing business logic call sites.

### Usage examples
- `sendBookingConfirmationSMS(phone)`
- `sendReminderSMS(phone)`
- `sendCancellationSMS(phone)`

Example (already wired): booking API calls `sendBookingConfirmationSMS(phone)` after successful transaction.


## Appointment metrics aggregation
Implemented with read-only aggregation in `lib/metrics/appointments.ts` and exposed at `GET /api/admin/metrics`.

Aggregates:
- online vs walk-in (`source`)
- no-shows (`status = no_show`)
- cancellations (`status = canceled`)

Performance and booking isolation:
- Query is read-only and filtered by `shop_id` (+ optional time range), leveraging existing appointments indexes (`appointments_shop_start_idx`, etc.).
- No write locks are acquired; booking transaction path remains unchanged.

Example output:
```json
{
  "shopId": "5a1c...",
  "range": { "startAt": null, "endAt": null },
  "metrics": {
    "online": 42,
    "walkIn": 18,
    "noShows": 4,
    "cancellations": 7
  }
}
```
