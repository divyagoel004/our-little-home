-- ============================================================================
--  Our Little Home ♡ — policies.sql   (run AFTER schema.sql)
--  Row Level Security: only the two signed-in members can touch anything,
--  private diary entries never leave their author, sealed letters stay sealed.
-- ============================================================================

alter table public.allowed_emails  enable row level security;  -- no policies = invisible to the browser
alter table public.profiles        enable row level security;
alter table public.diary_entries   enable row level security;
alter table public.feeling_meters  enable row level security;
alter table public.future_notes    enable row level security;
alter table public.memories        enable row level security;
alter table public.daily_surprises enable row level security;
alter table public.board_messages  enable row level security;
alter table public.presence        enable row level security;
alter table public.home_settings   enable row level security;

-- The anonymous role gets nothing at all.
revoke all on all tables in schema public from anon;
revoke all on public.allowed_emails from authenticated;

-- Baseline grants for signed-in users (RLS below narrows them further).
grant select on public.profiles, public.feeling_meters, public.future_notes, public.home_settings to authenticated;
grant select, insert, update, delete on public.diary_entries, public.memories, public.daily_surprises, public.board_messages to authenticated;
grant select, insert, update on public.presence to authenticated;
grant update (anniversary_date, updated_by) on public.home_settings to authenticated;

-- profiles: you may only change your own name / avatar / timezone (never your email or id)
grant update (display_name, avatar_url, timezone) on public.profiles to authenticated;
-- meters: values change ONLY through save_meter(); you may edit your mood + daily thought directly
grant update (current_mood, daily_thought, thought_updated_at) on public.feeling_meters to authenticated;

grant execute on function
  public.save_meter(text, integer),
  public.get_future_notes(),
  public.create_future_note(text, text, date, text),
  public.update_future_note(uuid, text, text, date, text),
  public.delete_future_note(uuid)
to authenticated;
revoke execute on function
  public.save_meter(text, integer),
  public.get_future_notes(),
  public.create_future_note(text, text, date, text),
  public.update_future_note(uuid, text, text, date, text),
  public.delete_future_note(uuid)
from anon;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists "members read profiles" on public.profiles;
create policy "members read profiles" on public.profiles
  for select to authenticated using (public.is_member());

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- diary_entries
--   private  → only the author
--   partner / both → the author and the other member
-- ---------------------------------------------------------------------------
drop policy if exists "read own or shared diary" on public.diary_entries;
create policy "read own or shared diary" on public.diary_entries
  for select to authenticated
  using (author_id = auth.uid() or (public.is_member() and visibility in ('partner','both')));

drop policy if exists "write own diary" on public.diary_entries;
create policy "write own diary" on public.diary_entries
  for insert to authenticated
  with check (author_id = auth.uid() and public.is_member());

drop policy if exists "edit own diary" on public.diary_entries;
create policy "edit own diary" on public.diary_entries
  for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists "delete own diary" on public.diary_entries;
create policy "delete own diary" on public.diary_entries
  for delete to authenticated using (author_id = auth.uid());

-- ---------------------------------------------------------------------------
-- feeling_meters: both can see both; each person only edits their own mood/thought.
-- (Meter values themselves: save_meter() only.)
-- ---------------------------------------------------------------------------
drop policy if exists "members read meters" on public.feeling_meters;
create policy "members read meters" on public.feeling_meters
  for select to authenticated using (public.is_member());

drop policy if exists "edit own mood and thought" on public.feeling_meters;
create policy "edit own mood and thought" on public.feeling_meters
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- future_notes: direct reads only once opened. Everything else goes through the
-- security-definer functions (get/create/update/delete_future_note).
-- ---------------------------------------------------------------------------
revoke insert, update, delete on public.future_notes from authenticated;

drop policy if exists "read opened notes" on public.future_notes;
create policy "read opened notes" on public.future_notes
  for select to authenticated
  using (
    public.is_member()
    and opening_date <= current_date
    and (author_id = auth.uid() or visibility = 'shared')
  );

-- ---------------------------------------------------------------------------
-- memories, daily_surprises, board_messages: both read, authors manage their own.
-- ---------------------------------------------------------------------------
drop policy if exists "members read memories" on public.memories;
create policy "members read memories" on public.memories for select to authenticated using (public.is_member());
drop policy if exists "add own memories" on public.memories;
create policy "add own memories" on public.memories for insert to authenticated with check (author_id = auth.uid() and public.is_member());
drop policy if exists "edit own memories" on public.memories;
create policy "edit own memories" on public.memories for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists "delete own memories" on public.memories;
create policy "delete own memories" on public.memories for delete to authenticated using (author_id = auth.uid());

drop policy if exists "members read surprises" on public.daily_surprises;
create policy "members read surprises" on public.daily_surprises for select to authenticated using (public.is_member());
drop policy if exists "add own surprises" on public.daily_surprises;
create policy "add own surprises" on public.daily_surprises for insert to authenticated with check (author_id = auth.uid() and public.is_member());
drop policy if exists "edit own surprises" on public.daily_surprises;
create policy "edit own surprises" on public.daily_surprises for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists "delete own surprises" on public.daily_surprises;
create policy "delete own surprises" on public.daily_surprises for delete to authenticated using (author_id = auth.uid());

drop policy if exists "members read board" on public.board_messages;
create policy "members read board" on public.board_messages for select to authenticated using (public.is_member());
drop policy if exists "post own board notes" on public.board_messages;
create policy "post own board notes" on public.board_messages for insert to authenticated with check (author_id = auth.uid() and public.is_member());
drop policy if exists "delete own board notes" on public.board_messages;
create policy "delete own board notes" on public.board_messages for delete to authenticated using (author_id = auth.uid());

-- ---------------------------------------------------------------------------
-- presence ("last seen"): privacy is enforced HERE, not just in the UI.
-- Your partner can only read your row while you have "share last seen" switched on.
-- ---------------------------------------------------------------------------
drop policy if exists "read presence" on public.presence;
create policy "read presence" on public.presence
  for select to authenticated
  using (user_id = auth.uid() or (share_last_seen and public.is_member()));

drop policy if exists "insert own presence" on public.presence;
create policy "insert own presence" on public.presence
  for insert to authenticated with check (user_id = auth.uid() and public.is_member());

drop policy if exists "update own presence" on public.presence;
create policy "update own presence" on public.presence
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- home_settings (shared anniversary date): both members may read and edit.
-- ---------------------------------------------------------------------------
drop policy if exists "members read settings" on public.home_settings;
create policy "members read settings" on public.home_settings for select to authenticated using (public.is_member());
drop policy if exists "members edit settings" on public.home_settings;
create policy "members edit settings" on public.home_settings for update to authenticated using (public.is_member()) with check (public.is_member());

-- ---------------------------------------------------------------------------
-- Storage (bucket "home-photos"). Paths are  <kind>/<user-id>/<file>.jpg
--   memories/ , avatars/  → both members can see
--   diary/                → the owner, or both once the entry is shared
-- Only the owner (first folder after kind = their id) can upload / replace / delete.
-- ---------------------------------------------------------------------------
drop policy if exists "home photos read" on storage.objects;
create policy "home photos read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'home-photos'
    and public.is_member()
    and (
      (storage.foldername(name))[1] in ('memories', 'avatars')
      or (
        (storage.foldername(name))[1] = 'diary'
        and (
          (storage.foldername(name))[2] = auth.uid()::text
          or exists (
            select 1 from public.diary_entries d
             where d.photo_url = storage.objects.name
               and d.visibility in ('partner', 'both')
          )
        )
      )
    )
  );

drop policy if exists "home photos upload" on storage.objects;
create policy "home photos upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'home-photos'
    and public.is_member()
    and (storage.foldername(name))[1] in ('memories', 'diary', 'avatars')
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "home photos update" on storage.objects;
create policy "home photos update" on storage.objects
  for update to authenticated
  using (bucket_id = 'home-photos' and (storage.foldername(name))[2] = auth.uid()::text);

drop policy if exists "home photos delete" on storage.objects;
create policy "home photos delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'home-photos' and (storage.foldername(name))[2] = auth.uid()::text);
