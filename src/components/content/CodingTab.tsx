import React, { useEffect, useState, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import axios from 'axios';
import { useCourse } from '../../context/CourseContext';
import { Lesson, Problem, SubmissionResult, TestCase } from '../../types';
import '../../styles/CodingTab.css';

type Tab = 'editor' | 'output' | 'testcases';

interface CodingTabProps {
  lesson: Lesson;
  problems: Problem[];
  authToken?: string | null;
}

const DEFAULT_STARTER: Record<string, string> = {
  javascript: `// JavaScript\nconsole.log("Hello World");`,
  python: `# Python\nprint("Hello World")`,
  cpp: `// C++\n#include <iostream>\nint main(){ std::cout << "Hello World\\n"; return 0; }`,
  java: `// Java\nclass Solution { public static void main(String[] args){ System.out.println("Hello World"); } }`,
};

const LANG_MAP: Record<string, string> = {
  javascript: 'javascript',
  js: 'javascript',
  python: 'python',
  py: 'python',
  cpp: 'cpp',
  'c++': 'cpp',
  java: 'java',
};

const POLL_INTERVAL = 1000; // 1 sec

// ✅ React CRA-compatible env variable
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const CodingTab: React.FC<CodingTabProps> = ({ lesson, problems, authToken }) => {
  const [activeProblem, setActiveProblem] = useState<number>(0);
  const [code, setCode] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('editor');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('javascript');

  const { updateLessonProgress } = useCourse();
  const editorRef = useRef<any>(null);

  const currentProblem: Problem | undefined = problems?.[activeProblem];

  // Set code & language when problem changes
  useEffect(() => {
    if (!currentProblem) return;
    const lang = currentProblem?.language
      ? LANG_MAP[currentProblem.language.toLowerCase()] || currentProblem.language.toLowerCase()
      : 'javascript';
    setSelectedLanguage(lang);
    const starter = currentProblem?.starterCode ?? DEFAULT_STARTER[lang] ?? '// Start coding here';
    setCode(starter);
    setOutput('');
    setSubmissionResult(null);
    setActiveTab('editor');
  }, [currentProblem]);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
    editor.updateOptions({
      tabSize: 2,
      insertSpaces: true,
      fontSize: 13,
      minimap: { enabled: false },
      wordWrap: 'on',
    });
  };

  // Preserve current code when switching languages
  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    if (!code || code === DEFAULT_STARTER[selectedLanguage]) {
      setCode(DEFAULT_STARTER[lang]);
    }
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setActiveTab('output');
    setOutput('Running code locally...\n');
    try {
      await new Promise((res) => setTimeout(res, 800));
      if (!code.trim()) setOutput('Error: No code to execute');
      else
        setOutput(
          (prev) =>
            prev +
            '\n✅ Program executed (mock)\nOutput:\nHello World\nExecution time: 0.023s'
        );
    } catch (err: any) {
      setOutput(`Error: ${String(err?.message ?? err)}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitCode = async () => {
    if (!currentProblem) return;
    setIsSubmitting(true);
    setSubmissionResult(null);
    setOutput('Submitting code to judge...\n');

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      };

      const payload = {
        courseId: currentProblem.courseId ?? '',
        lessonId: lesson.lessonId,
        problemId: currentProblem.problemId,
        code,
        language: selectedLanguage,
        testCases: currentProblem.testCases,
      };

      // ✅ using API_BASE env variable
      const res = await axios.post(`${API_BASE}/api/progress/coding/submit`, payload, { headers });
      const submissionId: string = res.data?.submissionId;
      if (!submissionId) throw new Error('No submissionId returned');

      let done = false;
      while (!done) {
        await new Promise((res) => setTimeout(res, POLL_INTERVAL));
        try {
          const statusRes = await axios.get(`${API_BASE}/api/submissions/${submissionId}`, { headers });
          const result: SubmissionResult | null = statusRes.data?.submission ?? null;
          if (result) {
            setSubmissionResult(result);

            let out = '';
            result.output.split('\n').forEach((line: string, i: number) => {
              out += `Line ${i + 1}: ${line}\n`;
            });
            setOutput(out);

            if (result.success) done = true;
          }
        } catch (err) {
          console.warn('Polling error', err);
        }
      }

      if (updateLessonProgress) updateLessonProgress(lesson.lessonId, { submissionId });
      setActiveTab('output');
    } catch (err: any) {
      setOutput((prev) => prev + `\n❌ Submission failed: ${err.message ?? err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setOutput((prev) => prev + '\n(code copied)');
    } catch {
      setOutput((prev) => prev + '\nFailed to copy code');
    }
  };

  const downloadCode = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const ext =
      selectedLanguage === 'python'
        ? 'py'
        : selectedLanguage === 'cpp'
        ? 'cpp'
        : selectedLanguage === 'java'
        ? 'java'
        : 'js';
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProblem?.title?.replace(/\s+/g, '_') || 'solution'}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="codingtab-container">
      {problems.length > 1 && (
        <div className="problem-tabs">
          {problems.map((p: Problem, i: number) => (
            <button
              key={p.problemId ?? i}
              onClick={() => setActiveProblem(i)}
              className={`problem-tab ${activeProblem === i ? 'active' : ''}`}
            >
              Problem {i + 1}
            </button>
          ))}
        </div>
      )}

      <div className="codingtab-grid">
        {/* Problem details */}
        <div className="problem-details">
          <div className="problem-card">
            <h2 className="problem-title">{currentProblem?.title}</h2>
            <p className="problem-description">{currentProblem?.description}</p>
          </div>
        </div>

        {/* Editor / Output / Testcases */}
        <div className="coding-section">
          <div className="tab-buttons">
            {(['editor', 'output', 'testcases'] as Tab[]).map((tab: Tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`tab-button ${activeTab === tab ? 'active' : ''}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === 'editor' && (
            <div className="editor-container">
              <div className="editor-header">
                <div className="editor-actions">
                  <button onClick={copyCode}>Copy</button>
                  <button onClick={downloadCode}>Download</button>
                </div>
                <div className="editor-language">Language: {selectedLanguage.toUpperCase()}</div>
              </div>

              <div className="language-switcher">
                {Object.keys(DEFAULT_STARTER).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageChange(lang)}
                    className={`lang-button ${selectedLanguage === lang ? 'active' : ''}`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>

              <Editor
                height="100%"
                language={selectedLanguage === 'cpp' ? 'cpp' : selectedLanguage}
                value={code}
                onMount={handleEditorMount}
                onChange={(val) => val !== undefined && setCode(val)}
                options={{
                  minimap: { enabled: false },
                  fontFamily: 'monospace',
                  fontSize: 13,
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                }}
              />

              <div className="editor-buttons">
                <button onClick={handleRunCode} disabled={isRunning || isSubmitting}>
                  {isRunning ? 'Running...' : '▶ Run'}
                </button>
                <button onClick={handleSubmitCode} disabled={isSubmitting || isRunning}>
                  {isSubmitting ? 'Submitting...' : '📤 Submit'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'output' && (
            <div className="output-console">{output || 'Output will appear here...'}</div>
          )}

          {activeTab === 'testcases' && (
            <div className="testcases-wrapper">
              {(currentProblem?.testCases || []).map((tc: TestCase, idx: number) => {
                const passed = submissionResult?.success ?? null;
                return (
                  <div
                    key={idx}
                    className={`testcase-card ${
                      passed === true ? 'passed' : passed === false ? 'failed' : ''
                    }`}
                  >
                    <div className="testcase-content">
                      <div>
                        <strong>Input:</strong> <span className="mono">{tc.input}</span>
                      </div>
                      <div>
                        <strong>Expected:</strong> <span className="mono">{tc.expected}</span>
                      </div>
                    </div>
                    <div className="testcase-result">
                      {passed === true ? '✅ Passed' : passed === false ? '❌ Failed' : 'Not run'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodingTab;
