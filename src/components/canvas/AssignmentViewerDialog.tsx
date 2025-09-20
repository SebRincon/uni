"use client";

import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import { FaTimes } from "react-icons/fa";
import { getCanvasAssignment, getCanvasFile } from "@/utilities/fetch/canvas-fetch";
import { CanvasModuleItem } from "@/types/CanvasTypes";
import CircularLoading from "@/components/misc/CircularLoading";

interface AssignmentViewerDialogProps {
  item: CanvasModuleItem | null;
  courseId: string;
  open: boolean;
  onClose: () => void;
}

// A helper function to extract a file ID from a Canvas API file URL
const getFileIdFromUrl = (url: string): string | null => {
    const match = url.match(/\/files\/(\d+)/);
    return match ? match[1] : null;
};

export default function AssignmentViewerDialog({ item, courseId, open, onClose }: AssignmentViewerDialogProps) {
  // Query 1: Fetch assignment details if the item is an 'Assignment'
  const { data: assignment, isLoading: isLoadingAssignment } = useQuery({
    queryKey: ["canvasAssignment", courseId, item?.content_id],
    queryFn: () => getCanvasAssignment(courseId, String(item!.content_id)),
    enabled: !!item && item.type === 'Assignment' && !!item.content_id,
  });

  // Determine the file ID from the assignment or the module item itself
  const fileId = item?.type === 'Assignment'
    ? assignment?.annotatable_attachment_id
    : (item?.type === 'File' && item.url)
    ? getFileIdFromUrl(item.url)
    : null;

  // Query 2: Fetch the file's metadata (including the download URL) using the determined file ID
  const { data: file, isLoading: isLoadingFile, isError } = useQuery({
    queryKey: ["canvasFile", fileId],
    queryFn: () => getCanvasFile(String(fileId)),
    enabled: !!fileId,
  });

  const isLoading = isLoadingAssignment || isLoadingFile;
  const isPdf = file?.['content-type'] === 'application/pdf';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" PaperProps={{ style: { height: '90vh' } }}>
      <DialogTitle style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {item?.title}
        <IconButton onClick={onClose}><FaTimes /></IconButton>
      </DialogTitle>
      <DialogContent style={{ display: 'flex', flexDirection: 'column' }}>
        {isLoading && <CircularLoading />}
        
        {file && isPdf && (
          <iframe src={file.url} title={file.display_name} width="100%" height="100%" />
        )}

        {!isLoading && (!fileId || isError) && (
            <div className="centered-message">
                <p>No PDF attached to this assignment.</p>
                <a href={item?.html_url} target="_blank" rel="noopener noreferrer" className="canvas-link">
                    View on Canvas
                </a>
            </div>
        )}
        
        {file && !isPdf && (
             <div className="centered-message">
                <p>This is not a PDF file.</p>
                <a href={file.url} target="_blank" rel="noopener noreferrer" className="canvas-link">
                    Download File: {file.display_name}
                </a>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}