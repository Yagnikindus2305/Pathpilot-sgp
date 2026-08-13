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

export function fetchCompanyMatch(skills: string[], role?: string) {
  return postJson<{ companies: CompanyMatch[] }>('/company-match', { skills, role });
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
