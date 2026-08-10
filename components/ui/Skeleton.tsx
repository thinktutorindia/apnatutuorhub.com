import React from "react";

interface SkeletonProps {
  className?: string;
  height?: string | number;
  width?: string | number;
  rounded?: string;
}

export function Skeleton({ className = "", height, width, rounded = "rounded" }: SkeletonProps) {
  return (
    <div
      className={`at-skeleton ${rounded} ${className}`}
      style={{ height, width }}
      role="status"
      aria-label="Loading..."
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="at-card p-5 space-y-4" aria-busy="true">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="at-card p-5 space-y-3" aria-busy="true">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

export function TutorCardSkeleton() {
  return (
    <div className="at-card p-5 space-y-4" aria-busy="true">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
      </div>
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 py-4" aria-busy="true">
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
