import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CategoryTags from '@/components/tokens/CategoryTags';

describe('CategoryTags', () => {
  it('renders nothing when categories is empty', () => {
    const { container } = render(<CategoryTags categories={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders all categories when 3 or fewer', () => {
    render(<CategoryTags categories={['DeFi', 'Layer 1', 'Smart Contracts']} />);

    expect(screen.getByText('DeFi')).toBeInTheDocument();
    expect(screen.getByText('Layer 1')).toBeInTheDocument();
    expect(screen.getByText('Smart Contracts')).toBeInTheDocument();
    expect(screen.queryByText(/more/)).not.toBeInTheDocument();
  });

  it('shows first 3 and "+N more" when more than 3', () => {
    render(
      <CategoryTags categories={['DeFi', 'Layer 1', 'Smart Contracts', 'Governance', 'Staking']} />
    );

    expect(screen.getByText('DeFi')).toBeInTheDocument();
    expect(screen.getByText('Layer 1')).toBeInTheDocument();
    expect(screen.getByText('Smart Contracts')).toBeInTheDocument();
    expect(screen.queryByText('Governance')).not.toBeInTheDocument();
    expect(screen.queryByText('Staking')).not.toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('expands to show all categories on click', () => {
    render(
      <CategoryTags categories={['DeFi', 'Layer 1', 'Smart Contracts', 'Governance', 'Staking']} />
    );

    fireEvent.click(screen.getByText('+2 more'));

    expect(screen.getByText('Governance')).toBeInTheDocument();
    expect(screen.getByText('Staking')).toBeInTheDocument();
    expect(screen.getByText('Show less')).toBeInTheDocument();
  });

  it('collapses back when "Show less" is clicked', () => {
    render(
      <CategoryTags categories={['DeFi', 'Layer 1', 'Smart Contracts', 'Governance', 'Staking']} />
    );

    fireEvent.click(screen.getByText('+2 more'));
    fireEvent.click(screen.getByText('Show less'));

    expect(screen.queryByText('Governance')).not.toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });
});
