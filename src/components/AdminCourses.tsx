import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getCourses,
  updateCourse,
  deleteCourse,
  createCourse,
  Course as APICourse,
  CoursePayload,
} from "../api";
import "../styles/AdminCourses.css";
interface LessonContent {
  explanation?: string[];
  examples?: string[];
  quiz?: {
    question: string;
    options: string[];
    answer: string;
  }[];
  coding?: Problem[]; // Now properly typed
}

interface TestCase {
  input: string;
  expected: string;
}

interface Problem {
  problem: string;
  starterCode: string;
  solution: string;
  testCases?: TestCase[];
}

interface Lesson {
  lessonId: string;
  title: string;
  content: LessonContent;
}

// ... rest of your interfaces


interface Unit {
  unitId: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

interface Course {
  _id: string;
  title: string;
  description: string;
  price: number;
  category: "programming" | "design" | "business" | "other";
  level?: "beginner" | "intermediate" | "advanced";
  units: Unit[];
}

interface CoursePayloadFixed extends Partial<CoursePayload> {
  units?: Unit[];
}

type ContentType = "explanation" | "example" | "quiz" | "coding";

// Comment interfaces
interface CommentUser {
  _id?: string;
  id?: string;
  name: string;
  role: 'admin' | 'user';
}

interface CommentData {
  _id: string;
  parentId?: string | null;
  content: string;
  user: CommentUser;
  userId?: CommentUser;
  createdAt: string;
  courseId: string;
  lessonId?: string;
  children?: CommentData[];
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AdminCourses: React.FC = () => {
  const { user, token } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedContentType, setSelectedContentType] = useState<ContentType | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{
    show: boolean;
    type: string;
    id: string;
    name: string;
  }>({ show: false, type: "", id: "", name: "" });
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [view, setView] = useState<"courses" | "details" | "comments">("courses");

  const [newCourseTitle, setNewCourseTitle] = useState<string>("");
  const [newUnitTitle, setNewUnitTitle] = useState<string>("");
  const [newUnitDesc, setNewUnitDesc] = useState<string>("");

  // Comment management states
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [selectedCourseForComments, setSelectedCourseForComments] = useState<Course | null>(null);
  const [commentSearchQuery, setCommentSearchQuery] = useState("");

  // Console logging helper
  const logAPI = (action: string, data?: any, error?: any) => {
    const timestamp = new Date().toISOString();
    console.group(`🔍 API ${action} - ${timestamp}`);
    console.log("Action:", action);
    if (data) console.log("Data:", JSON.stringify(data, null, 2));
    if (error) console.error("Error:", error);
    console.groupEnd();
  };

  const loadCourses = async () => {
    setLoading(true);
    try {
      logAPI("LOAD_COURSES - START");
      const data: APICourse[] = await getCourses(token || "");
      logAPI("LOAD_COURSES - SUCCESS", { count: data.length });
      
      const normalized: Course[] = data.map((c: any) => ({
        _id: c._id,
        title: c.title || "",
        description: c.description || "",
        price: c.price || 0,
        category: c.category || "other",
        level: c.level,
        units: c.units || [],
      }));
      
      console.log("📊 Normalized Courses:", normalized);
      setCourses(normalized);
      
      // Update selectedCourse with fresh data
      if (selectedCourse) {
        const updated = normalized.find((c) => c._id === selectedCourse._id);
        if (updated) {
          console.log("🔄 Updating selected course:", {
            courseId: updated._id,
            unitsCount: updated.units.length,
            firstLessonContent: updated.units[0]?.lessons[0]?.content
          });
          setSelectedCourse(updated);
        }
      }
    } catch (err) {
      logAPI("LOAD_COURSES - ERROR", null, err);
      console.error("❌ Load courses failed:", err);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, [token]);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  // ============ COMMENT MANAGEMENT FUNCTIONS ============
  
  const loadCommentsForCourse = async (courseId: string) => {
    try {
      setLoadingComments(true);
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const res = await fetch(`${API_URL}/comments/${courseId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        console.log('💬 Comments loaded for course:', courseId, data.comments);
        setComments(data.comments || []);
      } else {
        console.error('Failed to load comments');
        setComments([]);
      }
    } catch (err) {
      console.error('Error loading comments:', err);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleViewComments = (course: Course) => {
    setSelectedCourseForComments(course);
    setView("comments");
    loadCommentsForCourse(course._id);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!token) return;
    
    const confirmDelete = window.confirm("Are you sure you want to delete this comment?");
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${API_URL}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        // Remove comment from state
        setComments(prev => prev.filter(c => c._id !== commentId));
        showSuccess("Comment deleted successfully!");
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to delete comment');
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
      alert('Failed to delete comment');
    }
  };

  const handleBackFromComments = () => {
    setView("courses");
    setSelectedCourseForComments(null);
    setComments([]);
    setCommentSearchQuery("");
  };

  // Filter comments by search query
  const filteredComments = comments.filter(comment => 
    comment.content.toLowerCase().includes(commentSearchQuery.toLowerCase()) ||
    comment.user?.name?.toLowerCase().includes(commentSearchQuery.toLowerCase())
  );

  // Group comments by lesson
  const groupCommentsByLesson = () => {
    const grouped: { [key: string]: CommentData[] } = {};
    
    filteredComments.forEach(comment => {
      const key = comment.lessonId || 'general';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(comment);
    });
    
    return grouped;
  };

  // ============ COURSE MANAGEMENT FUNCTIONS ============

  const handleCreateCourse = async () => {
    if (!newCourseTitle || !token) return;
    try {
      logAPI("CREATE_COURSE - START", { title: newCourseTitle });
      const result = await createCourse({ title: newCourseTitle } as CoursePayload, token);
      logAPI("CREATE_COURSE - SUCCESS", result);
      
      setNewCourseTitle("");
      await loadCourses();
      showSuccess("Course created successfully!");
    } catch (err) {
      logAPI("CREATE_COURSE - ERROR", null, err);
      console.error("❌ Create course failed:", err);
      alert("Failed to create course");
    }
  };

  const handleDeleteCourse = async (_id: string) => {
    if (!token) return;
    try {
      logAPI("DELETE_COURSE - START", { courseId: _id });
      const result = await deleteCourse(_id, token);
      logAPI("DELETE_COURSE - SUCCESS", result);
      
      setShowDeleteConfirm({ show: false, type: "", id: "", name: "" });
      await loadCourses();
      setView("courses");
      showSuccess("Course deleted successfully!");
    } catch (err) {
      logAPI("DELETE_COURSE - ERROR", null, err);
      console.error("❌ Delete course failed:", err);
    }
  };

  const handleSelectCourse = (course: Course) => {
    logAPI("SELECT_COURSE", { courseId: course._id, title: course.title });
    setSelectedCourse(course);
    setSelectedLesson(null);
    setView("details");
  };

  const handleBackToCourses = () => {
    setView("courses");
    setSelectedCourse(null);
  };

  const handleEditCourseDetails = (field: keyof Course, value: string | number) => {
    if (!selectedCourse) return;
    setSelectedCourse({ ...selectedCourse, [field]: value });
  };

  const handleSaveCourseDetails = async () => {
    if (!selectedCourse || !token) return;
    
    const payload: any = {
      title: selectedCourse.title,
      description: selectedCourse.description,
      price: selectedCourse.price,
      category: selectedCourse.category,
      level: selectedCourse.level,
      units: selectedCourse.units,
    };
    
    try {
      logAPI("SAVE_COURSE_DETAILS - START", { courseId: selectedCourse._id, payload });
      const result = await updateCourse(selectedCourse._id, payload, token);
      logAPI("SAVE_COURSE_DETAILS - SUCCESS", result);
      
      await loadCourses();
      showSuccess("Course details saved!");
    } catch (err) {
      logAPI("SAVE_COURSE_DETAILS - ERROR", { payload }, err);
      console.error("❌ Save course details failed:", err);
      alert("Failed to save course details. Check console.");
    }
  };

  const handleAddUnit = async () => {
    if (!selectedCourse || !newUnitTitle) return;
    const newUnit: Unit = {
      unitId: Date.now().toString(),
      title: newUnitTitle,
      description: newUnitDesc,
      lessons: [],
    };
    
    const updatedUnits = [...selectedCourse.units, newUnit];
    const payload: any = { units: updatedUnits };
    
    try {
      logAPI("ADD_UNIT - START", { courseId: selectedCourse._id, newUnit, payload });
      const result = await updateCourse(selectedCourse._id, payload, token || "");
      logAPI("ADD_UNIT - SUCCESS", result);
      
      setNewUnitTitle("");
      setNewUnitDesc("");
      await loadCourses();
      showSuccess("Unit added successfully!");
    } catch (err) {
      logAPI("ADD_UNIT - ERROR", { payload }, err);
      console.error("❌ Add unit failed:", err);
      alert("Failed to add unit. Check console.");
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (!selectedCourse) return;
    const updatedUnits = selectedCourse.units.filter((u) => u.unitId !== unitId);
    const payload: any = { units: updatedUnits };
    
    try {
      logAPI("DELETE_UNIT - START", { courseId: selectedCourse._id, unitId, payload });
      const result = await updateCourse(selectedCourse._id, payload, token || "");
      logAPI("DELETE_UNIT - SUCCESS", result);
      
      setShowDeleteConfirm({ show: false, type: "", id: "", name: "" });
      await loadCourses();
      showSuccess("Unit deleted successfully!");
    } catch (err) {
      logAPI("DELETE_UNIT - ERROR", { payload }, err);
      console.error("❌ Delete unit failed:", err);
    }
  };

  const handleAddLesson = async (unitId: string, title: string) => {
    if (!selectedCourse || !title) return;
    
    const newLesson: Lesson = {
      lessonId: Date.now().toString(),
      title,
      content: {
        explanation: [],
        examples: [],
        quiz: [],
        coding: [],
      },
    };
    
    const updatedUnits = selectedCourse.units.map((u) =>
      u.unitId === unitId ? { ...u, lessons: [...u.lessons, newLesson] } : u
    );
    
    const payload: any = { units: updatedUnits };
    
    try {
      logAPI("ADD_LESSON - START", { courseId: selectedCourse._id, unitId, newLesson, payload });
      const result = await updateCourse(selectedCourse._id, payload, token || "");
      logAPI("ADD_LESSON - SUCCESS", result);
      
      await loadCourses();
      showSuccess("Lesson added successfully!");
    } catch (err) {
      logAPI("ADD_LESSON - ERROR", { payload }, err);
      console.error("❌ Add lesson failed:", err);
      alert("Failed to add lesson. Check console.");
    }
  };

  const handleDeleteLesson = async (unitId: string, lessonId: string) => {
    if (!selectedCourse) return;
    const updatedUnits = selectedCourse.units.map((u) =>
      u.unitId === unitId
        ? { ...u, lessons: u.lessons.filter((l) => l.lessonId !== lessonId) }
        : u
    );
    
    const payload: any = { units: updatedUnits };
    
    try {
      logAPI("DELETE_LESSON - START", { courseId: selectedCourse._id, unitId, lessonId, payload });
      const result = await updateCourse(selectedCourse._id, payload, token || "");
      logAPI("DELETE_LESSON - SUCCESS", result);
      
      setShowDeleteConfirm({ show: false, type: "", id: "", name: "" });
      await loadCourses();
      showSuccess("Lesson deleted successfully!");
    } catch (err) {
      logAPI("DELETE_LESSON - ERROR", { payload }, err);
      console.error("❌ Delete lesson failed:", err);
    }
  };

  const handleOpenContentEditor = (lesson: Lesson, unitId: string, contentType: ContentType) => {
    console.log("🔓 OPENING CONTENT EDITOR");
    console.log("Lesson:", lesson);
    console.log("Content:", lesson.content);
    console.log("Type:", contentType);
    
    const content: LessonContent = {
      explanation: [...(lesson.content?.explanation || [])],
      examples: [...(lesson.content?.examples || [])],
      quiz: lesson.content?.quiz ? lesson.content.quiz.map(q => ({...q, options: [...q.options]})) : [],
      coding: lesson.content?.coding ? lesson.content.coding.map(c => ({...c})) : [],
    };
    
    console.log("Cloned Content:", content);
    
    setSelectedLesson({ ...lesson, content });
    setSelectedUnitId(unitId);
    setSelectedContentType(contentType);
  };

  const handleSaveLessonContent = async () => {
    if (!selectedCourse || !selectedLesson || !selectedUnitId) return;

    console.log("💾 SAVING LESSON CONTENT");
    console.log("Selected Lesson:", selectedLesson);
    console.log("Content being saved:", selectedLesson.content);

    // Validation for quiz content
    if (selectedContentType === "quiz") {
      for (let q of selectedLesson.content.quiz || []) {
        if (!q.question.trim()) {
          alert("All quiz questions must have text");
          return;
        }
        if (q.options.length < 2) {
          alert("Each quiz question must have at least 2 options");
          return;
        }
        if (!q.answer || !q.options.includes(q.answer)) {
          alert("Quiz answer must be one of the provided options");
          return;
        }
      }
    }

    const updatedUnits = selectedCourse.units.map((unit) =>
      unit.unitId === selectedUnitId
        ? {
            ...unit,
            lessons: unit.lessons.map((l) =>
              l.lessonId === selectedLesson.lessonId 
                ? {
                    ...l,
                    content: {
                      explanation: selectedLesson.content.explanation || [],
                      examples: selectedLesson.content.examples || [],
                      quiz: selectedLesson.content.quiz || [],
                      coding: selectedLesson.content.coding || [],
                    }
                  }
                : l
            ),
          }
        : unit
    );
    
    const payload: any = { units: updatedUnits };
    
    console.log("📤 Payload being sent:", JSON.stringify(payload, null, 2));
    
    try {
      logAPI("SAVE_LESSON_CONTENT - START", {
        courseId: selectedCourse._id,
        unitId: selectedUnitId,
        lessonId: selectedLesson.lessonId,
        contentType: selectedContentType,
        content: selectedLesson.content,
        fullPayload: payload
      });
      
      const result = await updateCourse(selectedCourse._id, payload, token || "");
      logAPI("SAVE_LESSON_CONTENT - SUCCESS", result);
      
      setSelectedLesson(null);
      setSelectedUnitId(null);
      setSelectedContentType(null);
      
      await loadCourses();
      showSuccess("Lesson content saved!");
    } catch (err) {
      logAPI("SAVE_LESSON_CONTENT - ERROR", { payload }, err);
      console.error("❌ Save lesson content failed:", err);
      console.error("❌ Payload that failed:", JSON.stringify(payload, null, 2));
      alert("Failed to save lesson content. Check console for details.");
    }
  };

  const getContentCount = (lesson: Lesson, type: ContentType): number => {
    if (!lesson || !lesson.content) {
      console.warn("⚠️ Lesson or content is undefined:", lesson);
      return 0;
    }
    
    let count = 0;
    switch (type) {
      case "explanation":
        count = lesson.content.explanation?.length || 0;
        break;
      case "example":
        count = lesson.content.examples?.length || 0;
        break;
      case "quiz":
        count = lesson.content.quiz?.length || 0;
        break;
      case "coding":
        count = lesson.content.coding?.length || 0;
        break;
    }
    
    console.log(`📊 Content count for ${type}:`, count, lesson.content);
    return count;
  };

  // Filter courses
  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      filterCategory === "all" || course.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate statistics
  const getCourseStats = (course: Course) => {
    const totalUnits = course.units.length;
    const totalLessons = course.units.reduce(
      (sum, unit) => sum + unit.lessons.length,
      0
    );
    return { totalUnits, totalLessons };
  };

  if (!user || user.role !== "admin")
    return <p style={{ padding: "2rem" }}>Access denied</p>;

  return (
    <div className="admin-container">
      {/* Success Message */}
      {successMessage && (
        <div className="success-toast">{successMessage}</div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm.show && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <h3>Confirm Delete</h3>
            <p>
              Are you sure you want to delete <strong>{showDeleteConfirm.name}</strong>?
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-danger"
                onClick={() => {
                  if (showDeleteConfirm.type === "course") {
                    handleDeleteCourse(showDeleteConfirm.id);
                  } else if (showDeleteConfirm.type === "unit" && selectedCourse) {
                    handleDeleteUnit(showDeleteConfirm.id);
                  } else if (showDeleteConfirm.type === "lesson" && selectedUnitId) {
                    handleDeleteLesson(selectedUnitId, showDeleteConfirm.id);
                  }
                }}
              >
                Delete
              </button>
              <button
                className="btn btn-secondary"
                onClick={() =>
                  setShowDeleteConfirm({ show: false, type: "", id: "", name: "" })
                }
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ COURSES LIST VIEW ============ */}
      {view === "courses" && (
        <>
          <div className="admin-header">
            <div>
              <h1>Admin Courses Dashboard</h1>
              <p className="subtitle">Manage your courses, units, and lessons</p>
            </div>
            <div className="header-stats">
              <div className="stat-card">
                <span className="stat-number">{courses.length}</span>
                <span className="stat-label">Total Courses</span>
              </div>
            </div>
          </div>

          {/* New Course */}
          <div className="new-course-section">
            <h2>Create New Course</h2>
            <div className="new-course-form">
              <input
                placeholder="Enter course title..."
                value={newCourseTitle}
                onChange={(e) => setNewCourseTitle(e.target.value)}
                className="input-modern"
              />
              <button
                className="btn btn-primary"
                onClick={handleCreateCourse}
                disabled={!newCourseTitle.trim()}
              >
                <span className="btn-icon">+</span> Create Course
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="filters-section">
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Categories</option>
              <option value="programming">Programming</option>
              <option value="design">Design</option>
              <option value="business">Business</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Courses Grid */}
          <div className="courses-grid">
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading courses...</p>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📚</div>
                <h3>No courses found</h3>
                <p>
                  {searchQuery || filterCategory !== "all"
                    ? "Try adjusting your filters"
                    : "Create your first course to get started"}
                </p>
              </div>
            ) : (
              filteredCourses.map((course) => {
                const stats = getCourseStats(course);
                return (
                  <div
                    key={course._id}
                    className="course-card"
                  >
                    <div className="course-card-header">
                      <h3 onClick={() => handleSelectCourse(course)} style={{cursor: 'pointer'}}>
                        {course.title}
                      </h3>
                      <span className={`badge badge-${course.category}`}>
                        {course.category}
                      </span>
                    </div>
                    <p className="course-description">
                      {course.description || "No description"}
                    </p>
                    <div className="course-stats">
                      <span>
                        <strong>{stats.totalUnits}</strong> units
                      </span>
                      <span>
                        <strong>{stats.totalLessons}</strong> lessons
                      </span>
                      <span>
                        <strong>₹{course.price}</strong>
                      </span>
                    </div>
                    <div className="course-actions">
                      <button
                        className="btn btn-secondary btn-small"
                        onClick={() => handleViewComments(course)}
                        title="View Comments"
                      >
                        💬 Comments
                      </button>
                      <button
                        className="btn-icon-only danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm({
                            show: true,
                            type: "course",
                            id: course._id,
                            name: course.title,
                          });
                        }}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ============ COMMENTS MANAGEMENT VIEW ============ */}
      {view === "comments" && selectedCourseForComments && (
        <div className="comments-management-view">
          <div className="breadcrumb">
            <button className="breadcrumb-link" onClick={handleBackFromComments}>
              ← Back to Courses
            </button>
            <span className="breadcrumb-separator">/</span>
            <span>{selectedCourseForComments.title}</span>
            <span className="breadcrumb-separator">/</span>
            <span>Comments</span>
          </div>

          <div className="section-card">
            <div className="comments-header">
              <h2>Course Comments Management</h2>
              <p className="subtitle">View and manage all comments for {selectedCourseForComments.title}</p>
            </div>

            {/* Search Comments */}
            <div className="comment-search-section">
              <input
                type="text"
                placeholder="Search comments by content or user..."
                value={commentSearchQuery}
                onChange={(e) => setCommentSearchQuery(e.target.value)}
                className="search-input"
              />
              <div className="comment-stats">
                <span className="stat-badge">
                  Total: <strong>{comments.length}</strong> comments
                </span>
                {commentSearchQuery && (
                  <span className="stat-badge">
                    Found: <strong>{filteredComments.length}</strong> results
                  </span>
                )}
              </div>
            </div>

            {/* Comments List */}
            {loadingComments ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading comments...</p>
              </div>
            ) : filteredComments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <h3>No comments found</h3>
                <p>
                  {commentSearchQuery
                    ? "Try adjusting your search query"
                    : "This course has no comments yet"}
                </p>
              </div>
            ) : (
              <div className="admin-comments-list">
                {filteredComments.map((comment) => (
                  <div key={comment._id} className="admin-comment-card">
                    <div className="admin-comment-header">
                      <div className="comment-user-info">
                        <div className="avatar">
                          {comment.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="user-details">
                          <div className="user-name-role">
                            <span className="user-name">
                              {comment.user?.name || 'Anonymous'}
                            </span>
                            {comment.user?.role === 'admin' && (
                              <span className="role admin">Admin</span>
                            )}
                          </div>
                          <span className="comment-date">
                            {new Date(comment.createdAt).toLocaleDateString()} •{' '}
                            {new Date(comment.createdAt).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                      </div>
                      <button
                        className="btn-icon-only danger"
                        onClick={() => handleDeleteComment(comment._id)}
                        title="Delete Comment"
                      >
                        🗑️
                      </button>
                    </div>
                    
                    <div className="admin-comment-content">
                      {comment.content}
                    </div>

                    {comment.lessonId && (
                      <div className="comment-lesson-tag">
                        📍 Lesson ID: {comment.lessonId}
                      </div>
                    )}

                    {comment.parentId && (
                      <div className="comment-reply-indicator">
                        ↳ Reply to another comment
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ COURSE DETAILS VIEW ============ */}
      {view === "details" && selectedCourse && (
        <div className="course-details-view">
          <div className="breadcrumb">
            <button className="breadcrumb-link" onClick={handleBackToCourses}>
              ← Back to Courses
            </button>
            <span className="breadcrumb-separator">/</span>
            <span>{selectedCourse.title}</span>
          </div>

          <div className="details-container">
            {/* Course Info Section */}
            <div className="section-card">
              <h2>Course Information</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Title</label>
                  <input
                    value={selectedCourse.title}
                    onChange={(e) =>
                      handleEditCourseDetails("title", e.target.value)
                    }
                    className="input-modern"
                  />
                </div>
                <div className="form-group">
                  <label>Price (₹)</label>
                  <input
                    type="number"
                    value={selectedCourse.price}
                    onChange={(e) =>
                      handleEditCourseDetails("price", Number(e.target.value))
                    }
                    className="input-modern"
                  />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={selectedCourse.category}
                    onChange={(e) =>
                      handleEditCourseDetails("category", e.target.value)
                    }
                    className="input-modern"
                  >
                    <option value="programming">Programming</option>
                    <option value="design">Design</option>
                    <option value="business">Business</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Level</label>
                  <select
                    value={selectedCourse.level || "beginner"}
                    onChange={(e) =>
                      handleEditCourseDetails("level", e.target.value)
                    }
                    className="input-modern"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={selectedCourse.description}
                  onChange={(e) =>
                    handleEditCourseDetails("description", e.target.value)
                  }
                  className="input-modern"
                  rows={4}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleSaveCourseDetails}
              >
                💾 Save Course Details
              </button>
            </div>

            {/* Units Section */}
            <div className="section-card">
              <h2>Course Units</h2>

              {/* Add Unit Form */}
              <div className="add-unit-form">
                <div className="form-group">
                  <input
                    placeholder="Unit Title"
                    value={newUnitTitle}
                    onChange={(e) => setNewUnitTitle(e.target.value)}
                    className="input-modern"
                  />
                </div>
                <div className="form-group">
                  <input
                    placeholder="Unit Description"
                    value={newUnitDesc}
                    onChange={(e) => setNewUnitDesc(e.target.value)}
                    className="input-modern"
                  />
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleAddUnit}
                  disabled={!newUnitTitle.trim()}
                >
                  <span className="btn-icon">+</span> Add Unit
                </button>
              </div>

              {/* Units List */}
              {selectedCourse.units.length === 0 ? (
                <div className="empty-state-small">
                  <p>No units yet. Add your first unit to get started.</p>
                </div>
              ) : (
                <div className="units-list">
                  {selectedCourse.units.map((unit, index) => (
                    <div key={unit.unitId} className="unit-card">
                      <div className="unit-header">
                        <div className="unit-info">
                          <span className="unit-number">Unit {index + 1}</span>
                          <h3>{unit.title}</h3>
                          <p>{unit.description}</p>
                          <span className="lesson-count">
                            {unit.lessons.length} lesson
                            {unit.lessons.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="unit-actions">
                          <button
                            className="btn-icon-only danger"
                            onClick={() =>
                              setShowDeleteConfirm({
                                show: true,
                                type: "unit",
                                id: unit.unitId,
                                name: unit.title,
                              })
                            }
                            title="Delete Unit"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Add Lesson Form */}
                      <div className="add-lesson-form">
                        <input
                          placeholder="Lesson Title"
                          id={`lesson-title-${unit.unitId}`}
                          className="input-modern"
                        />
                        <button
                          className="btn btn-secondary"
                          onClick={() => {
                            const titleInput = document.getElementById(
                              `lesson-title-${unit.unitId}`
                            ) as HTMLInputElement;
                            if (titleInput.value.trim()) {
                              handleAddLesson(unit.unitId, titleInput.value);
                              titleInput.value = "";
                            }
                          }}
                        >
                          <span className="btn-icon">+</span> Add Lesson
                        </button>
                      </div>

                      {/* Lessons List */}
                      {unit.lessons.length === 0 ? (
                        <div className="empty-state-small">
                          <p>No lessons in this unit yet.</p>
                        </div>
                      ) : (
                        <div className="lessons-list">
                          {unit.lessons.map((lesson, lessonIndex) => {
                            const explCount = lesson.content?.explanation?.length || 0;
                            const exampCount = lesson.content?.examples?.length || 0;
                            const quizCount = lesson.content?.quiz?.length || 0;
                            const codeCount = lesson.content?.coding?.length || 0;
                            
                            return (
                              <div key={lesson.lessonId} className="lesson-card-new">
                                <div className="lesson-header-new">
                                  <div className="lesson-title-section">
                                    <span className="lesson-number">
                                      {lessonIndex + 1}
                                    </span>
                                    <strong>{lesson.title}</strong>
                                  </div>
                                  <button
                                    className="btn-icon-only danger"
                                    onClick={() => {
                                      setSelectedUnitId(unit.unitId);
                                      setShowDeleteConfirm({
                                        show: true,
                                        type: "lesson",
                                        id: lesson.lessonId,
                                        name: lesson.title,
                                      });
                                    }}
                                    title="Delete Lesson"
                                  >
                                    🗑️
                                  </button>
                                </div>

                                {/* Content Type Buttons */}
                                <div className="content-type-buttons">
                                  <button
                                    className="content-type-btn explanation-btn"
                                    onClick={() =>
                                      handleOpenContentEditor(
                                        lesson,
                                        unit.unitId,
                                        "explanation"
                                      )
                                    }
                                  >
                                    <span className="content-icon">📝</span>
                                    <div className="content-btn-text">
                                      <span className="content-btn-title">
                                        Explanations
                                      </span>
                                      <span className="content-btn-count">
                                        {explCount} items
                                      </span>
                                    </div>
                                  </button>

                                  <button
                                    className="content-type-btn example-btn"
                                    onClick={() =>
                                      handleOpenContentEditor(
                                        lesson,
                                        unit.unitId,
                                        "example"
                                      )
                                    }
                                  >
                                    <span className="content-icon">💡</span>
                                    <div className="content-btn-text">
                                      <span className="content-btn-title">
                                        Examples
                                      </span>
                                      <span className="content-btn-count">
                                        {exampCount} items
                                      </span>
                                    </div>
                                  </button>

                                  <button
                                    className="content-type-btn quiz-btn"
                                    onClick={() =>
                                      handleOpenContentEditor(
                                        lesson,
                                        unit.unitId,
                                        "quiz"
                                      )
                                    }
                                  >
                                    <span className="content-icon">❓</span>
                                    <div className="content-btn-text">
                                      <span className="content-btn-title">
                                        Quizzes
                                      </span>
                                      <span className="content-btn-count">
                                        {quizCount} items
                                      </span>
                                    </div>
                                  </button>

                                  <button
                                    className="content-type-btn coding-btn"
                                    onClick={() =>
                                      handleOpenContentEditor(
                                        lesson,
                                        unit.unitId,
                                        "coding"
                                      )
                                    }
                                  >
                                    <span className="content-icon">💻</span>
                                    <div className="content-btn-text">
                                      <span className="content-btn-title">
                                        Coding
                                      </span>
                                      <span className="content-btn-count">
                                        {codeCount} items
                                      </span>
                                    </div>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content Editor Modal - Same as original, keeping it complete */}
      {selectedLesson && selectedContentType && (
        <div className="modal-overlay">
          <div className="modal-large">
            <div className="modal-header">
              <h2>
                <span className={`lesson-type-badge ${selectedContentType}`}>
                  {selectedContentType === "explanation" && "📝"}
                  {selectedContentType === "example" && "💡"}
                  {selectedContentType === "quiz" && "❓"}
                  {selectedContentType === "coding" && "💻"}
                </span>
                {selectedLesson.title} - {selectedContentType.charAt(0).toUpperCase() + selectedContentType.slice(1)}
              </h2>
              <button
                className="close-btn"
                onClick={() => {
                  setSelectedLesson(null);
                  setSelectedContentType(null);
                }}
              >
                ✕
              </button>
            </div>

            <div className="modal-content">
              {/* Explanation Content */}
              {selectedContentType === "explanation" && (
                <div className="content-section">
                  <label className="content-label">
                    Explanation Sections ({(selectedLesson.content.explanation || []).length})
                  </label>
                  {(selectedLesson.content.explanation || []).map((exp, idx) => (
                    <div key={idx} className="array-item">
                      <span className="item-number">{idx + 1}</span>
                      <textarea
                        value={exp}
                        onChange={(e) => {
                          const explanations = [...(selectedLesson.content.explanation || [])];
                          explanations[idx] = e.target.value;
                          setSelectedLesson({
                            ...selectedLesson,
                            content: { ...selectedLesson.content, explanation: explanations },
                          });
                        }}
                        className="array-input"
                        rows={5}
                        placeholder="Enter explanation text..."
                      />
                      <button
                        className="btn-icon-only danger"
                        onClick={() => {
                          const explanations = [...(selectedLesson.content.explanation || [])];
                          explanations.splice(idx, 1);
                          setSelectedLesson({
                            ...selectedLesson,
                            content: { ...selectedLesson.content, explanation: explanations },
                          });
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      const explanations = [...(selectedLesson.content.explanation || []), ""];
                      setSelectedLesson({
                        ...selectedLesson,
                        content: { ...selectedLesson.content, explanation: explanations },
                      });
                    }}
                  >
                    <span className="btn-icon">+</span> Add Explanation
                  </button>
                </div>
              )}

              {/* Example Content */}
              {selectedContentType === "example" && (
                <div className="content-section">
                  <label className="content-label">
                    Examples ({(selectedLesson.content.examples || []).length})
                  </label>
                  {(selectedLesson.content.examples || []).map((ex, idx) => (
                    <div key={idx} className="array-item">
                      <span className="item-number">{idx + 1}</span>
                      <textarea
                        value={ex}
                        onChange={(e) => {
                          const examples = [...(selectedLesson.content.examples || [])];
                          examples[idx] = e.target.value;
                          setSelectedLesson({
                            ...selectedLesson,
                            content: { ...selectedLesson.content, examples },
                          });
                        }}
                        className="array-input"
                        rows={5}
                        placeholder="Enter example code or text..."
                      />
                      <button
                        className="btn-icon-only danger"
                        onClick={() => {
                          const examples = [...(selectedLesson.content.examples || [])];
                          examples.splice(idx, 1);
                          setSelectedLesson({
                            ...selectedLesson,
                            content: { ...selectedLesson.content, examples },
                          });
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      const examples = [...(selectedLesson.content.examples || []), ""];
                      setSelectedLesson({
                        ...selectedLesson,
                        content: { ...selectedLesson.content, examples },
                      });
                    }}
                  >
                    <span className="btn-icon">+</span> Add Example
                  </button>
                </div>
              )}

              {/* Quiz Content */}
              {selectedContentType === "quiz" && (
                <div className="content-section">
                  <label className="content-label">
                    Quiz Questions ({(selectedLesson.content.quiz || []).length})
                  </label>
                  {(selectedLesson.content.quiz || []).map((q, qIdx) => (
                    <div key={qIdx} className="quiz-question-card">
                      <div className="quiz-header">
                        <h4>Question {qIdx + 1}</h4>
                        <button
                          className="btn-icon-only danger"
                          onClick={() => {
                            const quiz = [...(selectedLesson.content.quiz || [])];
                            quiz.splice(qIdx, 1);
                            setSelectedLesson({
                              ...selectedLesson,
                              content: { ...selectedLesson.content, quiz },
                            });
                          }}
                        >
                          🗑️ Delete Question
                        </button>
                      </div>

                      <div className="form-group">
                        <label>Question Text</label>
                        <textarea
                          placeholder="Enter your question..."
                          value={q.question}
                          onChange={(e) => {
                            const quiz = [...(selectedLesson.content.quiz || [])];
                            quiz[qIdx] = { ...quiz[qIdx], question: e.target.value };
                            setSelectedLesson({
                              ...selectedLesson,
                              content: { ...selectedLesson.content, quiz },
                            });
                          }}
                          className="input-modern"
                          rows={2}
                        />
                      </div>

                      <div className="form-group">
                        <label>Options (Select correct answer)</label>
                        {(q.options || []).map((opt, oIdx) => (
                          <div key={oIdx} className="option-item">
                            <input
                              type="radio"
                              name={`answer-${qIdx}`}
                              checked={q.answer === opt}
                              onChange={() => {
                                const quiz = [...(selectedLesson.content.quiz || [])];
                                quiz[qIdx] = { ...quiz[qIdx], answer: opt };
                                setSelectedLesson({
                                  ...selectedLesson,
                                  content: { ...selectedLesson.content, quiz },
                                });
                              }}
                              className="radio-input"
                            />
                            <input
                              placeholder={`Option ${oIdx + 1}`}
                              value={opt}
                              onChange={(e) => {
                                const quiz = [...(selectedLesson.content.quiz || [])];
                                const options = [...(quiz[qIdx].options || [])];
                                const oldValue = options[oIdx];
                                options[oIdx] = e.target.value;

                                if (quiz[qIdx].answer === oldValue) {
                                  quiz[qIdx] = {
                                    ...quiz[qIdx],
                                    options,
                                    answer: e.target.value,
                                  };
                                } else {
                                  quiz[qIdx] = { ...quiz[qIdx], options };
                                }

                                setSelectedLesson({
                                  ...selectedLesson,
                                  content: { ...selectedLesson.content, quiz },
                                });
                              }}
                              className="option-input"
                            />
                            <button
                              className="btn-icon-only danger"
                              onClick={() => {
                                if ((q.options || []).length <= 2) {
                                  alert("Must have at least 2 options");
                                  return;
                                }
                                const quiz = [...(selectedLesson.content.quiz || [])];
                                const options = [...(quiz[qIdx].options || [])];
                                const removedOption = options[oIdx];
                                options.splice(oIdx, 1);

                                if (quiz[qIdx].answer === removedOption) {
                                  quiz[qIdx] = { ...quiz[qIdx], options, answer: "" };
                                } else {
                                  quiz[qIdx] = { ...quiz[qIdx], options };
                                }

                                setSelectedLesson({
                                  ...selectedLesson,
                                  content: { ...selectedLesson.content, quiz },
                                });
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          className="btn btn-secondary btn-small"
                          onClick={() => {
                            const quiz = [...(selectedLesson.content.quiz || [])];
                            const options = [...(quiz[qIdx].options || []), ""];
                            quiz[qIdx] = { ...quiz[qIdx], options };
                            setSelectedLesson({
                              ...selectedLesson,
                              content: { ...selectedLesson.content, quiz },
                            });
                          }}
                        >
                          + Add Option
                        </button>
                      </div>

                      {q.answer && (
                        <div className="correct-answer-display">
                          ✅ Correct Answer: {q.answer}
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      const quiz = [
                        ...(selectedLesson.content.quiz || []),
                        { question: "", options: ["", "", "", ""], answer: "" },
                      ];
                      setSelectedLesson({
                        ...selectedLesson,
                        content: { ...selectedLesson.content, quiz },
                      });
                    }}
                  >
                    <span className="btn-icon">+</span> Add Question
                  </button>
                </div>
              )}

           {/* Coding Content */}
{selectedContentType === "coding" && (
  <div className="content-section">
    <label className="content-label">
      Coding Problems ({(selectedLesson.content.coding as Problem[] || []).length})
    </label>

    {(selectedLesson.content.coding as Problem[] || []).map((c: Problem, idx: number) => (
      <div key={idx} className="coding-problem-card">
        <div className="coding-header">
          <h4>Problem {idx + 1}</h4>
          <button
            className="btn-icon-only danger"
            onClick={() => {
              const coding = [...(selectedLesson.content.coding as Problem[])];
              coding.splice(idx, 1);
              setSelectedLesson({
                ...selectedLesson,
                content: { ...selectedLesson.content, coding },
              });
            }}
          >
            🗑️ Delete Problem
          </button>
        </div>

        {/* Problem Description */}
        <div className="form-group">
          <label>Problem Description</label>
          <textarea
            placeholder="Describe the coding problem..."
            value={c.problem}
            onChange={(e) => {
              const coding = [...(selectedLesson.content.coding as Problem[])];
              coding[idx] = { ...coding[idx], problem: e.target.value };
              setSelectedLesson({
                ...selectedLesson,
                content: { ...selectedLesson.content, coding },
              });
            }}
            className="input-modern"
            rows={3}
          />
        </div>

        {/* Starter Code */}
        <div className="form-group">
          <label>Starter Code (Optional)</label>
          <textarea
            placeholder="def solution():\n    # Write your code here\n    pass"
            value={c.starterCode || ""}
            onChange={(e) => {
              const coding = [...(selectedLesson.content.coding as Problem[])];
              coding[idx] = { ...coding[idx], starterCode: e.target.value };
              setSelectedLesson({
                ...selectedLesson,
                content: { ...selectedLesson.content, coding },
              });
            }}
            className="code-textarea"
            rows={6}
          />
        </div>

        {/* Solution Code */}
        <div className="form-group">
          <label>Solution Code</label>
          <textarea
            placeholder="def solution():\n    # Your solution\n    return result"
            value={c.solution || ""}
            onChange={(e) => {
              const coding = [...(selectedLesson.content.coding as Problem[])];
              coding[idx] = { ...coding[idx], solution: e.target.value };
              setSelectedLesson({
                ...selectedLesson,
                content: { ...selectedLesson.content, coding },
              });
            }}
            className="code-textarea"
            rows={8}
          />
        </div>

        {/* --- TEST CASES SECTION --- */}
        <div className="form-group">
          <label>Test Cases</label>

          {/* Render existing test cases */}
          {(c.testCases || []).map((tc: TestCase, tIdx: number) => (
            <div key={tIdx} className="testcase-card" style={{ marginBottom: "8px" }}>
              <input
                type="text"
                placeholder="Input"
                value={tc.input}
                onChange={(e) => {
                  const coding = [...(selectedLesson.content.coding as Problem[])];
                  coding[idx].testCases![tIdx] = {
                    ...coding[idx].testCases![tIdx],
                    input: e.target.value,
                  };
                  setSelectedLesson({
                    ...selectedLesson,
                    content: { ...selectedLesson.content, coding },
                  });
                }}
                className="input-modern"
              />
              <input
                type="text"
                placeholder="Expected Output"
                value={tc.expected}
                onChange={(e) => {
                  const coding = [...(selectedLesson.content.coding as Problem[])];
                  coding[idx].testCases![tIdx] = {
                    ...coding[idx].testCases![tIdx],
                    expected: e.target.value,
                  };
                  setSelectedLesson({
                    ...selectedLesson,
                    content: { ...selectedLesson.content, coding },
                  });
                }}
                className="input-modern"
              />
              <button
                className="btn btn-sm danger"
                onClick={() => {
                  const coding = [...(selectedLesson.content.coding as Problem[])];
                  coding[idx].testCases!.splice(tIdx, 1);
                  setSelectedLesson({
                    ...selectedLesson,
                    content: { ...selectedLesson.content, coding },
                  });
                }}
              >
                Delete
              </button>
            </div>
          ))}

          {/* Add new test case button */}
          <button
            className="btn btn-secondary"
            onClick={() => {
              const coding = [...(selectedLesson.content.coding as Problem[])];
             if (!coding[idx].testCases) coding[idx].testCases = [];
coding[idx].testCases!.push({ input: "", expected: "" });

              setSelectedLesson({
                ...selectedLesson,
                content: { ...selectedLesson.content, coding },
              });
            }}
          >
            + Add Test Case
          </button>
        </div>
        {/* --- END TEST CASES SECTION --- */}
      </div>
    ))}

    {/* Add new coding problem button */}
    <button
      className="btn btn-primary"
      onClick={() => {
        const coding = [...(selectedLesson.content.coding as Problem[])];
        coding.push({ problem: "", starterCode: "", solution: "", testCases: [] });
        setSelectedLesson({
          ...selectedLesson,
          content: { ...selectedLesson.content, coding },
        });
      }}
    >
      <span className="btn-icon">+</span> Add Coding Problem
    </button>
  </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-primary btn-large"
                onClick={handleSaveLessonContent}
              >
                💾 Save Changes
              </button>
              <button
                className="btn btn-secondary btn-large"
                onClick={() => {
                  setSelectedLesson(null);
                  setSelectedContentType(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCourses;
