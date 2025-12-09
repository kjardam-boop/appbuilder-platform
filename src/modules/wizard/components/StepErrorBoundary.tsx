/**
 * StepErrorBoundary Component
 * 
 * Error boundary for wizard step components.
 * Catches errors and displays a fallback UI without crashing the whole wizard.
 */

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface StepErrorBoundaryProps {
  children: React.ReactNode;
  stepName: string;
  onRetry?: () => void;
}

interface StepErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class StepErrorBoundary extends React.Component<
  StepErrorBoundaryProps,
  StepErrorBoundaryState
> {
  constructor(props: StepErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): StepErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[${this.props.stepName}] Error:`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Feil i {this.props.stepName}
            </CardTitle>
            <CardDescription>
              Det oppstod en feil ved lasting av dette steget. Prøv å laste på nytt.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-sm font-mono">
              {this.state.error?.message || 'Ukjent feil'}
            </div>
            
            <div className="flex gap-2">
              <Button onClick={this.handleReset} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Prøv igjen
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                variant="ghost"
              >
                Last siden på nytt
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}


