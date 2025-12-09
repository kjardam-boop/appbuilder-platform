/**
 * StepErrorBoundary Unit Tests
 * 
 * Tests for the error boundary component used in wizard steps.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StepErrorBoundary } from '../../components/StepErrorBoundary';

// Component that throws an error
const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Content rendered successfully</div>;
};

describe('StepErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error for expected errors
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('rendering', () => {
    it('should render children when no error occurs', () => {
      render(
        <StepErrorBoundary stepName="Test Step">
          <div>Normal content</div>
        </StepErrorBoundary>
      );

      expect(screen.getByText('Normal content')).toBeInTheDocument();
    });

    it('should render error UI when child throws', () => {
      render(
        <StepErrorBoundary stepName="Discovery">
          <ThrowingComponent shouldThrow={true} />
        </StepErrorBoundary>
      );

      expect(screen.getByText(/Feil i Discovery/)).toBeInTheDocument();
      expect(screen.getByText(/Det oppstod en feil ved lasting/)).toBeInTheDocument();
    });

    it('should display step name in error message', () => {
      render(
        <StepErrorBoundary stepName="Workshop">
          <ThrowingComponent shouldThrow={true} />
        </StepErrorBoundary>
      );

      expect(screen.getByText(/Feil i Workshop/)).toBeInTheDocument();
    });
  });

  describe('error recovery', () => {
    it('should show error details when provided', () => {
      render(
        <StepErrorBoundary stepName="Company">
          <ThrowingComponent shouldThrow={true} />
        </StepErrorBoundary>
      );

      // Error boundary catches the error and displays fallback UI with error message
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });
  });

  describe('nested error boundaries', () => {
    it('should catch errors at the nearest boundary', () => {
      render(
        <StepErrorBoundary stepName="Outer">
          <div>
            <StepErrorBoundary stepName="Inner">
              <ThrowingComponent shouldThrow={true} />
            </StepErrorBoundary>
          </div>
        </StepErrorBoundary>
      );

      // Inner boundary should catch the error
      expect(screen.getByText(/Feil i Inner/)).toBeInTheDocument();
      // Outer content should still be rendered (not the outer error UI)
      expect(screen.queryByText(/Feil i Outer/)).not.toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply appropriate styling to error container', () => {
      render(
        <StepErrorBoundary stepName="Test">
          <ThrowingComponent shouldThrow={true} />
        </StepErrorBoundary>
      );

      const errorContainer = screen.getByText(/Feil i Test/).closest('div');
      expect(errorContainer).toHaveClass('p-6');
    });
  });
});

