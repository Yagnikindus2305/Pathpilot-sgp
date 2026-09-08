export interface InterviewQuestion {
  id: string;
  roleCategory: string;
  question: string;
  context: string;
  evaluationCriteria: string[];
  sampleStarAnswer: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
}

export interface InterviewEvaluation {
  overallScore: number;
  technicalAccuracyScore: number;
  starStructureScore: number;
  communicationScore: number;
  strengths: string[];
  improvements: string[];
  modelAnswer: string;
}

export const INTERVIEW_QUESTIONS: Record<string, InterviewQuestion[]> = {
  'Cybersecurity': [
    {
      id: 'sec-q1',
      roleCategory: 'Cybersecurity',
      question: 'You receive an alert in the SIEM showing multiple failed SSH logins followed by an outbound connection to an unknown external IP. Walk me through your triage and containment steps.',
      context: 'Tests incident triage, log correlation, IOC identification, and containment runbook execution.',
      evaluationCriteria: [
        'Identifies source and destination IP addresses, timestamps, and affected assets',
        'Checks authentication logs to verify if credential stuffing succeeded',
        'Isolates affected host from corporate subnet to prevent lateral movement',
        'Extracts hashes and checks VirusTotal / Threat Intelligence for external IP',
      ],
      sampleStarAnswer: {
        situation: 'During a 24x7 SOC shift, our Wazuh/Splunk SIEM triggered a high-severity alert showing 400+ failed SSH attempts followed by an outbound HTTPS beacon to an uncategorized IP.',
        task: 'I had to immediately determine if host compromise occurred, contain potential exfiltration, and identify the root attack vector.',
        action: 'I immediately quarantined the endpoint via EDR agent isolation. I then correlated auth.log against netflow telemetry to confirm the compromised user session, dumped the active process tree, and extracted the binary hash.',
        result: 'The C2 beacon was blocked enterprise-wide within 8 minutes. We reset the compromised service account credentials and patched the exposed SSH daemon port, preventing lateral spread.',
      },
    },
    {
      id: 'sec-q2',
      roleCategory: 'Cybersecurity',
      question: 'Explain the difference between a False Positive and a False Negative in SOC monitoring, and how you tune detection rules to minimize both.',
      context: 'Tests fundamental security metric analysis, alert fatigue management, and rule tuning.',
      evaluationCriteria: [
        'Defines false positive (benign activity flagged as attack) vs false negative (real attack missed)',
        'Explains the danger of false negatives (undetected breaches)',
        'Discusses threshold tuning, whitelist exceptions, and correlation rules',
      ],
      sampleStarAnswer: {
        situation: 'Our SOC was experiencing alert fatigue with over 3,000 daily alerts, causing tier 1 triage bottlenecks.',
        task: 'My goal was to tune SIEM correlation logic without creating blind spots (false negatives).',
        action: 'I analyzed 30 days of ticket logs, identified recurring automated backups triggering brute-force rules, created scoped whitelist rules based on host role and time-window, and added secondary telemetry conditions.',
        result: 'Reduced daily false positives by 68%, lowering mean time to respond (MTTR) on genuine incidents from 24 minutes to under 6 minutes.',
      },
    },
    {
      id: 'sec-q3',
      roleCategory: 'Cybersecurity',
      question: 'A user reports receiving a suspicious email claiming their password will expire in 2 hours with a login link. How do you analyze the email headers and determine if it is malicious?',
      context: 'Tests email security analysis, SPF/DKIM/DMARC inspection, URL sandboxing, and enterprise containment.',
      evaluationCriteria: [
        'Extracts raw RFC 822 email headers and verifies Return-Path vs From field',
        'Checks SPF, DKIM, and DMARC alignment and authentication pass/fail flags',
        'Inspects Received: from hops to trace originating mail transfer agent (MTA) IP',
        'Safely detonates URL/attachment in an isolated sandbox to detect credential harvesting or dropper payloads',
      ],
      sampleStarAnswer: {
        situation: 'An executive assistant reported a high-urgency payroll update email with an embedded link requesting Office 365 re-authentication.',
        task: 'I had to analyze the email headers, determine if authentication had failed, assess scope across the tenant, and purge identical copies.',
        action: 'I extracted the raw .eml headers, identified SPF and DMARC softfail flags from an unauthorized digital ocean droplet, submitted the hyperlink to an isolated sandbox confirming an active phishing kit, and executed a PowerShell tenant search to purge 14 copies from employee inboxes.',
        result: 'Zero credentials were compromised, the malicious phishing domain was blocked on the border proxy within 15 minutes, and an internal advisory was published.',
      },
    },
  ],
  'Frontend': [
    {
      id: 'fe-q1',
      roleCategory: 'Frontend',
      question: 'How do you optimize a slow React web application experiencing jank and slow initial page render times?',
      context: 'Tests performance profiling, React rendering lifecycle, bundle optimization, and Core Web Vitals.',
      evaluationCriteria: [
        'Mentions React DevTools Profiler to identify wasted re-renders',
        'Explains code splitting with React.lazy and dynamic imports',
        'Discusses memoization (useMemo, useCallback, React.memo) with appropriate caveats',
        'Optimizes image formats, font loading, and layout shifts (CLS, LCP)',
      ],
      sampleStarAnswer: {
        situation: 'A fintech merchant dashboard suffered from high initial bundle size (4.2MB) and noticeable UI lag during heavy transaction filtering.',
        task: 'I was tasked with bringing Largest Contentful Paint (LCP) under 1.5 seconds and eliminating dropped frames during re-renders.',
        action: 'I profiled rendering bottlenecks using React Profiler, refactored heavy charts to load via React.lazy on demand, virtualized a 5,000-row transaction table with TanStack Virtual, and memoized expensive filter computations.',
        result: 'Decreased bundle size by 62%, reduced initial load time from 4.8s to 1.1s, and earned a 96+ Lighthouse Performance score.',
      },
    },
  ],
  'Backend': [
    {
      id: 'be-q1',
      roleCategory: 'Backend',
      question: 'How do you design a high-throughput API service handling 50,000 requests per second with microsecond latency requirements?',
      context: 'Tests system design, database indexing, caching strategies, and event-driven architecture.',
      evaluationCriteria: [
        'Introduces Redis/Memcached caching layers with TTL and cache-invalidation strategies',
        'Discusses connection pooling, asynchronous worker queues (Kafka/RabbitMQ)',
        'Mentions horizontal scaling behind load balancers and database read replicas',
        'Addresses failure modes: rate limiting, circuit breakers, and idempotency keys',
      ],
      sampleStarAnswer: {
        situation: 'Our payment processing gateway needed to support flash-sale concurrency spikes reaching 50,000 RPS without dropping transaction state.',
        task: 'Design an end-to-end resilient architecture with sub-50ms p99 latency.',
        action: 'I implemented an asynchronous event-driven architecture using Kafka for transaction queuing, backed by Redis for idempotent token verification and clustered Go/Node microservices behind NGINX load balancers.',
        result: 'Successfully handled 65,000 peak RPS during Diwali sales with 0% dropped transactions and a 28ms average response latency.',
      },
    },
  ],
};

// Generic fallback question generator for any role
export function getInterviewQuestionsForRole(roleTitle: string): InterviewQuestion[] {
  const roleLower = roleTitle.toLowerCase();
  if (roleLower.includes('soc') || roleLower.includes('security') || roleLower.includes('cyber') || roleLower.includes('threat')) {
    return INTERVIEW_QUESTIONS['Cybersecurity'];
  }
  if (roleLower.includes('front') || roleLower.includes('react') || roleLower.includes('ui')) {
    return INTERVIEW_QUESTIONS['Frontend'];
  }
  if (roleLower.includes('back') || roleLower.includes('node') || roleLower.includes('api') || roleLower.includes('java')) {
    return INTERVIEW_QUESTIONS['Backend'];
  }
  // Default to Cybersecurity / General Software
  return INTERVIEW_QUESTIONS['Cybersecurity'];
}

// Evaluates candidate's written response using STAR method rubric & keyword matching
// Common English vocabulary and technical tokens to verify natural language coherence
const RECOGNIZED_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you',
  'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one',
  'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when',
  'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some',
  'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back',
  'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these',
  'give', 'day', 'most', 'us', 'is', 'was', 'were', 'had', 'has', 'are', 'been', 'alert', 'system', 'server', 'logs',
  'network', 'security', 'user', 'traffic', 'incident', 'data', 'check', 'investigate', 'contain', 'response', 'team',
  'host', 'ip', 'file', 'code', 'error', 'issue', 'problem', 'fix', 'step', 'found', 'quarantine', 'rule', 'siem',
  'during', 'isolated', 'analyzed', 'blocked', 'prevented', 'credentials', 'password', 'firewall', 'edr', 'ssh', 'domain',
  'react', 'component', 'state', 'hook', 'render', 'api', 'backend', 'frontend', 'database', 'query', 'cache', 'service',
]);

/**
 * Detects keyboard mashing, repeated symbols, or random non-words.
 */
function isGibberishOrNonsense(text: string): boolean {
  const clean = text.trim();
  if (!clean || clean.length < 5) return true;

  // Check for excessive repeating characters or consonant clusters (e.g. "kogkg", "mpgm")
  if (/[bcdfghjklmnpqrstvwxyz]{6,}/i.test(clean)) return true;
  if (/([a-zA-Z])\1{4,}/.test(clean)) return true;

  const words = clean.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 0);
  if (words.length < 3) return true;

  let recognized = 0;
  for (const word of words) {
    if (RECOGNIZED_WORDS.has(word) || word.length >= 3 && /^(auth|sec|log|net|serv|sys|dev|user|test|quer|conf|resp|anal|rule|drop|code|hash|scan|pack|monit|route|prox)/.test(word)) {
      recognized++;
    }
  }

  // If less than 40% of the words are recognized English or technical terms, classify as gibberish
  return (recognized / words.length) < 0.40;
}

export function evaluateInterviewResponse(
  question: InterviewQuestion,
  answerText: string
): InterviewEvaluation {
  const text = answerText.trim();
  const lower = text.toLowerCase();

  const modelAnswer = `${question.sampleStarAnswer.situation} ${question.sampleStarAnswer.task} ${question.sampleStarAnswer.action} ${question.sampleStarAnswer.result}`;

  // 1. Strict Gibberish / Random Typing Detection
  if (isGibberishOrNonsense(text)) {
    return {
      overallScore: 0,
      technicalAccuracyScore: 0,
      starStructureScore: 0,
      communicationScore: 0,
      strengths: [],
      improvements: [
        'Unintelligible or random keyboard input detected. No coherent technical sentences found.',
        'Please answer in clear English addressing the specific technical scenario.',
        'Describe the actual tools, investigation steps, and resolution actions taken.',
      ],
      modelAnswer,
    };
  }

  // 2. Very Short / Incomplete Answer
  if (text.length < 35) {
    return {
      overallScore: 10,
      technicalAccuracyScore: 5,
      starStructureScore: 5,
      communicationScore: 20,
      strengths: ['Initial attempt to formulate a response.'],
      improvements: [
        'Answer is far too brief (< 35 characters). Elaborate on the tools, commands, and steps taken.',
        'Apply the STAR method: Situation, Task, Action, and measurable Result.',
      ],
      modelAnswer,
    };
  }

  // 3. Technical Criteria Evaluation (Zero-based baseline)
  let matchedCriteria = 0;
  for (const criterion of question.evaluationCriteria) {
    const keywords = criterion.toLowerCase().split(' ').filter(w => w.length > 4 && !RECOGNIZED_WORDS.has(w));
    if (keywords.some(kw => lower.includes(kw))) {
      matchedCriteria++;
    }
  }

  const techRatio = matchedCriteria / Math.max(1, question.evaluationCriteria.length);
  const techScore = matchedCriteria === 0
    ? 0
    : Math.min(95, Math.round(techRatio * 75 + 20));

  // 4. STAR Structure Evaluation (Zero-based baseline)
  const hasSituation = lower.includes('when') || lower.includes('during') || lower.includes('in my') || lower.includes('alert') || lower.includes('system') || lower.includes('project');
  const hasTask = lower.includes('had to') || lower.includes('my goal') || lower.includes('responsible') || lower.includes('needed to') || lower.includes('task') || lower.includes('objective');
  const hasAction = lower.includes('i ') || lower.includes('we ') || lower.includes('configured') || lower.includes('implemented') || lower.includes('analyzed') || lower.includes('isolated') || lower.includes('checked') || lower.includes('executed') || lower.includes('tuned');
  const hasResult = lower.includes('result') || lower.includes('reduced') || lower.includes('%') || lower.includes('prevented') || lower.includes('resolved') || lower.includes('mitigated') || lower.includes('saved');

  let starScore = 0;
  if (hasSituation) starScore += 25;
  if (hasTask) starScore += 25;
  if (hasAction) starScore += 25;
  if (hasResult) starScore += 25;

  // 5. Communication & Coherence Evaluation
  const wordCount = text.split(/\s+/).length;
  let commScore = 30;
  if (wordCount >= 20) commScore = 60;
  if (wordCount >= 40) commScore = 75;
  if (wordCount >= 70) commScore = 90;

  // If technical content is completely absent (off-topic answer like "I like pizza"), overall score is heavily capped
  let overallScore = 0;
  if (techScore === 0) {
    overallScore = Math.min(10, Math.round(commScore * 0.15));
  } else {
    overallScore = Math.round(techScore * 0.50 + starScore * 0.35 + commScore * 0.15);
  }

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (matchedCriteria >= 2) strengths.push('Strong technical grounding and familiarity with core tools and protocols.');
  if (hasAction) strengths.push('Clearly explains concrete diagnostic, troubleshooting, and execution actions.');
  if (hasResult) strengths.push('Includes positive, quantifiable business impact and operational results.');
  if (matchedCriteria === 1 && strengths.length === 0) strengths.push('Identified relevant foundational concepts.');

  if (techScore === 0) {
    improvements.push('Your answer does not address the technical scenario described in the prompt.');
    improvements.push('Reference specific industry tooling and protocols (e.g. SIEM alerts, EDR containment, firewall logs, RFC headers).');
  } else if (matchedCriteria < question.evaluationCriteria.length) {
    improvements.push('Deepen your technical specifics (mention log correlation, packet analysis, or threat intel lookup).');
  }

  if (!hasResult) improvements.push('Add a clear quantified Result (e.g. "resolved incident in 8 minutes", "prevented data exfiltration").');
  if (!hasTask) improvements.push('Clearly define your direct ownership / Task in the situation.');

  return {
    overallScore,
    technicalAccuracyScore: techScore,
    starStructureScore: starScore,
    communicationScore: commScore,
    strengths,
    improvements,
    modelAnswer,
  };
}
