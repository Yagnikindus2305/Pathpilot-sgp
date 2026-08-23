/*
# Real single-device session enforcement

1. Problem
The existing "one active login" mechanism (auth.signOut({ scope: 'others' })
plus a realtime broadcast) revokes the other session's refresh token, but
its already-issued access token is a self-contained JWT that Supabase does
not re-validate against a revocation list — it keeps working until it
naturally expires (up to ~1 hour). The realtime broadcast only reaches a
device whose tab is open and actively connected right now; a backgrounded
or suspended tab (very common on phones) never receives it. Net effect:
two devices can genuinely both be usable at once for a meaningful stretch
of time, which is not acceptable for this app's "one seat per account"
requirement.

2. Fix
A tiny active_sessions table holds exactly one row per user: whichever
device most recently signed in. Each device also keeps its own persistent
id in localStorage (survives reloads, unlike a per-mount random id). Every
signed-in client polls its own row every 15s and re-checks on tab-visible —
if the stored device id no longer matches its own, it signs itself out
immediately with an explanation, regardless of whether its access token
has technically expired yet. This closes the gap down to the poll interval
(or immediately on returning to a backgrounded tab) instead of up to an
hour, without needing project-level JWT-expiry changes.
*/

create table if not exists public.active_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  device_id text not null,
  updated_at timestamptz not null default now()
);

alter table public.active_sessions enable row level security;

create policy "select_own_active_session" on active_sessions for select
  to authenticated using (user_id = auth.uid());

create policy "upsert_own_active_session" on active_sessions for insert
  to authenticated with check (user_id = auth.uid());

create policy "update_own_active_session" on active_sessions for update
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
