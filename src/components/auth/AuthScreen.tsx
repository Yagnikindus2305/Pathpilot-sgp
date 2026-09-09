import { useState, useRef, useEffect, type FormEvent, type ReactNode } from 'react';
import {
  Lock,
  KeyRound,
  Camera,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  X,
  Sparkles,
  User,
  Mail,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  isValidEmail,
  isValidPhone,
  EMAIL_HELP_TEXT,
  PHONE_HELP_TEXT,
  isStrongPassword,
  PASSWORD_HELP_TEXT,
} from '@/lib/validation';
import {
  startCamera,
  stopCamera,
  detectFacePresence,
  captureAveragedDescriptor,
  cameraErrorMessage,
} from '@/lib/faceAuth';
import { AuthBackground } from './AuthBackground';
import { AuthVisualHero } from './AuthVisualHero';
import { BrandLogo, PasswordInput, PhoneInput } from '@/components/common/FormInputs';

const ADMIN_NO_RECOVERY_EMAIL = 'yagnikchandira.23.cse@iite.indusuni.ac.in';

interface AuthScreenProps {
  themeToggle?: ReactNode;
}

export function AuthScreen({ themeToggle }: AuthScreenProps) {
  const {
    signIn,
    signUp,
    signInWithFaceScan,
    signInWithEmailOtp,
    verifyEmailOtp,
    verifyPasswordResetOtp,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [authMethod, setAuthMethod] = useState<'password' | 'otp' | 'face'>('password');

  // Face Scan State
  const faceVideoRef = useRef<HTMLVideoElement>(null);
  const faceStreamRef = useRef<MediaStream | null>(null);
  const [faceStage, setFaceStage] = useState<'idle' | 'camera' | 'scanning'>('idle');
  const [faceDarkGlasses, setFaceDarkGlasses] = useState(false);
  const faceStageRef = useRef<'idle' | 'camera' | 'scanning'>('idle');
  useEffect(() => {
    faceStageRef.current = faceStage;
  }, [faceStage]);
  useEffect(() => () => stopCamera(faceStreamRef.current), []);

  const faceFailCountRef = useRef(0);

  async function startFaceScan() {
    setError('');
    faceFailCountRef.current = 0;
    try {
      faceStreamRef.current = await startCamera(faceVideoRef.current!);
      setFaceStage('camera');
      faceStageRef.current = 'camera';
      autoCaptureLoop();
    } catch (err) {
      console.error('Camera failed to start:', err);
      setError(cameraErrorMessage(err));
    }
  }

  async function autoCaptureLoop() {
    let consecutiveHits = 0;
    while (faceVideoRef.current && faceStreamRef.current && faceStageRef.current === 'camera') {
      const present = await detectFacePresence(faceVideoRef.current).catch(() => null);
      setFaceDarkGlasses(Boolean(present?.darkGlasses));
      const usable = present && !present.darkGlasses;
      consecutiveHits = usable ? consecutiveHits + 1 : 0;
      if (consecutiveHits >= 2) {
        captureFaceScan();
        return;
      }
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  async function captureFaceScan() {
    if (faceStageRef.current === 'scanning') return;
    setFaceStage('scanning');
    faceStageRef.current = 'scanning';
    setError('');
    const descriptor = await captureAveragedDescriptor(faceVideoRef.current!, 3).catch((err) => {
      console.error('Face detection failed during login scan:', err);
      return null;
    });
    if (!descriptor) {
      setError("We couldn't see a clear face. Center your face in the frame and try again.");
      setFaceStage('camera');
      faceStageRef.current = 'camera';
      autoCaptureLoop();
      return;
    }
    setBusy(true);
    const result = await signInWithFaceScan(Array.from(descriptor));
    setBusy(false);
    if (result.error) {
      faceFailCountRef.current += 1;
      setError(result.error);
      setFaceStage('camera');
      faceStageRef.current = 'camera';
      if (faceFailCountRef.current < 2) {
        autoCaptureLoop();
      } else {
        setError(
          result.error +
            ' Auto-retry paused after multiple attempts. Use "Scan Now" below or switch to Password sign-in.'
        );
      }
    } else {
      stopCamera(faceStreamRef.current);
      faceStreamRef.current = null;
    }
  }

  // Form Fields State
  const [forgotMode, setForgotMode] = useState(false);
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [resetOtpCode, setResetOtpCode] = useState('');
  const [email, setEmail] = useState('');
  const isNoRecoveryAccount = email.trim().toLowerCase() === ADMIN_NO_RECOVERY_EMAIL;
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!isValidEmail(email)) {
      setError(EMAIL_HELP_TEXT);
      return;
    }
    if (mode === 'signup' && !isStrongPassword(password)) {
      setError(`Choose a stronger password. ${PASSWORD_HELP_TEXT}`);
      return;
    }
    if (mode === 'signup' && !isValidPhone(phone)) {
      setError(`Enter a valid phone number. ${PHONE_HELP_TEXT}`);
      return;
    }

    setBusy(true);
    const result =
      mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password, name, phone.trim());

    if (result.error) {
      setError(result.error);
    } else if (mode === 'signup') {
      setNotice('Account created successfully! You can now sign in to your workspace.');
      setMode('signin');
    }
    setBusy(false);
  }

  async function sendResetOtp(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!isValidEmail(email)) {
      setError(EMAIL_HELP_TEXT);
      return;
    }
    if (isNoRecoveryAccount) {
      setError('Password recovery is disabled for this account.');
      return;
    }
    setBusy(true);
    const result = await signInWithEmailOtp(email);
    setBusy(false);
    if (result.error) setError(result.error);
    else setResetOtpSent(true);
  }

  async function verifyResetOtp(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!resetOtpCode.trim()) {
      setError('Enter the 6-digit code we sent you.');
      return;
    }
    setBusy(true);
    const result = await verifyPasswordResetOtp(email, resetOtpCode.trim());
    setBusy(false);
    if (result.error) setError(result.error);
  }

  async function sendOtp(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!isValidEmail(email)) {
      setError(EMAIL_HELP_TEXT);
      return;
    }
    if (isNoRecoveryAccount) {
      setError('Email-code sign-in is disabled for this account.');
      return;
    }
    setBusy(true);
    const result = await signInWithEmailOtp(email);
    setBusy(false);
    if (result.error) setError(result.error);
    else setOtpSent(true);
  }

  async function verifyOtpSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!otpCode.trim()) {
      setError('Enter the code sent to your email.');
      return;
    }
    setBusy(true);
    const result = await verifyEmailOtp(email, otpCode.trim());
    setBusy(false);
    if (result.error) setError(result.error);
  }

  return (
    <main className="auth-page modern-auth-layout">
      {/* Background generative canvas */}
      <AuthBackground />

      {/* Left visual showcase */}
      <AuthVisualHero logo={<BrandLogo hero light />} />

      {/* Right Form Card */}
      <section className="auth-form-wrap modern-form-wrap">
        {themeToggle && <div className="auth-theme-toggle-slot">{themeToggle}</div>}

        <div className="auth-form-card glass-card">
          <div className="mobile-brand">
            <BrandLogo />
          </div>

          {forgotMode ? (
            /* Forgot Password Flow */
            <div className="auth-flow-container">
              <div className="auth-heading">
                <div className="eyebrow-badge">
                  <KeyRound size={13} />
                  <span>RESET PASSWORD</span>
                </div>
                <h2>Forgot password?</h2>
                <p>
                  {resetOtpSent
                    ? `We sent a verification code to ${email}.`
                    : "Enter your account email and we'll send you an instant verification code."}
                </p>
              </div>

              {resetOtpSent ? (
                <form onSubmit={verifyResetOtp} className="auth-form modern-form">
                  <div className="input-group">
                    <label>
                      <span>Verification Code</span>
                      <input
                        required
                        value={resetOtpCode}
                        onChange={(e) => setResetOtpCode(e.target.value)}
                        placeholder="Enter the 6-digit code"
                        inputMode="numeric"
                        className="modern-input code-input"
                        autoFocus
                      />
                    </label>
                  </div>

                  {error && (
                    <div className="form-alert error animated-alert">
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                  )}

                  <button className="primary-btn full glow-btn" disabled={busy}>
                    {busy ? 'Verifying...' : 'Verify & Set New Password'}
                    <ArrowRight size={18} />
                  </button>

                  <p className="switch-auth">
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => {
                        setResetOtpSent(false);
                        setResetOtpCode('');
                        setError('');
                      }}
                    >
                      Use a different email address
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={sendResetOtp} className="auth-form modern-form">
                  <div className="input-group">
                    <label>
                      <span>Email Address</span>
                      <div className="input-icon-wrap">
                        <Mail size={16} className="field-icon" />
                        <input
                          required
                          type="email"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="modern-input with-icon"
                          autoFocus
                        />
                      </div>
                    </label>
                  </div>

                  {error && (
                    <div className="form-alert error animated-alert">
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                  )}

                  <button className="primary-btn full glow-btn" disabled={busy}>
                    {busy ? 'Sending Code...' : 'Send Verification Code'}
                    <ArrowRight size={18} />
                  </button>
                </form>
              )}

              <div className="back-link-wrap">
                <button
                  type="button"
                  className="link-btn-subtle"
                  onClick={() => {
                    setForgotMode(false);
                    setResetOtpSent(false);
                    setResetOtpCode('');
                    setError('');
                  }}
                >
                  &larr; Back to sign in
                </button>
              </div>
            </div>
          ) : (
            /* Main Sign In / Sign Up Flow */
            <div className="auth-flow-container">
              {/* Segmented Mode Switcher (Watermelon UI style) */}
              <div className="segmented-auth-toggle">
                <button
                  type="button"
                  className={`segment-btn ${mode === 'signin' ? 'active' : ''}`}
                  onClick={() => {
                    setMode('signin');
                    setError('');
                    setNotice('');
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`segment-btn ${mode === 'signup' ? 'active' : ''}`}
                  onClick={() => {
                    setMode('signup');
                    setError('');
                    setNotice('');
                    if (faceStreamRef.current) {
                      stopCamera(faceStreamRef.current);
                      setFaceStage('idle');
                    }
                  }}
                >
                  Create Account
                </button>
              </div>

              {/* Heading */}
              <div className="auth-heading">
                <h2>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
                <p>
                  {mode === 'signin'
                    ? 'Access your resume analysis, roadmaps, and career milestones.'
                    : 'Get started with automated placement prep in under a minute.'}
                </p>
              </div>

              {/* Sign In Method Pills (Only on Sign In mode) */}
              {mode === 'signin' && !isNoRecoveryAccount && (
                <div className="auth-method-pills">
                  <button
                    type="button"
                    className={`method-pill ${authMethod === 'password' ? 'active' : ''}`}
                    onClick={() => {
                      setAuthMethod('password');
                      setError('');
                      if (faceStreamRef.current) {
                        stopCamera(faceStreamRef.current);
                        setFaceStage('idle');
                      }
                    }}
                  >
                    <Lock size={14} />
                    <span>Password</span>
                  </button>
                  <button
                    type="button"
                    className={`method-pill ${authMethod === 'otp' ? 'active' : ''}`}
                    onClick={() => {
                      setAuthMethod('otp');
                      setError('');
                      if (faceStreamRef.current) {
                        stopCamera(faceStreamRef.current);
                        setFaceStage('idle');
                      }
                    }}
                  >
                    <KeyRound size={14} />
                    <span>Email Code</span>
                  </button>
                  <button
                    type="button"
                    className={`method-pill ${authMethod === 'face' ? 'active' : ''}`}
                    onClick={() => {
                      setAuthMethod('face');
                      setError('');
                      startFaceScan();
                    }}
                  >
                    <Camera size={14} />
                    <span>Face Scan</span>
                  </button>
                </div>
              )}

              {/* Biometric Face Scan View */}
              {mode === 'signin' && authMethod === 'face' && !isNoRecoveryAccount ? (
                <div className="auth-form face-auth-panel">
                  <div className="face-scan-hud-container">
                    <div
                      className="camera-frame hud-frame"
                      style={faceStage === 'idle' ? { display: 'none' } : undefined}
                    >
                      <video ref={faceVideoRef} muted playsInline className="face-scan-video" />

                      {/* Biometric HUD Reticle & Scanline */}
                      <div className="hud-corner top-left" />
                      <div className="hud-corner top-right" />
                      <div className="hud-corner bottom-left" />
                      <div className="hud-corner bottom-right" />
                      <div className="hud-scanline-beam" />

                      <span className="camera-live-badge">
                        <span className="camera-live-dot" /> LIVE BIOMETRIC
                      </span>
                    </div>
                  </div>

                  {faceStage === 'camera' && faceDarkGlasses && (
                    <div className="face-status-alert warning">
                      <AlertCircle size={15} />
                      <span>Please remove dark glasses so we can recognize your facial features.</span>
                    </div>
                  )}

                  {faceStage === 'camera' && !faceDarkGlasses && (
                    <div className="face-status-pill scanning">
                      <span className="pulse-indicator" />
                      <span>Position your face within the frame &mdash; scanning automatically...</span>
                    </div>
                  )}

                  {faceStage === 'scanning' && (
                    <div className="face-status-pill verifying">
                      <RefreshCw size={14} className="spin" />
                      <span>Verifying biometric signature...</span>
                    </div>
                  )}

                  {error && (
                    <div className="form-alert error animated-alert">
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                  )}

                  {faceStage === 'idle' && (
                    <button
                      type="button"
                      className="primary-btn full glow-btn"
                      disabled={busy}
                      onClick={startFaceScan}
                    >
                      <Camera size={17} />
                      <span>Open Camera &amp; Scan</span>
                    </button>
                  )}

                  {faceStage === 'camera' && (
                    <button
                      type="button"
                      className="secondary-btn full"
                      disabled={busy}
                      onClick={captureFaceScan}
                    >
                      <span>Scan Now Instead</span>
                      <ArrowRight size={16} />
                    </button>
                  )}

                  {faceStage === 'scanning' && (
                    <button type="button" className="primary-btn full" disabled>
                      <RefreshCw size={16} className="spin" />
                      <span>Verifying Face Match...</span>
                    </button>
                  )}
                </div>
              ) : mode === 'signin' && authMethod === 'otp' && !isNoRecoveryAccount ? (
                /* Email Code OTP View */
                otpSent ? (
                  <form onSubmit={verifyOtpSubmit} className="auth-form modern-form">
                    <div className="input-group">
                      <label>
                        <span>Code sent to {email}</span>
                        <input
                          required
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          placeholder="Enter the 6-digit code"
                          inputMode="numeric"
                          className="modern-input code-input"
                          autoFocus
                        />
                      </label>
                    </div>

                    {error && (
                      <div className="form-alert error animated-alert">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                      </div>
                    )}

                    <button className="primary-btn full glow-btn" disabled={busy}>
                      {busy ? 'Verifying...' : 'Verify & Sign In'}
                      <ArrowRight size={18} />
                    </button>

                    <p className="switch-auth">
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => {
                          setOtpSent(false);
                          setOtpCode('');
                          setError('');
                        }}
                      >
                        Use a different email address
                      </button>
                    </p>
                  </form>
                ) : (
                  <form onSubmit={sendOtp} className="auth-form modern-form">
                    <div className="input-group">
                      <label>
                        <span>Email Address</span>
                        <div className="input-icon-wrap">
                          <Mail size={16} className="field-icon" />
                          <input
                            required
                            type="email"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="modern-input with-icon"
                            autoFocus
                          />
                        </div>
                      </label>
                    </div>

                    {error && (
                      <div className="form-alert error animated-alert">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                      </div>
                    )}

                    <button className="primary-btn full glow-btn" disabled={busy}>
                      {busy ? 'Sending code...' : 'Send Sign-In Code'}
                      <ArrowRight size={18} />
                    </button>
                  </form>
                )
              ) : (
                /* Standard Password Form (Sign In or Sign Up) */
                <form onSubmit={submit} className="auth-form modern-form">
                  {mode === 'signup' && (
                    <div className="input-group">
                      <label>
                        <span>Full Name</span>
                        <div className="input-icon-wrap">
                          <User size={16} className="field-icon" />
                          <input
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Aarav Sharma"
                            className="modern-input with-icon"
                          />
                        </div>
                      </label>
                    </div>
                  )}

                  <div className="input-group">
                    <label>
                      <span>Email Address</span>
                      <div className="input-icon-wrap">
                        <Mail size={16} className="field-icon" />
                        <input
                          required
                          type="email"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="modern-input with-icon"
                        />
                      </div>
                    </label>
                  </div>

                  <div className="input-group">
                    <div className="label-row">
                      <span>Password</span>
                      {mode === 'signin' && !isNoRecoveryAccount && (
                        <button
                          type="button"
                          className="forgot-link-btn"
                          onClick={() => {
                            setForgotMode(true);
                            setError('');
                            setNotice('');
                          }}
                        >
                          Forgot?
                        </button>
                      )}
                    </div>
                    <PasswordInput
                      value={password}
                      onChange={setPassword}
                      placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                      showStrength={mode === 'signup'}
                    />
                  </div>

                  {mode === 'signup' && (
                    <div className="input-group">
                      <label>
                        <span>Mobile Number</span>
                        <PhoneInput required value={phone} onChange={setPhone} />
                      </label>
                    </div>
                  )}

                  {error && (
                    <div className="form-alert error animated-alert">
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                  )}

                  {notice && (
                    <div className="form-alert success animated-alert">
                      <CheckCircle2 size={16} />
                      <span>{notice}</span>
                    </div>
                  )}

                  <button className="primary-btn full glow-btn" disabled={busy}>
                    <span>
                      {busy
                        ? 'Please wait...'
                        : mode === 'signin'
                        ? 'Enter Workspace'
                        : 'Create Free Account'}
                    </span>
                    <ArrowRight size={18} />
                  </button>
                </form>
              )}

              {/* Bottom Switcher */}
              <div className="switch-auth modern-switch">
                <span>
                  {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
                </span>
                <button
                  type="button"
                  className="switch-btn"
                  onClick={() => {
                    setMode(mode === 'signin' ? 'signup' : 'signin');
                    setError('');
                    setNotice('');
                  }}
                >
                  {mode === 'signin' ? 'Create one now' : 'Sign in'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
