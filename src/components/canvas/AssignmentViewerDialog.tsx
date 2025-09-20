"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Button, Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import { FaTimes, FaDownload } from "react-icons/fa";
import { getCanvasAssignment, getCanvasFile, getCanvasFilePublicUrl } from "@/utilities/fetch/canvas-fetch";
import { CanvasModuleItem } from "@/types/CanvasTypes";
import CircularLoading from "@/components/misc/CircularLoading";

interface AssignmentViewerDialogProps {
  item: CanvasModuleItem | null;
  courseId: string;
  open: boolean;
  onClose: () => void;
}

// Helper to extract file ID from a Canvas file URL
const getFileIdFromFileUrl = (url: string): string | null => {
  const match = url.match(/\/files\/(\d+)/);
  return match ? match[1] : null;
};

// Helper to extract file ID from the HTML description of an assignment
const getFileIdFromAssignmentDescription = (html: string): string | null => {
  const match = html.match(/data-api-endpoint="[^"]*\/files\/(\d+)"/);
  return match ? match[1] : null;
};

export default function AssignmentViewerDialog({ item, courseId, open, onClose }: AssignmentViewerDialogProps) {
  // Query 1: Fetch assignment details if the item is an 'Assignment' to find the linked file
  const { data: assignment, isLoading: isLoadingAssignment } = useQuery({
    queryKey: ["canvasAssignment", courseId, item?.content_id],
    queryFn: () => getCanvasAssignment(courseId, String(item!.content_id)),
    enabled: !!item && item.type === 'Assignment' && !!item.content_id,
  });

  // Consolidate logic to find the file ID from either item type
  const fileId = useMemo(() => {
    if (!item) return null;
    if (item.type === 'File' && item.url) {
      return getFileIdFromFileUrl(item.url);
    }
    if (item.type === 'Assignment' && assignment?.description) {
      return getFileIdFromAssignmentDescription(assignment.description);
    }
    return null;
  }, [item, assignment]);

  // Query 2: Fetch the file's metadata (for content-type and a direct download URL)
  const { data: fileMetadata, isLoading: isLoadingFileMetadata } = useQuery({
    queryKey: ["canvasFileMetadata", fileId],
    queryFn: () => getCanvasFile(String(fileId)),
    enabled: !!fileId,
  });

  // Query 3: Fetch the public, viewable URL for the file, only if it's a PDF
  const { data: filePreviewData, isLoading: isLoadingPublicUrl, isError: isPublicUrlError } = useQuery({
    queryKey: ["canvasFilePublicUrl", fileId],
    queryFn: () => getCanvasFilePublicUrl(String(fileId)),
    enabled: !!fileId && fileMetadata?.['content-type'] === 'application/pdf',
    retry: 1,
  });

  const isLoading = isLoadingAssignment || isLoadingFileMetadata || isLoadingPublicUrl;
  const isPdf = fileMetadata?.['content-type'] === 'application/pdf';
  const canBeViewed = isPdf && filePreviewData?.public_url && !isPublicUrlError;

  const renderContent = () => {
    if (isLoading) {
      return <CircularLoading />;
    }

    // Handle case where no file is associated with an assignment
    if (item && item.type === 'Assignment' && !fileId) {
      return (
        <div className="centered-message" style={{ padding: '1rem 2rem', overflowY: 'auto', alignItems: 'flex-start' }}>
          <h3>Assignment Description</h3>
          {assignment?.description ? (
            <div dangerouslySetInnerHTML={{ __html: assignment.description }} />
          ) : (
            <p>This assignment has no description or attached file.</p>
          )}
          <a href={item.html_url} target="_blank" rel="noopener noreferrer" className="canvas-link" style={{marginTop: 'auto'}}>
            View on Canvas
          </a>
        </div>
      );
    }
    
    // Handle PDF rendering
    if (canBeViewed && fileMetadata) {
      return (
        <iframe
          src={filePreviewData.public_url}
          title={fileMetadata.display_name}
          width="100%"
          height="100%"
          style={{ border: 'none' }}
        />
      );
    }
    
    // Handle non-PDF files that can be downloaded
    if (fileMetadata && !isPdf) {
      return (
        <div className="centered-message">
          <p>This document (<code>{fileMetadata.display_name}</code>) cannot be previewed here.</p>
          <p>Please use the download button.</p>
        </div>
      );
    }

    // Fallback for errors or missing documents
    return (
      <div className="centered-message">
        <p>Could not load the document preview.</p>
        {item?.html_url && (
            <a href={item.html_url} target="_blank" rel="noopener noreferrer" className="canvas-link">
                View on Canvas
            </a>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" PaperProps={{ style: { height: '90vh' } }}>
      <DialogTitle style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{item?.title || 'Document Viewer'}</span>
        <div>
          {fileMetadata?.url && (
            <Button
              variant="outlined"
              startIcon={<FaDownload />}
              href={fileMetadata.url}
              // Add the download attribute to force download
              download
            >
              Download
            </Button>
          )}
          <IconButton onClick={onClose} style={{ marginLeft: '1rem' }}>
            <FaTimes />
          </IconButton>
        </div>
      </DialogTitle>
      <DialogContent style={{ display: 'flex', flexDirection: 'column', padding: 0, height: '100%' }}>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}