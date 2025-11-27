/**
 * WizardStepIndicator Component
 * 
 * Visual progress indicator for the wizard steps
 */

import { cn } from '@/lib/utils';
import { LucideIcon, Check } from 'lucide-react';

export interface Step {
  key: string;
  label: string;
  icon: LucideIcon;
}

interface WizardStepIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepNumber: number) => void;
  allowNavigation?: boolean;
}

export function WizardStepIndicator({
  steps,
  currentStep,
  onStepClick,
  allowNavigation = false,
}: WizardStepIndicatorProps) {
  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="relative mb-8">
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>
        
        {/* Step circles */}
        <div className="relative flex justify-between">
          {steps.map((step, i) => {
            const stepNumber = i + 1;
            const isCompleted = stepNumber < currentStep;
            const isCurrent = stepNumber === currentStep;
            const isClickable = allowNavigation && stepNumber <= currentStep;
            
            return (
              <div key={step.key} className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick?.(stepNumber)}
                  disabled={!isClickable}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                    'border-2 bg-background',
                    isCompleted && 'border-primary bg-primary text-primary-foreground',
                    isCurrent && 'border-primary ring-4 ring-primary/20',
                    !isCompleted && !isCurrent && 'border-muted text-muted-foreground',
                    isClickable && 'cursor-pointer hover:scale-105',
                    !isClickable && 'cursor-default'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </button>
                <span className={cn(
                  'mt-2 text-xs font-medium',
                  isCurrent ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

