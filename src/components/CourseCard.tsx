import React, { FC, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CourseType } from "../types";
import { useCourse } from "../context/CourseContext";

interface CourseCardProps {
  course: CourseType;
  onEnrollClick: (courseId: string) => void; // parent handles payment redirect
}

const CourseCard: FC<CourseCardProps> = ({ course, onEnrollClick }) => {
  const navigate = useNavigate();
  const { enrolledCourseIds } = useCourse();
  const [isEnrolled, setIsEnrolled] = useState(enrolledCourseIds.includes(course._id));

  // Update if enrollment changes in context
  useEffect(() => {
    setIsEnrolled(enrolledCourseIds.includes(course._id));
  }, [enrolledCourseIds, course._id]);

  const handleClick = () => {
    if (isEnrolled) {
      // Navigate directly to course page
      navigate(`/course/${course._id}`);
    } else {
      // Redirect to payment page
      onEnrollClick(course._id);
    }
  };

  return (
    <div className="course-card" style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}>
      <div>
        <div className="course-icon" style={{ fontSize: "2rem" }}>{course.icon || "📚"}</div>
        <h3 className="course-title">{course.title}</h3>
        <p className="course-description">{course.description}</p>
      </div>
      <div className="course-footer" style={{ marginTop: "0.5rem" }}>
        <span className="course-price">₹{course.price}</span>
        <button
          className={`btn ${isEnrolled ? "btn--warning" : "btn--warning"}`}
          onClick={handleClick}
        >
          {isEnrolled ? "Enrolled" : "Enroll Now"}
        </button>
      </div>
    </div>
  );
};

export default CourseCard;
