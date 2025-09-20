export interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
  enrollment_term_id: number;
}

export interface CanvasModule {
  id: number;
  name: string;
  position: number;
  items_count: number;
  items_url: string;
}

export interface CanvasModuleItem {
  id: number;
  title: string;
  type:
    | "Assignment"
    | "Page"
    | "Quiz"
    | "File"
    | "Discussion"
    | "ExternalUrl"
    | "SubHeader";
  html_url: string;
  url?: string;
  content_id?: number;
}

export interface CanvasAssignment {
  id: number;
  description: string;
  html_url: string;
  annotatable_attachment_id?: number;
}

export interface CanvasFile {
  id: number;
  url: string;
  display_name: string;
  "content-type": string;
}