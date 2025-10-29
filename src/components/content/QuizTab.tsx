import React, { useState } from "react";
import { Question, Quiz, QuizResults, QuizResultDetail } from "../../types";
import { Lesson } from "../../types";
import "../../styles/QuizTab.css";

interface QuizTabProps {
  lesson: Lesson;
  quiz: Quiz;
}

const QuizTab: React.FC<QuizTabProps> = ({ lesson, quiz }) => {
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<QuizResults | null>(null);

  const handleAnswerChange = (questionId: string, answer: any) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleSubmit = () => {
    if (!quiz.questions || quiz.questions.length === 0) {
      alert("No questions available");
      return;
    }

    let correctCount = 0;
    let earnedPoints = 0;
    let totalPoints = 0;

    const details: QuizResultDetail[] = quiz.questions.map((q) => {
      // ✅ Generate ID if missing
      const qId = q.questionId || `q-${Math.random().toString(36).substr(2, 9)}`;
      const userAnswer = userAnswers[qId];
      const correctAnswer = q.correctAnswer || q.answer || "";
      const isCorrect = userAnswer === correctAnswer;
      const points = q.points || 1;

      totalPoints += points;
      if (isCorrect) {
        correctCount++;
        earnedPoints += points;
      }

      return {
        questionId: qId,  // ✅ Always defined
        question: q.question,
        userAnswer,
        correctAnswer,
        isCorrect,
        explanation: q.explanation,
        points,
      };
    });

    const score = quiz.questions.length > 0 
      ? Math.round((correctCount / quiz.questions.length) * 100) 
      : 0;
    
    const passingScore = quiz.passingScore || 70;
    const passed = score >= passingScore;

    setResults({
      score,
      correctAnswers: correctCount,
      totalQuestions: quiz.questions.length,
      earnedPoints,
      totalPoints,
      passed,
      details,
    });

    setSubmitted(true);
  };

  const handleRetry = () => {
    setUserAnswers({});
    setSubmitted(false);
    setResults(null);
  };

  if (!quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="quiz-tab">
        <div className="quiz-empty">
          <p>📝 No quiz questions available for this lesson yet.</p>
        </div>
      </div>
    );
  }

  if (submitted && results) {
    return (
      <div className="quiz-tab">
        <div className="quiz-results">
          <div className={`quiz-results-header ${results.passed ? "passed" : "failed"}`}>
            <h2>{results.passed ? "✅ Passed!" : "❌ Not Passed"}</h2>
            <div className="quiz-score">
              <span className="score-value">{results.score}%</span>
              <span className="score-label">Score</span>
            </div>
            <div className="quiz-stats">
              <div className="stat">
                <span className="stat-value">{results.correctAnswers}</span>
                <span className="stat-label">Correct</span>
              </div>
              <div className="stat">
                <span className="stat-value">{results.totalQuestions - results.correctAnswers}</span>
                <span className="stat-label">Incorrect</span>
              </div>
              <div className="stat">
                <span className="stat-value">{results.earnedPoints}/{results.totalPoints}</span>
                <span className="stat-label">Points</span>
              </div>
            </div>
          </div>

          <div className="quiz-answers-review">
            <h3>Review Your Answers</h3>
            {results.details.map((detail, idx) => {
              const question = quiz.questions[idx];
              const qId = detail.questionId;

              return (
                <div
                  key={qId}
                  className={`quiz-answer-card ${detail.isCorrect ? "correct" : "incorrect"}`}
                >
                  <div className="answer-card-header">
                    <span className="question-number">Question {idx + 1}</span>
                    <span className={`answer-badge ${detail.isCorrect ? "correct" : "incorrect"}`}>
                      {detail.isCorrect ? "✅ Correct" : "❌ Incorrect"}
                    </span>
                  </div>
                  <p className="question-text">{detail.question}</p>

                  {question?.type === "mcq" || !question?.type ? (
                    <div className="answer-options">
                      {question?.options?.map((option, optIdx) => {
                        const isUserAnswer = detail.userAnswer === option;
                        const isCorrectAnswer = detail.correctAnswer === option;

                        return (
                          <div
                            key={optIdx}
                            className={`answer-option ${
                              isUserAnswer ? "user-answer" : ""
                            } ${isCorrectAnswer ? "correct-answer" : ""}`}
                          >
                            <span className="option-label">{String.fromCharCode(65 + optIdx)}.</span>
                            <span className="option-text">{option}</span>
                            {isUserAnswer && !isCorrectAnswer && (
                              <span className="option-icon">❌</span>
                            )}
                            {isCorrectAnswer && <span className="option-icon">✅</span>}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="answer-text-review">
                      <p>
                        <strong>Your Answer:</strong> {detail.userAnswer || "(No answer)"}
                      </p>
                      <p>
                        <strong>Correct Answer:</strong> {detail.correctAnswer}
                      </p>
                    </div>
                  )}

                  {detail.explanation && (
                    <div className="answer-explanation">
                      <strong>Explanation:</strong>
                      <p>{detail.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="quiz-actions">
            <button className="btn btn-primary" onClick={handleRetry}>
              🔄 Retry Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-tab">
      <div className="quiz-header">
        <h2>📝 Quiz: {lesson.title}</h2>
        <p className="quiz-info">
          {quiz.questions.length} question{quiz.questions.length !== 1 ? "s" : ""}
          {quiz.timeLimit && ` • ${quiz.timeLimit} minutes`}
          {quiz.passingScore && ` • Passing score: ${quiz.passingScore}%`}
        </p>
      </div>

      <div className="quiz-questions">
        {quiz.questions.map((question, idx) => {
          // ✅ Generate ID if missing
          const qId = question.questionId || `q-${Math.random().toString(36).substr(2, 9)}`;

          return (
            <div key={qId} className="quiz-question-card">
              <div className="question-header">
                <span className="question-number">Question {idx + 1}</span>
                {question.points && (
                  <span className="question-points">{question.points} point{question.points !== 1 ? "s" : ""}</span>
                )}
              </div>
              <p className="question-text">{question.question}</p>

              {question.type === "mcq" || !question.type ? (
                <div className="question-options">
                  {question.options?.map((option, optIdx) => (
                    <label key={optIdx} className="option-label">
                      <input
                        type="radio"
                        name={qId}
                        value={option}
                        checked={userAnswers[qId] === option}
                        onChange={(e) => handleAnswerChange(qId, e.target.value)}
                      />
                      <span className="option-text">
                        <span className="option-letter">{String.fromCharCode(65 + optIdx)}.</span>
                        {option}
                      </span>
                    </label>
                  ))}
                </div>
              ) : question.type === "fill_blank" ? (
                <input
                  type="text"
                  className="fill-blank-input"
                  placeholder="Type your answer here..."
                  value={userAnswers[qId] || ""}
                  onChange={(e) => handleAnswerChange(qId, e.target.value)}
                />
              ) : question.type === "true_false" ? (
                <div className="question-options">
                  <label className="option-label">
                    <input
                      type="radio"
                      name={qId}
                      value="true"
                      checked={userAnswers[qId] === "true"}
                      onChange={(e) => handleAnswerChange(qId, e.target.value)}
                    />
                    <span className="option-text">True</span>
                  </label>
                  <label className="option-label">
                    <input
                      type="radio"
                      name={qId}
                      value="false"
                      checked={userAnswers[qId] === "false"}
                      onChange={(e) => handleAnswerChange(qId, e.target.value)}
                    />
                    <span className="option-text">False</span>
                  </label>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="quiz-submit">
        <button
          className="btn btn-primary btn-submit"
          onClick={handleSubmit}
          disabled={Object.keys(userAnswers).length === 0}
        >
          Submit Quiz
        </button>
        {Object.keys(userAnswers).length === 0 && (
          <p className="submit-hint">Please answer at least one question to submit</p>
        )}
      </div>
    </div>
  );
};

export default QuizTab;
