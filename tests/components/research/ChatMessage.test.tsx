import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import ChatMessage from '@/components/research/ChatMessage';

describe('ChatMessage', () => {
  it('renders user message with blue background', () => {
    const { container } = render(
      <ChatMessage role="USER" content="Hello world" />
    );
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    const bubble = container.querySelector('.bg-blue-600');
    expect(bubble).not.toBeNull();
  });

  it('renders assistant message with gray background', () => {
    const { container } = render(
      <ChatMessage role="ASSISTANT" content="Here is my analysis." />
    );
    const bubble = container.querySelector('.bg-gray-700');
    expect(bubble).not.toBeNull();
  });

  it('renders user messages right-aligned', () => {
    const { container } = render(
      <ChatMessage role="USER" content="Test" />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('justify-end');
  });

  it('renders assistant messages left-aligned', () => {
    const { container } = render(
      <ChatMessage role="ASSISTANT" content="Test" />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('justify-start');
  });

  it('renders markdown in assistant messages', () => {
    const { container } = render(
      <ChatMessage role="ASSISTANT" content="This is **bold** text" />
    );
    const strong = container.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe('bold');
  });

  it('shows re-research suggestion when flagged', () => {
    render(
      <ChatMessage
        role="ASSISTANT"
        content="Gaps found."
        suggestsReresearch={true}
        onReresearchClick={vi.fn()}
      />
    );
    expect(screen.getByText(/suggests a re-research/)).toBeInTheDocument();
  });

  it('does not show re-research button when not flagged', () => {
    render(
      <ChatMessage role="ASSISTANT" content="All good." />
    );
    expect(screen.queryByText(/suggests a re-research/)).toBeNull();
  });
});
