import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NormalizeToggle from '@/components/compare/NormalizeToggle';

describe('NormalizeToggle', () => {
  it('renders with inactive state', () => {
    render(<NormalizeToggle enabled={false} onToggle={vi.fn()} />);
    const button = screen.getByText('Normalize');
    expect(button.className).toContain('bg-gray-700');
    expect(button.className).not.toContain('bg-blue-500');
  });

  it('renders with active state', () => {
    render(<NormalizeToggle enabled={true} onToggle={vi.fn()} />);
    const button = screen.getByText('Normalize');
    expect(button.className).toContain('bg-blue-500');
  });

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn();
    render(<NormalizeToggle enabled={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByText('Normalize'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
