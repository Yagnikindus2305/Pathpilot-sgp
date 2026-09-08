import { useState } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  Send,
  Linkedin,
  Mail,
  UserCheck,
  Users,
  ExternalLink,
} from 'lucide-react';
import { generateOutreachTemplates, type OutreachTemplate } from '@/lib/outreach';

interface SocialSonicModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName?: string;
  companyName: string;
  roleTitle: string;
  matchedSkills?: string[];
  college?: string;
}

export function SocialSonicModal({
  isOpen,
  onClose,
  candidateName,
  companyName,
  roleTitle,
  matchedSkills,
  college,
}: SocialSonicModalProps) {
  const [activeTemplateId, setActiveTemplateId] = useState<string>('linkedin');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const templates = generateOutreachTemplates({
    candidateName,
    companyName,
    roleTitle,
    matchedSkills,
    college,
  });

  const currentTemplate = templates.find((t) => t.id === activeTemplateId) || templates[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const linkedInSearchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
    `${companyName} recruiter OR "talent acquisition" OR "engineering manager"`
  )}`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="socialsonic-modal glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="socialsonic-modal-head">
          <div className="socialsonic-title-wrap">
            <div className="socialsonic-badge">
              <Sparkles size={14} />
              <span>SOCIALSONIC &amp; HAPPENSTANCE CO-PILOT</span>
            </div>
            <h2>1-Click Cold Outreach &amp; Referrals</h2>
            <p>
              Targeting <strong>{roleTitle}</strong> at <strong>{companyName}</strong>. Generate proven, tailored messages that skip the black hole.
            </p>
          </div>
          <button className="socialsonic-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Template Selector Pills */}
        <div className="outreach-template-pills">
          {templates.map((tmpl) => (
            <button
              key={tmpl.id}
              className={`outreach-pill ${activeTemplateId === tmpl.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTemplateId(tmpl.id);
                setCopied(false);
              }}
            >
              {tmpl.id === 'linkedin' && <Linkedin size={13} />}
              {tmpl.id === 'recruiter' && <Mail size={13} />}
              {tmpl.id === 'hiring_manager' && <UserCheck size={13} />}
              {tmpl.id === 'alumni' && <Users size={13} />}
              {tmpl.id === 'followup' && <Send size={13} />}
              <span>{tmpl.title}</span>
              <span className="pill-badge">{tmpl.badge}</span>
            </button>
          ))}
        </div>

        {/* Selected Template Body Container */}
        <div className="outreach-body-container">
          <div className="outreach-tip-banner">
            <Sparkles size={14} />
            <span>{currentTemplate.tip}</span>
          </div>

          {currentTemplate.subject && (
            <div className="outreach-subject-row">
              <label>Subject Line:</label>
              <div className="subject-box">
                <span>{currentTemplate.subject}</span>
                <button
                  className="copy-mini-btn"
                  onClick={() => handleCopy(currentTemplate.subject!)}
                  title="Copy subject line"
                >
                  <Copy size={12} />
                </button>
              </div>
            </div>
          )}

          <div className="outreach-textarea-wrap">
            <textarea
              readOnly
              value={currentTemplate.body}
              rows={9}
              className="outreach-textarea"
            />
          </div>
        </div>

        {/* Actions Footer */}
        <div className="socialsonic-modal-foot">
          <a
            href={linkedInSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="secondary-btn linkedin-search-link"
          >
            <Linkedin size={14} />
            <span>Find {companyName} Recruiters on LinkedIn</span>
            <ExternalLink size={12} />
          </a>

          <div className="foot-action-group">
            <button
              className="primary-btn"
              onClick={() => handleCopy(currentTemplate.body)}
            >
              {copied ? (
                <>
                  <Check size={16} /> Copied to Clipboard!
                </>
              ) : (
                <>
                  <Copy size={16} /> Copy Message
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
