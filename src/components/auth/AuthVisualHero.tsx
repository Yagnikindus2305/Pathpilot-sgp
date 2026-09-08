import { Linkedin, Sparkles, Compass, ShieldCheck, Target, Award } from 'lucide-react';
import yagnikPhoto from '@/assets/founders/yagnik-chandira.jpeg';
import meetPhoto from '@/assets/founders/meet-mistry.jpeg';
import vidhiPhoto from '@/assets/founders/vidhi-ramani.jpeg';
import type { ReactNode } from 'react';

interface AuthVisualHeroProps {
  logo: ReactNode;
}

export function AuthVisualHero({ logo }: AuthVisualHeroProps) {
  return (
    <section className="auth-visual modern-hero">
      {/* Brand Header */}
      <div className="hero-brand-wrap">
        {logo}
        <div className="hero-status-pill">
          <span className="pulse-dot-green" />
          <span>CAREER ACCELERATOR 2.0</span>
        </div>
      </div>

      {/* Hero Typography */}
      <div className="visual-copy">
        <div className="hero-eyebrow">
          <Sparkles size={14} className="hero-sparkle-icon" />
          <span>BUILT FOR YOUR NEXT MOVE</span>
        </div>
        <h1 className="hero-headline">
          Turn potential<br />
          <span className="gradient-text">into placement.</span>
        </h1>
        <p className="hero-subtext">
          A focused workspace to analyze your resume, close skill gaps with targeted roadmaps, pass proctored assessments, and match with verified company hiring bars.
        </p>
      </div>

      {/* Feature Highlights Grid */}
      <div className="hero-features-chips">
        <div className="feature-chip">
          <Compass size={14} />
          <span>ATS Resume Scoring</span>
        </div>
        <div className="feature-chip">
          <Target size={14} />
          <span>Skill Gap Roadmaps</span>
        </div>
        <div className="feature-chip">
          <ShieldCheck size={14} />
          <span>Camera-Proctored Tests</span>
        </div>
        <div className="feature-chip">
          <Award size={14} />
          <span>Salary Benchmarking</span>
        </div>
      </div>

      {/* Modern Stats Banner */}
      <div className="visual-stats modern-stats">
        <div className="stat-card">
          <strong>6</strong>
          <span>Career Modules</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-card">
          <strong>100%</strong>
          <span>Self-Paced</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-card">
          <strong>&infin;</strong>
          <span>Opportunities</span>
        </div>
      </div>

      {/* Founders Showcase */}
      <div className="visual-about modern-founders">
        <div className="founders-label">
          <span>CREATED BY INDUS UNIVERSITY FOUNDERS</span>
        </div>
        <div className="founders-row">
          <div className="founder-avatar-card">
            <div className="founder-photo-ring">
              <img src={meetPhoto} alt="Meet Mistry" loading="lazy" />
            </div>
            <div className="founder-meta">
              <strong>Meet Mistry</strong>
              <a
                className="founder-linkedin-chip"
                href="https://www.linkedin.com/in/meet-mistry-4aa8b9284"
                target="_blank"
                rel="noreferrer"
                aria-label="Meet Mistry LinkedIn"
              >
                <Linkedin size={12} />
                <span>LinkedIn</span>
              </a>
            </div>
          </div>

          <div className="founder-avatar-card">
            <div className="founder-photo-ring">
              <img src={yagnikPhoto} alt="Yagnik Chandira" loading="lazy" />
            </div>
            <div className="founder-meta">
              <strong>Yagnik Chandira</strong>
              <a
                className="founder-linkedin-chip"
                href="https://www.linkedin.com/in/yagnik-chandira-a6b5aa2b2"
                target="_blank"
                rel="noreferrer"
                aria-label="Yagnik Chandira LinkedIn"
              >
                <Linkedin size={12} />
                <span>LinkedIn</span>
              </a>
            </div>
          </div>

          <div className="founder-avatar-card">
            <div className="founder-photo-ring">
              <img
                src={vidhiPhoto}
                alt="Vidhi Ramani"
                loading="lazy"
                style={{ transform: 'scale(1.15)', objectPosition: 'center 15%' }}
              />
            </div>
            <div className="founder-meta">
              <strong>Vidhi Ramani</strong>
              <a
                className="founder-linkedin-chip"
                href="https://www.linkedin.com/in/vidhi-ramani-6032052a7"
                target="_blank"
                rel="noreferrer"
                aria-label="Vidhi Ramani LinkedIn"
              >
                <Linkedin size={12} />
                <span>LinkedIn</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
