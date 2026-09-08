export interface JobOpening {
  id: string;
  title: string;
  company: string;
  logoBadge: string;
  logoBg: string;
  location: string;
  workMode: 'Remote' | 'Hybrid' | 'On-site';
  experienceLevel: 'Fresher / Entry' | 'Junior (1-3 yrs)' | 'Mid-Senior (3-5+ yrs)';
  salaryRange: string;
  minSalaryLPA: number;
  requiredSkills: string[];
  preferredSkills: string[];
  description: string;
  postedDate: string;
  category: string;
  applyUrl: string;
  source?: 'GitHub Tech Repo' | 'Remotive Remote' | 'Arbeitnow Live' | 'Verified Portal';
  sourceUrl?: string;
}

export interface JobFitResult {
  job: JobOpening;
  fitScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  whyYouFit: string[];
}

export interface LiveStats {
  totalLiveJobs: number;
  githubRepoJobs: number;
  remoteJobs: number;
  indiaJobs: number;
}

export const CURATED_JOB_OPENINGS: JobOpening[] = [
  {
    id: 'job-1',
    title: 'Frontend Engineer (React / TypeScript)',
    company: 'Razorpay',
    logoBadge: 'RZP',
    logoBg: 'rgba(59, 130, 246, 0.18)',
    location: 'Bengaluru / Remote',
    workMode: 'Remote',
    experienceLevel: 'Junior (1-3 yrs)',
    salaryRange: '₹14–22 LPA',
    minSalaryLPA: 14,
    requiredSkills: ['React', 'TypeScript', 'JavaScript', 'HTML', 'CSS'],
    preferredSkills: ['Redux', 'REST APIs', 'Webpack', 'Tailwind CSS'],
    description: 'Build mission-critical checkout interfaces and financial merchant dashboards handling millions of daily transactions with zero downtime.',
    postedDate: '2 hours ago',
    category: 'Frontend',
    applyUrl: 'https://razorpay.com/jobs/',
  },
  {
    id: 'job-2',
    title: 'Backend Systems Developer (Node.js / Go)',
    company: 'CRED',
    logoBadge: 'CRD',
    logoBg: 'rgba(168, 85, 247, 0.18)',
    location: 'Bengaluru, Karnataka',
    workMode: 'Hybrid',
    experienceLevel: 'Junior (1-3 yrs)',
    salaryRange: '₹18–28 LPA',
    minSalaryLPA: 18,
    requiredSkills: ['Node.js', 'Express', 'SQL', 'MongoDB', 'REST APIs'],
    preferredSkills: ['Redis', 'Docker', 'System Design', 'Microservices'],
    description: 'Design ultra-low-latency event-driven microservices for high-volume rewards processing and member payment infrastructure.',
    postedDate: '4 hours ago',
    category: 'Backend',
    applyUrl: 'https://cred.club/careers',
  },
  {
    id: 'job-3',
    title: 'Associate Software Engineer',
    company: 'Microsoft',
    logoBadge: 'MSFT',
    logoBg: 'rgba(16, 185, 129, 0.18)',
    location: 'Hyderabad / Bengaluru',
    workMode: 'Hybrid',
    experienceLevel: 'Fresher / Entry',
    salaryRange: '₹16–24 LPA',
    minSalaryLPA: 16,
    requiredSkills: ['Java', 'C++', 'Data Structures', 'Algorithms', 'Git'],
    preferredSkills: ['Azure', 'REST APIs', 'SQL', 'Object-Oriented Design'],
    description: 'Work on Azure cloud services, Office core runtime, and distributed compute platforms supporting hundreds of millions of worldwide users.',
    postedDate: '5 hours ago',
    category: 'Full Stack',
    applyUrl: 'https://careers.microsoft.com/',
  },
  {
    id: 'job-4',
    title: 'Full Stack Developer',
    company: 'Swiggy',
    logoBadge: 'SWG',
    logoBg: 'rgba(249, 115, 22, 0.18)',
    location: 'Bengaluru, Karnataka',
    workMode: 'Hybrid',
    experienceLevel: 'Junior (1-3 yrs)',
    salaryRange: '₹15–23 LPA',
    minSalaryLPA: 15,
    requiredSkills: ['React', 'Node.js', 'TypeScript', 'REST APIs', 'SQL'],
    preferredSkills: ['AWS', 'Docker', 'Kafka', 'Redis'],
    description: 'Deliver high-throughput logistics, real-time tracking, and consumer ordering platforms operating at scale across 500+ Indian cities.',
    postedDate: 'Just now',
    category: 'Full Stack',
    applyUrl: 'https://careers.swiggy.com/',
  },
  {
    id: 'job-5',
    title: 'Junior Machine Learning Engineer',
    company: 'Zerodha (Rainmatter)',
    logoBadge: 'ZRD',
    logoBg: 'rgba(6, 182, 212, 0.18)',
    location: 'Bengaluru / Remote',
    workMode: 'Remote',
    experienceLevel: 'Junior (1-3 yrs)',
    salaryRange: '₹12–18 LPA',
    minSalaryLPA: 12,
    requiredSkills: ['Python', 'Pandas', 'NumPy', 'Machine Learning', 'Statistics'],
    preferredSkills: ['Scikit-learn', 'PyTorch', 'FastAPI', 'Docker'],
    description: 'Build predictive anomaly detection and quantitative research tools for India’s largest retail brokerage ecosystem.',
    postedDate: '1 day ago',
    category: 'AI / ML',
    applyUrl: 'https://zerodha.com/careers',
  },
  {
    id: 'job-6',
    title: 'Security Analyst / Penetration Tester',
    company: 'Paytm Security',
    logoBadge: 'PYTM',
    logoBg: 'rgba(239, 68, 68, 0.18)',
    location: 'Noida / Bengaluru',
    workMode: 'On-site',
    experienceLevel: 'Junior (1-3 yrs)',
    salaryRange: '₹10–18 LPA',
    minSalaryLPA: 10,
    requiredSkills: ['Network Security', 'Penetration Testing', 'Wireshark', 'Nmap', 'Linux'],
    preferredSkills: ['Burp Suite', 'Python', 'Web Application Security', 'OWASP'],
    description: 'Conduct comprehensive vulnerability assessments, API pentesting, and threat mitigation for payment gateways and wallet systems.',
    postedDate: '1 day ago',
    category: 'Cybersecurity',
    applyUrl: 'https://paytm.com/careers',
  },
  {
    id: 'job-sec-crwd',
    title: 'SOC Analyst (L1/L2 Incident Response & SIEM)',
    company: 'CrowdStrike',
    logoBadge: 'CRWD',
    logoBg: 'rgba(220, 38, 38, 0.18)',
    location: 'Pune / Remote',
    workMode: 'Remote',
    experienceLevel: 'Junior (1-3 yrs)',
    salaryRange: '₹14–24 LPA',
    minSalaryLPA: 14,
    requiredSkills: ['SOC Monitoring', 'SIEM', 'CrowdStrike Falcon', 'Incident Response', 'Network Security'],
    preferredSkills: ['Threat Hunting', 'EDR', 'Python', 'Splunk'],
    description: 'Monitor real-time endpoint security alerts, triage telemetry from CrowdStrike Falcon platform, perform threat hunting and coordinate rapid incident containment.',
    postedDate: 'Today',
    category: 'Cybersecurity',
    applyUrl: 'https://crowdstrike.wd5.myworkdayjobs.com/crowdstrikecareers',
  },
  {
    id: 'job-sec-pan',
    title: 'Security Operations Center (SOC) Analyst',
    company: 'Palo Alto Networks',
    logoBadge: 'PAN',
    logoBg: 'rgba(234, 88, 12, 0.18)',
    location: 'Bengaluru, Karnataka',
    workMode: 'Hybrid',
    experienceLevel: 'Junior (1-3 yrs)',
    salaryRange: '₹16–28 LPA',
    minSalaryLPA: 16,
    requiredSkills: ['SOC Monitoring', 'SIEM', 'Cortex XDR', 'Threat Detection', 'Network Security'],
    preferredSkills: ['Unit 42 Intel', 'Wireshark', 'Firewall', 'Incident Response'],
    description: 'Analyze anomalous security events using Cortex XSOAR and XDR. Conduct triage on malicious network traffic and collaborate with Unit 42 global threat intelligence.',
    postedDate: 'Today',
    category: 'Cybersecurity',
    applyUrl: 'https://jobs.paloaltonetworks.com/',
  },
  {
    id: 'job-sec-s1',
    title: 'Cybersecurity Operations Associate (SOC)',
    company: 'SentinelOne',
    logoBadge: 'S1',
    logoBg: 'rgba(147, 51, 234, 0.18)',
    location: 'Bengaluru / Remote',
    workMode: 'Remote',
    experienceLevel: 'Junior (1-3 yrs)',
    salaryRange: '₹12–22 LPA',
    minSalaryLPA: 12,
    requiredSkills: ['SOC Monitoring', 'Endpoint Security', 'EDR', 'Malware Analysis', 'Wireshark'],
    preferredSkills: ['Python', 'Threat Detection', 'SIEM', 'Linux'],
    description: 'Investigate endpoint detections, analyze suspicious binaries and scripts, manage alert queues, and configure autonomous threat defense policies.',
    postedDate: 'Today',
    category: 'Cybersecurity',
    applyUrl: 'https://www.sentinelone.com/careers/',
  },
  {
    id: 'job-7',
    title: 'Cloud DevOps Associate',
    company: 'Infosys Wingspan',
    logoBadge: 'INFY',
    logoBg: 'rgba(99, 102, 241, 0.18)',
    location: 'Pune / Hyderabad',
    workMode: 'Hybrid',
    experienceLevel: 'Fresher / Entry',
    salaryRange: '₹6–10 LPA',
    minSalaryLPA: 6,
    requiredSkills: ['Linux', 'Git', 'CI/CD', 'Docker', 'Bash'],
    preferredSkills: ['AWS', 'Kubernetes', 'Jenkins', 'Terraform'],
    description: 'Automate deployment workflows, monitor Kubernetes clusters, and scale enterprise container platforms for Fortune 500 clients.',
    postedDate: '2 days ago',
    category: 'DevOps / Cloud',
    applyUrl: 'https://www.infosys.com/careers/',
  },
  {
    id: 'job-8',
    title: 'Data Analyst (Product & Growth)',
    company: 'Flipkart',
    logoBadge: 'FLPK',
    logoBg: 'rgba(234, 179, 8, 0.18)',
    location: 'Bengaluru, Karnataka',
    workMode: 'Hybrid',
    experienceLevel: 'Fresher / Entry',
    salaryRange: '₹9–15 LPA',
    minSalaryLPA: 9,
    requiredSkills: ['SQL', 'Python', 'Excel', 'Data Visualization', 'Statistics'],
    preferredSkills: ['Tableau', 'Power BI', 'Pandas', 'A/B Testing'],
    description: 'Turn search, checkout, and campaign behavioral logs into actionable merchandising and pricing strategies.',
    postedDate: '2 days ago',
    category: 'Data Science',
    applyUrl: 'https://www.flipkartcareers.com/',
  },
];

export function calculateJobFit(userSkills: string[], job: JobOpening): JobFitResult {
  const userLower = new Set(userSkills.map((s) => s.toLowerCase()));

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const req of job.requiredSkills) {
    if (userLower.has(req.toLowerCase())) {
      matchedSkills.push(req);
    } else {
      missingSkills.push(req);
    }
  }

  let preferredMatches = 0;
  for (const pref of job.preferredSkills) {
    if (userLower.has(pref.toLowerCase())) {
      preferredMatches++;
      if (!matchedSkills.includes(pref)) {
        matchedSkills.push(pref);
      }
    }
  }

  const reqRatio = matchedSkills.length / Math.max(1, job.requiredSkills.length);
  const fitScore = Math.min(
    99,
    Math.max(25, Math.round(reqRatio * 75 + (preferredMatches / Math.max(1, job.preferredSkills.length)) * 20 + 5))
  );

  const whyYouFit: string[] = [];
  if (matchedSkills.length > 0) {
    whyYouFit.push(`Matches ${matchedSkills.length} of ${job.requiredSkills.length} core technical requirements`);
  }
  if (matchedSkills.includes(job.requiredSkills[0])) {
    whyYouFit.push(`Strong foundation in primary tech stack (${job.requiredSkills[0]})`);
  }
  if (preferredMatches > 0) {
    whyYouFit.push(`Brings ${preferredMatches} bonus preferred tools to the team`);
  }
  if (whyYouFit.length === 0) {
    whyYouFit.push('Entry-level baseline qualifications match company profile');
  }

  return {
    job,
    fitScore,
    matchedSkills,
    missingSkills,
    whyYouFit,
  };
}

export async function fetchLiveJobOpenings(params?: {
  what?: string;
  where?: string;
  source?: string;
  page?: number;
  limit?: number;
}): Promise<{ jobs: JobOpening[]; total: number; sources?: any }> {
  try {
    const q = new URLSearchParams();
    if (params?.what) q.set('what', params.what);
    if (params?.where) q.set('where', params.where);
    if (params?.source && params.source !== 'All') q.set('source', params.source.toLowerCase());
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));

    const res = await fetch(`/api/jobs/search?${q.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const mapped: JobOpening[] = (data.jobs || []).map((j: any, i: number) => {
      const companyInitials = (j.company || 'Tech')
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .slice(0, 3)
        .toUpperCase();
      const hues = [
        'rgba(59, 130, 246, 0.2)',
        'rgba(16, 185, 129, 0.2)',
        'rgba(168, 85, 247, 0.2)',
        'rgba(245, 158, 11, 0.2)',
        'rgba(236, 72, 153, 0.2)',
      ];
      const logoBg = hues[i % hues.length];

      return {
        id: j.id || `live-${i}`,
        title: j.title,
        company: j.company,
        logoBadge: companyInitials,
        logoBg,
        location: j.location || 'Remote',
        workMode: j.isRemote ? 'Remote' : j.location?.toLowerCase().includes('hybrid') ? 'Hybrid' : 'On-site',
        experienceLevel: j.title?.toLowerCase().includes('intern')
          ? 'Fresher / Entry'
          : j.title?.toLowerCase().includes('senior') || j.title?.toLowerCase().includes('lead')
          ? 'Mid-Senior (3-5+ yrs)'
          : 'Junior (1-3 yrs)',
        salaryRange: j.salaryBand || (j.salaryMin ? `₹${j.salaryMin}–${j.salaryMax} LPA` : 'Competitive Benchmark'),
        minSalaryLPA: j.salaryMin || 10,
        requiredSkills: (j.tags && j.tags.length > 0) ? j.tags.slice(0, 5) : ['JavaScript', 'Git', 'Problem Solving'],
        preferredSkills: (j.tags && j.tags.length > 5) ? j.tags.slice(5) : ['Communication', 'Agile'],
        description: j.descriptionSnippet || `Live technical opening at ${j.company} for ${j.title}. Verified recruitment portal posting.`,
        postedDate: j.postedAt || 'Active Now',
        category: j.category || 'Software Engineering',
        applyUrl: j.applyUrl || '#',
        source: j.source,
        sourceUrl: j.sourceUrl,
      };
    });

    return { jobs: mapped, total: data.total || mapped.length, sources: data.sources };
  } catch (err) {
    console.warn('[jobright] Failed to fetch live jobs from backend, using curated pool:', err);
    return { jobs: CURATED_JOB_OPENINGS, total: CURATED_JOB_OPENINGS.length };
  }
}

export async function fetchLiveStats(): Promise<LiveStats | null> {
  try {
    const res = await fetch('/api/jobs/stats');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
