"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCanvasModules } from "@/utilities/fetch/canvas-fetch";
import CircularLoading from "@/components/misc/CircularLoading";
import BackToArrow from "@/components/misc/BackToArrow";
import ModuleRow from "@/components/canvas/ModuleRow";
import { CanvasModule, CanvasModuleItem } from "@/types/CanvasTypes";
import AssignmentViewerDialog from "@/components/canvas/AssignmentViewerDialog";

export default function ClassDetailsPage({ params }: { params: { classId: string } }) {
  const { classId } = params;
  const [viewingItem, setViewingItem] = useState<CanvasModuleItem | null>(null);

  const { data: modules, isLoading, isError } = useQuery({
    queryKey: ["canvasModules", classId],
    queryFn: () => getCanvasModules(classId),
    enabled: !!classId,
  });
  
  const handleItemClick = (item: CanvasModuleItem) => {
    if (item.type === 'Assignment' || item.type === 'File') {
      setViewingItem(item);
    } else {
      window.open(item.html_url, '_blank');
    }
  };

  const handleViewerClose = () => {
    setViewingItem(null);
  };

  if (isLoading) return <CircularLoading />;
  if (isError) return <div>Error fetching modules for this class.</div>;

  return (
    <main>
      <BackToArrow title="All Classes" url="/classes" />
      <div className="module-list">
        {modules?.map((module: CanvasModule) => (
          <ModuleRow 
            key={module.id} 
            module={module} 
            courseId={classId} 
            onItemClick={handleItemClick}
          />
        ))}
      </div>
      
      <AssignmentViewerDialog 
        item={viewingItem}
        courseId={classId}
        open={!!viewingItem}
        onClose={handleViewerClose}
      />
    </main>
  );
}