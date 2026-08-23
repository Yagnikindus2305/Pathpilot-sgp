/*
# Missing delete policy on face_enrollments

1. Problem
The original face_auth migration added select/insert/update RLS policies
for face_enrollments but no delete policy. Row-level security defaults to
denying any action with no matching policy, so a user's own "delete my
face and re-scan" request silently deleted nothing -- the row stayed, so
the app never dropped back into the enrollment screen.

2. Fix
Add the missing delete policy, same shape as the existing ones.
*/

create policy "delete_own_face_enrollment" on face_enrollments for delete
  to authenticated using (user_id = auth.uid());
