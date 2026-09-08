import { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  Send,
  Zap,
  ChevronRight,
  Award,
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
    setCurrentIndex((prev) => (prev + 1) % questions.length);
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
          <button className="interview-close-btn" onClick={onClose}>
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
            <div className="interview-eval-head">
              <div className="interview-score-ring">
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
                <ul>
                  {evaluation.strengths.map((str, idx) => (
                    <li key={idx}>{str}</li>
                  ))}
                </ul>
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

            <div className="eval-model-answer">
              <div className="model-answer-head">
                <Award size={14} />
                <span>Benchmark STAR Answer (How Top 1% Candidates Answer):</span>
              </div>
              <p className="model-answer-text">"{evaluation.modelAnswer}"</p>
            </div>

            <div className="eval-actions-bar">
              <button className="secondary-btn" onClick={() => setEvaluation(null)}>
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
              <span className="char-count">{answerText.length} characters</span>
            </div>

            <textarea
              className="interview-textarea"
              placeholder="Type your spoken or written response here. E.g., 'In my previous project, when our SIEM triggered... I was responsible for... So I executed the following containment steps... and the final result was...'"
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              rows={7}
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
