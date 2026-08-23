import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  passwordRecovery: boolean;
  // null while unknown/loading, so callers don't briefly flash the
  // enrollment gate before the real answer comes back.
  hasEnrolledFace: boolean | null;
  refreshFaceEnrollment: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithFaceScan: (descriptor: number[]) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  clearPasswordRecovery: () => void;
  signInWithEmailOtp: (email: string) => Promise<{ error: string | null }>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  verifyPasswordResetOtp: (email: string, token: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Mobile keyboards frequently auto-capitalize the first letter or leave a
// trailing space from autocomplete/predictive text — invisible in the input
// but enough to make the exact string sent to Supabase not match the
// account, producing "Invalid login credentials" only on phones/tablets,
// never on a physical keyboard. Every email that reaches Supabase auth goes
// through this first.
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const DEVICE_ID_STORAGE_KEY = 'pathpilot-device-id';

// Persisted (unlike a plain useRef(crypto.randomUUID())) so it survives a
// reload — a fresh id on every page load would make active_sessions'
// "which device is current" check impossible to tell apart from "this same
// device reloaded the page." Shared by every tab of the same browser, which
// is correct: two tabs of one login are not "another device."
function getPersistentDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, id);
  }
  return id;
}

// Supabase's backend does the actual sending (via the configured SMTP
// provider) — this is just our own record that the request was made, for the
// admin's "Email Activity" view. Best-effort: failure to log never blocks auth.
async function logEmailEvent(email: string, type: 'signup' | 'password_reset' | 'otp_code', success: boolean) {
  try {
    await supabase.from('email_log').insert({ email, type, success });
  } catch {
    // logging is best-effort only
  }
}

export type ActivityEvent = 'login_success' | 'login_failed' | 'signup' | 'logout' | 'resume_analyzed' | 'resume_compared' | 'aptitude_completed' | 'application_submitted';

// Forensic activity trail — goes through the Worker (not a direct Supabase
// insert) so the real client IP can be attached server-side; the browser
// can't be trusted to self-report its own IP. Best-effort: never blocks the
// action itself if this fails. Exported so pages outside AuthContext (resume
// analysis, compare, aptitude, applications) can log what a signed-in user
// actually did, not just their login/logout.
export async function logActivity(email: string, event: ActivityEvent, accessToken?: string) {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    await fetch('/api/activity/log', { method: 'POST', headers, body: JSON.stringify({ email, event }) });
  } catch {
    // best-effort only
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [hasEnrolledFace, setHasEnrolledFace] = useState<boolean | null>(null);
  // Stable per-device id (see getPersistentDeviceId) so this tab can tell
  // "another device signed in and revoked me" apart from "this is the
  // broadcast I just sent myself" — and so active_sessions can tell a real
  // second device apart from this same device simply reloading the page.
  const deviceId = useRef(getPersistentDeviceId()).current;

  async function loadProfile(authUser: User) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (error) {
      console.error('Profile load error:', error.message);
      return;
    }

    if (!data) {
      // Defensive fallback only: the on_auth_user_created DB trigger creates this
      // row already, atomically, at signup time (see migrations). This branch
      // covers accounts created before that trigger existed.
      const meta = authUser.user_metadata || {};
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({
          id: authUser.id,
          email: authUser.email ?? '',
          full_name: meta.full_name || meta.name || '',
          phone: meta.phone || '',
        })
        .select('*')
        .maybeSingle();
      if (newProfile) setProfile(newProfile as Profile);
    } else {
      setProfile(data as Profile);
    }
  }

  // Defensive against the face_enrollments table not existing yet (same
  // pattern as active_sessions above) -- an error here just leaves
  // hasEnrolledFace null rather than crashing, and the enrollment gate
  // below treats null as "still checking," not "must enroll."
  async function checkFaceEnrollment(userId: string) {
    const { data, error } = await supabase.from('face_enrollments').select('user_id').eq('user_id', userId).maybeSingle();
    if (error) { console.error('Face enrollment check failed:', error.message); return; }
    setHasEnrolledFace(Boolean(data));
  }

  async function refreshFaceEnrollment() {
    if (user) await checkFaceEnrollment(user.id);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        Promise.all([loadProfile(session.user), checkFaceEnrollment(session.user.id)]).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await Promise.all([loadProfile(session.user), checkFaceEnrollment(session.user.id)]);
        } else {
          setProfile(null);
          setHasEnrolledFace(null);
        }
        setLoading(false);
      })();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Listens for the "you've been signed in elsewhere" broadcast (sent by
  // revokeOtherSessions below) so this tab signs out the instant a new device
  // logs in, rather than staying usable until its access token happens to
  // expire and its already-revoked refresh token fails — revoking the refresh
  // token is what actually enforces one active device; this just makes an
  // already-open other tab notice immediately instead of up to ~an hour later.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel(`user-session-${user.id}`);
    channel
      .on('broadcast', { event: 'force-logout' }, ({ payload }) => {
        if (payload?.exceptDeviceId === deviceId) return;
        window.alert('You were signed out because this account was signed in on another device.');
        signOut();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Closes the gap the broadcast above can't: a backgrounded/suspended tab
  // (routine on phones) never receives a realtime broadcast, so without this
  // it would keep working on its still-valid access token until that token
  // naturally expires. Checking on an interval, and immediately whenever the
  // tab becomes visible again, means a device that's actually being looked
  // at gets signed out within seconds of losing the seat, not up to an hour
  // later.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    async function checkSeat() {
      const { data } = await supabase.from('active_sessions').select('device_id').eq('user_id', user!.id).maybeSingle();
      if (cancelled || !data) return;
      if (data.device_id !== deviceId) {
        window.alert('You were signed out because this account was signed in on another device.');
        signOut();
      }
    }
    const interval = setInterval(checkSeat, 15_000);
    function onVisible() { if (document.visibilityState === 'visible') checkSeat(); }
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function signUp(email: string, password: string, fullName: string, phone: string) {
    // Metadata passed here lands in auth.users.raw_user_meta_data regardless of
    // whether email confirmation is on (i.e. even with no session yet). The
    // on_auth_user_created trigger reads it from there to create the profiles row,
    // so there's no session-dependent write to the profiles table on this path.
    email = normalizeEmail(email);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone } },
    });
    await logEmailEvent(email, 'signup', !error);
    if (!error) await logActivity(email, 'signup');
    if (error) return { error: error.message };
    return { error: null };
  }

  async function signIn(email: string, password: string) {
    email = normalizeEmail(email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      await logActivity(email, 'login_failed');
      return { error: error.message };
    }
    await logActivity(email, 'login_success', data.session?.access_token);
    await revokeOtherSessions();
    return { error: null };
  }

  // Supabase has no client-callable "sign in with a custom verification"
  // API, so the match happens server-side (the Worker holds the
  // descriptor-matching logic and the service-role key) and the Worker
  // hands back a magic-link token it generated but never emailed -- this
  // client redeems it the normal way, which establishes a real session
  // exactly like password or OTP login, so single-session enforcement and
  // activity logging both keep working unchanged. No email is passed in --
  // the scan alone identifies the account (the Worker searches every
  // enrolled face for the closest match), so which account failed a bad
  // scan isn't known client-side either; logged under a fixed label rather
  // than skipped, so failed attempts still show up in the activity log.
  async function signInWithFaceScan(descriptor: number[]) {
    try {
      const res = await fetch('/api/auth/face-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descriptor }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.token) {
        // Shown directly rather than only console-logged -- reading it off
        // DevTools was one more step than it needed to be when the point is
        // just getting the real number instead of guessing at the
        // threshold again.
        const distanceNote = typeof body.distance === 'number' ? ` (distance ${body.distance} vs threshold ${body.threshold})` : '';
        await logActivity('unmatched face scan', 'login_failed');
        return { error: (body.message || 'Face not recognized.') + distanceNote };
      }
      // generateLink() (on the Worker side) returns a hashed_token meant for
      // link-style redemption via token_hash, not the email+token shape used
      // for a 6-digit OTP code -- using the wrong overload here silently
      // fails with "Token has expired or is invalid" even for a token that's
      // completely fresh.
      const { data, error } = await supabase.auth.verifyOtp({ token_hash: body.token, type: 'magiclink' });
      if (error || !data.session) {
        await logActivity('unmatched face scan', 'login_failed');
        return { error: error?.message || 'Face sign-in failed.' };
      }
      const email = data.session.user.email || 'unknown';
      await logActivity(email, 'login_success', data.session.access_token);
      await revokeOtherSessions();
      return { error: null };
    } catch {
      return { error: 'Could not reach the server. Check your connection and try again.' };
    }
  }

  // Only one active login per account: revoke every other session's refresh
  // token right after a fresh sign-in, so logging in on a new device/browser
  // signs the account out everywhere else. Best-effort — never blocks login.
  async function revokeOtherSessions() {
    try {
      await supabase.auth.signOut({ scope: 'others' });
      const { data: { user: current } } = await supabase.auth.getUser();
      if (!current) return;
      // Claims the single seat for this device. Every signed-in client polls
      // this row (see the effect below) and signs itself out the moment it
      // sees a different device_id here — this is what actually closes the
      // "other device still works for up to an hour" gap, since it doesn't
      // depend on the other tab being open/connected right now the way the
      // broadcast below does.
      await supabase.from('active_sessions').upsert({ user_id: current.id, device_id: deviceId, updated_at: new Date().toISOString() });
      // Nudges any other tab/device that's still open right now to sign out
      // immediately instead of waiting for its access token to expire.
      const channel = supabase.channel(`user-session-${current.id}`);
      channel.subscribe((status) => {
        if (status !== 'SUBSCRIBED') return;
        channel.send({ type: 'broadcast', event: 'force-logout', payload: { exceptDeviceId: deviceId } })
          .finally(() => supabase.removeChannel(channel));
      });
    } catch (err) {
      console.error('Failed to revoke other sessions:', err);
    }
  }

  async function signOut() {
    if (user?.email && session?.access_token) await logActivity(user.email, 'logout', session.access_token);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out request failed:', err);
    } finally {
      // Clear local state immediately rather than waiting on onAuthStateChange
      // — if that event is ever delayed or dropped, the button should still
      // visibly log the user out instead of appearing to do nothing.
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  }

  async function refreshProfile() {
    if (user) await loadProfile(user);
  }

  async function resetPassword(email: string) {
    // window.location.origin would bake in "http://localhost:5173" (or whatever
    // dev port) whenever this runs locally — a link an email client can never
    // reach. VITE_PUBLIC_APP_URL should be set to the deployed app's URL once
    // it's hosted somewhere public; until then this falls back to the current
    // origin so local dev keeps working, but real reset emails need the env var.
    const redirectTo = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined) || window.location.origin;
    email = normalizeEmail(email);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    await logEmailEvent(email, 'password_reset', !error);
    if (error) return { error: error.message };
    return { error: null };
  }

  async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    setPasswordRecovery(false);
    return { error: null };
  }

  function clearPasswordRecovery() {
    setPasswordRecovery(false);
  }

  // shouldCreateUser: false keeps this strictly a sign-in path — an email with
  // no existing account errors out instead of silently creating a blank one.
  // Uses Supabase's own auth email sending, so no external provider is needed.
  async function signInWithEmailOtp(email: string) {
    email = normalizeEmail(email);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    await logEmailEvent(email, 'otp_code', !error);
    if (error) return { error: error.message };
    return { error: null };
  }

  async function verifyEmailOtp(email: string, token: string) {
    const { error } = await supabase.auth.verifyOtp({ email: normalizeEmail(email), token: token.trim(), type: 'email' });
    if (error) return { error: error.message };
    await revokeOtherSessions();
    return { error: null };
  }

  // Forgot-password path that doesn't depend on a clickable email link (and
  // therefore doesn't care what URL the app is running on): the code proves
  // the user owns the inbox, then we force the same "set new password" gate
  // the link-based flow uses instead of dropping them straight into the app
  // like a normal OTP sign-in would.
  async function verifyPasswordResetOtp(email: string, token: string) {
    const { error } = await supabase.auth.verifyOtp({ email: normalizeEmail(email), token: token.trim(), type: 'email' });
    if (error) return { error: error.message };
    setPasswordRecovery(true);
    return { error: null };
  }

  async function updateProfile(updates: Partial<Profile>) {
    if (!user) return { error: 'Not authenticated' };
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select('*')
      .maybeSingle();
    if (error) return { error: error.message };
    if (data) setProfile(data as Profile);
    return { error: null };
  }

  return (
    <AuthContext.Provider
      value={{ session, user, profile, loading, passwordRecovery, hasEnrolledFace, refreshFaceEnrollment, signUp, signIn, signInWithFaceScan, signOut, refreshProfile, updateProfile, resetPassword, updatePassword, clearPasswordRecovery, signInWithEmailOtp, verifyEmailOtp, verifyPasswordResetOtp }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
