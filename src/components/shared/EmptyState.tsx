/**
 * EmptyState Component
 * 
 * Consistent empty state display for lists, tables, and containers.
 * Provides visual feedback when there's no data to display.
 */

import { ReactNode } from 'react';
import { LucideIcon, Inbox, SearchX, AlertCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type EmptyStateVariant = 'default' | 'search' | 'error' | 'filtered';

export interface EmptyStateProps {
  /** Primary message */
  title: string;
  /** Secondary description */
  description?: string;
  /** Icon to display (defaults based on variant) */
  icon?: LucideIcon;
  /** Variant determines styling and default icon */
  variant?: EmptyStateVariant;
  /** Primary action button */
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  /** Secondary action (link style) */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Additional CSS classes */
  className?: string;
  /** Children for custom content */
  children?: ReactNode;
}

const variantConfig: Record<EmptyStateVariant, { icon: LucideIcon; iconClassName: string }> = {
  default: { 
    icon: Inbox, 
    iconClassName: 'text-muted-foreground' 
  },
  search: { 
    icon: SearchX, 
    iconClassName: 'text-muted-foreground' 
  },
  error: { 
    icon: AlertCircle, 
    iconClassName: 'text-destructive' 
  },
  filtered: { 
    icon: SearchX, 
    iconClassName: 'text-muted-foreground' 
  },
};

export function EmptyState({
  title,
  description,
  icon,
  variant = 'default',
  action,
  secondaryAction,
  className,
  children,
}: EmptyStateProps) {
  const config = variantConfig[variant];
  const Icon = icon || config.icon;

  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      className
    )}>
      {/* Icon */}
      <div className={cn(
        'flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4',
        variant === 'error' && 'bg-destructive/10'
      )}>
        <Icon className={cn('h-8 w-8', config.iconClassName)} />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-muted-foreground mt-1 max-w-md">{description}</p>
      )}

      {/* Custom children */}
      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-6">
          {action && (
            <Button onClick={action.onClick}>
              {action.icon ? (
                <action.icon className="mr-2 h-4 w-4" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="ghost" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PRESET EMPTY STATES
// =============================================================================

export function NoDataEmptyState({ 
  entityName,
  onAdd,
}: { 
  entityName: string;
  onAdd?: () => void;
}) {
  return (
    <EmptyState
      title={`Ingen ${entityName.toLowerCase()} funnet`}
      description={`Det er ingen ${entityName.toLowerCase()} ennå. Klikk på knappen nedenfor for å legge til.`}
      action={onAdd ? {
        label: `Legg til ${entityName.toLowerCase()}`,
        onClick: onAdd,
      } : undefined}
    />
  );
}

export function NoSearchResultsEmptyState({ 
  searchTerm,
  onClearSearch,
}: { 
  searchTerm: string;
  onClearSearch: () => void;
}) {
  return (
    <EmptyState
      variant="search"
      title="Ingen resultater"
      description={`Ingen resultater for "${searchTerm}". Prøv å justere søkekriteriene.`}
      secondaryAction={{
        label: 'Tøm søk',
        onClick: onClearSearch,
      }}
    />
  );
}

export function FilteredEmptyState({ 
  onClearFilters,
}: { 
  onClearFilters: () => void;
}) {
  return (
    <EmptyState
      variant="filtered"
      title="Ingen treff med valgte filtre"
      description="Prøv å justere eller fjerne noen filtre for å se flere resultater."
      secondaryAction={{
        label: 'Fjern alle filtre',
        onClick: onClearFilters,
      }}
    />
  );
}

export function ErrorEmptyState({ 
  message,
  onRetry,
}: { 
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      variant="error"
      title="Noe gikk galt"
      description={message || 'Vi kunne ikke laste inn dataene. Vennligst prøv igjen.'}
      action={onRetry ? {
        label: 'Prøv igjen',
        onClick: onRetry,
      } : undefined}
    />
  );
}

export default EmptyState;

