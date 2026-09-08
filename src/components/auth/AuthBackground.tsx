export function AuthBackground() {
  return (
    <div className="auth-bg-container" aria-hidden="true">
      {/* Dynamic ambient floating glow orbs */}
      <div className="auth-glow-orb orb-primary" />
      <div className="auth-glow-orb orb-secondary" />
      <div className="auth-glow-orb orb-accent" />

      {/* High-tech precision dot matrix grid */}
      <svg className="auth-grid-overlay" width="100%" height="100%">
        <defs>
          <pattern id="auth-grid-pattern" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" className="grid-dot" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#auth-grid-pattern)" />
      </svg>

      {/* Haikei-style layered organic waves */}
      <svg
        className="auth-wave-svg"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="wave-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.22" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="wave-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.18" />
            <stop offset="70%" stopColor="#c084fc" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#3b5bdb" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="wave-grad-3" x1="50%" y1="100%" x2="50%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Organic deep layered curves */}
        <path
          d="M0,320 C320,420,480,210,800,290 C1120,370,1280,180,1440,240 L1440,900 L0,900 Z"
          fill="url(#wave-grad-1)"
        />
        <path
          d="M0,480 C260,380,540,560,860,460 C1180,360,1320,520,1440,490 L1440,900 L0,900 Z"
          fill="url(#wave-grad-2)"
        />
        <path
          d="M0,640 C340,590,620,720,960,650 C1240,590,1380,700,1440,680 L1440,900 L0,900 Z"
          fill="url(#wave-grad-3)"
        />
      </svg>

      {/* Generative geometric floating contours */}
      <div className="auth-contour-circle contour-one" />
      <div className="auth-contour-circle contour-two" />
      <div className="auth-contour-circle contour-three" />
    </div>
  );
}
