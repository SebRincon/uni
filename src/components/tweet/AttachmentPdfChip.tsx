"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import { FaTimes } from "react-icons/fa";
import { useStorageUrl } from "@/hooks/useStorageUrl";

export default function AttachmentPdfChip({ path, name }: { path: string; name: string }) {
  const url = useStorageUrl(path);
  const [open, setOpen] = useState(false);

  return (
    <>
      <a
        className="attachment-chip"
        href={url || undefined}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          // If we resolved a URL, prefer inline viewer
          if (url) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        PDF: {name}
      </a>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="lg" PaperProps={{ style: { height: '90vh' } }}>
        <DialogTitle style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{name}</span>
          <IconButton onClick={() => setOpen(false)}>
            <FaTimes />
          </IconButton>
        </DialogTitle>
        <DialogContent style={{ padding: 0, height: '100%' }}>
          {url ? (
            <iframe src={url} title={name} width="100%" height="100%" style={{ border: 'none' }} />
          ) : (
            <div className="centered-message" style={{ padding: '1rem' }}>Unable to load PDF.</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}