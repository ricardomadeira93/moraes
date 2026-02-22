create table if not exists push_notification_events (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  subscription_id uuid not null references push_subscriptions(id) on delete cascade,
  event_key varchar(200) not null,
  delivered_at timestamptz not null default now()
);

create unique index if not exists push_events_shop_sub_event_uq
  on push_notification_events (shop_id, subscription_id, event_key);

create index if not exists push_events_shop_delivered_idx
  on push_notification_events (shop_id, delivered_at);
