"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCanvasModuleItems } from "@/utilities/fetch/canvas-fetch";
import { CanvasModule, CanvasModuleItem } from "@/types/CanvasTypes";
import CircularLoading from "@/components/misc/CircularLoading";
import { FaChevronDown, FaChevronRight } from "react-icons/fa";

interface ModuleRowProps {
  module: CanvasModule;
  courseId: string;
  onItemClick: (item: CanvasModuleItem) => void;
}

export default function ModuleRow({ module, courseId, onItemClick }: ModuleRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ["canvasModuleItems", courseId, module.id],
    queryFn: () => getCanvasModuleItems(courseId, String(module.id)),
    enabled: isExpanded,
    staleTime: Infinity,
  });

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  const handleItemClick = (e: React.MouseEvent, item: CanvasModuleItem) => {
    e.preventDefault();
    onItemClick(item);
  };

  return (
    <div className="module-row">
      <div className="module-header" onClick={toggleExpansion}>
        {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
        <h3>{module.name}</h3>
        <span className="item-count">{module.items_count} items</span>
      </div>
      {isExpanded && (
        <div className="assignments-container">
          {isLoading && <CircularLoading />}
          {items && (
            <ul>
              {items.map((item: CanvasModuleItem) => (
                <li key={item.id} className="assignment-item">
                  <a href={item.html_url} onClick={(e) => handleItemClick(e, item)}>
                    <span className="item-type">{item.type}</span>
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}