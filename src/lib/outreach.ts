export interface OutreachTemplate {
  id: 'linkedin' | 'recruiter' | 'hiring_manager' | 'alumni' | 'followup';
  title: string;
  badge: string;
  charCount?: number;
  subject?: string;
  body: string;
  tip: string;
}

export function generateOutreachTemplates(params: {
  candidateName?: string;
  companyName: string;
  roleTitle: string;
  matchedSkills?: string[];
  college?: string;
}): OutreachTemplate[] {
  const name = params.candidateName || 'Candidate';
  const company = params.companyName || 'Target Company';
  const role = params.roleTitle || 'Software Engineer';
  const topSkills = (params.matchedSkills && params.matchedSkills.length > 0)
    ? params.matchedSkills.slice(0, 3).join(', ')
    : 'modern full-stack technologies';
  const college = params.college || 'my university';

  // 1. SocialSonic: LinkedIn Connection Note (Strictly under 300 characters)
  const linkedinNote = `Hi! I noticed ${company}'s great work in the tech space. As a developer specializing in ${topSkills}, I'd love to connect and follow your engineering milestones. Look forward to staying in touch!`;

  // 2. SocialSonic: Recruiter Direct Email / InMail
  const recruiterSubject = `Application / Inquiry: ${role} – ${name} (${topSkills})`;
  const recruiterBody = `Hi [Recruiter Name],

I hope you're having a productive week.

I recently explored ${company}'s open ${role} position and wanted to reach out directly. My background centers heavily on ${topSkills}, where I've delivered scalable features with strong focus on clean architecture and performance.

Given ${company}'s growth, I believe my hands-on experience aligns closely with what your engineering team is tackling right now.

I've attached my resume and would welcome a brief 10-minute conversation if you're actively reviewing candidates for this role.

Best regards,
${name}
LinkedIn: [Your Profile Link] | Portfolio: [Your Site Link]`;

  // 3. SocialSonic: Engineering Hiring Manager Value Pitch
  const hmSubject = `Quick question re: ${company}'s engineering stack for ${role}`;
  const hmBody = `Hi [Hiring Manager Name],

I've been following ${company}'s technical progress and was really impressed by your team's approach to scale and reliability.

I'm reaching out because I specialize in ${topSkills} and have been actively building end-to-end applications designed for high uptime and smooth user experiences. I saw the ${role} opening and wanted to share a few ideas on how my skill set could add immediate velocity to your sprint goals.

Would you be open to a quick 5-minute chat sometime this week? Even if the timing isn't right, I'd love to connect with fellow engineers building great products.

Cheers,
${name}`;

  // 4. Happenstance: Warm Alumni & Insider Referral Pitch
  const alumniSubject = `Hello from a fellow ${college} student/alum!`;
  const alumniBody = `Hi [Alum Name],

Hope you're doing well! I'm currently studying at / a graduate of ${college}, and I came across your profile while learning more about ${company}. It's inspiring to see fellow alumni doing impactful work on your team!

I am preparing to apply for the ${role} position and my core skills align around ${topSkills}. 

If your schedule permits, I would be deeply grateful for 10 minutes of your advice on what ${company}'s team looks for in strong applicants. If you feel my background looks like a good match, I would be honored to be considered for an internal referral.

Thank you so much for your time and guidance!

Warm regards,
${name}`;

  // 5. SocialSonic: 5-Day Follow-Up Bump
  const followupBody = `Hi [Name],

I know your inbox is incredibly busy, so I just wanted to gently follow up on my note below regarding the ${role} opening at ${company}.

I remain very excited about the chance to contribute with ${topSkills} and would love to chat if the opportunity is still open.

Thank you again for your time!
${name}`;

  return [
    {
      id: 'linkedin',
      title: 'SocialSonic LinkedIn Note',
      badge: `${linkedinNote.length}/300 chars`,
      charCount: linkedinNote.length,
      body: linkedinNote,
      tip: 'Send this as a personalized invite to recruiters or tech leads at the target company.',
    },
    {
      id: 'recruiter',
      title: 'Direct Recruiter InMail',
      badge: 'High Conversion',
      subject: recruiterSubject,
      body: recruiterBody,
      tip: 'Best for talent acquisition managers and technical recruiters actively sourcing for this opening.',
    },
    {
      id: 'hiring_manager',
      title: 'Engineering Manager Pitch',
      badge: 'Value-First',
      subject: hmSubject,
      body: hmBody,
      tip: 'Send directly to tech leads or engineering managers who care about technical depth and team velocity.',
    },
    {
      id: 'alumni',
      title: 'Happenstance Alumni Connector',
      badge: 'Warm Referral',
      subject: alumniSubject,
      body: alumniBody,
      tip: 'Referrals have a 4x higher interview rate. Reach out to alumni from your college working at the firm.',
    },
    {
      id: 'followup',
      title: 'SocialSonic 5-Day Follow-up',
      badge: 'Polite Bump',
      body: followupBody,
      tip: 'Send 4 to 6 business days after your first message if you haven’t received a reply yet.',
    },
  ];
}
