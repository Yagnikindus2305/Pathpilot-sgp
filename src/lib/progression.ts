import type { AptitudeResult, Profile, ResumeAnalysis, ResumeComparison, RoadmapSkill } from './types';

export const APTITUDE_CATEGORIES = ['Quantitative', 'Logical Reasoning', 'Verbal Ability', 'Technical MCQs'];

// A single strong category (e.g. 100% on Quantitative) used to be enough on
// its own to count as "aptitude passed" everywhere this is checked, even
// with the other three sitting at 25% — that let a resume unlock Resume
// Compare without actually proving readiness across the whole test. Now
// every category must individually clear 70%.
export function allAptitudeCategoriesPassed(results: AptitudeResult[]): boolean {
  return APTITUDE_CATEGORIES.every((cat) =>
    results.some((r) => r.category === cat && r.score / Math.max(r.total, 1) >= 0.7)
  );
}

export type ModuleId = 'profile' | 'resume' | 'roadmap' | 'aptitude' | 'compare' | 'dashboard' | 'admin';

export interface ProgressionState {
  profile: boolean;
  resume: boolean;
  roadmap: boolean;
  aptitude: boolean;
  compare: boolean;
}

export function computeProgression(
  profile: Profile | null,
  resume: ResumeAnalysis | null,
  roadmap: RoadmapSkill[],
  results: AptitudeResult[],
  comparisons: ResumeComparison[] = [],
): ProgressionState {
  const profileDone = Boolean(profile?.full_name && profile?.college && profile?.target_role);
  const resumeDone = Boolean(resume);
  // A roadmap skill also counts as done if accumulated resume history already
  // proves it (same rule the Roadmap page itself uses to show completion) —
  // without this, the page could show "18 of 18 covered!" while this check
  // still saw an unmarked DB row for an auto-satisfied skill and kept
  // Aptitude/Compare locked despite the roadmap looking finished.
  const knownLower = new Set((profile?.saved_skills || []).map((s) => s.toLowerCase()));
  const roadmapDone = roadmap.length > 0 && roadmap.every((s) => s.done || knownLower.has(s.skill_name.toLowerCase()));
  const aptitudeDone = allAptitudeCategoriesPassed(results);
  const compareDone = comparisons.length > 0;
  return { profile: profileDone, resume: resumeDone, roadmap: roadmapDone, aptitude: aptitudeDone, compare: compareDone };
}

export function canAccess(
  module: ModuleId,
  state: ProgressionState,
): { allowed: boolean; reason?: string } {
  switch (module) {
    case 'profile':
      return { allowed: true };
    case 'resume':
      return state.profile
        ? { allowed: true }
        : { allowed: false, reason: 'Complete your profile first to unlock resume analysis.' };
    case 'roadmap':
      return state.resume
        ? { allowed: true }
        : { allowed: false, reason: 'Analyze your resume first to unlock your skill roadmap.' };
    case 'aptitude':
      return state.roadmap
        ? { allowed: true }
        : { allowed: false, reason: 'Complete your skill roadmap first to unlock aptitude tests.' };
    case 'compare':
      return state.aptitude
        ? { allowed: true }
        : { allowed: false, reason: 'Score 70%+ on all four aptitude categories to unlock resume comparison.' };
    case 'dashboard':
      return { allowed: true };
    case 'admin':
      return { allowed: true };
  }
}

export const MODULE_ORDER: ModuleId[] = ['profile', 'resume', 'roadmap', 'aptitude', 'compare', 'dashboard', 'admin'];
