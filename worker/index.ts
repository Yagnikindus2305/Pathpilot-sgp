import { createClient } from '@supabase/supabase-js';

export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ADZUNA_APP_ID?: string;
  ADZUNA_APP_KEY?: string;
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

interface LiveJob {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salaryMin: number | null;
  salaryMax: number | null;
  applyUrl: string;
  created: string;
}

interface AdzunaRawJob {
  id?: string | number;
  title?: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  description?: string;
  salary_min?: number;
  salary_max?: number;
  redirect_url?: string;
  created?: string;
}

const ADZUNA_BASE_URL = 'https://api.adzuna.com/v1/api/jobs';

// Proxies Adzuna's public job-search API (https://api.adzuna.com) so real,
// current job postings can be searched by role/location instead of relying
// on a hand-authored static role list. The app_key stays server-side here
// (a Worker secret), never shipped in the browser bundle. Responses are
// cached for 15 minutes via the Cache API to stay well within Adzuna's
// free-tier rate limit — no Redis needed at this scale.
async function searchJobs(request: Request, env: Env): Promise<Response> {
  if (!env.ADZUNA_APP_ID || !env.ADZUNA_APP_KEY) {
    return json({ message: 'Live job search is not configured (missing ADZUNA_APP_ID/ADZUNA_APP_KEY secrets).' }, 503);
  }

  const url = new URL(request.url);
  const what = url.searchParams.get('what') || '';
  const where = url.searchParams.get('where') || '';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const country = (url.searchParams.get('country') || 'in').toLowerCase();

  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(url.toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const qs = new URLSearchParams({
    app_id: env.ADZUNA_APP_ID,
    app_key: env.ADZUNA_APP_KEY,
    results_per_page: '15',
  });
  if (what) qs.set('what', what);
  if (where) qs.set('where', where);

  const adzunaUrl = `${ADZUNA_BASE_URL}/${country}/search/${page}?${qs.toString()}`;

  let upstream: Response;
  try {
    upstream = await fetch(adzunaUrl, { headers: { Accept: 'application/json' } });
  } catch {
    return json({ message: 'Failed to reach the job search provider.' }, 502);
  }
  if (!upstream.ok) {
    return json({ message: `Job search provider returned ${upstream.status}.` }, 502);
  }

  const data = (await upstream.json()) as { results?: AdzunaRawJob[] };
  const jobs: LiveJob[] = (data.results || []).map((r) => ({
    id: String(r.id ?? ''),
    title: r.title || 'Untitled role',
    company: r.company?.display_name || 'Unknown company',
    location: r.location?.display_name || '',
    description: (r.description || '').slice(0, 400),
    salaryMin: typeof r.salary_min === 'number' ? Math.round(r.salary_min) : null,
    salaryMax: typeof r.salary_max === 'number' ? Math.round(r.salary_max) : null,
    applyUrl: r.redirect_url || '',
    created: r.created || '',
  }));

  const response = json({ jobs });
  response.headers.set('Cache-Control', 'public, max-age=900');
  await cache.put(cacheKey, response.clone());
  return response;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const deleteMatch = url.pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (deleteMatch && request.method === 'DELETE') {
      return deleteUser(request, env, deleteMatch[1]);
    }

    if (url.pathname === '/api/jobs/search' && request.method === 'GET') {
      return searchJobs(request, env);
    }

    // Everything else (the SPA, its assets, and the /api/data/* routes that
    // already have client-side fallbacks) is served exactly as before.
    return env.ASSETS.fetch(request);
  },
};
