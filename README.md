# Our Little Home ♡

A cozy, private digital home for two people: individual diaries with clear visibility, "I miss you / I love you" meters, sealed letters to your future selves, a memories wall, little surprises you write for each other, a shared message board, live clocks, and gentle animations.

**Fully independent project.** It has its own Supabase project, its own database, its own GitHub repo and its own site. It shares nothing with any other site you have.

Stack: React 18 · TypeScript · Vite · Framer Motion · Lucide · custom CSS · Supabase (Auth, Postgres + RLS, Realtime, Storage) · GitHub Pages + Actions.

---

## 1. Create a NEW Supabase project

1. supabase.com → **New project** (name it e.g. `our-little-home`).
2. **Authentication → Providers → Email** → enabled.
3. Open **SQL Editor** and edit the two emails near the top of `supabase/schema.sql`:
   ```sql
   insert into public.allowed_emails (email) values
     ('you@example.com'),
     ('mikku@example.com')
   ```
   Use your two real emails, **lowercase**. Nobody else can ever create an account — a database trigger rejects any other email.
4. Run **`supabase/schema.sql`**, then run **`supabase/policies.sql`** (in that order). Both can safely be re-run.
   - This also creates the private `home-photos` Storage bucket and enables Realtime.

## 2. Create your two logins

**Authentication → Users → Add user → Create new user.** Create one for each of you with your email + a password, and tick **Auto Confirm User**. Then sign in with email + password on the site.

(Magic links also work, but Supabase's built-in email sender is limited to about 2 emails per hour on the free tier, so passwords are the reliable default. To use magic links heavily, add a custom SMTP provider under Project Settings → Authentication.)

The display name defaults to the part of the email before the `@`. Each person can change theirs in the ⚙ settings, or you can set it up front:
```sql
update public.profiles set display_name = 'Mikku' where email = 'mikku@example.com';
```

## 3. Keys

Project Settings → **API Keys** (or Data API):
- **Project URL** → `VITE_SUPABASE_URL`
- **Publishable key** (`sb_publishable_…`, or the legacy `anon` key) → `VITE_SUPABASE_ANON_KEY`

**Never use the secret / service_role key anywhere in this project.** The browser only ever holds the public key; Row Level Security protects everything.

## 4. Run locally

```bash
npm install
cp .env.example .env.local     # fill in the two values
npm run dev
```

Other scripts: `npm run typecheck`, `npm run build`, `npm run preview`.

## 5. Deploy to GitHub Pages

1. Create a new GitHub repo and push this folder (`main` branch).
2. Repo → **Settings → Secrets and variables → Actions → Secrets**: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Repo → **Settings → Pages → Source: GitHub Actions**.
4. Actions tab → **Deploy to GitHub Pages** → *Run workflow* (it also runs on every push to `main`).
5. Your site: `https://<user>.github.io/<repo>/`. (For a `<user>.github.io` repo, add a repository **variable** `VITE_BASE_PATH` = `/`.)
6. **Back in Supabase → Authentication → URL Configuration:** set **Site URL** to that address and add it (with `/**`) under **Redirect URLs**. Without this, magic links go to `localhost`.

The app uses a hash router (`/#/home`), so refreshes and deep links never 404 on GitHub Pages.

---

## What's inside

| Room | What it does |
| --- | --- |
| **Welcome** | Animated cozy room (glowing lamp, rainy window, swaying curtains, fairy lights, floating hearts, handwritten note). "Come Inside ♡" opens the login. |
| **Our Home** | Greeting by name, live clocks for both of you in your own time zones, days together (shared anniversary), each person's thought of the day, "A Little Something for You ♡" surprises, message board. |
| **My Diary** | Journal-page timeline + calendar, search, mood filter (10 moods), photo, multiple entries per day, edit/delete. Visibility per entry: **Just for me / For {partner} / For both of us**, with a clear "who can read this" banner before saving. Default is private. |
| **Your Diary** | Read-only view of what your partner chose to share with you. Private entries are never sent to your browser (enforced by RLS, not the UI). |
| **Our Feelings** | "I Miss You" flower and "I Love You" heart per person, 0–100, with labels and last-updated time. You can only change your own (database function `save_meter`); your partner's update live. Nothing changes automatically and nothing compares the two. |
| **Future Us** | Letters with an opening date, private or shared, live countdown. While sealed, the text is **never sent to the browser** (not even to the author). The author can change/delete only before the opening date. |
| **Our Little Memories** | Polaroid wall, scrapbook, or timeline, with photos, captions and dates. |
| **Settings (⚙)** | Your name, anniversary, "share my last seen" switch, rain/fireplace sound (off by default; the speaker icon is always visible). |

The surprises are **written only by the two of you** — nothing is auto-generated. Mood atmosphere (rain, hearts, petals, sparkles) follows whichever mood was set most recently.

## Security model

- Two accounts only: the `allowed_emails` trigger on `auth.users`, plus RLS that requires a `profiles` row. The anonymous role has no table access.
- Diary: authors see their own; the other member only sees entries marked `partner`/`both`.
- Meters: values change only through a security-definer function that writes to *your own* row. Mood/thought are column-restricted updates on your own row.
- Future letters: no direct table access while sealed; reads go through `get_future_notes()`, which masks content until the opening date. Edit/delete functions refuse once it has opened.
- "Last seen": the partner can only read your presence row while *you* have sharing on (RLS).
- Photos: private bucket, signed URLs. Memory/avatar photos are visible to both; a diary photo is visible to the partner only when its entry is shared. You can only upload to or delete from your own folder.
- No service-role key in the frontend, and `.env*` files are git-ignored.

## Notes

- **Opening dates** are evaluated by the database in UTC (`current_date`), so a letter may open a few hours before/after local midnight depending on your time zone. If creating a letter for "tomorrow" is refused in a far-west time zone, choose the day after.
- Photos are resized in the browser (max 1600px JPEG) before upload; the bucket limit is 5 MB.
- Realtime: tables are added to the `supabase_realtime` publication by `schema.sql`; if live updates ever stop, check Database → Replication.
- Both people's time zones are saved automatically from their browsers so each clock is correct.

## Folder structure

```
src/
  components/   AppShell, CozyRoom, Atmosphere, DiaryEditor, Meters, Surprise, Board, SettingsModal, Ui
  hooks/        useAuth, HomeContext, useLive (realtime), useSignedUrls, useNow, useAmbientSound
  services/     home.ts (all data access), storage.ts (photos)
  pages/        Welcome (+login), Dashboard, Diary, Feelings, FutureSelf, Memories
  lib/          supabase, config, format, moods
  styles/       global.css
supabase/       schema.sql, policies.sql
.github/workflows/deploy.yml
```
