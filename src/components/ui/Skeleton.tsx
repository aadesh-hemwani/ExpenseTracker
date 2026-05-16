import { memo } from "react";

interface SkeletonProps {
  className?: string;
}

export const Skeleton = memo(({ className = "" }: SkeletonProps) => {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-white/10 rounded-lg ${className}`}
    />
  );
});

Skeleton.displayName = "Skeleton";

export const ExpenseCardSkeleton = memo(() => {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-transparent">
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="w-32 h-4" />
          <Skeleton className="w-20 h-3" />
        </div>
      </div>
      <Skeleton className="w-16 h-5" />
    </div>
  );
});

ExpenseCardSkeleton.displayName = "ExpenseCardSkeleton";

export const HeroBalanceSkeleton = memo(() => {
  return (
    <div className="space-y-4 mb-8">
      <Skeleton className="w-24 h-4 mx-auto" />
      <Skeleton className="w-48 h-12 mx-auto" />
      <div className="flex gap-4 justify-center">
        <Skeleton className="w-24 h-4" />
        <Skeleton className="w-24 h-4" />
      </div>
    </div>
  );
});

HeroBalanceSkeleton.displayName = "HeroBalanceSkeleton";

export const ChartSkeleton = memo(() => {
  return (
    <div className="w-full h-[250px] flex items-center justify-center">
      <div className="relative w-48 h-48">
        <Skeleton className="absolute inset-0 rounded-full" />
        <div className="absolute inset-4 rounded-full bg-white dark:bg-[#121316]" />
      </div>
    </div>
  );
});

ChartSkeleton.displayName = "ChartSkeleton";
