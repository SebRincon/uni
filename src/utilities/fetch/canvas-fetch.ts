import {
  CanvasAssignment,
  CanvasCourse,
  CanvasFile,
  CanvasModule,
  CanvasModuleItem,
} from "@/types/CanvasTypes";

// The base URL for all client-side requests is our own API proxy.
const BASE_URL = "/api/canvas";

const canvasApiFetch = async (endpoint: string): Promise<any> => {
  const url = `${BASE_URL}${endpoint}`;
  try {
    console.log(`[Canvas API Fetch] Requesting: ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Canvas API Fetch] Response not OK (${response.status}) for ${url}. Body:`, errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: "Failed to parse error response from proxy.", details: errorText };
      }

      console.error("[Canvas API Fetch] Parsed Proxy Error:", errorData);
      throw new Error(
        `Canvas API request failed: ${errorData.error || response.statusText}. Details: ${errorData.details || 'N/A'}`
      );
    }
    
    const data = await response.json();
    console.log(`[Canvas API Fetch] Success for ${url}. Data received:`, data);
    return data;
  } catch (error) {
    console.error(`[Canvas API Fetch] CATCH block for endpoint '${endpoint}':`, error);
    throw error;
  }
};

// Endpoints are relative to /api/v1/ on the Canvas API, which our proxy handles.
export const getCanvasCourses = async (): Promise<CanvasCourse[]> => {
  // Fetch courses with all relevant enrollment states to show a complete list.
  return canvasApiFetch("/courses?enrollment_state[]=active&enrollment_state[]=invited&enrollment_state[]=completed&enrollment_state[]=inactive");
};

export const getCanvasModules = async (
  courseId: string
): Promise<CanvasModule[]> => {
  return canvasApiFetch(
    `/courses/${courseId}/modules?include[]=items_count`
  );
};

export const getCanvasModuleItems = async (
  courseId: string,
  moduleId: string
): Promise<CanvasModuleItem[]> => {
  return canvasApiFetch(`/courses/${courseId}/modules/${moduleId}/items`);
};

export const getCanvasAssignment = async (
  courseId: string,
  assignmentId: string
): Promise<CanvasAssignment> => {
  return canvasApiFetch(`/courses/${courseId}/assignments/${assignmentId}`);
};

export const getCanvasFile = async (fileId: string): Promise<CanvasFile> => {
  return canvasApiFetch(`/files/${fileId}`);
};