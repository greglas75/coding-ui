// ═══════════════════════════════════════════════════════════════
// 🧪 CodeSuggestions Tests
// ═══════════════════════════════════════════════════════════════

import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CodeSuggestions } from '../components/CodeSuggestions';
import type { CodeSuggestion } from '../lib/codeSuggestionEngine';
import { render, screen } from '../test/utils/test-utils';

describe('CodeSuggestions', () => {
  const mockSuggestions: CodeSuggestion[] = [
    {
      codeId: 1,
      codeName: 'Apple',
      confidence: 0.95,
      reason: 'Frequently used for similar answers',
      frequency: 10,
      source: 'frequency',
    },
    {
      codeId: 2,
      codeName: 'Samsung',
      confidence: 0.75,
      reason: 'Pattern match detected',
      frequency: 5,
      source: 'similarity',
    },
    {
      codeId: 3,
      codeName: 'Nike',
      confidence: 0.45,
      reason: 'Low confidence match',
      frequency: 2,
      source: 'hybrid',
    },
  ];

  const mockProps = {
    suggestions: mockSuggestions,
    onApply: vi.fn(),
    isLoading: false,
  };

  describe('Loading State', () => {
    it('should show loading indicator when isLoading is true', () => {
      render(<CodeSuggestions {...mockProps} isLoading={true} />);

      expect(screen.getByText('Analyzing patterns...')).toBeInTheDocument();
    });

    it('should show animated sparkles during loading', () => {
      render(<CodeSuggestions {...mockProps} isLoading={true} />);

      const sparkles = document.querySelector('.animate-pulse');
      expect(sparkles).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show message when no suggestions available', () => {
      render(<CodeSuggestions {...mockProps} suggestions={[]} />);

      expect(screen.getByText(/No suggestions available yet/)).toBeInTheDocument();
      expect(screen.getByText(/Code more answers to build history!/)).toBeInTheDocument();
    });
  });

  describe('Suggestions Display', () => {
    it('should render all suggestions', () => {
      render(<CodeSuggestions {...mockProps} />);

      expect(screen.getByText('Apple')).toBeInTheDocument();
      expect(screen.getByText('Samsung')).toBeInTheDocument();
      expect(screen.getByText('Nike')).toBeInTheDocument();
    });

    it('should display confidence percentages', () => {
      render(<CodeSuggestions {...mockProps} />);

      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('45%')).toBeInTheDocument();
    });

    it('should show frequency counts', () => {
      render(<CodeSuggestions {...mockProps} />);

      expect(screen.getByText('10× used')).toBeInTheDocument();
      expect(screen.getByText('5× used')).toBeInTheDocument();
      expect(screen.getByText('2× used')).toBeInTheDocument();
    });

    it('should display rank badges', () => {
      render(<CodeSuggestions {...mockProps} />);

      expect(screen.getByText('1')).toBeInTheDocument(); // Rank badge
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should show reason for each suggestion', () => {
      render(<CodeSuggestions {...mockProps} />);

      expect(screen.getByText('Frequently used for similar answers')).toBeInTheDocument();
      expect(screen.getByText('Pattern match detected')).toBeInTheDocument();
      expect(screen.getByText('Low confidence match')).toBeInTheDocument();
    });
  });

  describe('Confidence Color Coding', () => {
    it('should use green for high confidence (>= 70%)', () => {
      render(<CodeSuggestions {...mockProps} />);

      const apple95 = screen.getByText('95%');
      const samsung75 = screen.getByText('75%');

      expect(apple95.className).toContain('bg-green-100');
      expect(samsung75.className).toContain('bg-green-100');
    });

    it('should use yellow for medium confidence (40-69%)', () => {
      render(<CodeSuggestions {...mockProps} />);

      const nike45 = screen.getByText('45%');
      expect(nike45.className).toContain('bg-yellow-100');
    });

    it('should use gray for low confidence (< 40%)', () => {
      const lowConfidenceSuggestion: CodeSuggestion[] = [{
        codeId: 4,
        codeName: 'LowConf',
        confidence: 0.25,
        reason: 'Very low match',
        frequency: 1,
        source: 'keyword',
      }];

      render(<CodeSuggestions {...mockProps} suggestions={lowConfidenceSuggestion} />);

      const lowConf = screen.getByText('25%');
      expect(lowConf.className).toContain('bg-gray-100');
    });
  });

  describe('User Interactions', () => {
    it('should call onApply when suggestion is clicked', async () => {
      const user = userEvent.setup();
      render(<CodeSuggestions {...mockProps} />);

      const appleButton = screen.getByText('Apple').closest('button');
      await user.click(appleButton!);

      expect(mockProps.onApply).toHaveBeenCalledWith(1, 'Apple');
    });

    it('should call onApply with correct parameters for each suggestion', async () => {
      const user = userEvent.setup();
      render(<CodeSuggestions {...mockProps} />);

      // Click Samsung
      const samsungButton = screen.getByText('Samsung').closest('button');
      await user.click(samsungButton!);

      expect(mockProps.onApply).toHaveBeenCalledWith(2, 'Samsung');
    });

    it('should show hover effects on buttons', async () => {
      const user = userEvent.setup();
      render(<CodeSuggestions {...mockProps} />);

      const appleButton = screen.getByText('Apple').closest('button');

      await user.hover(appleButton!);

      // Button should have hover classes
      expect(appleButton!.className).toContain('hover:border-purple-300');
    });
  });

  describe('Suggestion Ordering', () => {
    it('should display suggestions in order (highest confidence first)', () => {
      render(<CodeSuggestions {...mockProps} />);

      const ranks = screen.getAllByText(/^[123]$/);
      expect(ranks[0]).toHaveTextContent('1'); // Apple (95%)
      expect(ranks[1]).toHaveTextContent('2'); // Samsung (75%)
      expect(ranks[2]).toHaveTextContent('3'); // Nike (45%)
    });
  });

  describe('Info Text', () => {
    it('should show info about suggestions being based on history', () => {
      render(<CodeSuggestions {...mockProps} />);

      expect(screen.getByText('Smart Suggestions')).toBeInTheDocument();
      expect(screen.getByText(/Based on your coding history/)).toBeInTheDocument();
    });

    it('should show usage instructions', () => {
      render(<CodeSuggestions {...mockProps} />);

      expect(screen.getByText(/Click any suggestion to apply instantly/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle suggestions without frequency', () => {
      const suggestionsWithoutFreq: CodeSuggestion[] = [{
        codeId: 1,
        codeName: 'Test',
        confidence: 0.8,
        reason: 'Test reason',
        frequency: undefined,
        source: 'similarity',
      }];

      render(<CodeSuggestions {...mockProps} suggestions={suggestionsWithoutFreq} />);

      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.queryByText(/× used/)).not.toBeInTheDocument();
    });

    it('should handle zero frequency', () => {
      const suggestionsWithZeroFreq: CodeSuggestion[] = [{
        codeId: 1,
        codeName: 'Test',
        confidence: 0.8,
        reason: 'Test reason',
        frequency: 0,
        source: 'keyword',
      }];

      render(<CodeSuggestions {...mockProps} suggestions={suggestionsWithZeroFreq} />);

      expect(screen.queryByText(/× used/)).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should render gradient background', () => {
      const { container } = render(<CodeSuggestions {...mockProps} />);

      const gradientDiv = container.querySelector('.bg-gradient-to-br');
      expect(gradientDiv).toBeInTheDocument();
    });

    it('should have proper spacing between suggestions', () => {
      const { container } = render(<CodeSuggestions {...mockProps} />);

      const spacedContainer = container.querySelector('.space-y-2');
      expect(spacedContainer).toBeInTheDocument();
    });
  });
});

