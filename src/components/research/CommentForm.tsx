'use client';

import { useState } from 'react';

interface CommentFormProps {
  researchId: string;
  parentCommentId?: string;
  citedText?: string;
  onSubmitted: () => void;
  onCancel?: () => void;
  onClearCitation?: () => void;
  compact?: boolean;
}

export default function CommentForm({
  researchId,
  parentCommentId,
  citedText,
  onSubmitted,
  onCancel,
  onClearCitation,
  compact = false,
}: CommentFormProps) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/research/${researchId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          citedText: citedText || undefined,
          parentCommentId,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error || 'Failed to post comment');
        return;
      }

      setContent('');
      onSubmitted();
    } catch {
      setError('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {citedText && (
        <div className="relative">
          <blockquote className="border-l-2 border-blue-500/50 pl-3 pr-8 py-1 text-sm text-gray-400 italic bg-gray-800/30 rounded-r">
            {citedText.length > 200 ? citedText.slice(0, 200) + '...' : citedText}
          </blockquote>
          {onClearCitation && (
            <button
              type="button"
              onClick={onClearCitation}
              className="absolute top-1 right-2 text-gray-500 hover:text-gray-300 text-xs"
              aria-label="Remove citation"
            >
              x
            </button>
          )}
        </div>
      )}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={parentCommentId ? 'Write a reply...' : 'Add a comment...'}
        className={`w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-gray-300 placeholder-gray-600 resize-none focus:outline-none focus:border-blue-500 ${
          compact ? 'min-h-[60px]' : 'min-h-[80px]'
        }`}
        maxLength={5000}
        rows={compact ? 2 : 3}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors"
        >
          {submitting ? 'Posting...' : parentCommentId ? 'Reply' : 'Comment'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 text-gray-400 hover:text-gray-300 text-sm transition-colors"
          >
            Cancel
          </button>
        )}
        <span className="text-xs text-gray-600 ml-auto">
          {content.length}/5000
        </span>
      </div>
    </form>
  );
}
