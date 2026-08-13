import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  passwordRecovery: boolean;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user).finally(() => setLoading(false));
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
          await loadProfile(session.user);
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signUp(email: string, password: string, fullName: string, phone: string) {
    // Metadata passed here lands in auth.users.raw_user_meta_data regardless of
    // whether email confirmation is on (i.e. even with no session yet). The
    // on_auth_user_created trigger reads it from there to create the profiles row,
    // so there's no session-dependent write to the profiles table on this path.
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone } },
    });
    await logEmailEvent(email, 'signup', !error);
    if (error) return { error: error.message };
    return { error: null };
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    await revokeOtherSessions();
    return { error: null };
  }

  // Only one active login per account: revoke every other session's refresh
  // token right after a fresh sign-in, so logging in on a new device/browser
  // signs the account out everywhere else. Best-effort — never blocks login.
  async function revokeOtherSessions() {
    try {
      await supabase.auth.signOut({ scope: 'others' });
    } catch (err) {
      console.error('Failed to revoke other sessions:', err);
    }
  }

  async function signOut() {
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
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    await logEmailEvent(email, 'otp_code', !error);
    if (error) return { error: error.message };
    return { error: null };
  }

  async function verifyEmailOtp(email: string, token: string) {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
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
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
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
      value={{ session, user, profile, loading, passwordRecovery, signUp, signIn, signOut, refreshProfile, updateProfile, resetPassword, updatePassword, clearPasswordRecovery, signInWithEmailOtp, verifyEmailOtp, verifyPasswordResetOtp }}
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
