import { extractSkillsFromText } from './analysis';
import { ROLE_SKILLS } from './roleSkills';

export interface JdMatchResult {
  score: number;
  roleTitle: string;
  matchedKeywords: string[];
  missingHardSkills: string[];
  missingSoftSkills: string[];
  missingActionVerbs: string[];
  bulletSuggestions: Array<{
    original: string;
    enhanced: string;
    actionVerb: string;
    reason: string;
  }>;
}

const COMMON_SOFT_SKILLS = [
  'communication',
  'leadership',
  'collaboration',
  'problem solving',
  'critical thinking',
  'adaptability',
  'teamwork',
  'time management',
  'agile',
  'scrum',
  'ownership',
  'stakeholder management',
  'cross-functional',
];

const POWER_ACTION_VERBS = [
  'Architected',
  'Spearheaded',
  'Engineered',
  'Optimized',
  'Accelerated',
  'Automated',
  'Orchestrated',
  'Delivered',
  'Refactored',
  'Scaled',
  'Pioneered',
  'Devised',
  'Implemented',
  'Supervised',
];

export function analyzeJobDescriptionMatch(
  resumeText: string,
  resumeSkills: string[],
  jdText: string,
  targetRole?: string
): JdMatchResult {
  const jdLower = (jdText || '').toLowerCase();
  const resumeLower = (resumeText || '').toLowerCase();

  // Extract skills from JD text using our comprehensive taxonomy
  const jdSkills = extractSkillsFromText(jdText);

  // If JD is short or target role specified, pull in core role requirements
  const roleData = targetRole && ROLE_SKILLS[targetRole] ? ROLE_SKILLS[targetRole] : null;
  const combinedJdHardSkills = Array.from(
    new Set([
      ...jdSkills,
      ...(roleData ? [...roleData.must, ...roleData.nice] : []),
    ])
  );

  const matchedKeywords: string[] = [];
  const missingHardSkills: string[] = [];

  const resumeSkillsLower = new Set(resumeSkills.map((s) => s.toLowerCase()));

  for (const skill of combinedJdHardSkills) {
    if (resumeSkillsLower.has(skill.toLowerCase()) || resumeLower.includes(skill.toLowerCase())) {
      matchedKeywords.push(skill);
    } else {
      missingHardSkills.push(skill);
    }
  }

  // Check for soft skills mentioned in JD
  const missingSoftSkills: string[] = [];
  for (const soft of COMMON_SOFT_SKILLS) {
    if (jdLower.includes(soft) && !resumeLower.includes(soft)) {
      missingSoftSkills.push(soft.charAt(0).toUpperCase() + soft.slice(1));
    }
  }

  // Check for powerful action verbs
  const missingActionVerbs: string[] = [];
  for (const verb of POWER_ACTION_VERBS) {
    if (!resumeLower.includes(verb.toLowerCase())) {
      missingActionVerbs.push(verb);
    }
  }

  // Calculate realistic Careerflow-grade Match Percentage
  const totalRequired = Math.max(1, matchedKeywords.length + missingHardSkills.length);
  const rawRatio = matchedKeywords.length / totalRequired;
  
  // Bonus if soft skills or good action verbs are present
  const softBonus = missingSoftSkills.length === 0 ? 5 : 0;
  const score = Math.min(98, Math.max(18, Math.round(rawRatio * 85 + softBonus + 8)));

  // Generate Careerflow-style XYZ bullet rewrites
  const bulletSuggestions = generateBulletSuggestions(resumeText, matchedKeywords, missingHardSkills);

  return {
    score,
    roleTitle: targetRole || 'Target Job Description',
    matchedKeywords,
    missingHardSkills: missingHardSkills.slice(0, 10),
    missingSoftSkills: missingSoftSkills.slice(0, 6),
    missingActionVerbs: missingActionVerbs.slice(0, 6),
    bulletSuggestions,
  };
}

function generateBulletSuggestions(
  resumeText: string,
  matched: string[],
  missing: string[]
): Array<{ original: string; enhanced: string; actionVerb: string; reason: string }> {
  const topMatched = matched.slice(0, 2).join(' and ') || 'modern frameworks';
  const topMissing = missing[0] || 'CI/CD automation';

  return [
    {
      original: 'Worked on building frontend components and fixed UI bugs.',
      enhanced: `Architected responsive, accessible UI modules using ${topMatched}, reducing page load latency by 34% across 10,000+ active sessions.`,
      actionVerb: 'Architected',
      reason: 'Replaces passive "Worked on" with high-impact leadership verb and quantifiable latency outcome (XYZ formula).',
    },
    {
      original: 'Helped team deploy backend services and write database queries.',
      enhanced: `Engineered scalable REST endpoints and optimized database indexing, achieving a 45% reduction in query execution time while introducing ${topMissing}.`,
      actionVerb: 'Engineered',
      reason: 'Demonstrates active ownership and embeds the missing target keyword in a production context.',
    },
    {
      original: 'Responsible for testing and code reviews.',
      enhanced: `Spearheaded automated unit and integration testing pipelines, increasing code coverage from 62% to 91% and eliminating critical release regressions.`,
      actionVerb: 'Spearheaded',
      reason: 'Eliminates weak "Responsible for" phrasing in favor of quantifiable testing metrics.',
    },
  ];
}

export function getRoleMissingDeepDive(targetRole: string, currentSkills: string[]) {
  const roleData = ROLE_SKILLS[targetRole];
  if (!roleData) return null;

  const currentSet = new Set(currentSkills.map((s) => s.toLowerCase()));

  const mustMissing = roleData.must.filter((s: string) => !currentSet.has(s.toLowerCase()));
  const niceMissing = roleData.nice.filter((s: string) => !currentSet.has(s.toLowerCase()));
  const advancedMissing = (roleData.advanced || []).filter((s: string) => !currentSet.has(s.toLowerCase()));

  const mustHaveCount = roleData.must.length;
  const mustHaveEarned = mustHaveCount - mustMissing.length;
  const readinessPct = Math.round((mustHaveEarned / Math.max(1, mustHaveCount)) * 100);

  return {
    targetRole,
    readinessPct,
    mustHave: {
      total: mustHaveCount,
      earned: mustHaveEarned,
      missing: mustMissing,
    },
    niceToHave: {
      total: roleData.nice.length,
      missing: niceMissing,
    },
    advanced: {
      total: (roleData.advanced || []).length,
      missing: advancedMissing,
    },
  };
}
