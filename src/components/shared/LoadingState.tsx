/**
 * LoadingState Component
 * 
 * Consistent loading state display for async operations.
 */

import { Loader2, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LoadingStateProps {
  /** Loading message */
  message?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Full page overlay mode */
  fullPage?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const sizeConfig = {
  sm: { icon: 'h-4 w-4', text: 'text-sm' },
  md: { icon: 'h-6 w-6', text: 'text-base' },
  lg: { icon: 'h-8 w-8', text: 'text-lg' },
};

export function LoadingState({
  message = 'Laster...',
  size = 'md',
  fullPage = false,
  className,
}: LoadingStateProps) {
  const config = sizeConfig[size];

  const content = (
    <div className={cn(
      'flex flex-col items-center justify-center gap-3',
      fullPage ? 'min-h-[400px]' : 'py-8',
      className
    )}>
      <Loader2 className={cn(config.icon, 'animate-spin text-primary')} />
      {message && (
        <p className={cn(config.text, 'text-muted-foreground')}>{message}</p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
        {content}
      </div>
    );
  }

  return content;
}

/**
 * Inline loading spinner
 */
export function LoadingSpinner({ 
  className,
  size = 'md',
}: { 
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const config = sizeConfig[size];
  return <Loader2 className={cn(config.icon, 'animate-spin', className)} />;
}

/**
 * Skeleton loading placeholder
 */
export function LoadingSkeleton({ 
  className,
  count = 1,
}: { 
  className?: string;
  count?: number;
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-12 bg-muted rounded-md animate-pulse',
            className
          )}
        />
      ))}
    </div>
  );
}

/**
 * Card skeleton for grid layouts
 */
export function LoadingCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-6 border rounded-lg space-y-3">
          <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
          <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
          <div className="h-20 bg-muted rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/**
 * Table row skeleton
 */
export function LoadingTableSkeleton({ 
  rows = 5, 
  columns = 4 
}: { 
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex gap-4 p-3 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-muted rounded animate-pulse flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-4 p-3 border-b">
          {Array.from({ length: columns }).map((_, col) => (
            <div key={col} className="h-4 bg-muted rounded animate-pulse flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default LoadingState;

