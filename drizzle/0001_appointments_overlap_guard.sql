-- Database-level protection against double-bookings for the same barber.
create extension if not exists btree_gist;

-- Keep temporal integrity for appointment ranges.
alter table appointments
  add constraint appointments_valid_range_ck
  check (starts_at < ends_at);

-- Prevent overlap for active appointment statuses only.
alter table appointments
  add constraint appointments_barber_active_no_overlap_excl
  exclude using gist (
    barber_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (status in ('scheduled', 'walk_in'));
