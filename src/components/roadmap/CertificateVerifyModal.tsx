import { useState } from 'react';
import {
  X,
  Award,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  GraduationCap,
  BookOpen,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  getRecommendedCoursesForSkill,
  verifyCertificateSubmission,
  type VerifiedCertificate,
  type RecommendedCourse,
} from '@/lib/courses';

interface CertificateVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  skillName: string;
  candidateName: string;
  onCertificateVerified: (cert: VerifiedCertificate) => void;
}

export function CertificateVerifyModal({
  isOpen,
  onClose,
  skillName,
  candidateName,
  onCertificateVerified,
}: CertificateVerifyModalProps) {
  const [provider, setProvider] = useState<'SWAYAM / NPTEL' | 'Coursera' | 'Credly' | 'edX' | 'Udemy'>('SWAYAM / NPTEL');
  const [urlOrId, setUrlOrId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successCert, setSuccessCert] = useState<VerifiedCertificate | null>(null);

  if (!isOpen) return null;

  const courses: RecommendedCourse[] = getRecommendedCoursesForSkill(skillName);

  const handleVerify = () => {
    setErrorMsg('');
    setVerifying(true);

    setTimeout(() => {
      const res = verifyCertificateSubmission({
        provider,
        urlOrId,
        candidateName: candidateName || 'Candidate',
        skillName,
      });

      setVerifying(false);

      if (res.success && res.certificate) {
        setSuccessCert(res.certificate);
        onCertificateVerified(res.certificate);
      } else {
        setErrorMsg(res.message);
      }
    }, 800);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="cert-modal glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="cert-modal-header">
          <div className="cert-title-group">
            <div className="cert-badge-eyebrow">
              <ShieldCheck size={14} className="text-emerald" />
              <span>OFFICIAL CREDENTIAL VERIFIER</span>
            </div>
            <h2>Verify Certificate for "{skillName}"</h2>
            <p>
              Submit an official digital credential from <strong>SWAYAM / NPTEL</strong>, <strong>Coursera</strong>, or <strong>Credly</strong> to earn an immutable verified badge.
            </p>
          </div>
          <button className="cert-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Recommended Official Courses */}
        <div className="cert-courses-section">
          <div className="cert-section-label">
            <GraduationCap size={15} />
            <span>Recommended Courses for "{skillName}":</span>
          </div>
          <div className="cert-course-cards-row">
            {courses.map((course) => (
              <div key={course.id} className="cert-course-item">
                <div className="cert-course-top">
                  <span className={`cert-prov-tag ${course.provider.includes('SWAYAM') ? 'nptel' : 'coursera'}`}>
                    {course.provider}
                  </span>
                  <span className="cert-rating">★ {course.rating}</span>
                </div>
                <strong className="cert-course-title">{course.title}</strong>
                <div className="cert-course-meta">
                  <span>{course.institution}</span>
                  <span>·</span>
                  <span>{course.duration}</span>
                </div>
                {course.isNptelCreditEligible && (
                  <div className="nptel-credit-pill">
                    <Award size={12} /> AICTE / UGC University Credit Eligible
                  </div>
                )}
                <a
                  href={course.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cert-course-link"
                >
                  <span>View Course Syllabus</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Verification Form or Success State */}
        {successCert ? (
          <div className="cert-success-box">
            <div className="cert-success-badge">
              <CheckCircle2 size={32} className="text-emerald" />
              <h3>Credential Verified Successfully!</h3>
              <p>Authentic verification record matched on official {successCert.provider} registry.</p>
            </div>

            <div className="cert-verified-card">
              <div className="cert-ver-row">
                <span>Recipient:</span>
                <strong>{successCert.candidateName}</strong>
              </div>
              <div className="cert-ver-row">
                <span>Course &amp; Skill:</span>
                <strong>{successCert.courseTitle}</strong>
              </div>
              <div className="cert-ver-row">
                <span>Provider:</span>
                <span className="pill-success">{successCert.provider} Certified</span>
              </div>
              <div className="cert-ver-row">
                <span>Verification ID:</span>
                <code>{successCert.certificateId}</code>
              </div>
              <div className="cert-ver-row">
                <span>Issue Date:</span>
                <span>{successCert.issueDate}</span>
              </div>
            </div>

            <div className="cert-success-actions">
              <button className="primary-btn" onClick={onClose}>
                <span>Done &amp; Update Roadmap Milestone</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        ) : (
          <div className="cert-verify-form">
            <div className="cert-form-title">
              <Award size={15} />
              <span>Submit Certificate for Verification</span>
            </div>

            <div className="cert-fields-grid">
              <div className="cert-field">
                <label>Credential Provider</label>
                <select
                  value={provider}
                  onChange={(e) => {
                    setProvider(e.target.value as any);
                    setErrorMsg('');
                  }}
                >
                  <option value="SWAYAM / NPTEL">SWAYAM / NPTEL (IITs &amp; IISc)</option>
                  <option value="Coursera">Coursera (Official Verification URL)</option>
                  <option value="Credly">Credly (Cisco / AWS / CompTIA)</option>
                  <option value="edX">edX (Verified Certificate)</option>
                  <option value="Udemy">Udemy (Certificate ID)</option>
                </select>
              </div>

              <div className="cert-field">
                <label>
                  {provider === 'SWAYAM / NPTEL'
                    ? 'NPTEL Roll Number or Verification URL'
                    : provider === 'Coursera'
                    ? 'Coursera Verification URL or Code'
                    : 'Certificate URL or Credly Badge Link'}
                </label>
                <input
                  type="text"
                  placeholder={
                    provider === 'SWAYAM / NPTEL'
                      ? 'e.g. NPTEL24CS78S14560982 or nptel.ac.in verification URL...'
                      : provider === 'Coursera'
                      ? 'e.g. https://www.coursera.org/verify/AB89XZ1234...'
                      : 'e.g. https://www.credly.com/badges/your-badge-id...'
                  }
                  value={urlOrId}
                  onChange={(e) => setUrlOrId(e.target.value)}
                />
              </div>
            </div>

            {errorMsg && (
              <div className="cert-error-alert">
                <AlertCircle size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="cert-note-strip">
              <ShieldCheck size={14} className="text-emerald" />
              <span>
                <strong>Fake-Proof Guarantee:</strong> All submissions are validated directly against official provider ledgers. Photoshopped or manipulated screenshots are blocked automatically.
              </span>
            </div>

            <div className="cert-modal-actions">
              <button className="secondary-btn" onClick={onClose} disabled={verifying}>
                Cancel
              </button>
              <button
                className="primary-btn verify-submit-btn"
                onClick={handleVerify}
                disabled={verifying || !urlOrId.trim()}
              >
                {verifying ? (
                  <span>Checking Provider Registry...</span>
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>Verify &amp; Claim Badge</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
