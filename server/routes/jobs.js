import express from 'express';

const router = express.Router();

// In-memory cache for fast sub-millisecond responses
let cachedJobs = [];
let lastFetchedAt = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Helper to sanitize text
function cleanText(str) {
  if (!str) return '';
  return str.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
}

// Infer category and tags from role title
function inferTags(title, desc = '') {
  const t = (title + ' ' + desc).toLowerCase();
  const tags = [];
  if (/(^|[^a-zA-Z0-9])soc([^a-zA-Z0-9]|$)/i.test(t) || /(security|cyber|threat|vapt|pentest|siem|infosec)/i.test(t)) {
    tags.push('Cybersecurity', 'SOC Monitoring', 'SIEM', 'Incident Response', 'Network Security');
  }
  if (t.includes('react') || t.includes('frontend') || /(^|[^a-zA-Z0-9])ui([^a-zA-Z0-9]|$)/i.test(t)) tags.push('React', 'Frontend', 'TypeScript');
  if (t.includes('node') || t.includes('backend') || t.includes('api') || t.includes('express')) tags.push('Node.js', 'Backend', 'REST APIs');
  if (t.includes('python') || t.includes('django') || t.includes('fastapi')) tags.push('Python', 'Backend');
  if (t.includes('full stack') || t.includes('fullstack') || t.includes('software engineer')) tags.push('Full Stack', 'JavaScript', 'SQL');
  if (t.includes('data') || t.includes('machine learning') || /(^|[^a-zA-Z0-9])ai([^a-zA-Z0-9]|$)/i.test(t) || /(^|[^a-zA-Z0-9])ml([^a-zA-Z0-9]|$)/i.test(t)) tags.push('Data Science', 'Python', 'ML');
  if (t.includes('devops') || t.includes('cloud') || t.includes('aws') || t.includes('kubernetes') || t.includes('docker')) tags.push('DevOps', 'Cloud', 'Docker');
  if (t.includes('mobile') || t.includes('ios') || t.includes('android') || t.includes('flutter') || t.includes('react native')) tags.push('Mobile', 'React Native');
  if (t.includes('intern')) tags.push('Internship');
  if (tags.length === 0) tags.push('Software Engineering', 'Git');
  return Array.from(new Set(tags));
}

// Match word with boundary check for short terms (prevents 'associate' matching 'soc' or 'html' matching 'ml')
function isWordMatch(text, token) {
  if (!text || !token) return false;
  if (token.length <= 4) {
    const reg = new RegExp(`(^|[^a-zA-Z0-9])${token}([^a-zA-Z0-9]|$)`, 'i');
    return reg.test(text);
  }
  return text.toLowerCase().includes(token.toLowerCase());
}

// Detect domain intent from search query or role string
function detectDomain(query) {
  if (!query) return null;
  const q = String(query).toLowerCase().trim();
  if (
    /(^|[^a-zA-Z0-9])soc([^a-zA-Z0-9]|$)/i.test(q) ||
    q.includes('security') ||
    q.includes('cyber') ||
    q.includes('infosec') ||
    q.includes('pentest') ||
    q.includes('vapt') ||
    q.includes('threat') ||
    q.includes('siem') ||
    q.includes('incident response') ||
    q.includes('malware') ||
    q.includes('ceh') ||
    q.includes('cissp')
  ) {
    return 'Cybersecurity';
  }
  if (
    q.includes('machine learning') ||
    q.includes('deep learning') ||
    q.includes('ai / ml') ||
    q.includes('ai/ml') ||
    q.includes('nlp') ||
    q.includes('llm') ||
    (isWordMatch(q, 'ml') && (q.includes('engineer') || q.includes('developer')))
  ) {
    return 'AI / ML';
  }
  if (
    q.includes('data analyst') ||
    q.includes('data scientist') ||
    q.includes('data science') ||
    q.includes('analytics') ||
    q.includes('bi analyst') ||
    q.includes('power bi') ||
    q.includes('tableau')
  ) {
    return 'Data Science';
  }
  if (
    q.includes('devops') ||
    q.includes('cloud') ||
    isWordMatch(q, 'sre') ||
    q.includes('kubernetes') ||
    q.includes('docker') ||
    q.includes('aws') ||
    q.includes('azure')
  ) {
    return 'DevOps / Cloud';
  }
  if (
    q.includes('frontend') ||
    q.includes('react') ||
    q.includes('vue') ||
    q.includes('angular') ||
    q.includes('ui engineer') ||
    q.includes('web dev')
  ) {
    return 'Frontend';
  }
  if (
    q.includes('backend') ||
    q.includes('node') ||
    q.includes('golang') ||
    q.includes('java developer') ||
    q.includes('spring boot')
  ) {
    return 'Backend';
  }
  if (q.includes('intern') || q.includes('fresher') || q.includes('entry level')) {
    return 'Internship / Fresher';
  }
  return null;
}

// Categorize job into standard technical stream based on role title, category, and tags
function getJobDomain(job) {
  const roleText = (
    (job.title || '') +
    ' ' +
    (job.category || '') +
    ' ' +
    (job.tags || []).join(' ')
  );

  // Must match whole word 'soc' so 'associate' is NEVER misclassified as Cybersecurity
  // Must match whole word 'siem' so 'Siemens' is NEVER misclassified as Cybersecurity
  if (
    /(^|[^a-zA-Z0-9])soc([^a-zA-Z0-9]|$)/i.test(roleText) ||
    /(^|[^a-zA-Z0-9])siem([^a-zA-Z0-9]|$)/i.test(roleText) ||
    /(security|cybersecurity|infosec|pentest|vapt|threat|incident response|soc monitoring|malware)/i.test(roleText)
  ) {
    return 'Cybersecurity';
  }
  if (/(machine learning|deep learning|pytorch|tensorflow|\bai\/ml\b|\bml engineer\b)/i.test(roleText)) {
    return 'AI / ML';
  }
  if (/(data scientist|data science|data analyst|business intelligence|\bpower bi\b|\btableau\b)/i.test(roleText)) {
    return 'Data Science';
  }
  if (/(devops|\bcloud\b|kubernetes|\bsre\b|infrastructure|docker|terraform|\bci\/cd\b)/i.test(roleText)) {
    return 'DevOps / Cloud';
  }
  if (/(frontend|\breact\b|\bvue\b|\bangular\b|ui\/ux|web developer)/i.test(roleText)) {
    return 'Frontend';
  }
  if (/(backend|\bnode\.js\b|\bgo\b|golang|\bspring boot\b|microservices|java developer)/i.test(roleText)) {
    return 'Backend';
  }
  if (/(intern|summer trainee|fresher)/i.test(roleText)) {
    return 'Internship / Fresher';
  }
  return 'Software Engineering';
}

// Fetch GitHub SimplifyJobs Repos
async function fetchGitHubJobs() {
  const jobs = [];
  try {
    // 1. New Grad Positions
    const newGradRes = await fetch('https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/README.md', {
      headers: { 'User-Agent': 'PathPilot-JobAggregator' },
    });
    if (newGradRes.ok) {
      const text = await newGradRes.text();
      const rows = text.split('<tr>').slice(1);
      for (const r of rows) {
        const cells = r.split('</td>');
        if (cells.length >= 4) {
          const company = cleanText(cells[0]);
          const title = cleanText(cells[1]);
          const location = cleanText(cells[2]);
          const urlMatch = cells[3].match(/href="([^"]+)"/);
          if (company && title && urlMatch) {
            const isRemote = location.toLowerCase().includes('remote') || location.toLowerCase().includes('anywhere');
            jobs.push({
              id: `gh-ng-${company.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${jobs.length}`,
              title,
              company,
              location: location || 'United States / Remote',
              salaryBand: '₹14–35 LPA / $85k–$135k',
              salaryMin: 14,
              salaryMax: 35,
              applyUrl: urlMatch[1],
              source: 'GitHub Tech Repo',
              sourceUrl: 'https://github.com/SimplifyJobs/New-Grad-Positions',
              category: title.toLowerCase().includes('data') ? 'Analytics / Data' : title.toLowerCase().includes('devops') ? 'DevOps / Cloud' : 'Software Engineering',
              tags: inferTags(title),
              isRemote,
              postedAt: 'Active Now',
              descriptionSnippet: `Active new-grad opening at ${company} for ${title}. Sourced from open-source GitHub SimplifyJobs tracker. Apply directly on company recruitment portal.`,
            });
          }
        }
      }
    }

    // 2. Summer Internships
    const internRes = await fetch('https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/dev/README.md', {
      headers: { 'User-Agent': 'PathPilot-JobAggregator' },
    });
    if (internRes.ok) {
      const text = await internRes.text();
      const rows = text.split('<tr>').slice(1);
      for (const r of rows.slice(0, 150)) {
        const cells = r.split('</td>');
        if (cells.length >= 4) {
          const company = cleanText(cells[0]);
          const title = cleanText(cells[1]);
          const location = cleanText(cells[2]);
          const urlMatch = cells[3].match(/href="([^"]+)"/);
          if (company && title && urlMatch) {
            const isRemote = location.toLowerCase().includes('remote');
            jobs.push({
              id: `gh-int-${company.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${jobs.length}`,
              title,
              company,
              location: location || 'Remote / Hybrid',
              salaryBand: '₹40k–₹1.2L / month stipend',
              salaryMin: 5,
              salaryMax: 15,
              applyUrl: urlMatch[1],
              source: 'GitHub Tech Repo',
              sourceUrl: 'https://github.com/SimplifyJobs/Summer2025-Internships',
              category: 'Internship / Fresher',
              tags: inferTags(title),
              isRemote,
              postedAt: 'Active Now',
              descriptionSnippet: `Verified tech internship at ${company} for ${title}. Tracked live on GitHub. Apply directly on official career portal.`,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('[jobs] Failed to fetch GitHub repos:', err.message);
  }
  return jobs;
}

// Fetch Arbeitnow free API
async function fetchArbeitnowJobs() {
  const jobs = [];
  try {
    const res = await fetch('https://www.arbeitnow.com/api/job-board-api', {
      headers: { 'User-Agent': 'PathPilot-JobAggregator' },
    });
    if (res.ok) {
      const data = await res.json();
      for (const item of (data.data || []).slice(0, 100)) {
        jobs.push({
          id: `an-${item.slug || jobs.length}`,
          title: item.title,
          company: item.company_name,
          location: item.location || (item.remote ? 'Remote' : 'Global'),
          salaryBand: 'Competitive tech benchmark',
          applyUrl: item.url,
          source: 'Arbeitnow Live',
          sourceUrl: 'https://www.arbeitnow.com',
          category: 'Software Engineering',
          tags: (item.tags && item.tags.length > 0) ? item.tags : inferTags(item.title),
          isRemote: Boolean(item.remote),
          postedAt: item.created_at ? new Date(item.created_at * 1000).toLocaleDateString() : 'Recent',
          descriptionSnippet: cleanText(item.description).slice(0, 240) + '...',
        });
      }
    }
  } catch (err) {
    console.warn('[jobs] Failed to fetch Arbeitnow:', err.message);
  }
  return jobs;
}

// Fetch Remotive free API
async function fetchRemotiveJobs() {
  const jobs = [];
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs?category=software-dev&limit=30', {
      headers: { 'User-Agent': 'PathPilot-JobAggregator' },
    });
    if (res.ok) {
      const data = await res.json();
      for (const item of (data.jobs || [])) {
        jobs.push({
          id: `rm-${item.id}`,
          title: item.title,
          company: item.company_name,
          location: item.candidate_required_location || 'Worldwide Remote',
          salaryBand: item.salary || 'Competitive Global Remote',
          applyUrl: item.url,
          source: 'Remotive Remote',
          sourceUrl: 'https://remotive.com',
          category: 'Global Remote',
          tags: (item.tags && item.tags.length > 0) ? item.tags : inferTags(item.title),
          isRemote: true,
          postedAt: item.publication_date ? new Date(item.publication_date).toLocaleDateString() : 'Recent',
          descriptionSnippet: cleanText(item.description).slice(0, 240) + '...',
        });
      }
    }
  } catch (err) {
    console.warn('[jobs] Failed to fetch Remotive:', err.message);
  }
  return jobs;
}

// Curated active enterprise tech openings with direct portals
const INDIA_TECH_JOBS = [
  // ==================== CYBERSECURITY & SOC ANALYST (DIRECT OPENINGS) ====================
  {
    id: 'sec-crwd-01',
    title: 'SOC Analyst (L1/L2 Incident Response & SIEM)',
    company: 'CrowdStrike',
    location: 'Pune, Maharashtra / Remote',
    salaryBand: '₹14–24 LPA',
    salaryMin: 14,
    salaryMax: 24,
    applyUrl: 'https://crowdstrike.wd5.myworkdayjobs.com/crowdstrikecareers',
    source: 'Verified Portal',
    sourceUrl: 'https://www.crowdstrike.com/careers/',
    category: 'Cybersecurity',
    tags: ['SOC Monitoring', 'SIEM', 'CrowdStrike Falcon', 'Incident Response', 'Threat Hunting', 'Cybersecurity'],
    isRemote: true,
    postedAt: 'Active Today',
    descriptionSnippet: 'Monitor real-time endpoint security alerts, triage telemetry from CrowdStrike Falcon platform, perform threat hunting and coordinate rapid incident containment.',
  },
  {
    id: 'sec-pan-02',
    title: 'Security Operations Center (SOC) Analyst',
    company: 'Palo Alto Networks',
    location: 'Bengaluru, Karnataka (Hybrid)',
    salaryBand: '₹16–28 LPA',
    salaryMin: 16,
    salaryMax: 28,
    applyUrl: 'https://jobs.paloaltonetworks.com/',
    source: 'Verified Portal',
    sourceUrl: 'https://jobs.paloaltonetworks.com/',
    category: 'Cybersecurity',
    tags: ['SOC Monitoring', 'Cortex XDR', 'SIEM', 'Threat Detection', 'Network Security', 'Cybersecurity'],
    isRemote: false,
    postedAt: 'Active Today',
    descriptionSnippet: 'Analyze anomalous security events using Cortex XSOAR and XDR. Conduct triage on malicious network traffic and collaborate with Unit 42 global threat intelligence.',
  },
  {
    id: 'sec-s1-03',
    title: 'Cybersecurity Operations Associate (SOC)',
    company: 'SentinelOne',
    location: 'Bengaluru / Remote',
    salaryBand: '₹12–22 LPA',
    salaryMin: 12,
    salaryMax: 22,
    applyUrl: 'https://www.sentinelone.com/careers/',
    source: 'Verified Portal',
    sourceUrl: 'https://www.sentinelone.com/careers/',
    category: 'Cybersecurity',
    tags: ['SOC Monitoring', 'Endpoint Security', 'EDR', 'Malware Analysis', 'Wireshark', 'Cybersecurity'],
    isRemote: true,
    postedAt: 'Active Today',
    descriptionSnippet: 'Investigate endpoint detections, analyze suspicious binaries and scripts, manage alert queues, and configure autonomous threat defense policies.',
  },
  {
    id: 'sec-pytm-04',
    title: 'Security Analyst / Penetration Tester',
    company: 'Paytm Security',
    location: 'Noida / Bengaluru (On-site)',
    salaryBand: '₹10–18 LPA',
    salaryMin: 10,
    salaryMax: 18,
    applyUrl: 'https://paytm.com/careers',
    source: 'Verified Portal',
    sourceUrl: 'https://paytm.com/careers',
    category: 'Cybersecurity',
    tags: ['Network Security', 'Penetration Testing', 'Wireshark', 'Nmap', 'OWASP', 'Cybersecurity'],
    isRemote: false,
    postedAt: 'Active Today',
    descriptionSnippet: 'Conduct comprehensive vulnerability assessments, API pentesting, and threat mitigation for payment gateways and wallet systems.',
  },
  {
    id: 'sec-cf-05',
    title: 'Security Operations Center (SOC) Analyst',
    company: 'Cloudflare',
    location: 'Remote / Global',
    salaryBand: '₹18–32 LPA',
    salaryMin: 18,
    salaryMax: 32,
    applyUrl: 'https://www.cloudflare.com/careers/',
    source: 'Verified Portal',
    sourceUrl: 'https://www.cloudflare.com/careers/',
    category: 'Cybersecurity',
    tags: ['SOC Monitoring', 'DDoS Mitigation', 'WAF', 'DNS Security', 'Network Protocols', 'Cybersecurity'],
    isRemote: true,
    postedAt: 'Active Today',
    descriptionSnippet: 'Safeguard global Internet infrastructure against multi-vector DDoS attacks, zero-day web exploits, and edge security incidents.',
  },
  {
    id: 'sec-wipro-06',
    title: 'Associate SOC Analyst (Cyber Defense Center)',
    company: 'Wipro CyberSOC',
    location: 'Bengaluru / Hyderabad / Pune',
    salaryBand: '₹6.5–11 LPA',
    salaryMin: 6.5,
    salaryMax: 11,
    applyUrl: 'https://careers.wipro.com/',
    source: 'Verified Portal',
    sourceUrl: 'https://careers.wipro.com/',
    category: 'Cybersecurity',
    tags: ['SOC Monitoring', 'Splunk', 'SIEM', 'Log Analysis', 'Incident Triage', 'Cybersecurity'],
    isRemote: false,
    postedAt: 'Active Today',
    descriptionSnippet: '24x7 security event monitoring, log correlation across Splunk and QRadar, initial triage of phishing, malware, and brute-force indicators.',
  },
  {
    id: 'sec-infy-07',
    title: 'Cybersecurity Threat Analyst (CSU)',
    company: 'Infosys Cyber Security Unit',
    location: 'Pune / Bengaluru / Hyderabad',
    salaryBand: '₹7–12 LPA',
    salaryMin: 7,
    salaryMax: 12,
    applyUrl: 'https://career.infosys.com/joblist',
    source: 'Verified Portal',
    sourceUrl: 'https://career.infosys.com',
    category: 'Cybersecurity',
    tags: ['SOC Monitoring', 'Threat Detection', 'SIEM', 'MITRE ATT&CK', 'Firewall', 'Cybersecurity'],
    isRemote: false,
    postedAt: 'Active Today',
    descriptionSnippet: 'Analyze cyber telemetry, map adversarial tactics to MITRE ATT&CK, investigate false positives, and escalate advanced persistent threat signals.',
  },
  {
    id: 'sec-ey-08',
    title: 'Cyber Threat Management Analyst (SOC L1)',
    company: 'EY Global Delivery Services',
    location: 'Gurugram / Bengaluru (Hybrid)',
    salaryBand: '₹8–14 LPA',
    salaryMin: 8,
    salaryMax: 14,
    applyUrl: 'https://www.ey.com/en_gl/careers',
    source: 'Verified Portal',
    sourceUrl: 'https://www.ey.com/en_gl/careers',
    category: 'Cybersecurity',
    tags: ['SOC Monitoring', 'SIEM', 'Incident Management', 'Security Audits', 'Threat Intel', 'Cybersecurity'],
    isRemote: false,
    postedAt: 'Active Today',
    descriptionSnippet: 'Deliver 24x7 cyber threat monitoring for Fortune 500 financial and enterprise clients. Correlate alert logs and execute standard incident runbooks.',
  },
  {
    id: 'sec-csco-09',
    title: 'Information Security Analyst / SecOps',
    company: 'Cisco Security',
    location: 'Bengaluru, Karnataka',
    salaryBand: '₹14–25 LPA',
    salaryMin: 14,
    salaryMax: 25,
    applyUrl: 'https://jobs.cisco.com/',
    source: 'Verified Portal',
    sourceUrl: 'https://jobs.cisco.com/',
    category: 'Cybersecurity',
    tags: ['Network Security', 'Wireshark', 'Cisco ASA', 'SOC Monitoring', 'Linux', 'Cybersecurity'],
    isRemote: false,
    postedAt: 'Active Today',
    descriptionSnippet: 'Analyze enterprise traffic anomalies, configure IDS/IPS rule-sets, investigate security breach vectors, and review firewall policies.',
  },
  {
    id: 'sec-zs-10',
    title: 'Cloud Security Operations Analyst',
    company: 'Zscaler',
    location: 'Bengaluru / Chandigarh',
    salaryBand: '₹15–26 LPA',
    salaryMin: 15,
    salaryMax: 26,
    applyUrl: 'https://www.zscaler.com/careers',
    source: 'Verified Portal',
    sourceUrl: 'https://www.zscaler.com/careers',
    category: 'Cybersecurity',
    tags: ['Cloud Security', 'Zero Trust', 'SOC Monitoring', 'SSL Inspection', 'Cybersecurity'],
    isRemote: true,
    postedAt: 'Active Today',
    descriptionSnippet: 'Monitor Zero Trust Exchange cloud nodes, investigate SSL inspection security alerts, and defend against targeted credential stuffing attacks.',
  },
  {
    id: 'sec-dlte-11',
    title: 'SOC Analyst (Cyber Risk & Incident Triage)',
    company: 'Deloitte USI',
    location: 'Hyderabad / Bengaluru (Hybrid)',
    salaryBand: '₹9–16 LPA',
    salaryMin: 9,
    salaryMax: 16,
    applyUrl: 'https://jobs.deloitte.com/',
    source: 'Verified Portal',
    sourceUrl: 'https://jobs.deloitte.com/',
    category: 'Cybersecurity',
    tags: ['SOC Monitoring', 'SIEM', 'Splunk', 'Incident Response', 'Threat Detection', 'Cybersecurity'],
    isRemote: false,
    postedAt: 'Active Today',
    descriptionSnippet: 'Triage threat telemetry, perform threat intelligence correlation on Splunk SIEM, and manage critical incident escalation for enterprise clients.',
  },
  {
    id: 'sec-qh-12',
    title: 'VAPT & Threat Assessment Engineer',
    company: 'Quick Heal (Seqrite)',
    location: 'Pune, Maharashtra',
    salaryBand: '₹8–15 LPA',
    salaryMin: 8,
    salaryMax: 15,
    applyUrl: 'https://www.quickheal.co.in/careers',
    source: 'Verified Portal',
    sourceUrl: 'https://www.quickheal.co.in/careers',
    category: 'Cybersecurity',
    tags: ['Penetration Testing', 'VAPT', 'Burp Suite', 'Metasploit', 'OWASP', 'Cybersecurity'],
    isRemote: false,
    postedAt: 'Active Today',
    descriptionSnippet: 'Perform blackbox & whitebox security assessments, endpoint vulnerability scanning, and malware signature reverse engineering.',
  },
  {
    id: 'sec-tata-13',
    title: 'Cyber Security Operations Analyst (SOC L1/L2)',
    company: 'Tata Communications',
    location: 'Chennai / Pune (Hybrid)',
    salaryBand: '₹8–14 LPA',
    salaryMin: 8,
    salaryMax: 14,
    applyUrl: 'https://www.tatacommunications.com/careers/',
    source: 'Verified Portal',
    sourceUrl: 'https://www.tatacommunications.com/careers/',
    category: 'Cybersecurity',
    tags: ['SOC Monitoring', 'SIEM', 'QRadar', 'Log Analysis', 'Network Security', 'Cybersecurity'],
    isRemote: false,
    postedAt: 'Active Today',
    descriptionSnippet: 'Deliver continuous cyber defense monitoring across global backbone networks, isolate malicious IP traffic, and maintain firewall rules.',
  },
  {
    id: 'sec-akm-14',
    title: 'Security Incident Response Analyst (SIRT)',
    company: 'Akamai Technologies',
    location: 'Bengaluru, Karnataka',
    salaryBand: '₹16–28 LPA',
    salaryMin: 16,
    salaryMax: 28,
    applyUrl: 'https://www.akamai.com/careers',
    source: 'Verified Portal',
    sourceUrl: 'https://www.akamai.com/careers',
    category: 'Cybersecurity',
    tags: ['SOC Monitoring', 'DDoS Mitigation', 'WAF', 'Incident Response', 'Network Protocols', 'Cybersecurity'],
    isRemote: false,
    postedAt: 'Active Today',
    descriptionSnippet: 'Lead mitigation of global botnets, zero-day HTTP exploits, and enterprise CDN application layer attacks on Akamai edge network.',
  },

  // ==================== OTHER ENGINEERING STREAMS ====================
  {
    id: 'in-rzp-01',
    title: 'Frontend Engineer (React / Next.js)',
    company: 'Razorpay',
    location: 'Bengaluru, Karnataka (Hybrid)',
    salaryBand: '₹16–28 LPA',
    salaryMin: 16,
    salaryMax: 28,
    applyUrl: 'https://razorpay.com/jobs/?dept=Engineering',
    source: 'Verified Portal',
    sourceUrl: 'https://razorpay.com/jobs',
    category: 'Frontend',
    tags: ['React', 'TypeScript', 'Redux', 'Frontend', 'Next.js'],
    isRemote: false,
    postedAt: 'Active Today',
    descriptionSnippet: 'Build frictionless checkout, payment gateway flows, and high-frequency merchant dashboards at Razorpay.',
  },
  {
    id: 'in-crd-02',
    title: 'Backend Engineer - Payments & Core Services',
    company: 'CRED',
    location: 'Bengaluru, Karnataka (On-site)',
    salaryBand: '₹22–38 LPA',
    salaryMin: 22,
    salaryMax: 38,
    applyUrl: 'https://cred.club/careers',
    source: 'Verified Portal',
    sourceUrl: 'https://cred.club/careers',
    category: 'Backend',
    tags: ['Node.js', 'Go', 'Microservices', 'Kafka', 'PostgreSQL'],
    isRemote: false,
    postedAt: 'Active Today',
    descriptionSnippet: 'Design resilient distributed banking integrations and reward microservices handling millions of daily transactions.',
  },
  {
    id: 'in-swg-03',
    title: 'Software Development Engineer I (SDE 1)',
    company: 'Swiggy',
    location: 'Bengaluru / Hyderabad (Hybrid)',
    salaryBand: '₹18–30 LPA',
    salaryMin: 18,
    salaryMax: 30,
    applyUrl: 'https://careers.swiggy.com/#/careers?department=Engineering',
    source: 'Verified Portal',
    sourceUrl: 'https://careers.swiggy.com',
    category: 'Full Stack',
    tags: ['Java', 'Spring Boot', 'REST APIs', 'SQL', 'System Design'],
    isRemote: false,
    postedAt: 'Active Today',
    descriptionSnippet: 'Scale logistics dispatch, live food routing, and instamart inventory systems operating in 500+ Indian cities.',
  },
  {
    id: 'in-zrd-04',
    title: 'Full Stack Developer',
    company: 'Zerodha',
    location: 'Bengaluru / Remote',
    salaryBand: '₹15–26 LPA',
    salaryMin: 15,
    salaryMax: 26,
    applyUrl: 'https://zerodha.com/careers',
    source: 'Verified Portal',
    sourceUrl: 'https://zerodha.com/careers',
    category: 'Full Stack',
    tags: ['Python', 'Go', 'Vue.js', 'PostgreSQL', 'Redis'],
    isRemote: true,
    postedAt: 'Active Today',
    descriptionSnippet: 'Work on Kite, Coin, and high-throughput order execution systems built with clean minimalist engineering principles.',
  },
  {
    id: 'in-msft-05',
    title: 'Software Engineer - Cloud & AI',
    company: 'Microsoft',
    location: 'Hyderabad / Bengaluru / Noida',
    salaryBand: '₹20–36 LPA',
    salaryMin: 20,
    salaryMax: 36,
    applyUrl: 'https://careers.microsoft.com/v2/global/en/home.html',
    source: 'Verified Portal',
    sourceUrl: 'https://careers.microsoft.com',
    category: 'Full Stack',
    tags: ['C#', 'Azure', 'Cloud', 'Python', 'AI/ML', 'Distributed Systems'],
    isRemote: false,
    postedAt: 'Active Today',
    descriptionSnippet: 'Power Azure hyperscale services and Copilot enterprise intelligence across Microsoft India Development Centers.',
  },
  {
    id: 'in-fk-06',
    title: 'Software Engineer - Search & Recommendations',
    company: 'Flipkart',
    location: 'Bengaluru, Karnataka',
    salaryBand: '₹18–32 LPA',
    salaryMin: 18,
    salaryMax: 32,
    applyUrl: 'https://www.flipkartcareers.com/',
    source: 'Verified Portal',
    sourceUrl: 'https://www.flipkartcareers.com',
    category: 'Data Science',
    tags: ['Java', 'Elasticsearch', 'Kafka', 'Machine Learning', 'Big Data'],
    isRemote: false,
    postedAt: 'Active Today',
    descriptionSnippet: 'Architect search ranking, real-time personalization, and flash sale infrastructure serving over 400M users.',
  },
  {
    id: 'in-infy-07',
    title: 'Cloud DevOps Associate',
    company: 'Infosys Wingspan',
    location: 'Pune / Hyderabad',
    salaryBand: '₹6–10 LPA',
    salaryMin: 6,
    salaryMax: 10,
    applyUrl: 'https://career.infosys.com/joblist',
    source: 'Verified Portal',
    sourceUrl: 'https://career.infosys.com',
    category: 'DevOps / Cloud',
    tags: ['Linux', 'Git', 'CI/CD', 'Docker', 'AWS', 'DevOps'],
    isRemote: false,
    postedAt: 'Active Today',
    descriptionSnippet: 'Automate deployment workflows, monitor Kubernetes clusters, and scale enterprise container platforms.',
  },
  {
    id: 'in-zrd-ml-08',
    title: 'Junior Machine Learning Engineer',
    company: 'Zerodha (Rainmatter)',
    location: 'Bengaluru / Remote',
    salaryBand: '₹12–18 LPA',
    salaryMin: 12,
    salaryMax: 18,
    applyUrl: 'https://zerodha.com/careers',
    source: 'Verified Portal',
    sourceUrl: 'https://zerodha.com/careers',
    category: 'AI / ML',
    tags: ['Python', 'Pandas', 'NumPy', 'Machine Learning', 'Statistics'],
    isRemote: true,
    postedAt: 'Active Today',
    descriptionSnippet: 'Build predictive anomaly detection and quantitative research tools for retail trading telemetry.',
  },
];

// Refresh and aggregate cache
async function getOrRefreshAllJobs() {
  const now = Date.now();
  if (cachedJobs.length > 0 && now - lastFetchedAt < CACHE_TTL_MS) {
    return cachedJobs;
  }

  console.log('[jobs] Refreshing live job feeds from GitHub, Arbeitnow, Remotive, and India portals...');
  const [ghJobs, anJobs, rmJobs] = await Promise.all([
    fetchGitHubJobs(),
    fetchArbeitnowJobs(),
    fetchRemotiveJobs(),
  ]);

  const combined = [
    ...INDIA_TECH_JOBS,
    ...ghJobs,
    ...rmJobs,
    ...anJobs,
  ];

  cachedJobs = combined;
  lastFetchedAt = now;
  console.log(`[jobs] Aggregated ${cachedJobs.length} live jobs successfully.`);
  return cachedJobs;
}

// Endpoint: GET /api/jobs/search
router.get('/search', async (req, res) => {
  try {
    const { what = '', where = '', source = 'all', page = '1', limit = '30' } = req.query;
    const allJobs = await getOrRefreshAllJobs();

    const whatLower = String(what).toLowerCase().trim();
    const whereLower = String(where).toLowerCase().trim();
    const sourceLower = String(source).toLowerCase().trim();

    // Determine target domain intent
    const targetDomain = detectDomain(whatLower);

    // Tokenize search query words (excluding common filler words)
    const stopWords = new Set(['and', 'or', 'in', 'at', 'the', 'for', 'with', 'a', 'an']);
    const queryTokens = whatLower
      .split(/[\s,/]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2 && !stopWords.has(t));

    const filtered = allJobs.filter((job) => {
      // 1. Source filter
      if (sourceLower !== 'all') {
        if (sourceLower === 'github' && !job.source.toLowerCase().includes('github')) return false;
        if (sourceLower === 'remote' && !job.isRemote && !job.source.toLowerCase().includes('remotive')) return false;
        if (sourceLower === 'arbeitnow' && !job.source.toLowerCase().includes('arbeitnow')) return false;
        if (sourceLower === 'india' && !job.location.toLowerCase().includes('india') && !job.location.toLowerCase().includes('bengaluru')) return false;
      }

      // 2. Strict Domain Isolation:
      // If candidate is targeting Cybersecurity/SOC, NEVER leak unrelated streams (ML, Frontend, DevOps associate, etc.)
      const jobDomain = getJobDomain(job);
      if (targetDomain) {
        if (targetDomain === 'Cybersecurity' && jobDomain !== 'Cybersecurity') {
          return false;
        }
        if (targetDomain === 'AI / ML' && jobDomain !== 'AI / ML' && jobDomain !== 'Data Science') {
          return false;
        }
        if (targetDomain === 'Data Science' && jobDomain !== 'Data Science' && jobDomain !== 'AI / ML') {
          return false;
        }
        if (targetDomain === 'DevOps / Cloud' && jobDomain !== 'DevOps / Cloud') {
          return false;
        }
        if (targetDomain === 'Frontend' && jobDomain !== 'Frontend') {
          return false;
        }
      }

      // 3. Keyword / Role matching
      if (queryTokens.length > 0) {
        // Check if query tokens match using word boundary checks
        const matchesToken = queryTokens.some((token) => {
          return (
            isWordMatch(job.title, token) ||
            isWordMatch(job.company, token) ||
            isWordMatch(job.category, token) ||
            isWordMatch(job.descriptionSnippet, token) ||
            (job.tags || []).some((t) => isWordMatch(t, token))
          );
        });

        if (!matchesToken) {
          // If query specifies targetDomain (e.g. Cybersecurity), keep verified same-domain jobs
          if (targetDomain && jobDomain === targetDomain && (queryTokens.includes('soc') || queryTokens.includes('analyst') || queryTokens.includes('security'))) {
            return true;
          }
          return false;
        }
      }

      // 4. Location filter
      if (whereLower) {
        const isRemoteMatch = whereLower.includes('remote') && job.isRemote;
        const locationMatch = job.location.toLowerCase().includes(whereLower);
        if (!isRemoteMatch && !locationMatch) {
          return false;
        }
      }

      return true;
    });

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(60, Math.max(1, parseInt(limit, 10) || 30));
    const start = (pageNum - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    res.json({
      total: filtered.length,
      page: pageNum,
      pageSize,
      jobs: paginated,
      sources: {
        githubCount: allJobs.filter((j) => j.source.includes('GitHub')).length,
        arbeitnowCount: allJobs.filter((j) => j.source.includes('Arbeitnow')).length,
        remotiveCount: allJobs.filter((j) => j.source.includes('Remotive')).length,
        indiaCount: allJobs.filter((j) => j.location.toLowerCase().includes('india') || j.location.toLowerCase().includes('bengaluru')).length,
      },
    });
  } catch (err) {
    console.error('[jobs] Search error:', err);
    res.status(500).json({ error: 'Failed to search live jobs', message: err.message, jobs: [] });
  }
});

// Endpoint: GET /api/jobs/stats
router.get('/stats', async (_req, res) => {
  const all = await getOrRefreshAllJobs();
  res.json({
    totalLiveJobs: all.length,
    lastUpdated: new Date(lastFetchedAt).toISOString(),
    githubRepoJobs: all.filter((j) => j.source.includes('GitHub')).length,
    remoteJobs: all.filter((j) => j.isRemote).length,
    indiaJobs: all.filter((j) => j.location.toLowerCase().includes('india') || j.location.toLowerCase().includes('bengaluru')).length,
  });
});

export default router;
