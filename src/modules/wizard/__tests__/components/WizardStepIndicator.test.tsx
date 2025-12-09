/**
 * WizardStepIndicator Unit Tests
 * 
 * Tests for the wizard progress indicator component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WizardStepIndicator, WizardStep } from '../../components/WizardStepIndicator';
import { Building2, MessageSquare, Users, Puzzle, Wand2, Rocket } from 'lucide-react';

const mockSteps: WizardStep[] = [
  { key: 'company', label: 'Selskap', icon: Building2 },
  { key: 'discovery', label: 'Discovery', icon: MessageSquare },
  { key: 'workshop', label: 'Workshop', icon: Users },
  { key: 'capabilities', label: 'Capabilities', icon: Puzzle },
  { key: 'generate', label: 'Generer', icon: Wand2 },
  { key: 'deploy', label: 'Deploy', icon: Rocket },
];

describe('WizardStepIndicator', () => {
  describe('rendering', () => {
    it('should render all steps', () => {
      render(
        <WizardStepIndicator
          steps={mockSteps}
          currentStep={1}
        />
      );

      mockSteps.forEach(step => {
        expect(screen.getByText(step.label)).toBeInTheDocument();
      });
    });

    it('should highlight current step', () => {
      render(
        <WizardStepIndicator
          steps={mockSteps}
          currentStep={3}
        />
      );

      // Current step should have primary styling
      const workshopLabel = screen.getByText('Workshop');
      expect(workshopLabel).toHaveClass('text-primary');
    });

    it('should mark completed steps with checkmark', () => {
      render(
        <WizardStepIndicator
          steps={mockSteps}
          currentStep={3}
        />
      );

      // Steps 1 and 2 should be completed (have green styling)
      const selskapLabel = screen.getByText('Selskap');
      const discoveryLabel = screen.getByText('Discovery');
      
      expect(selskapLabel).toHaveClass('text-green-600');
      expect(discoveryLabel).toHaveClass('text-green-600');
    });
  });

  describe('navigation', () => {
    it('should call onStepClick when clicking reachable step', () => {
      const onStepClick = vi.fn();
      
      render(
        <WizardStepIndicator
          steps={mockSteps}
          currentStep={3}
          highestStepReached={3}
          onStepClick={onStepClick}
        />
      );

      // Click on step 1 (should be reachable)
      const step1Button = screen.getAllByRole('button')[0];
      fireEvent.click(step1Button);

      expect(onStepClick).toHaveBeenCalledWith(1);
    });

    it('should not call onStepClick when clicking unreachable step', () => {
      const onStepClick = vi.fn();
      
      render(
        <WizardStepIndicator
          steps={mockSteps}
          currentStep={2}
          highestStepReached={2}
          onStepClick={onStepClick}
        />
      );

      // Click on step 4 (should NOT be reachable)
      const step4Button = screen.getAllByRole('button')[3];
      fireEvent.click(step4Button);

      expect(onStepClick).not.toHaveBeenCalled();
    });

    it('should allow navigation to any step up to highestStepReached', () => {
      const onStepClick = vi.fn();
      
      render(
        <WizardStepIndicator
          steps={mockSteps}
          currentStep={1}
          highestStepReached={4}
          onStepClick={onStepClick}
        />
      );

      // Should be able to click step 4 since highestStepReached is 4
      const step4Button = screen.getAllByRole('button')[3];
      fireEvent.click(step4Button);

      expect(onStepClick).toHaveBeenCalledWith(4);
    });
  });

  describe('accessibility', () => {
    it('should have title attribute on reachable steps', () => {
      render(
        <WizardStepIndicator
          steps={mockSteps}
          currentStep={1}
          highestStepReached={3}
          onStepClick={vi.fn()}
        />
      );

      const step1Button = screen.getAllByRole('button')[0];
      expect(step1Button).toHaveAttribute('title', 'Gå til Selskap');
    });

    it('should disable unreachable steps', () => {
      render(
        <WizardStepIndicator
          steps={mockSteps}
          currentStep={2}
          highestStepReached={2}
          onStepClick={vi.fn()}
        />
      );

      // Step 4 should be disabled
      const step4Button = screen.getAllByRole('button')[3];
      expect(step4Button).toBeDisabled();
    });
  });

  describe('without onStepClick', () => {
    it('should render but not be interactive without onStepClick', () => {
      render(
        <WizardStepIndicator
          steps={mockSteps}
          currentStep={3}
          highestStepReached={5}
        />
      );

      // All buttons should be disabled without onStepClick
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('with descriptions', () => {
    it('should render step descriptions when provided', () => {
      const stepsWithDescriptions: WizardStep[] = [
        { key: 'company', label: 'Selskap', icon: Building2, description: 'Velg kunde' },
        { key: 'discovery', label: 'Discovery', icon: MessageSquare, description: 'Kartlegg behov' },
      ];

      render(
        <WizardStepIndicator
          steps={stepsWithDescriptions}
          currentStep={1}
        />
      );

      // Note: Descriptions are hidden on mobile (hidden md:block)
      // In jsdom they should still be in the document
      expect(screen.getByText('Velg kunde')).toBeInTheDocument();
      expect(screen.getByText('Kartlegg behov')).toBeInTheDocument();
    });
  });
});


