-- ============================================================================
--  Our Little Home ♡ — schema.sql
--  Run this FIRST in the Supabase SQL editor of a NEW, dedicated project,
--  then run policies.sql.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 0. THE TWO PEOPLE ALLOWED IN  (EDIT THESE TWO EMAILS BEFORE RUNNING!)
--    Anyone else is rejected by a trigger on auth.users, so no third account
--    can ever exist. The table is RLS-locked: the browser can never read it.
-- ---------------------------------------------------------------------------
create table if not exists public.allowed_emails (
  email text primary key check (email = lower(email))
);
alter table public.allowed_emails enable row level security;

insert into public.allowed_emails (email) values
  ('divyagoellcs@gmail.com'),     -- ← replace with your email (lowercase)
  ('yashdixit4123@gmail.com')    -- ← replace with your partner's email (lowercase)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  email        text not null unique,
  avatar_url   text,
  timezone     text not null default 'UTC',
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. diary_entries
--    `content` holds "What happened today?"; the other prompts have columns.
-- ---------------------------------------------------------------------------
create table if not exists public.diary_entries (
  id             uuid primary key default gen_random_uuid(),
  author_id      uuid not null references public.profiles (id) on delete cascade,
  title          text not null default '' check (char_length(title) <= 140),
  content        text not null default '' check (char_length(content) <= 20000),
  day_feeling    text not null default '' check (char_length(day_feeling) <= 20000),
  thinking_about text not null default '' check (char_length(thinking_about) <= 20000),
  wish_to_tell   text not null default '' check (char_length(wish_to_tell) <= 20000),
  grateful_for   text not null default '' check (char_length(grateful_for) <= 20000),
  mood           text not null default 'peaceful'
                 check (mood in ('happy','missing_you','sad','anxious','excited','tired','loved','romantic','peaceful','random')),
  visibility     text not null default 'private'
                 check (visibility in ('private','partner','both')),   -- just me / for you / for both of us
  photo_url      text,                                                  -- storage path inside bucket home-photos
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (char_length(title || content || day_feeling || thinking_about || wish_to_tell || grateful_for) > 0)
);

-- ---------------------------------------------------------------------------
-- 3. feeling_meters  (one row per person; values are changed ONLY by the person, via save_meter())
-- ---------------------------------------------------------------------------
create table if not exists public.feeling_meters (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references public.profiles (id) on delete cascade,
  miss_you_value    integer not null default 0 check (miss_you_value between 0 and 100),
  love_you_value    integer not null default 0 check (love_you_value between 0 and 100),
  miss_updated_at   timestamptz,
  love_updated_at   timestamptz,
  current_mood      text check (current_mood in ('happy','missing_you','sad','anxious','excited','tired','loved','romantic','peaceful','random')),
  daily_thought     text not null default '' check (char_length(daily_thought) <= 280),
  thought_updated_at timestamptz,
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. future_notes  (sealed until opening_date; read/written only through functions below)
-- ---------------------------------------------------------------------------
create table if not exists public.future_notes (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references public.profiles (id) on delete cascade,
  title        text not null default '' check (char_length(title) <= 140),
  content      text not null check (char_length(content) between 1 and 20000),
  opening_date date not null,
  visibility   text not null default 'private' check (visibility in ('private','shared')),
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5. memories
-- ---------------------------------------------------------------------------
create table if not exists public.memories (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 140),
  description text not null default '' check (char_length(description) <= 5000),
  image_url   text,                                   -- storage path inside bucket home-photos
  memory_date date not null default current_date,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 6. daily_surprises  (the two of you write these — nothing is pre-filled)
-- ---------------------------------------------------------------------------
create table if not exists public.daily_surprises (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles (id) on delete cascade,
  content    text not null check (char_length(content) between 1 and 500),
  category   text not null default 'love_note' check (category in ('love_note','reason','question','affirmation')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 7. Shared-home extras: message board, presence (last seen), settings
-- ---------------------------------------------------------------------------
create table if not exists public.board_messages (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles (id) on delete cascade,
  content    text not null check (char_length(content) between 1 and 300),
  color      text not null default 'blush' check (color in ('blush','sage','champagne')),
  created_at timestamptz not null default now()
);

create table if not exists public.presence (
  user_id         uuid primary key references public.profiles (id) on delete cascade,
  last_seen_at    timestamptz not null default now(),
  share_last_seen boolean not null default true
);

create table if not exists public.home_settings (
  id               integer primary key default 1 check (id = 1),
  anniversary_date date,
  updated_by       uuid references public.profiles (id) on delete set null,
  updated_at       timestamptz not null default now()
);
insert into public.home_settings (id) values (1) on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 8. Indexes
-- ---------------------------------------------------------------------------
create index if not exists diary_author_created_idx on public.diary_entries (author_id, created_at desc);
create index if not exists diary_visibility_idx     on public.diary_entries (visibility);
create index if not exists future_author_idx        on public.future_notes (author_id, opening_date);
create index if not exists memories_date_idx        on public.memories (memory_date desc);
create index if not exists surprises_cat_idx        on public.daily_surprises (category);
create index if not exists board_created_idx        on public.board_messages (created_at desc);

-- ---------------------------------------------------------------------------
-- 9. Functions & triggers
-- ---------------------------------------------------------------------------

-- Creates the profile (+ meter row + presence row) when someone first signs in.
-- Rejects any email that is not on the allow-list.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if not exists (select 1 from public.allowed_emails where email = lower(new.email)) then
    raise exception 'This home is private.' using errcode = '42501';
  end if;

  v_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
  if v_name is null then
    v_name := initcap(split_part(new.email, '@', 1));
  end if;

  insert into public.profiles (id, display_name, email)
  values (new.id, left(v_name, 40), lower(new.email))
  on conflict (id) do nothing;

  insert into public.feeling_meters (user_id) values (new.id) on conflict do nothing;
  insert into public.presence (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- True only for the signed-in members of this home.
create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid());
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists diary_touch  on public.diary_entries;
create trigger diary_touch  before update on public.diary_entries  for each row execute function public.touch_updated_at();
drop trigger if exists meters_touch on public.feeling_meters;
create trigger meters_touch before update on public.feeling_meters for each row execute function public.touch_updated_at();
drop trigger if exists settings_touch on public.home_settings;
create trigger settings_touch before update on public.home_settings for each row execute function public.touch_updated_at();

-- A person changes THEIR OWN meter only, and only by calling this. Nothing ever changes it automatically.
create or replace function public.save_meter(p_kind text, p_value integer)
returns public.feeling_meters
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.feeling_meters;
begin
  if not public.is_member() then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;
  if p_value is null or p_value < 0 or p_value > 100 then
    raise exception 'The value must be between 0 and 100.';
  end if;

  if p_kind = 'miss' then
    insert into public.feeling_meters (user_id, miss_you_value, miss_updated_at)
    values (auth.uid(), p_value, now())
    on conflict (user_id) do update
      set miss_you_value = excluded.miss_you_value, miss_updated_at = now()
    returning * into r;
  elsif p_kind = 'love' then
    insert into public.feeling_meters (user_id, love_you_value, love_updated_at)
    values (auth.uid(), p_value, now())
    on conflict (user_id) do update
      set love_you_value = excluded.love_you_value, love_updated_at = now()
    returning * into r;
  else
    raise exception 'Unknown meter.';
  end if;
  return r;
end;
$$;

-- ----- Letters to our future selves: sealed until opening_date -------------

-- Lists notes you may know about. Locked notes come back WITHOUT their content
-- (and without their title when they belong to your partner).
create or replace function public.get_future_notes()
returns table (
  id uuid, author_id uuid, title text, content text,
  opening_date date, visibility text, created_at timestamptz, is_locked boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select n.id,
         n.author_id,
         case when n.opening_date > current_date and n.author_id <> auth.uid() then '' else n.title end,
         case when n.opening_date > current_date then null else n.content end,
         n.opening_date,
         n.visibility,
         n.created_at,
         (n.opening_date > current_date)
    from public.future_notes n
   where public.is_member()
     and (n.author_id = auth.uid() or n.visibility = 'shared')
   order by n.opening_date, n.created_at;
$$;

create or replace function public.create_future_note(
  p_title text, p_content text, p_opening_date date, p_visibility text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_member() then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if p_opening_date is null or p_opening_date <= current_date then
    raise exception 'The opening date must be in the future.';
  end if;
  if coalesce(btrim(p_content), '') = '' then raise exception 'Write something first.'; end if;
  if p_visibility not in ('private','shared') then raise exception 'Bad visibility.'; end if;

  insert into public.future_notes (author_id, title, content, opening_date, visibility)
  values (auth.uid(), left(coalesce(p_title, ''), 140), p_content, p_opening_date, p_visibility)
  returning id into v_id;
  return v_id;
end;
$$;

-- Only the author, and only while the note is still sealed. p_content null/blank = keep the sealed text.
create or replace function public.update_future_note(
  p_id uuid, p_title text, p_content text, p_opening_date date, p_visibility text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_opening_date is null or p_opening_date <= current_date then
    raise exception 'The opening date must be in the future.';
  end if;
  if p_visibility not in ('private','shared') then raise exception 'Bad visibility.'; end if;

  update public.future_notes
     set title = left(coalesce(p_title, ''), 140),
         content = case when coalesce(btrim(p_content), '') = '' then content else p_content end,
         opening_date = p_opening_date,
         visibility = p_visibility
   where id = p_id and author_id = auth.uid() and opening_date > current_date;

  if not found then
    raise exception 'This note can no longer be changed.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.delete_future_note(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.future_notes
   where id = p_id and author_id = auth.uid() and opening_date > current_date;
  if not found then
    raise exception 'This note can no longer be deleted.' using errcode = '42501';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Storage bucket for photos (private; served with short-lived signed URLs)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('home-photos', 'home-photos', false, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 11. Realtime
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['profiles','diary_entries','feeling_meters','memories','daily_surprises','board_messages','presence','home_settings']
  loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
