import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TimeRangeSelector from '@/components/charts/TimeRangeSelector';

describe('TimeRangeSelector', () => {
  it('renders all preset range buttons', () => {
    render(
      <TimeRangeSelector
        activeRange="30d"
        onRangeChange={vi.fn()}
        onCustomRange={vi.fn()}
      />
    );

    expect(screen.getByText('7D')).toBeInTheDocument();
    expect(screen.getByText('30D')).toBeInTheDocument();
    expect(screen.getByText('90D')).toBeInTheDocument();
    expect(screen.getByText('1Y')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('highlights the active range button', () => {
    render(
      <TimeRangeSelector
        activeRange="7d"
        onRangeChange={vi.fn()}
        onCustomRange={vi.fn()}
      />
    );

    expect(screen.getByText('7D').className).toContain('bg-blue-500');
    expect(screen.getByText('30D').className).not.toContain('bg-blue-500');
  });

  it('calls onRangeChange when a preset button is clicked', () => {
    const onRangeChange = vi.fn();
    render(
      <TimeRangeSelector
        activeRange="30d"
        onRangeChange={onRangeChange}
        onCustomRange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('90D'));
    expect(onRangeChange).toHaveBeenCalledWith('90d');
  });

  it('shows date inputs when Custom is clicked', () => {
    render(
      <TimeRangeSelector
        activeRange="30d"
        onRangeChange={vi.fn()}
        onCustomRange={vi.fn()}
      />
    );

    expect(screen.queryByLabelText('Start date')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Custom'));

    expect(screen.getByLabelText('Start date')).toBeInTheDocument();
    expect(screen.getByLabelText('End date')).toBeInTheDocument();
    expect(screen.getByText('Apply')).toBeInTheDocument();
  });

  it('calls onCustomRange when Apply is clicked with valid dates', () => {
    const onCustomRange = vi.fn();
    render(
      <TimeRangeSelector
        activeRange="30d"
        onRangeChange={vi.fn()}
        onCustomRange={onCustomRange}
      />
    );

    fireEvent.click(screen.getByText('Custom'));

    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2025-01-01' } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2025-06-30' } });
    fireEvent.click(screen.getByText('Apply'));

    expect(onCustomRange).toHaveBeenCalledWith('2025-01-01', '2025-06-30');
  });

  it('disables Apply button when dates are empty', () => {
    render(
      <TimeRangeSelector
        activeRange="30d"
        onRangeChange={vi.fn()}
        onCustomRange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Custom'));

    const applyButton = screen.getByText('Apply');
    expect(applyButton).toBeDisabled();
  });
});
