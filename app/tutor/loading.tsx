import React from "react";

export default function TutorDashboardLoading() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2 animate-pulse">
      {/* Header Skeleton */}
      <div className="h-28 rounded-3xl bg-gray-200/80 w-full" />

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="h-28 rounded-2xl bg-gray-200/70" />
        <div className="h-28 rounded-2xl bg-gray-200/70" />
        <div className="h-28 rounded-2xl bg-gray-200/70" />
        <div className="h-28 rounded-2xl bg-gray-200/70" />
      </div>

      {/* Main Section Skeleton */}
      <div className="h-64 rounded-3xl bg-gray-200/70 w-full" />

      {/* Grid Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-44 rounded-2xl bg-gray-200/60" />
        <div className="h-44 rounded-2xl bg-gray-200/60" />
        <div className="h-44 rounded-2xl bg-gray-200/60" />
      </div>
    </div>
  );
}
