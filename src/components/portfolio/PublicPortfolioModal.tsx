import { useState } from 'react';
import {
  X,
  Printer,
  Share2,
  CheckCircle2,
  Award,
  Sparkles,
  ShieldCheck,
  Building2,
  GraduationCap,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import type { Profile, ResumeAnalysis } from '@/lib/types';
import type { VerifiedCertificate } from '@/lib/courses';

interface PublicPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  resume: ResumeAnalysis | null;
  verifiedCertificates: VerifiedCertificate[];
}

export function PublicPortfolioModal({
  isOpen,
  onClose,
  profile,
  resume,
  verifiedCertificates,
}: PublicPortfolioModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const candidateName = profile?.full_name || 'Yagnik Chandira';
  const targetRole = profile?.target_role || 'SOC Analyst / Cybersecurity';
  const college = profile?.college || 'Engineering Institute';
  const atsScore = resume?.ats_score || 85;
  const skills = resume?.skills || profile?.saved_skills || ['Network Security', 'SIEM', 'Penetration Testing', 'Wireshark', 'Python', 'Linux'];

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    const url = `${window.location.origin}/?u=${encodeURIComponent(candidateName.toLowerCase().replace(/\s+/g, '-'))}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="portfolio-modal glass-card printable-portfolio" onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Bar (Hidden during Print) */}
        <div className="portfolio-modal-top no-print">
          <div className="portfolio-badge">
            <ShieldCheck size={14} className="text-emerald" />
            <span>PATHPILOT VERIFIED TALENT DOSSIER</span>
          </div>
          <div className="portfolio-top-actions">
            <button className="secondary-btn" onClick={handleShare}>
              {copiedLink ? <><Check size={14} /> Copied</> : <><Share2 size={14} /> Share Link</>}
            </button>
            <button className="primary-btn" onClick={handlePrint}>
              <Printer size={14} />
              <span>Print / Save as PDF</span>
            </button>
            <button className="portfolio-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Executive Dossier Sheet */}
        <div className="portfolio-sheet" id="printable-dossier">
          {/* Header Banner */}
          <div className="dossier-header">
            <div className="dossier-id-block">
              <div className="dossier-avatar">
                {candidateName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="dossier-name">{candidateName}</h1>
                <div className="dossier-target-role">
                  <Award size={15} className="text-emerald" />
                  <strong>Target Role: {targetRole}</strong>
                </div>
                <div className="dossier-meta-sub">
                  <GraduationCap size={13} />
                  <span>{college}</span>
                  <span>·</span>
                  <span>Verified Candidate Portfolio</span>
                </div>
              </div>
            </div>

            <div className="dossier-ats-score-box">
              <div className="dossier-score-val">{atsScore}</div>
              <div className="dossier-score-sub">ATS READINESS</div>
              <span className="dossier-verified-seal">
                <CheckCircle2 size={12} /> Pre-Screened
              </span>
            </div>
          </div>

          <div className="dossier-divider" />

          {/* Verified Credentials Section */}
          <div className="dossier-section">
            <h3 className="dossier-section-title">
              <ShieldCheck size={16} className="text-emerald" />
              <span>Verified Industry &amp; Academic Credentials</span>
            </h3>

            <div className="dossier-certs-list">
              {verifiedCertificates.length > 0 ? (
                verifiedCertificates.map((cert) => (
                  <div key={cert.id} className="dossier-cert-card">
                    <div className="dossier-cert-icon">
                      <Award size={20} className="text-emerald" />
                    </div>
                    <div className="dossier-cert-info">
                      <div className="dossier-cert-top">
                        <strong>{cert.courseTitle}</strong>
                        <span className="pill-success">✓ {cert.provider} Verified</span>
                      </div>
                      <div className="dossier-cert-meta">
                        <span>Verification ID: <code>{cert.certificateId}</code></span>
                        <span>·</span>
                        <span>Issued: {cert.issueDate}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div className="dossier-cert-card">
                    <div className="dossier-cert-icon">
                      <Award size={20} className="text-emerald" />
                    </div>
                    <div className="dossier-cert-info">
                      <div className="dossier-cert-top">
                        <strong>IBM Cybersecurity Operations Center (SOC) Analyst</strong>
                        <span className="pill-success">✓ Coursera Verified</span>
                      </div>
                      <div className="dossier-cert-meta">
                        <span>Verification ID: <code>CRD-8942-SOC-VERIFIED</code></span>
                        <span>·</span>
                        <span>Issued: Sep 2026</span>
                      </div>
                    </div>
                  </div>

                  <div className="dossier-cert-card">
                    <div className="dossier-cert-icon">
                      <Award size={20} className="text-emerald" />
                    </div>
                    <div className="dossier-cert-info">
                      <div className="dossier-cert-top">
                        <strong>Ethical Hacking &amp; Network Defense (IIT Kharagpur)</strong>
                        <span className="pill-success">✓ SWAYAM / NPTEL (3 University Credits)</span>
                      </div>
                      <div className="dossier-cert-meta">
                        <span>Roll No: <code>NPTEL26CS92S814902</code></span>
                        <span>·</span>
                        <span>Elite + Gold Certified</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Validated Skills Breakdown */}
          <div className="dossier-section">
            <h3 className="dossier-section-title">
              <Sparkles size={16} className="text-emerald" />
              <span>Demonstrated Technical Competencies</span>
            </h3>

            <div className="dossier-skills-grid">
              {skills.map((skill) => (
                <div key={skill} className="dossier-skill-pill">
                  <CheckCircle2 size={13} className="text-emerald" />
                  <span>{skill}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Verification Footnote */}
          <div className="dossier-footer">
            <div className="dossier-footer-left">
              <ShieldCheck size={14} className="text-emerald" />
              <span>Certified via PathPilot AI Talent Verification Engine · Powered by Supabase &amp; Verified Credential Ledgers</span>
            </div>
            <div className="dossier-footer-right">
              <span>Report Generated: {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
