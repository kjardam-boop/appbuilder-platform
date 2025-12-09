/**
 * WizardStepIndicator Component
 * 
 * Visual progress indicator for the wizard steps.
 * Supports navigation to previously visited steps via highestStepReached.
 */

import { cn } from '@/lib/utils';
import { LucideIcon, Check } from 'lucide-react';

export interface WizardStep {
  key: string;
  label: string;
  icon: LucideIcon;
  description?: string;
}

interface WizardStepIndicatorProps {
  steps: WizardStep[];
  currentStep: number;
  highestStepReached?: number;
  onStepClick?: (stepNumber: number) => void;
}

export function WizardStepIndicator({
  steps,
  currentStep,
  highestStepReached = currentStep,
  onStepClick,
}: WizardStepIndicatorProps) {
  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="relative mb-8">
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted">
          {/* Completed progress */}
          <div 
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${((Math.min(currentStep, highestStepReached) - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>
        
        {/* Step circles */}
        <div className="relative flex justify-between">
          {steps.map((step, i) => {
            const stepNumber = i + 1;
            const isCompleted = stepNumber < currentStep;
            const isCurrent = stepNumber === currentStep;
            const isReachable = stepNumber <= highestStepReached;
            const isClickable = isReachable && onStepClick;
            
            return (
              <div key={step.key} className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick(stepNumber)}
                  disabled={!isClickable}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                    'border-2 bg-background',
                    // Completed steps (before current)
                    isCompleted && 'border-green-500 bg-green-500 text-white',
                    // Current step
                    isCurrent && 'border-primary ring-4 ring-primary/20',
                    // Reachable but not current or completed
                    isReachable && !isCurrent && !isCompleted && 'border-primary/50 text-primary',
                    // Unreachable steps
                    !isReachable && 'border-muted text-muted-foreground opacity-50',
                    // Clickable hover effect
                    isClickable && 'cursor-pointer hover:scale-105 hover:shadow-md',
                    !isClickable && 'cursor-default'
                  )}
                  title={isReachable ? `Gå til ${step.label}` : undefined}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </button>
                <span className={cn(
                  'mt-2 text-xs font-medium transition-colors',
                  isCurrent && 'text-primary',
                  isCompleted && 'text-green-600',
                  isReachable && !isCurrent && !isCompleted && 'text-muted-foreground',
                  !isReachable && 'text-muted-foreground/50'
                )}>
                  {step.label}
                </span>
                {step.description && (
                  <span className="text-[10px] text-muted-foreground hidden md:block">
                    {step.description}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

