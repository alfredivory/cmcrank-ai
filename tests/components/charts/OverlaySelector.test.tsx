import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OverlaySelector from '@/components/charts/OverlaySelector';

describe('OverlaySelector', () => {
  it('renders all overlay buttons', () => {
    render(
      <OverlaySelector activeOverlay="rank" onOverlayChange={vi.fn()} />
    );

    expect(screen.getByText('Rank')).toBeInTheDocument();
    expect(screen.getByText('Market Cap')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();
    expect(screen.getByText('Volume')).toBeInTheDocument();
    expect(screen.getByText('Supply')).toBeInTheDocument();
  });

  it('highlights the active overlay button', () => {
    render(
      <OverlaySelector activeOverlay="price" onOverlayChange={vi.fn()} />
    );

    expect(screen.getByText('Price').className).toContain('bg-blue-500');
    expect(screen.getByText('Rank').className).not.toContain('bg-blue-500');
  });

  it('calls onOverlayChange when a button is clicked', () => {
    const onOverlayChange = vi.fn();
    render(
      <OverlaySelector activeOverlay="rank" onOverlayChange={onOverlayChange} />
    );

    fireEvent.click(screen.getByText('Market Cap'));
    expect(onOverlayChange).toHaveBeenCalledWith('marketCap');
  });

  it('calls onOverlayChange with correct value for each button', () => {
    const onOverlayChange = vi.fn();
    render(
      <OverlaySelector activeOverlay="rank" onOverlayChange={onOverlayChange} />
    );

    fireEvent.click(screen.getByText('Volume'));
    expect(onOverlayChange).toHaveBeenCalledWith('volume24h');

    fireEvent.click(screen.getByText('Supply'));
    expect(onOverlayChange).toHaveBeenCalledWith('circulatingSupply');
  });
});
