import { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Zap,
  ChevronRight,
  Award,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import {
  getInterviewQuestionsForRole,
  evaluateInterviewResponse,
  type InterviewQuestion,
  type InterviewEvaluation,
} from '@/lib/mockInterview';

interface MockInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRole: string;
}

export function MockInterviewModal({
  isOpen,
  onClose,
  targetRole,
}: MockInterviewModalProps) {
  const questions: InterviewQuestion[] = useMemo(() => {
    return getInterviewQuestionsForRole(targetRole || 'SOC Analyst');
  }, [targetRole]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<InterviewEvaluation | null>(null);
  const [pasteWarning, setPasteWarning] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentQ = questions[currentIndex] || questions[0];

  const handleSubmitAnswer = () => {
    if (!answerText.trim()) return;
    setIsSubmitting(true);
    setTimeout(() => {
      const evalResult = evaluateInterviewResponse(currentQ, answerText);
      setEvaluation(evalResult);
      setIsSubmitting(false);
    }, 700);
  };

  const handleNextQuestion = () => {
    setEvaluation(null);
    setAnswerText('');
    setPasteWarning(null);
    setCurrentIndex((prev) => (prev + 1) % questions.length);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const diff = newVal.length - answerText.length;
    // Guard against programmatic / automated paste bypass (>35 chars inserted instantly)
    if (diff > 35) {
      setPasteWarning('🚫 Bulk text insertion detected. Please type your response directly to demonstrate authentic communication.');
      return;
    }
    if (pasteWarning) setPasteWarning(null);
    setAnswerText(newVal);
  };

  const blockPaste = (e: React.ClipboardEvent | React.DragEvent) => {
    e.preventDefault();
    setPasteWarning('🚫 Copy-pasting is strictly disabled in Technical Interview Mode. Please formulate and type your own response.');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
      e.preventDefault();
      setPasteWarning('🚫 Keyboard paste (Ctrl+V / Cmd+V) is disabled. Please type your answer directly.');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="interview-modal glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="interview-modal-head">
          <div className="interview-title-group">
            <div className="interview-eyebrow">
              <Zap size={14} className="text-emerald" />
              <span>AI TECHNICAL INTERVIEW COACH</span>
            </div>
            <h2>Technical Mock Interview: {targetRole || 'SOC Analyst'}</h2>
            <p>Practice real-world interview scenarios and get evaluated on the <strong>STAR Method</strong> &amp; technical depth.</p>
          </div>
          <button className="interview-close-btn" onClick={onClose} aria-label="Close interview modal">
            <X size={18} />
          </button>
        </div>

        {/* Question Banner */}
        <div className="interview-q-card">
          <div className="interview-q-meta">
            <span className="interview-q-index">Question {currentIndex + 1} of {questions.length}</span>
            <span className="interview-q-context">{currentQ.context}</span>
          </div>
          <h3 className="interview-q-text">"{currentQ.question}"</h3>

          <div className="interview-criteria-chips">
            <span className="criteria-lbl">Recruiter Evaluation Signals:</span>
            {currentQ.evaluationCriteria.map((crit, idx) => (
              <span key={idx} className="criteria-chip">
                ✓ {crit}
              </span>
            ))}
          </div>
        </div>

        {/* Response Input or Evaluation Result */}
        {evaluation ? (
          <div className="interview-eval-box">
            {evaluation.isPlagiarized && (
              <div className="paste-warning-banner" style={{ marginBottom: 16 }}>
                <ShieldAlert size={18} />
                <div>
                  <strong>Plagiarism / Benchmark Copy Flagged:</strong> Canned or copied answers score 0% to prevent interview fraud. Please articulate your own hands-on experience.
                </div>
              </div>
            )}

            <div className="interview-eval-head">
              <div className={`interview-score-ring ${evaluation.overallScore === 0 ? 'score-zero' : ''}`}>
                <div className="score-number">{evaluation.overallScore}%</div>
                <div className="score-tag">INTERVIEW FIT</div>
              </div>

              <div className="interview-metric-bars">
                <div className="metric-bar-item">
                  <div className="metric-bar-label">
                    <span>Technical Accuracy</span>
                    <strong>{evaluation.technicalAccuracyScore}%</strong>
                  </div>
                  <div className="bar-track">
                    <div style={{ width: `${evaluation.technicalAccuracyScore}%`, background: '#10b981' }} />
                  </div>
                </div>

                <div className="metric-bar-item">
                  <div className="metric-bar-label">
                    <span>STAR Method Structure</span>
                    <strong>{evaluation.starStructureScore}%</strong>
                  </div>
                  <div className="bar-track">
                    <div style={{ width: `${evaluation.starStructureScore}%`, background: '#3b82f6' }} />
                  </div>
                </div>

                <div className="metric-bar-item">
                  <div className="metric-bar-label">
                    <span>Communication &amp; Clarity</span>
                    <strong>{evaluation.communicationScore}%</strong>
                  </div>
                  <div className="bar-track">
                    <div style={{ width: `${evaluation.communicationScore}%`, background: '#8b5cf6' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="eval-feedback-grid">
              <div className="eval-col strengths">
                <h4>
                  <CheckCircle2 size={14} className="text-emerald" /> Key Strengths
                </h4>
                {evaluation.strengths.length > 0 ? (
                  <ul>
                    {evaluation.strengths.map((str, idx) => (
                      <li key={idx}>{str}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-strengths-text">No technical strengths identified in this attempt.</p>
                )}
              </div>

              <div className="eval-col improvements">
                <h4>
                  <AlertCircle size={14} className="text-amber" /> Areas to Sharpen
                </h4>
                <ul>
                  {evaluation.improvements.map((imp, idx) => (
                    <li key={idx}>{imp}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div
              className="eval-model-answer"
              onCopy={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
            >
              <div className="model-answer-head">
                <Award size={14} />
                <span>Benchmark STAR Answer (How Top 1% Candidates Answer):</span>
                <span className="anti-cheat-pill">
                  <Lock size={10} /> Copy-Protected
                </span>
              </div>
              <p className="model-answer-text select-none">"{evaluation.modelAnswer}"</p>
            </div>

            <div className="eval-actions-bar">
              <button
                className="secondary-btn"
                onClick={() => {
                  setEvaluation(null);
                  setPasteWarning(null);
                }}
              >
                Try Answering Again
              </button>
              <button className="primary-btn next-q-btn" onClick={handleNextQuestion}>
                <span>Next Question</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        ) : (
          <div className="interview-answer-box">
            <div className="answer-box-head">
              <span className="star-tip">
                💡 Tip: Structure your response using <strong>Situation</strong>, <strong>Task</strong>, <strong>Action</strong>, and <strong>Result</strong>.
              </span>
              <div className="answer-box-status">
                <span className="anti-cheat-badge">
                  <Lock size={11} /> Anti-Cheat: Paste Disabled
                </span>
                <span className="char-count">{answerText.length} characters</span>
              </div>
            </div>

            {pasteWarning && (
              <div className="paste-warning-banner">
                <ShieldAlert size={15} />
                <span>{pasteWarning}</span>
              </div>
            )}

            <textarea
              id="interview-answer-input"
              className="interview-textarea"
              placeholder="Type your spoken or written response directly. E.g., 'In my previous project, when our SIEM triggered... I was responsible for... So I executed the following containment steps... and the final result was...'"
              value={answerText}
              onChange={handleTextChange}
              onPaste={blockPaste}
              onDrop={blockPaste}
              onKeyDown={handleKeyDown}
              onFocus={(e) => {
                setTimeout(() => {
                  try {
                    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  } catch {}
                }, 280);
              }}
              autoCapitalize="sentences"
              autoComplete="off"
              autoCorrect="on"
              spellCheck={true}
              rows={5}
            />

            <div className="interview-action-buttons">
              <button className="secondary-btn" onClick={onClose}>
                Exit Session
              </button>
              <button
                className="primary-btn submit-answer-btn"
                onClick={handleSubmitAnswer}
                disabled={isSubmitting || answerText.trim().length < 20}
              >
                {isSubmitting ? (
                  <span>Analyzing with AI Coach...</span>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Evaluate My Answer</span>
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
