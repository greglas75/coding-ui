/**
 * Loading skeleton components for better UX while data loads.
 * Shows placeholder content like YouTube/Facebook/Netflix do.
 *
 * Business benefit: Users see immediate feedback instead of blank screen,
 * making the app feel faster and more responsive.
 */

interface SkeletonProps {
  className?: string;
}

/**
 * Base skeleton pulse animation
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-neutral-700 rounded ${className}`}
    />
  );
}

/**
 * Single answer row skeleton
 */
export function AnswerRowSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center gap-3 border-b border-gray-200 dark:border-neutral-800 ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
      {/* Checkbox skeleton */}
      <Skeleton className="w-4 h-4 flex-shrink-0" />

      {/* Text content skeleton */}
      <div className="flex-1 space-y-2">
        <Skeleton className={`h-4 w-3/4 ${compact ? '' : 'mb-2'}`} />
        {!compact && <Skeleton className="h-3 w-1/2" />}
      </div>

      {/* Code badge skeleton */}
      <Skeleton className={`h-6 flex-shrink-0 ${compact ? 'w-24' : 'w-32'}`} />

      {/* Status dropdown skeleton */}
      <Skeleton className={`h-8 flex-shrink-0 ${compact ? 'w-20' : 'w-28'}`} />
    </div>
  );
}

/**
 * Full table skeleton with multiple rows
 */
export function AnswerTableSkeleton({ rows = 10, compact = false }: { rows?: number; compact?: boolean }) {
  return (
    <div className="border border-gray-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-neutral-900">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 border-b-2 border-gray-300 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 px-4 py-3">
        <Skeleton className="w-4 h-4" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-28" />
      </div>

      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, i) => (
        <AnswerRowSkeleton key={i} compact={compact} />
      ))}

      {/* Footer skeleton */}
      <div className="border-t border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800 px-4 py-2">
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  );
}

/**
 * Category card skeleton for home page
 */
export function CategoryCardSkeleton() {
  return (
    <div className="border border-gray-200 dark:border-neutral-800 rounded-lg p-4 bg-white dark:bg-neutral-900">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-8 w-16" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

/**
 * Grid of category card skeletons
 */
export function CategoryGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CategoryCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Code list row skeleton
 */
export function CodeRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-gray-200 dark:border-neutral-800 px-4 py-3">
      <Skeleton className="w-4 h-4" />
      <Skeleton className="h-5 flex-1" />
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-8 w-20" />
    </div>
  );
}

/**
 * Full code list skeleton
 */
export function CodeListSkeleton({ rows = 15 }: { rows?: number }) {
  return (
    <div className="border border-gray-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-neutral-900">
      {/* Header */}
      <div className="flex items-center gap-4 border-b-2 border-gray-300 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 px-4 py-3">
        <Skeleton className="w-4 h-4" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <CodeRowSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Page loading spinner (full screen)
 */
export function PageLoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400 font-medium">{message}</p>
      </div>
    </div>
  );
}

/**
 * Inline loading spinner (for smaller components)
 */
export function InlineSpinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className={`animate-spin rounded-full border-b-2 border-blue-600 dark:border-blue-400 ${sizeClasses[size]} ${className}`} />
  );
}

/**
 * Modal loading skeleton
 */
export function ModalContentSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
      <div className="flex gap-2 justify-end">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

/**
 * Filter bar skeleton
 */
export function FilterBarSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-10 w-32" />
      <div className="flex-1" />
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-24" />
    </div>
  );
}
