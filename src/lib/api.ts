import companiesData from '@/data/pathpilot_companies.json';
import { supabase } from '@/lib/supabase';

export interface GroupedOptions {
  [category: string]: string[];
}

export interface RoadmapItem {
  skill: string;
  video: string;
  priority?: 'Must Have' | 'Nice to Have' | 'Advanced';
}

export interface ToolCheckItem {
  tool: string;
  present: boolean;
}

export interface CompanyRoleMatch {
  role: string;
  have: string[];
  missing: string[];
  matchPct: number;
}

export interface CompanyMatch {
  company: string;
  category: string;
  tier: string;
  salaryBand: string;
  bestMatch: CompanyRoleMatch;
  allRoles: CompanyRoleMatch[];
}

const API_BASE = '/api/data';

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export function fetchColleges() {
  return getJson<{ grouped: GroupedOptions }>('/colleges');
}

export function fetchCourses() {
  return getJson<{ grouped: GroupedOptions; years: string[] }>('/courses');
}

export function fetchRoles() {
  return getJson<{ grouped: GroupedOptions }>('/roles');
}

export function fetchRoadmap(role: string, have: string[]) {
  const params = new URLSearchParams({ role, have: have.join(',') });
  return getJson<{ role: string; salaryLPA?: unknown; roadmap: RoadmapItem[] }>(`/roadmap?${params}`);
}

export function fetchToolCheck(role: string, resumeText: string) {
  return postJson<{ role: string; tools: ToolCheckItem[] }>('/tool-check', { role, resumeText });
}

interface CompanyRecord {
  name: string;
  category: string;
  tier: string;
  salaryBand: string;
  roles: { role: string; skills: string[] }[];
}

const companyList = (companiesData as { companies: CompanyRecord[] }).companies;

// Mirrors server/routes/data.js's inferCompanyCategories — kept in sync by hand
// since this is a client-side fallback for when /api/data/company-match is
// unreachable (e.g. a static-only deploy with no port-4000 server running).
function inferCompanyCategories(roleTitle: string): string[] {
  const t = (roleTitle || '').toLowerCase();
  const has = (...words: string[]) => words.some((w) => t.includes(w));
  const categories: string[] = [];

  if (has('security', 'vapt', 'penetration', 'soc analyst', 'cyber', 'threat')) categories.push('Cybersecurity');
  if (has('data analyst', 'data scientist', 'data engineer', 'machine learning', 'ml engineer', 'ai engineer', 'business intelligence', 'analytics', 'statistician')) categories.push('Analytics / Data');
  if (has('embedded', 'hardware', 'semiconductor', 'vlsi', 'chip')) categories.push('Semiconductor / Deep Tech');
  if (has('mechanical', 'civil engineer', 'electrical engineer', 'chemical engineer', 'biomedical', 'architect')) categories.push('Core Engineering');
  if (has('consult')) categories.push('Consulting / GCC');

  if (!categories.length) categories.push('Indian IT Services', 'Global Product / MNC', 'Indian Product / Startup');
  return categories;
}

function salaryFloor(salaryBand: string): number {
  const match = /([\d.]+)/.exec(salaryBand || '');
  return match ? parseFloat(match[1]) : Infinity;
}

function matchRole(skills: string[], roleSkills: string[], userSkills: string[]) {
  const have = roleSkills.filter((s) => userSkills.includes(s.toLowerCase()));
  const missing = roleSkills.filter((s) => !userSkills.includes(s.toLowerCase()));
  return { have, missing, matchPct: Math.round((have.length / roleSkills.length) * 100) };
}

function getCompanyMatches(skills: string[], role?: string): CompanyMatch[] {
  const userSkills = (skills || []).map((s) => s.toLowerCase());
  const relevantCategories = inferCompanyCategories(role || '');

  const results: CompanyMatch[] = [];
  for (const c of companyList) {
    if (!relevantCategories.includes(c.category)) continue;
    const roleMatches: CompanyRoleMatch[] = [];
    for (const r of c.roles || []) {
      const { have, missing, matchPct } = matchRole(userSkills, r.skills, userSkills);
      if (have.length) roleMatches.push({ role: r.role, have, missing, matchPct });
    }
    if (roleMatches.length) {
      roleMatches.sort((a, b) => b.matchPct - a.matchPct);
      results.push({ company: c.name, category: c.category, tier: c.tier, salaryBand: c.salaryBand, bestMatch: roleMatches[0], allRoles: roleMatches });
    }
  }
  results.sort((a, b) => b.bestMatch.matchPct - a.bestMatch.matchPct);
  if (results.length > 18) results.length = 18;

  const hasMassRecruiter = results.some((r) => r.tier === 'Mass recruiter');
  if (!hasMassRecruiter) {
    const pool = companyList.filter((c) => relevantCategories.includes(c.category) && c.tier === 'Mass recruiter');
    const fallbackCompany = [...pool].sort((a, b) => salaryFloor(a.salaryBand) - salaryFloor(b.salaryBand))[0];
    if (fallbackCompany && !results.some((r) => r.company === fallbackCompany.name)) {
      const role0 = fallbackCompany.roles[0];
      const { have, missing, matchPct } = matchRole(userSkills, role0.skills, userSkills);
      const match = { role: role0.role, have, missing, matchPct };
      results.push({ company: fallbackCompany.name, category: fallbackCompany.category, tier: fallbackCompany.tier, salaryBand: fallbackCompany.salaryBand, bestMatch: match, allRoles: [match] });
    }
  }

  results.push({
    company: 'Entry-Level / Walk-in & Campus Drives',
    category: 'Entry-Level',
    tier: 'Mass recruiter',
    salaryBand: '1-2 LPA',
    bestMatch: { role: 'Trainee / Associate', have: [], missing: ['Communication', 'MS Office', 'Basic Computer Skills'], matchPct: 40 },
    allRoles: [{ role: 'Trainee / Associate', have: [], missing: ['Communication', 'MS Office', 'Basic Computer Skills'], matchPct: 40 }],
  });

  return results.slice(0, 20);
}

// Falls back to a local, bundled recomputation (identical logic to the server
// route) when /api/data/company-match is unreachable — the one static-deploy
// gap that didn't already have a client-side fallback like colleges/roles/roadmap do.
export function fetchCompanyMatch(skills: string[], role?: string) {
  return postJson<{ companies: CompanyMatch[] }>('/company-match', { skills, role }).catch(() => ({ companies: getCompanyMatches(skills, role) }));
}

// Fetches matches per role (same-domain roles a student selected) and merges
// them, keeping each company's single best match across all requested roles
// rather than showing it once per role.
export async function fetchCombinedCompanyMatch(skills: string[], roles: string[]): Promise<{ companies: CompanyMatch[] }> {
  const uniqueRoles = Array.from(new Set(roles.filter(Boolean)));
  if (!uniqueRoles.length) return fetchCompanyMatch(skills);
  const results = await Promise.all(uniqueRoles.map((role) => fetchCompanyMatch(skills, role).catch(() => ({ companies: [] as CompanyMatch[] }))));
  const byCompany = new Map<string, CompanyMatch>();
  for (const res of results) {
    for (const match of res.companies) {
      const existing = byCompany.get(match.company);
      if (!existing || match.bestMatch.matchPct > existing.bestMatch.matchPct) byCompany.set(match.company, match);
    }
  }
  return { companies: Array.from(byCompany.values()).sort((a, b) => b.bestMatch.matchPct - a.bestMatch.matchPct) };
}

export interface InternshipMatch {
  company: string;
  category: string;
  tier: string;
  stipendBand: string;
  bestMatch: CompanyRoleMatch;
  allRoles: CompanyRoleMatch[];
}

// Internship stipends aren't in the source data (it's a full-time hiring
// dataset) — derived from each company's existing tier instead of a separate
// 90-company dataset, so this stays consistent with "Companies you can
// target" rather than drifting out of sync.
interface StipendRange { min: number; max: number }

// Matches the seed rows in supabase/migrations/20260817060000_internship_stipend_tiers.sql —
// used only if that table is empty or unreachable, so internships never break.
const FALLBACK_STIPEND_TIERS: Record<string, StipendRange> = {
  mass_recruiter: { min: 6000, max: 8000 },
  mid_tier: { min: 8000, max: 15000 },
  tier_1: { min: 15000, max: 25000 },
  dream: { min: 25000, max: 50000 },
};

let stipendTiersCache: Record<string, StipendRange> | null = null;

// Cached for the lifetime of the page load — these ranges are edited rarely
// (via Supabase's table editor, not the app), so there's no need to refetch
// on every internship-match call.
async function loadStipendTiers(): Promise<Record<string, StipendRange>> {
  if (stipendTiersCache) return stipendTiersCache;
  try {
    const { data, error } = await supabase.from('stipend_tiers').select('tier_key, min_stipend, max_stipend');
    if (error || !data || !data.length) throw error || new Error('empty');
    const map: Record<string, StipendRange> = {};
    for (const row of data as { tier_key: string; min_stipend: number; max_stipend: number }[]) {
      map[row.tier_key] = { min: row.min_stipend, max: row.max_stipend };
    }
    stipendTiersCache = { ...FALLBACK_STIPEND_TIERS, ...map };
  } catch {
    stipendTiersCache = FALLBACK_STIPEND_TIERS;
  }
  return stipendTiersCache;
}

function tierKeyFor(tier: string): string {
  const t = tier.toLowerCase();
  if (t.includes('dream')) return 'dream';
  if (t.includes('tier-1')) return 'tier_1';
  if (t.includes('mid')) return 'mid_tier';
  return 'mass_recruiter';
}

function formatStipendBand(range: StipendRange): string {
  return `₹${range.min.toLocaleString('en-IN')}–${range.max.toLocaleString('en-IN')}/month`;
}

export async function getInternshipMatches(skills: string[], role?: string): Promise<InternshipMatch[]> {
  const tiers = await loadStipendTiers();
  const userSkills = (skills || []).map((s) => s.toLowerCase());
  const relevantCategories = inferCompanyCategories(role || '');

  const results: InternshipMatch[] = [];
  for (const c of companyList) {
    if (!relevantCategories.includes(c.category)) continue;
    const roleMatches: CompanyRoleMatch[] = [];
    for (const r of c.roles || []) {
      const { have, missing, matchPct } = matchRole(userSkills, r.skills, userSkills);
      if (have.length) roleMatches.push({ role: `${r.role} Intern`, have, missing, matchPct });
    }
    if (roleMatches.length) {
      roleMatches.sort((a, b) => b.matchPct - a.matchPct);
      const band = formatStipendBand(tiers[tierKeyFor(c.tier)] || FALLBACK_STIPEND_TIERS.mass_recruiter);
      results.push({ company: c.name, category: c.category, tier: c.tier, stipendBand: band, bestMatch: roleMatches[0], allRoles: roleMatches });
    }
  }
  results.sort((a, b) => b.bestMatch.matchPct - a.bestMatch.matchPct);
  if (results.length > 14) results.length = 14;

  // Guaranteed floor entry, same idea as getCompanyMatches: a beginner with
  // zero skill overlap should never see an empty list.
  results.push({
    company: 'Campus / Walk-in Internship Drives',
    category: 'Entry-Level',
    tier: 'Mass recruiter',
    stipendBand: formatStipendBand(tiers.mass_recruiter),
    bestMatch: { role: 'Intern Trainee', have: [], missing: ['Communication', 'MS Office', 'Basic Computer Skills'], matchPct: 40 },
    allRoles: [{ role: 'Intern Trainee', have: [], missing: ['Communication', 'MS Office', 'Basic Computer Skills'], matchPct: 40 }],
  });

  return results.slice(0, 15);
}

export async function fetchInternshipMatch(skills: string[], role?: string): Promise<{ internships: InternshipMatch[] }> {
  return { internships: await getInternshipMatches(skills, role) };
}

export async function fetchCombinedInternshipMatch(skills: string[], roles: string[]): Promise<{ internships: InternshipMatch[] }> {
  const uniqueRoles = Array.from(new Set(roles.filter(Boolean)));
  const targets = uniqueRoles.length ? uniqueRoles : [undefined];
  const byCompany = new Map<string, InternshipMatch>();
  for (const role of targets) {
    for (const match of await getInternshipMatches(skills, role)) {
      const existing = byCompany.get(match.company);
      if (!existing || match.bestMatch.matchPct > existing.bestMatch.matchPct) byCompany.set(match.company, match);
    }
  }
  return { internships: Array.from(byCompany.values()).sort((a, b) => b.bestMatch.matchPct - a.bestMatch.matchPct).slice(0, 15) };
}
