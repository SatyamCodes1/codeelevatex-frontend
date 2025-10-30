import React, { useRef, useEffect, useState } from 'react';
import API from '../api'; // make sure this path is correct
import '../styles/TabNavigation.css';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  lessonId?: string;
  type?: 'coding' | 'quiz' | 'content';
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  courseId: string;
  token: string;
  completedLessons?: string[];
  lessonStatuses?: Record<string, boolean>;
  onProgressUpdate?: (completedLessons: string[], overallPercentage: number) => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
  courseId,
  token,
  completedLessons: completedLessonsProp = [],
  lessonStatuses: lessonStatusesProp = {},
  onProgressUpdate,
}) => {
  const tabsRef = useRef<HTMLDivElement>(null);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });
  const [completedLessons, setCompletedLessons] = useState<string[]>(completedLessonsProp);
  const [lessonStatuses, setLessonStatuses] = useState<Record<string, boolean>>(lessonStatusesProp);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // ✅ FIXED: Added API base URL
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // ---------------- FETCH PROGRESS ----------------
  useEffect(() => {
    if (!courseId || !token) return;

    const fetchProgress = async () => {
      try {
        // ✅ FIXED: Using fetch with /api prefix instead of API.get
        const res = await fetch(`${API_BASE}/api/progress/course/${courseId}`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        const completed: string[] = [];
        const statuses: Record<string, boolean> = {};

        if (data.progress?.detailedProgress) {
          data.progress.detailedProgress.forEach((p: any) => {
            let isCompleted = p.status === 'completed';

            // Check coding submissions
            if (p.lessonProgress?.codingSubmissions?.length) {
              const latest =
                p.lessonProgress.codingSubmissions[p.lessonProgress.codingSubmissions.length - 1];
              if (latest.percentage === 100) isCompleted = true;
            }

            // Check quiz attempts
            if (p.lessonProgress?.quizAttempts?.length) {
              const latestQuiz = p.lessonProgress.quizAttempts[p.lessonProgress.quizAttempts.length - 1];
              if (latestQuiz.score === 100) isCompleted = true;
            }

            if (p.lessonId) {
              statuses[p.lessonId] = isCompleted;
              if (isCompleted) completed.push(p.lessonId);
            }
          });

          setCompletedLessons(completed);
          setLessonStatuses(statuses);

          const totalLessons = tabs.filter((t) => t.lessonId).length;
          const overallPercentage =
            totalLessons > 0 ? Math.round((completed.length / totalLessons) * 100) : 0;

          onProgressUpdate?.(completed, overallPercentage);
        }
      } catch (err: any) {
        console.error('[TabNavigation] Fetch progress error:', err);
      }
    };

    fetchProgress();
  }, [courseId, token, tabs, onProgressUpdate, API_BASE]);

  // ---------------- UNDERLINE ----------------
  const updateUnderline = () => {
    if (!tabsRef.current) return;
    const activeButton = tabsRef.current.querySelector<HTMLButtonElement>('.tab-navigation__button.active');
    if (activeButton) {
      const { offsetLeft, offsetWidth } = activeButton;
      setUnderlineStyle({ left: offsetLeft, width: offsetWidth });

      const container = tabsRef.current;
      const containerWidth = container.offsetWidth;
      const scrollPosition = offsetLeft - containerWidth / 2 + offsetWidth / 2;
      container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    updateUnderline();
    window.addEventListener('resize', updateUnderline);
    return () => window.removeEventListener('resize', updateUnderline);
  }, [activeTab, tabs]);

  // ---------------- KEYBOARD & TOUCH ----------------
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    if (currentIndex === -1) return;

    if (e.key === 'ArrowRight') onTabChange(tabs[(currentIndex + 1) % tabs.length].id);
    else if (e.key === 'ArrowLeft') onTabChange(tabs[(currentIndex - 1 + tabs.length) % tabs.length].id);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => (touchStartX.current = e.touches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => (touchEndX.current = e.touches[0].clientX);
  const handleTouchEnd = () => {
    const delta = touchStartX.current - touchEndX.current;
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    if (Math.abs(delta) > 50) {
      if (delta > 0) onTabChange(tabs[(currentIndex + 1) % tabs.length].id);
      else onTabChange(tabs[(currentIndex - 1 + tabs.length) % tabs.length].id);
    }
  };

  // ---------------- SYNC PROPS ----------------
  useEffect(() => {
    setCompletedLessons(completedLessonsProp);
  }, [completedLessonsProp]);

  useEffect(() => {
    setLessonStatuses(lessonStatusesProp);
  }, [lessonStatusesProp]);

  // ---------------- RENDER ----------------
  return (
    <div
      className="tab-navigation"
      role="tablist"
      aria-label="Tabs"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="tab-navigation__container" ref={tabsRef}>
        <div className="tab-navigation__tabs">
          {tabs.map((tab) => {
            const isCompleted = tab.lessonId ? lessonStatuses[tab.lessonId] : false;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`tab-navigation__button ${activeTab === tab.id ? 'active' : ''}`}
                role="tab"
                aria-selected={activeTab === tab.id}
                tabIndex={activeTab === tab.id ? 0 : -1}
              >
                {tab.icon && <span className="tab-navigation__icon">{tab.icon}</span>}
                <span>{tab.label}</span>
                {isCompleted && <span className="tab-navigation__tick">✔️</span>}
              </button>
            );
          })}
          <div
            className="tab-navigation__underline"
            style={{ left: underlineStyle.left, width: underlineStyle.width }}
          />
        </div>
      </div>
    </div>
  );
};

export default TabNavigation;
