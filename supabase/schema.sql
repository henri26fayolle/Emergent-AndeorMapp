-- Supabase/Postgres schema for the Emergent An Deor game app.
-- First migration goal: replace MongoDB behind the existing FastAPI /api surface.
-- Keep the React frontend pointed at REACT_APP_BACKEND_URL; do not expose service_role keys client-side.

create extension if not exists pgcrypto;
create extension if not exists citext;

create or replace function public.game_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.game_users (
  user_id text primary key,
  andeor_user_id text,
  email citext not null unique,
  password_hash text,
  name text not null default '',
  picture text,
  role text not null default 'player' check (role in ('player', 'admin')),
  auth_provider text not null default 'password',
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  avatar text,
  tutorial_completed boolean not null default false,
  regions_unlocked text[] not null default '{}',
  cards text[] not null default '{}',
  badges text[] not null default '{}',
  enrolled_main_quests text[] not null default '{}',
  focused_main_quest text,
  completed_main_quests text[] not null default '{}',
  titles_earned text[] not null default '{}',
  active_self_guided text,
  self_guided_progress jsonb not null default '{}'::jsonb,
  rewards jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.game_users
add column if not exists andeor_user_id text;

create unique index if not exists game_users_andeor_user_id_idx
on public.game_users(andeor_user_id)
where andeor_user_id is not null;

drop trigger if exists game_users_touch_updated_at on public.game_users;
create trigger game_users_touch_updated_at
before update on public.game_users
for each row execute function public.game_touch_updated_at();

create table if not exists public.game_user_sessions (
  session_token text primary key,
  user_id text not null references public.game_users(user_id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists game_user_sessions_user_id_idx on public.game_user_sessions(user_id);
create index if not exists game_user_sessions_expires_at_idx on public.game_user_sessions(expires_at);

create table if not exists public.game_regions (
  region_id text primary key,
  name text not null,
  description text,
  unlock_xp integer not null default 0,
  icon text,
  lore_title text,
  lore_summary text,
  lore_text text,
  lore_updated_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists game_regions_touch_updated_at on public.game_regions;
create trigger game_regions_touch_updated_at
before update on public.game_regions
for each row execute function public.game_touch_updated_at();

create table if not exists public.game_tours (
  tour_id text primary key,
  name text not null,
  region_id text not null references public.game_regions(region_id) on update cascade,
  subregion text,
  city_x numeric,
  city_y numeric,
  category text,
  description text,
  price numeric(12, 2) not null default 0,
  currency text not null default 'EUR',
  duration text,
  xp_reward integer not null default 0,
  card_id text,
  badge_id text,
  guide_pin text,
  image text,
  lore_title text,
  lore_summary text,
  lore_text text,
  gpx_files jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_tours_region_id_idx on public.game_tours(region_id);
create index if not exists game_tours_subregion_idx on public.game_tours(subregion);
create index if not exists game_tours_category_idx on public.game_tours(category);

drop trigger if exists game_tours_touch_updated_at on public.game_tours;
create trigger game_tours_touch_updated_at
before update on public.game_tours
for each row execute function public.game_touch_updated_at();

create table if not exists public.game_quests (
  quest_id text primary key,
  name text not null,
  description text,
  type text not null,
  target integer,
  xp_reward integer not null default 0,
  icon text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists game_quests_touch_updated_at on public.game_quests;
create trigger game_quests_touch_updated_at
before update on public.game_quests
for each row execute function public.game_touch_updated_at();

create table if not exists public.game_main_quests (
  main_quest_id text primary key,
  title text not null,
  subtitle text,
  icon text,
  theme_color text,
  theme_hex text,
  tour_ids text[] not null default '{}',
  lore_intro text,
  epilogue text,
  seal_badge_id text,
  title_earned text,
  discount_pct integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists game_main_quests_touch_updated_at on public.game_main_quests;
create trigger game_main_quests_touch_updated_at
before update on public.game_main_quests
for each row execute function public.game_touch_updated_at();

create table if not exists public.game_self_guided_journeys (
  journey_id text primary key,
  subregion text not null,
  title text not null,
  subtitle text,
  theme_color text,
  theme_hex text,
  lore_intro text,
  xp_reward integer not null default 0,
  badge_id text,
  stops jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_self_guided_journeys_subregion_idx
on public.game_self_guided_journeys(subregion);

drop trigger if exists game_self_guided_journeys_touch_updated_at on public.game_self_guided_journeys;
create trigger game_self_guided_journeys_touch_updated_at
before update on public.game_self_guided_journeys
for each row execute function public.game_touch_updated_at();

create table if not exists public.game_reward_templates (
  reward_id text primary key,
  type text not null,
  title text not null,
  description text,
  code_prefix text,
  min_xp integer not null default 0,
  partner text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists game_reward_templates_touch_updated_at on public.game_reward_templates;
create trigger game_reward_templates_touch_updated_at
before update on public.game_reward_templates
for each row execute function public.game_touch_updated_at();

create table if not exists public.game_bookings (
  booking_id text primary key,
  user_id text not null references public.game_users(user_id) on delete cascade,
  tour_id text not null references public.game_tours(tour_id) on update cascade,
  tour_name text not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'completed', 'cancelled')),
  date date,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_bookings_user_id_idx on public.game_bookings(user_id);
create index if not exists game_bookings_tour_id_idx on public.game_bookings(tour_id);
create index if not exists game_bookings_status_idx on public.game_bookings(status);
create index if not exists game_bookings_created_at_idx on public.game_bookings(created_at desc);

drop trigger if exists game_bookings_touch_updated_at on public.game_bookings;
create trigger game_bookings_touch_updated_at
before update on public.game_bookings
for each row execute function public.game_touch_updated_at();

create table if not exists public.game_user_rewards (
  user_reward_id text primary key,
  user_id text not null references public.game_users(user_id) on delete cascade,
  template_id text references public.game_reward_templates(reward_id) on update cascade,
  source_main_quest_id text references public.game_main_quests(main_quest_id) on update cascade,
  type text not null,
  title text not null,
  description text,
  partner text,
  code text unique,
  discount_pct integer,
  redeemed boolean not null default false,
  redeemed_at timestamptz,
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_user_rewards_user_id_idx on public.game_user_rewards(user_id);
create index if not exists game_user_rewards_template_id_idx on public.game_user_rewards(template_id);
create index if not exists game_user_rewards_source_main_quest_id_idx on public.game_user_rewards(source_main_quest_id);

drop trigger if exists game_user_rewards_touch_updated_at on public.game_user_rewards;
create trigger game_user_rewards_touch_updated_at
before update on public.game_user_rewards
for each row execute function public.game_touch_updated_at();

create table if not exists public.game_chat_messages (
  message_id bigserial primary key,
  session_id text not null,
  user_id text not null references public.game_users(user_id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  ts timestamptz not null default now()
);

create index if not exists game_chat_messages_session_ts_idx on public.game_chat_messages(session_id, ts);
create index if not exists game_chat_messages_user_id_idx on public.game_chat_messages(user_id);

create table if not exists public.game_storage_assets (
  asset_id uuid primary key default gen_random_uuid(),
  bucket text not null,
  object_path text not null,
  public_url text,
  source text,
  owner_type text,
  owner_id text,
  mime_type text,
  size_bytes bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (bucket, object_path)
);

-- Buckets for assets currently stored under frontend/public and backend/uploads.
-- These inserts are safe to run in Supabase. If you prefer private files, change public=false
-- and have FastAPI create signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('game-media', 'game-media', true, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']),
  ('game-audio', 'game-audio', true, 10485760, array['audio/mpeg']),
  ('game-gpx', 'game-gpx', true, 5242880, array['application/gpx+xml', 'application/octet-stream', 'text/xml'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
