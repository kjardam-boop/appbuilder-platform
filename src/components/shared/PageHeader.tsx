/**
 * PageHeader Component
 * 
 * Consistent page header with title, description, breadcrumbs, and actions.
 * Used across all pages for visual consistency.
 */

import { ReactNode } from 'react';
import { AppBreadcrumbs } from '@/components/ui/app-breadcrumbs';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional description below title */
  description?: string;
  /** Optional icon component */
  icon?: ReactNode;
  /** Optional action buttons (right side) */
  actions?: ReactNode;
  /** Show breadcrumbs (default: true) */
  showBreadcrumbs?: boolean;
  /** Show back button (default: false) */
  showBackButton?: boolean;
  /** Custom back navigation path */
  backPath?: string;
  /** Additional CSS classes */
  className?: string;
  /** Children rendered below header */
  children?: ReactNode;
}

export function PageHeader({
  title,
  description,
  icon,
  actions,
  showBreadcrumbs = true,
  showBackButton = false,
  backPath,
  className,
  children,
}: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Breadcrumbs */}
      {showBreadcrumbs && (
        <div className="flex items-center gap-2">
          {showBackButton && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <AppBreadcrumbs />
        </div>
      )}

      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {description && (
              <p className="text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Optional children content */}
      {children}
    </div>
  );
}

export default PageHeader;

