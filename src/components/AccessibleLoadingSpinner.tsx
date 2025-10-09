export function AccessibleLoadingSpinner({
  size = 'md',
  label = 'Loading...'
}: { size?: 'sm' | 'md' | 'lg'; label?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="flex items-center justify-center"
    >
      <div
        className={`${sizeClasses[size]} border-2 border-gray-300 dark:border-gray-600 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin`}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
