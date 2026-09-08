import { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  Search,
  MapPin,
  ExternalLink,
  Send,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Target,
  RefreshCw,
  Globe,
  Radio,
  Github,
} from 'lucide-react';
import {
  CURATED_JOB_OPENINGS,
  calculateJobFit,
  fetchLiveJobOpenings,
  fetchLiveStats,
  type JobOpening,
  type JobFitResult,
  type LiveStats,
} from '@/lib/jobright';

interface JobRightAgentProps {
  userSkills: string[];
  targetRole?: string;
  onOpenOutreach: (job: JobOpening, matchedSkills: string[]) => void;
  onTrackApplication?: (company: string, role: string) => void;
  onOpenJdMatcher?: (jobTitle: string, jobDesc: string) => void;
}

export function JobRightAgent({
  userSkills,
  targetRole,
  onOpenOutreach,
  onTrackApplication,
  onOpenJdMatcher,
}: JobRightAgentProps) {
  const [openings, setOpenings] = useState<JobOpening[]>(CURATED_JOB_OPENINGS);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(targetRole || '');
  const [selectedWorkMode, setSelectedWorkMode] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSource, setSelectedSource] = useState<string>('All');
  const [minSalary, setMinSalary] = useState<number>(0);
  const [trackedJobs, setTrackedJobs] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<LiveStats | null>(null);

  const sources = ['All', 'GitHub Tech Repos', 'Global Remote', 'Arbeitnow Live', 'India Tech Leaders'];
  const categories = ['All', 'Cybersecurity', 'Frontend', 'Backend', 'Full Stack', 'Data Science', 'AI / ML', 'DevOps / Cloud', 'Internship / Fresher'];
  const workModes = ['All', 'Remote', 'Hybrid', 'On-site'];

  // Load live statistics and initial feed
  useEffect(() => {
    fetchLiveStats().then((st) => {
      if (st) setStats(st);
    });
  }, []);

  // Fetch live jobs based on query and source
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(() => {
      let sourceParam = 'All';
      if (selectedSource === 'GitHub Tech Repos') sourceParam = 'github';
      else if (selectedSource === 'Global Remote') sourceParam = 'remote';
      else if (selectedSource === 'Arbeitnow Live') sourceParam = 'arbeitnow';
      else if (selectedSource === 'India Tech Leaders') sourceParam = 'india';

      fetchLiveJobOpenings({
        what: searchQuery.trim(),
        source: sourceParam,
        limit: 45,
      })
        .then((res) => {
          if (!cancelled) {
            setOpenings(res.jobs || []);
          }
        })
        .catch(() => {
          if (!cancelled) setOpenings(CURATED_JOB_OPENINGS);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, selectedSource]);

  // Score all retrieved jobs against user skills
  const scoredJobs: JobFitResult[] = useMemo(() => {
    return openings.map((job) => calculateJobFit(userSkills, job)).sort(
      (a, b) => b.fitScore - a.fitScore
    );
  }, [openings, userSkills]);

  // Client-side quick filter with strict domain relevance enforcement
  const filteredJobs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const isCyberQuery = /(^|[^a-zA-Z0-9])soc([^a-zA-Z0-9]|$)/i.test(query) || /(security|cyber|infosec|vapt|pentest|threat|siem)/i.test(query);

    return scoredJobs.filter((item) => {
      const job = item.job;
      if (selectedWorkMode !== 'All' && job.workMode !== selectedWorkMode) return false;
      if (selectedCategory !== 'All' && !job.category.toLowerCase().includes(selectedCategory.toLowerCase())) return false;
      if (minSalary > 0 && job.minSalaryLPA < minSalary) return false;

      // Strict Domain Relevance Guarantee:
      // If user searched for SOC/Cybersecurity or selected Cybersecurity domain, strictly reject unrelated domains
      if (isCyberQuery || selectedCategory === 'Cybersecurity') {
        const isSecJob =
          job.category.toLowerCase().includes('cyber') ||
          /(^|[^a-zA-Z0-9])soc([^a-zA-Z0-9]|$)/i.test(job.title) ||
          /(security|cyber|threat|vapt|pentest|siem|infosec)/i.test(job.title) ||
          (job.requiredSkills || []).some((s) => /(security|pentest|siem|wireshark|nmap|owasp|soc)/i.test(s));
        if (!isSecJob) return false;
      }

      return true;
    });
  }, [scoredJobs, selectedWorkMode, selectedCategory, minSalary, searchQuery]);

  const handleTrack = (job: JobOpening) => {
    onTrackApplication?.(job.company, job.title);
    setTrackedJobs((prev) => new Set([...prev, job.id]));
  };

  return (
    <div className="jobright-agent-card content-card">
      <div className="jobright-header">
        <div className="jobright-title-group">
          <div className="jobright-eyebrow">
            <Sparkles size={14} />
            <span>JOBRIGHT.AI REAL-TIME AGENT</span>
            <span className="live-pulse-dot" />
            <span className="live-feed-badge">
              <Radio size={11} className="text-emerald animate-pulse" /> LIVE FEEDS ACTIVE
            </span>
          </div>
          <h2>Live Job Openings &amp; Smart Fit Matcher</h2>
          <p>
            Real openings aggregated continuously from <strong>GitHub Open-Source Trackers (SimplifyJobs)</strong>,{' '}
            <strong>Remotive Global Remote</strong>, <strong>Arbeitnow Live API</strong>, and verified top Indian tech portals.
          </p>
        </div>

        <div className="jobright-stat-pill">
          <Target size={15} />
          <span>
            <strong>{filteredJobs.length}</strong> matching openings
            {stats && <small style={{ display: 'block', opacity: 0.8, fontSize: '0.74rem' }}>from {stats.totalLiveJobs}+ tracked</small>}
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="jobright-controls">
        <div className="jobright-search-wrap">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search live openings by keyword, title, company or tech (e.g. React, Python, Microsoft)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {loading && <RefreshCw size={15} className="search-spin-icon" />}
        </div>

        {/* Source Switcher */}
        <div className="jobright-filters-row">
          <div className="filter-pill-group">
            <span className="filter-label">Source:</span>
            {sources.map((src) => (
              <button
                key={src}
                className={`filter-chip ${selectedSource === src ? 'active' : ''}`}
                onClick={() => setSelectedSource(src)}
              >
                {src === 'GitHub Tech Repos' && <Github size={12} style={{ marginRight: 4 }} />}
                {src === 'Global Remote' && <Globe size={12} style={{ marginRight: 4 }} />}
                {src}
              </button>
            ))}
          </div>

          <div className="filter-pill-group">
            <span className="filter-label">Work Mode:</span>
            {workModes.map((mode) => (
              <button
                key={mode}
                className={`filter-chip ${selectedWorkMode === mode ? 'active' : ''}`}
                onClick={() => setSelectedWorkMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="jobright-filters-row">
          <div className="filter-pill-group categories-pills">
            <span className="filter-label">Domain:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`filter-chip category-chip ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="filter-pill-group">
            <span className="filter-label">Min Salary:</span>
            {[0, 10, 15, 20].map((amt) => (
              <button
                key={amt}
                className={`filter-chip ${minSalary === amt ? 'active' : ''}`}
                onClick={() => setMinSalary(amt)}
              >
                {amt === 0 ? 'Any' : `₹${amt}+ LPA`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Openings Grid */}
      {loading && openings.length === 0 ? (
        <div className="jobright-loading-state">
          <RefreshCw size={24} className="spin" />
          <p>Fetching real-time openings from GitHub, Remotive &amp; Arbeitnow...</p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="empty-state" style={{ padding: '32px 16px' }}>
          <Target size={28} />
          <strong>No matching openings found.</strong>
          <p>Try clearing filters or searching for broader terms like "Software", "Frontend", or "Data".</p>
          <button
            className="secondary-btn"
            style={{ marginTop: 12 }}
            onClick={() => {
              setSearchQuery('');
              setSelectedSource('All');
              setSelectedWorkMode('All');
              setSelectedCategory('All');
              setMinSalary(0);
            }}
          >
            Reset all filters
          </button>
        </div>
      ) : (
        <div className="jobright-openings-grid">
          {filteredJobs.slice(0, 30).map(({ job, fitScore, matchedSkills, missingSkills, whyYouFit }) => {
            const isTracked = trackedJobs.has(job.id);
            return (
              <div key={job.id} className="job-opening-card">
                <div className="job-card-top">
                  <div className="job-company-badge-wrap">
                    <div
                      className="job-company-logo"
                      style={{ background: job.logoBg }}
                    >
                      {job.logoBadge}
                    </div>

                    <div>
                      <h3 className="job-role-title">{job.title}</h3>
                      <div className="job-company-meta">
                        <span className="company-name">{job.company}</span>
                        <span className="bullet">·</span>
                        <span className="job-location">
                          <MapPin size={12} /> {job.location}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* JobRight AI Fit Badge */}
                  <div className="job-fit-pill">
                    <div className="fit-score-text">{fitScore}%</div>
                    <div className="fit-score-lbl">AI FIT</div>
                  </div>
                </div>

                <p className="job-description">{job.description}</p>

                {/* Tags and Source Badges */}
                <div className="job-tags-row">
                  {job.source && (
                    <span className="job-pill source-pill" title={`Verified via ${job.source}`}>
                      {job.source.includes('GitHub') ? <Github size={11} style={{ marginRight: 3 }} /> : <Globe size={11} style={{ marginRight: 3 }} />}
                      {job.source}
                    </span>
                  )}
                  <span className="job-pill workmode">{job.workMode}</span>
                  <span className="job-pill experience">{job.experienceLevel}</span>
                  <span className="job-pill salary">{job.salaryRange}</span>
                  <span className="job-posted">{job.postedDate}</span>
                </div>

                {/* Fit Insights */}
                <div className="job-fit-insights">
                  <div className="why-fit-list">
                    <span className="insight-title">
                      <CheckCircle2 size={13} className="text-emerald" /> Why you fit:
                    </span>
                    <div className="why-fit-chips">
                      {matchedSkills.slice(0, 4).map((s) => (
                        <span key={s} className="match-chip">
                          {s}
                        </span>
                      ))}
                      {matchedSkills.length > 4 && (
                        <span className="match-chip-more">+{matchedSkills.length - 4} more</span>
                      )}
                    </div>
                  </div>

                  {missingSkills.length > 0 && (
                    <div className="missing-skills-alert">
                      <AlertTriangle size={12} />
                      <span>Missing: {missingSkills.slice(0, 2).join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="job-card-actions">
                  <a
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="primary-btn apply-direct-btn"
                  >
                    <span>Apply Directly</span>
                    <ExternalLink size={13} />
                  </a>

                  {onOpenJdMatcher && (
                    <button
                      className="secondary-btn cf-match-btn"
                      onClick={() => onOpenJdMatcher(job.title, `${job.title} at ${job.company}. Location: ${job.location}. Requirements: ${job.requiredSkills.join(', ')}. ${job.description}`)}
                      title="Analyze this exact JD with Careerflow.ai ATS Matcher"
                    >
                      <Sparkles size={13} />
                      <span>Careerflow Match</span>
                    </button>
                  )}

                  <button
                    className="secondary-btn outreach-btn"
                    onClick={() => onOpenOutreach(job, matchedSkills)}
                    title="Generate SocialSonic Cold Outreach"
                  >
                    <Send size={13} />
                    <span>Outreach</span>
                  </button>

                  <button
                    className={`track-btn ${isTracked ? 'tracked' : ''}`}
                    onClick={() => handleTrack(job)}
                    disabled={isTracked}
                    title="Track in Applications"
                  >
                    {isTracked ? (
                      <>
                        <CheckCircle2 size={13} /> Saved
                      </>
                    ) : (
                      <>
                        <PlusCircle size={13} /> Track
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
