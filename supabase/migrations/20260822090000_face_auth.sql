/*
# Face authentication + Aptitude Test proctoring

1. Problem
Login required a password to be typed every time, and the Aptitude Test had
no way to verify the person taking it was actually the enrolled student, or
that they weren't using a second device/phone to look up answers.

2. Fix
face_enrollments stores one face descriptor (a 128-float numeric vector,
never the actual photo) per user, captured once during a mandatory
enrollment step. It's used two ways: a Worker route matches a live scan
against it to sign a user in without a password, and the Aptitude Test
periodically re-checks the person in frame against it while a test is in
progress. proctoring_incidents logs anything the Aptitude Test's camera
check flags (no face, a mismatched face, a second person, or a phone in
frame) so admins can review flagged attempts, the same way other account
activity is already logged.
*/

create table if not exists public.face_enrollments (
  user_id uuid primary key references auth.users(id) on delete cascade,
  descriptor jsonb not null,
  enrolled_at timestamptz not null default now()
);

alter table public.face_enrollments enable row level security;

create policy "select_own_face_enrollment" on face_enrollments for select
  to authenticated using (user_id = auth.uid());

create policy "upsert_own_face_enrollment" on face_enrollments for insert
  to authenticated with check (user_id = auth.uid());

create policy "update_own_face_enrollment" on face_enrollments for update
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.proctoring_incidents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  incident_type text not null check (incident_type in ('no_face', 'multiple_faces', 'phone_detected', 'identity_mismatch')),
  category text,
  created_at timestamptz not null default now()
);

alter table public.proctoring_incidents enable row level security;

create policy "select_own_incidents" on proctoring_incidents for select
  to authenticated using (user_id = auth.uid());

create policy "insert_own_incidents" on proctoring_incidents for insert
  to authenticated with check (user_id = auth.uid());

create policy "admin_select_all_incidents" on proctoring_incidents for select
  to authenticated using (public.is_admin());

create index if not exists proctoring_incidents_user_id_idx on proctoring_incidents (user_id);
create index if not exists proctoring_incidents_created_at_idx on proctoring_incidents (created_at desc);
