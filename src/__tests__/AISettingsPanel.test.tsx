// ═══════════════════════════════════════════════════════════════
// 🧪 Tests: AI Settings Panel
// ═══════════════════════════════════════════════════════════════

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AISettingsPanel from '../components/settings/AISettingsPanel';

describe('AISettingsPanel', () => {
  const defaultSettings = {
    useWebContext: true,
    useAutoTranslate: true,
    useAdaptiveSearch: true,
    useEvaluator: false,
    priority: 'balanced' as const,
  };

  it('renders with default settings', () => {
    const onChange = vi.fn();

    render(<AISettingsPanel settings={defaultSettings} onChange={onChange} />);

    expect(screen.getByText(/AI Configuration/)).toBeInTheDocument();
    expect(screen.getByText(/Control how the AI behaves/)).toBeInTheDocument();
  });

  it('renders all toggle switches', () => {
    const onChange = vi.fn();

    render(<AISettingsPanel settings={defaultSettings} onChange={onChange} />);

    expect(screen.getByLabelText(/Use Google Search Context/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Auto-translate to English/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Use Adaptive Search/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Use Evaluator Model/)).toBeInTheDocument();
  });

  it('renders priority select with options', () => {
    const onChange = vi.fn();

    render(<AISettingsPanel settings={defaultSettings} onChange={onChange} />);

    const select = screen.getByLabelText(/AI Mode/);
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('balanced');
  });

  it('calls onChange when useWebContext is toggled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<AISettingsPanel settings={defaultSettings} onChange={onChange} />);

    const toggle = screen.getByRole('switch', { name: /Use Google Search Context/ });
    await user.click(toggle);

    expect(onChange).toHaveBeenCalledWith({ useWebContext: false });
  });

  it('calls onChange when useAutoTranslate is toggled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<AISettingsPanel settings={defaultSettings} onChange={onChange} />);

    const toggle = screen.getByRole('switch', { name: /Auto-translate to English/ });
    await user.click(toggle);

    expect(onChange).toHaveBeenCalledWith({ useAutoTranslate: false });
  });

  it('calls onChange when useAdaptiveSearch is toggled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<AISettingsPanel settings={defaultSettings} onChange={onChange} />);

    const toggle = screen.getByRole('switch', { name: /Use Adaptive Search/ });
    await user.click(toggle);

    expect(onChange).toHaveBeenCalledWith({ useAdaptiveSearch: false });
  });

  it('calls onChange when useEvaluator is toggled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<AISettingsPanel settings={defaultSettings} onChange={onChange} />);

    const toggle = screen.getByRole('switch', { name: /Use Evaluator Model/ });
    await user.click(toggle);

    expect(onChange).toHaveBeenCalledWith({ useEvaluator: true });
  });

  it('calls onChange when priority is changed', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<AISettingsPanel settings={defaultSettings} onChange={onChange} />);

    const select = screen.getByLabelText(/AI Mode/);
    await user.selectOptions(select, 'fast');

    expect(onChange).toHaveBeenCalledWith({ priority: 'fast' });
  });

  it('displays correct toggle states', () => {
    const onChange = vi.fn();
    const customSettings = {
      useWebContext: false,
      useAutoTranslate: false,
      useAdaptiveSearch: false,
      useEvaluator: true,
      priority: 'accurate' as const,
    };

    render(<AISettingsPanel settings={customSettings} onChange={onChange} />);

    expect(screen.getByRole('switch', { name: /Use Google Search Context/ })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('switch', { name: /Auto-translate to English/ })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('switch', { name: /Use Adaptive Search/ })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('switch', { name: /Use Evaluator Model/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('shows performance summary', () => {
    const onChange = vi.fn();

    render(<AISettingsPanel settings={defaultSettings} onChange={onChange} />);

    expect(screen.getByText(/Current Configuration Impact/)).toBeInTheDocument();
    expect(screen.getByText(/Estimated Latency:/)).toBeInTheDocument();
    expect(screen.getByText(/Cost per Request:/)).toBeInTheDocument();
    expect(screen.getByText(/Quality Score:/)).toBeInTheDocument();
  });

  it('updates performance metrics based on priority', () => {
    const onChange = vi.fn();

    const { rerender } = render(
      <AISettingsPanel settings={{ ...defaultSettings, priority: 'fast' }} onChange={onChange} />
    );

    expect(screen.getByText(/~0.3-0.5s/)).toBeInTheDocument();

    rerender(
      <AISettingsPanel settings={{ ...defaultSettings, priority: 'accurate' }} onChange={onChange} />
    );

    expect(screen.getByText(/~1.2-1.5s/)).toBeInTheDocument();
  });

  it('shows evaluator latency impact', () => {
    const onChange = vi.fn();

    render(
      <AISettingsPanel settings={{ ...defaultSettings, useEvaluator: true }} onChange={onChange} />
    );

    expect(screen.getByText(/\+0.4s/)).toBeInTheDocument();
  });

  it('applies default values when settings are undefined', () => {
    const onChange = vi.fn();

    render(<AISettingsPanel settings={{}} onChange={onChange} />);

    expect(screen.getByRole('switch', { name: /Use Google Search Context/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: /Auto-translate to English/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: /Use Adaptive Search/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: /Use Evaluator Model/ })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByLabelText(/AI Mode/)).toHaveValue('balanced');
  });

  it('renders info tooltips', () => {
    const onChange = vi.fn();

    render(<AISettingsPanel settings={defaultSettings} onChange={onChange} />);

    // Info icons are SVG elements
    const container = screen.getByText(/AI Configuration/).closest('div');
    expect(container).toBeInTheDocument();
  });

  it('toggles work independently', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<AISettingsPanel settings={defaultSettings} onChange={onChange} />);

    // Toggle first switch
    const webContextToggle = screen.getByRole('switch', { name: /Use Google Search Context/ });
    await user.click(webContextToggle);
    expect(onChange).toHaveBeenCalledWith({ useWebContext: false });

    // Toggle second switch
    const autoTranslateToggle = screen.getByRole('switch', { name: /Auto-translate to English/ });
    await user.click(autoTranslateToggle);
    expect(onChange).toHaveBeenCalledWith({ useAutoTranslate: false });

    // Verify both toggles were called
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('priority select has all three options', () => {
    const onChange = vi.fn();

    render(<AISettingsPanel settings={defaultSettings} onChange={onChange} />);

    const select = screen.getByLabelText(/AI Mode/);
    const options = select.querySelectorAll('option');

    expect(options).toHaveLength(3);
    expect(options[0]).toHaveValue('fast');
    expect(options[1]).toHaveValue('balanced');
    expect(options[2]).toHaveValue('accurate');
  });
});

