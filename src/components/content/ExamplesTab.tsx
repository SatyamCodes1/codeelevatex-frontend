import React, { useState, useEffect } from 'react';
import { useCourse } from '../../context/CourseContext';
import { Lesson, Example } from '../../types';
import '../../styles/ExamplesTab.css';

interface ExamplesTabProps {
  lesson: Lesson | null;
  examples: Example[] | null;
}

const ExamplesTab: React.FC<ExamplesTabProps> = ({ lesson, examples }) => {
  const [activeExample, setActiveExample] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { updateLessonProgress } = useCourse();

  useEffect(() => {
    if (!lesson) return;

    const startTime = Date.now();
    return () => {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      if (timeSpent > 30) {
        updateLessonProgress(lesson.lessonId, {
          status: 'in_progress',
          timeSpent,
        });
      }
    };
  }, [lesson, updateLessonProgress]);

  const markAsComplete = () => {
    if (lesson) {
      updateLessonProgress(lesson.lessonId, {
        status: 'completed',
        timeSpent: 180,
      });
    }
  };

  if (!examples || examples.length === 0) {
    return (
      <div className="examples-empty">
        <div className="examples-empty-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
        <h3>No Examples Available</h3>
        <p>This lesson doesn't have practical examples yet.</p>
      </div>
    );
  }

  const current = examples[activeExample];

  const handleCopy = (code: string | undefined, index: number) => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000); // reset after 2s
    });
  };

  return (
    <div className="examples-container">
      {/* Header */}
      <div className="examples-header">
        <h1>Examples</h1>
      </div>

      {/* Example Navigation */}
      <div className="examples-nav">
        {examples.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveExample(index)}
            className={activeExample === index ? 'active' : ''}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {/* Current Example */}
      <div className="examples-card">
        <div className="examples-card-header">
          <h3>{current.title || ''}</h3>
          {current.description && <p>{current.description}</p>}
        </div>

        <div className="examples-card-content">
          {/* Code Section */}
          <div className="examples-code-box">
            <div className="examples-code-topbar">
              <span>{current.language || 'javascript'}</span>
              <button
                onClick={() => handleCopy(current.code, activeExample)}
                className={`copy-btn ${copiedIndex === activeExample ? 'copied' : ''}`}
              >
                {copiedIndex === activeExample ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="examples-code-pre">
              <code>{current.code || '// No code provided'}</code>
            </pre>
          </div>

          {/* Output Section */}
          {current.output && (
            <div className="examples-output">
              <pre>{current.output}</pre>
            </div>
          )}

          {/* Explanation Section */}
          {current.explanation && (
            <div className="examples-explanation">
              <p>{current.explanation}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="examples-nav-btns">
        <button
          onClick={() => setActiveExample(Math.max(0, activeExample - 1))}
          disabled={activeExample === 0}
        >
          ← Previous
        </button>
        <span className="examples-page-number">
          {activeExample + 1} of {examples.length}
        </span>
        <button
          onClick={() =>
            setActiveExample(Math.min(examples.length - 1, activeExample + 1))
          }
          disabled={activeExample === examples.length - 1}
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default ExamplesTab;
