import React from "react";

interface Tab {
  label: string;
  value: string;
}

interface FeedTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabValue: string) => void;
}

export default function FeedTabs({ tabs, activeTab, onTabChange }: FeedTabsProps) {
  return (
    <div className="feed-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          className={`tab-button ${activeTab === tab.value ? "active" : ""}`}
          onClick={() => onTabChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}