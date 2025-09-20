"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getCanvasCourses } from "@/utilities/fetch/canvas-fetch";
import CircularLoading from "@/components/misc/CircularLoading";
import NothingToShow from "@/components/misc/NothingToShow";
import { CanvasCourse } from "@/types/CanvasTypes";

export default function ClassesPage() {
  const { data: courses, isLoading, isError, error } = useQuery<CanvasCourse[], Error>({
    queryKey: ["canvasCourses"],
    queryFn: getCanvasCourses,
  });

  if (isLoading) return <CircularLoading />;

  if (isError) {
    return (
        <main>
            <h1 className="page-name">My Classes</h1>
            <div className="error-message" style={{ padding: '2rem', textAlign: 'center' }}>
                <h2>Error Fetching Courses</h2>
                <p style={{ color: 'var(--twitter-red)', marginTop: '1rem' }}>
                    {error?.message || "An unknown error occurred."}
                </p>
                <p style={{ marginTop: '1rem', color: 'var(--twitter-muted)'}}>
                    This could be due to an incorrect API key or a problem with the Canvas API connection. Check the browser console and server logs for more details.
                </p>
            </div>
        </main>
    );
  }

  return (
    <main>
      <h1 className="page-name">My Classes</h1>
      <div className="course-list">
        {courses && courses.length > 0 ? (
          courses.map((course: CanvasCourse) => (
            <Link href={`/classes/${course.id}`} key={course.id} className="course-card-link">
              <div className="course-card">
                <h2>{course.name}</h2>
                <p>{course.course_code}</p>
              </div>
            </Link>
          ))
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--twitter-muted)'}}>
            <h3>No Courses Found</h3>
            <p>We couldn't find any courses in Canvas for your account.</p>
          </div>
        )}
      </div>
    </main>
  );
}