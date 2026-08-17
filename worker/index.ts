import { createClient } from '@supabase/supabase-js';

export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' },
  });
}

// Verifies the caller's Supabase access token and confirms profiles.is_admin
// is true for that user — mirrors server/routes/admin.js's requireAdmin.
// The service_role key only ever lives here (a Worker secret), never in the
// browser bundle; it's what makes auth.admin.deleteUser possible at all.
async function requireAdmin(request: Request, env: Env) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: json({ message: 'Admin actions are not configured (missing SUPABASE_SERVICE_ROLE_KEY secret).' }, 503) };
  }
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return { error: json({ message: 'Missing auth token' }, 401) };

  const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return { error: json({ message: 'Invalid or expired session' }, 401) };

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError || !profile?.is_admin) return { error: json({ message: 'Admin access required' }, 403) };

  return { supabaseAdmin, adminUserId: user.id };
}

// Deletes a user's auth account entirely — cascades (via each table's
// `user_id ... REFERENCES auth.users(id) ON DELETE CASCADE`) to remove their
// profile, resumes, roadmap, aptitude results, comparisons, and milestones.
// There is no undo.
async function deleteUser(request: Request, env: Env, targetId: string): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if ('error' in auth) return auth.error;
  const { supabaseAdmin, adminUserId } = auth;

  if (targetId === adminUserId) {
    return json({ message: "You can't delete your own account from here." }, 400);
  }

  const { data: targetProfile, error: targetError } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', targetId)
    .maybeSingle();
  if (targetError) return json({ message: targetError.message }, 500);
  if (targetProfile?.is_admin) {
    return json({ message: 'Admin accounts cannot be deleted from the panel.' }, 403);
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(targetId);
  if (error) {
    console.error('[admin] Failed to delete user:', error.message);
    return json({ message: error.message }, 500);
  }
  console.warn(`[admin] User ${targetId} deleted by admin ${adminUserId}`);
  return json({ ok: true });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const deleteMatch = url.pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (deleteMatch && request.method === 'DELETE') {
      return deleteUser(request, env, deleteMatch[1]);
    }

    // Everything else (the SPA, its assets, and the /api/data/* routes that
    // already have client-side fallbacks) is served exactly as before.
    return env.ASSETS.fetch(request);
  },
};
