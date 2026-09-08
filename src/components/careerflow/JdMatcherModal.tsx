import { useState, useMemo, useEffect } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  FileText,
  Target,
  Zap,
  Copy,
  Check,
} from 'lucide-react';
import { analyzeJobDescriptionMatch, type JdMatchResult } from '@/lib/careerflow';
import { ROLE_SKILLS } from '@/lib/roleSkills';

interface JdMatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeText: string;
  resumeSkills: string[];
  initialRole?: string;
  initialJdText?: string;
  onAddSkillToRoadmap?: (skill: string) => void;
}

export function JdMatcherModal({
  isOpen,
  onClose,
  resumeText,
  resumeSkills,
  initialRole,
  initialJdText = '',
  onAddSkillToRoadmap,
}: JdMatcherModalProps) {
  const [selectedRole, setSelectedRole] = useState(initialRole || 'Frontend Developer');
  const [customJdText, setCustomJdText] = useState(initialJdText);
  const [activeTab, setActiveTab] = useState<'overview' | 'missing' | 'bullets'>('overview');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [draftedBullet, setDraftedBullet] = useState<{ skill: string; text: string } | null>(null);
  const [copiedDraft, setCopiedDraft] = useState(false);

  useEffect(() => {
    if (initialJdText) setCustomJdText(initialJdText);
    if (initialRole) setSelectedRole(initialRole);
  }, [initialJdText, initialRole]);

  const availableRoles = useMemo(() => Object.keys(ROLE_SKILLS).sort(), []);

  // Compute live match result
  const matchResult: JdMatchResult = useMemo(() => {
    const defaultRoleText = ROLE_SKILLS[selectedRole]
      ? `${selectedRole} role requiring strong proficiency in ${ROLE_SKILLS[selectedRole].must.join(', ')} alongside ${ROLE_SKILLS[selectedRole].nice.join(', ')}. Strong problem solving, communication, and agile teamwork required.`
      : '';
    const textToAnalyze = customJdText.trim() ? customJdText : defaultRoleText;
    return analyzeJobDescriptionMatch(resumeText, resumeSkills, textToAnalyze, selectedRole);
  }, [resumeText, resumeSkills, selectedRole, customJdText]);

  if (!isOpen) return null;

  const handleCopyBullet = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyDraft = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  const generateXyzForSkill = (skill: string) => {
    const sLower = skill.toLowerCase();
    let text = `Architected and deployed robust modules utilizing ${skill}, boosting system throughput by 34% and eliminating critical bottlenecks across production sprints.`;
    if (sLower.includes('siem') || sLower.includes('soc') || sLower.includes('security') || sLower.includes('vapt') || sLower.includes('threat')) {
      text = `Spearheaded real-time threat detection and telemetry monitoring using ${skill}, reducing false positive escalation latency by 45% and hardening enterprise defense posture.`;
    } else if (sLower.includes('docker') || sLower.includes('kubernetes') || sLower.includes('cloud') || sLower.includes('devops') || sLower.includes('aws')) {
      text = `Containerized distributed microservices with ${skill}, standardizing CI/CD automation and accelerating release frequency by 3x with zero downtime.`;
    } else if (sLower.includes('react') || sLower.includes('frontend') || sLower.includes('ui') || sLower.includes('typescript')) {
      text = `Engineered responsive, accessible interface components with ${skill}, enhancing user task completion rate by 28% and decreasing initial page load to under 1.2s.`;
    } else if (sLower.includes('python') || sLower.includes('machine learning') || sLower.includes('data') || sLower.includes('sql')) {
      text = `Engineered automated predictive workflows and data pipelines in ${skill}, achieving 92% model accuracy and reducing manual analysis cycles by 60%.`;
    }
    setDraftedBullet({ skill, text });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="jd-matcher-modal glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="jd-modal-head">
          <div className="jd-modal-title-wrap">
            <div className="cf-badge">
              <Sparkles size={14} />
              <span>CAREERFLOW.AI ATS MATCHER</span>
            </div>
            <h2>Target Job Description Matcher</h2>
            <p>Compare your resume against any target role or paste a job posting to uncover ATS gaps.</p>
          </div>
          <button className="jd-modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Input Controls: Role Select & Custom JD Toggle */}
        <div className="jd-input-bar">
          <div className="jd-role-selector">
            <label>Target Role Profile</label>
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setCustomJdText('');
              }}
            >
              {availableRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="jd-or-divider">OR</div>
          <div className="jd-paste-btn-wrap">
            <label>Paste Custom Job Description</label>
            <textarea
              placeholder="Paste job posting text from LinkedIn, Indeed, or company careers page..."
              value={customJdText}
              onChange={(e) => setCustomJdText(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        {/* Score & Health Header */}
        <div className="jd-score-banner">
          <div className="jd-score-circle">
            <div className="score-num">{matchResult.score}%</div>
            <div className="score-lbl">ATS FIT</div>
          </div>
          <div className="jd-score-meta">
            <div className="jd-score-status">
              {matchResult.score >= 80 ? (
                <span className="pill-success">
                  <CheckCircle2 size={13} /> High ATS Interview Probability
                </span>
              ) : matchResult.score >= 60 ? (
                <span className="pill-warning">
                  <AlertCircle size={13} /> Moderate Match · Keywords Missing
                </span>
              ) : (
                <span className="pill-danger">
                  <AlertCircle size={13} /> ATS Filter Risk · Critical Gaps
                </span>
              )}
            </div>
            <h3>{matchResult.roleTitle}</h3>
            <p>
              Found <strong>{matchResult.matchedKeywords.length}</strong> matching keywords out of{' '}
              <strong>
                {matchResult.matchedKeywords.length + matchResult.missingHardSkills.length}
              </strong>{' '}
              critical ATS signals for this job profile.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="jd-modal-tabs">
          <button
            className={`jd-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Target size={14} /> Keywords Overview ({matchResult.matchedKeywords.length})
          </button>
          <button
            className={`jd-tab-btn ${activeTab === 'missing' ? 'active' : ''}`}
            onClick={() => setActiveTab('missing')}
          >
            <AlertCircle size={14} /> Missing Skills ({matchResult.missingHardSkills.length})
          </button>
          <button
            className={`jd-tab-btn ${activeTab === 'bullets' ? 'active' : ''}`}
            onClick={() => setActiveTab('bullets')}
          >
            <Zap size={14} /> Bullet Point Optimizer (XYZ)
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="jd-tab-content">
            <div className="jd-section">
              <h4>Matched Resume Keywords (Passed ATS)</h4>
              <div className="jd-tag-grid">
                {matchResult.matchedKeywords.length > 0 ? (
                  matchResult.matchedKeywords.map((s) => (
                    <span key={s} className="skill-tag green">
                      <Check size={12} /> {s}
                    </span>
                  ))
                ) : (
                  <p className="text-muted">No direct keywords detected yet for this role.</p>
                )}
              </div>
            </div>

            {/* Drafted XYZ Bullet Live Preview Box */}
            {draftedBullet && (
              <div className="jd-drafted-preview-box">
                <div className="jd-drafted-head">
                  <div className="jd-drafted-label">
                    <Sparkles size={14} className="text-emerald" />
                    <span>Instant XYZ Bullet for "{draftedBullet.skill}"</span>
                  </div>
                  <button
                    className="copy-bullet-btn"
                    onClick={() => handleCopyDraft(draftedBullet.text)}
                  >
                    {copiedDraft ? (
                      <>
                        <Check size={13} /> Copied to Clipboard
                      </>
                    ) : (
                      <>
                        <Copy size={13} /> Copy to Clipboard
                      </>
                    )}
                  </button>
                </div>
                <p className="jd-drafted-content">"{draftedBullet.text}"</p>
                <small className="jd-drafted-note">
                  Google/Careerflow XYZ formula applied. Paste directly into your resume's Experience section to pass the ATS filter.
                </small>
              </div>
            )}

            {matchResult.missingHardSkills.length > 0 && (
              <div className="jd-section">
                <h4>Top Missing Keywords (Likely ATS Filter Blocker)</h4>
                <div className="jd-tag-grid">
                  {matchResult.missingHardSkills.map((s) => (
                    <span key={s} className="skill-tag red">
                      <X size={12} /> {s}
                      <button
                        className="jd-draft-xyz-btn"
                        title="Generate ready-to-paste XYZ bullet with this skill"
                        onClick={() => generateXyzForSkill(s)}
                      >
                        <Sparkles size={11} /> + Draft XYZ
                      </button>
                      {onAddSkillToRoadmap && (
                        <button
                          className="jd-add-roadmap-btn"
                          title="Add to roadmap"
                          onClick={() => onAddSkillToRoadmap(s)}
                        >
                          + Roadmap
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Missing Skills Deep Dive */}
        {activeTab === 'missing' && (
          <div className="jd-tab-content">
            {/* Drafted XYZ Bullet Live Preview Box */}
            {draftedBullet && (
              <div className="jd-drafted-preview-box">
                <div className="jd-drafted-head">
                  <div className="jd-drafted-label">
                    <Sparkles size={14} className="text-emerald" />
                    <span>Instant XYZ Bullet for "{draftedBullet.skill}"</span>
                  </div>
                  <button
                    className="copy-bullet-btn"
                    onClick={() => handleCopyDraft(draftedBullet.text)}
                  >
                    {copiedDraft ? (
                      <>
                        <Check size={13} /> Copied to Clipboard
                      </>
                    ) : (
                      <>
                        <Copy size={13} /> Copy to Clipboard
                      </>
                    )}
                  </button>
                </div>
                <p className="jd-drafted-content">"{draftedBullet.text}"</p>
                <small className="jd-drafted-note">
                  Google/Careerflow XYZ formula applied. Paste directly into your resume's Experience section to pass the ATS filter.
                </small>
              </div>
            )}

            <div className="jd-section">
              <h4>Missing Hard Technical Skills</h4>
              <p className="section-note">
                These are mandatory technical requirements. Click <strong>+ Draft XYZ</strong> to generate an instant bullet point incorporating the skill, or <strong>+ Add to Roadmap</strong> to track it.
              </p>
              <div className="jd-tag-grid">
                {matchResult.missingHardSkills.map((s) => (
                  <span key={s} className="skill-tag red">
                    {s}
                    <button
                      className="jd-draft-xyz-btn"
                      title="Generate ready-to-paste XYZ bullet with this skill"
                      onClick={() => generateXyzForSkill(s)}
                    >
                      <Sparkles size={11} /> + Draft XYZ
                    </button>
                    {onAddSkillToRoadmap && (
                      <button
                        className="jd-add-roadmap-btn"
                        onClick={() => onAddSkillToRoadmap(s)}
                      >
                        + Add to Roadmap
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {matchResult.missingSoftSkills.length > 0 && (
              <div className="jd-section">
                <h4>Missing Soft Skills & Methodologies</h4>
                <div className="jd-tag-grid">
                  {matchResult.missingSoftSkills.map((s) => (
                    <span key={s} className="skill-tag subtle-amber">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {matchResult.missingActionVerbs.length > 0 && (
              <div className="jd-section">
                <h4>Recommended High-Impact Action Verbs</h4>
                <div className="jd-tag-grid">
                  {matchResult.missingActionVerbs.map((v) => (
                    <span key={v} className="action-verb-pill">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Bullet Point Optimizer (XYZ Formula) */}
        {activeTab === 'bullets' && (
          <div className="jd-tab-content">
            <div className="xyz-formula-banner">
              <strong>Google / Careerflow XYZ Formula:</strong>
              <span>Accomplished [X] as measured by [Y] by doing [Z]</span>
            </div>

            <div className="bullet-suggestions-list">
              {matchResult.bulletSuggestions.map((item, idx) => (
                <div key={idx} className="bullet-card">
                  <div className="bullet-before">
                    <span className="bullet-tag weak">WEAK RESUME BULLET</span>
                    <p>"{item.original}"</p>
                  </div>
                  <div className="bullet-after">
                    <div className="bullet-after-header">
                      <span className="bullet-tag strong">
                        <Sparkles size={11} /> OPTIMIZED (XYZ FORMULA)
                      </span>
                      <button
                        className="copy-bullet-btn"
                        onClick={() => handleCopyBullet(item.enhanced, idx)}
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check size={13} /> Copied
                          </>
                        ) : (
                          <>
                            <Copy size={13} /> Copy Bullet
                          </>
                        )}
                      </button>
                    </div>
                    <p className="enhanced-text">"{item.enhanced}"</p>
                    <div className="bullet-reason">
                      <strong>Why this wins:</strong> {item.reason}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="jd-modal-foot">
          <button className="secondary-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
