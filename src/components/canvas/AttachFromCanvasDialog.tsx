"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogTitle, DialogContent, IconButton, Button } from "@mui/material";
import { FaTimes, FaChevronRight, FaChevronLeft } from "react-icons/fa";
import {
  getCanvasCourses,
  getCanvasModules,
  getCanvasModuleItems,
  getCanvasFile,
  getCanvasFilePublicUrl,
} from "@/utilities/fetch/canvas-fetch";
import type { CanvasCourse, CanvasModule, CanvasModuleItem } from "@/types/CanvasTypes";
import CircularLoading from "@/components/misc/CircularLoading";

type Step = "courses" | "modules" | "items";

interface AttachFromCanvasDialogProps {
  open: boolean;
  onClose: () => void;
  onAttach: (file: File) => void;
}

// Utility: extract file ID from Canvas file URL
const getFileIdFromFileUrl = (url: string): string | null => {
  const match = url.match(/\/files\/(\d+)/);
  return match ? match[1] : null;
};

// Utility: extract file ID from assignment HTML description
const getFileIdFromAssignmentDescription = (html: string): string | null => {
  const match = html.match(/data-api-endpoint=\"[^\"]*\/files\/(\d+)\"/);
  return match ? match[1] : null;
};

export default function AttachFromCanvasDialog({ open, onClose, onAttach }: AttachFromCanvasDialogProps) {
  const [step, setStep] = useState<Step>("courses");
  const [selectedCourse, setSelectedCourse] = useState<CanvasCourse | null>(null);
  const [selectedModule, setSelectedModule] = useState<CanvasModule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAttaching, setIsAttaching] = useState(false);

  useEffect(() => {
    if (open) {
      // Reset when opened
      setStep("courses");
      setSelectedCourse(null);
      setSelectedModule(null);
      setError(null);
      setIsAttaching(false);
    }
  }, [open]);

  // Step 1: Courses
  const { data: courses, isLoading: loadingCourses, error: coursesError } = useQuery<CanvasCourse[], Error>({
    queryKey: ["canvasCourses"],
    queryFn: getCanvasCourses,
    enabled: open,
    staleTime: 60 * 1000,
  });

  // Step 2: Modules
  const courseId = selectedCourse?.id ? String(selectedCourse.id) : null;
  const { data: modules, isLoading: loadingModules } = useQuery<CanvasModule[]>({
    queryKey: ["canvasModules", courseId],
    queryFn: () => getCanvasModules(courseId!),
    enabled: open && !!courseId && step !== "courses",
    staleTime: Infinity,
  } as any);

  // Step 3: Items (files/assignments)
  const moduleId = selectedModule?.id ? String(selectedModule.id) : null;
  const { data: items, isLoading: loadingItems } = useQuery<CanvasModuleItem[]>({
    queryKey: ["canvasModuleItems", courseId, moduleId],
    queryFn: () => getCanvasModuleItems(courseId!, moduleId!),
    enabled: open && !!courseId && !!moduleId && step === "items",
    staleTime: 30 * 1000,
  } as any);

  const filteredItems = useMemo(() => {
    return (items || []).filter((i) => i.type === "File" || i.type === "Assignment");
  }, [items]);

  const goBack = () => {
    setError(null);
    if (step === "items") {
      setStep("modules");
      return;
    }
    if (step === "modules") {
      setStep("courses");
      return;
    }
    onClose();
  };

  const handleSelectCourse = (course: CanvasCourse) => {
    setSelectedCourse(course);
    setSelectedModule(null);
    setStep("modules");
  };

  const handleSelectModule = (module: CanvasModule) => {
    setSelectedModule(module);
    setStep("items");
  };

  const attachByModuleItem = async (item: CanvasModuleItem) => {
    try {
      setError(null);
      setIsAttaching(true);

      // Resolve fileId depending on item type
      let fileId: string | null = null;
      if (item.type === "File" && item.url) {
        fileId = getFileIdFromFileUrl(item.url);
      } else if (item.type === "Assignment" && item.content_id) {
        // fetch assignment to parse description for file link
        // reuse AssignmentViewerDialog approach by calling the same endpoints indirectly
        const res = await fetch(`/api/canvas/courses/${courseId}/assignments/${item.content_id}`);
        if (!res.ok) throw new Error(`Failed to fetch assignment: ${res.statusText}`);
        const assignment = await res.json();
        if (assignment?.description) {
          fileId = getFileIdFromAssignmentDescription(assignment.description);
        }
      }

      if (!fileId) {
        throw new Error("Could not resolve an attached file from this item.");
      }

      // Check file metadata to ensure it's a PDF
      const fileMeta = await getCanvasFile(fileId);
      const isPdf = fileMeta?.["content-type"] === "application/pdf";
      if (!isPdf) {
        throw new Error("Only PDF files can be attached from Canvas.");
      }

      // Get a public URL (signed) and fetch the blob
      const { public_url } = await getCanvasFilePublicUrl(fileId);
      if (!public_url) throw new Error("Could not get a public URL for this file.");

      const blobResp = await fetch(public_url);
      if (!blobResp.ok) throw new Error("Failed to download the PDF file.");
      const blob = await blobResp.blob();
      const file = new File([blob], fileMeta.display_name || `canvas-${fileId}.pdf`, { type: "application/pdf" });

      onAttach(file);
      onClose();
    } catch (e: any) {
      setError(e?.message || "Failed to attach file.");
    } finally {
      setIsAttaching(false);
    }
  };

  const renderBody = () => {
    if (coursesError) {
      return (
        <div className="centered-message" style={{ padding: "1rem", color: "var(--twitter-red)" }}>
          {coursesError.message}
        </div>
      );
    }

    if (step === "courses") {
      if (loadingCourses) return <CircularLoading />;
      return (
        <div className="list">
          {(courses || []).map((c) => (
            <button key={c.id} className="list-item" onClick={() => handleSelectCourse(c)}>
              <div className="primary">{c.name}</div>
              <div className="secondary">{c.course_code}</div>
              <FaChevronRight />
            </button>
          ))}
          {courses && courses.length === 0 && (
            <div className="centered-message">No courses found.</div>
          )}
        </div>
      );
    }

    if (step === "modules") {
      if (loadingModules) return <CircularLoading />;
      return (
        <div className="list">
          {(modules || []).map((m) => (
            <button key={m.id} className="list-item" onClick={() => handleSelectModule(m)}>
              <div className="primary">{m.name}</div>
              <div className="secondary">{m.items_count} items</div>
              <FaChevronRight />
            </button>
          ))}
          {modules && modules.length === 0 && (
            <div className="centered-message">No modules found for this course.</div>
          )}
        </div>
      );
    }

    if (step === "items") {
      if (loadingItems) return <CircularLoading />;
      return (
        <div className="list">
          {filteredItems.map((it) => (
            <button key={it.id} className="list-item" onClick={() => attachByModuleItem(it)} disabled={isAttaching}>
              <div className="primary">{it.title}</div>
              <div className="secondary">{it.type}</div>
            </button>
          ))}
          {filteredItems.length === 0 && (
            <div className="centered-message">No attachable items in this module.</div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Button onClick={goBack} startIcon={<FaChevronLeft />}>Back</Button>
          <span>
            {step === "courses" && "Select a course"}
            {step === "modules" && selectedCourse?.name}
            {step === "items" && selectedModule?.name}
          </span>
        </div>
        <IconButton onClick={onClose}>
          <FaTimes />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {error && (
          <div style={{ color: "var(--twitter-red)", marginBottom: 8 }}>{error}</div>
        )}
        {renderBody()}
      </DialogContent>
    </Dialog>
  );
}