'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface ResearchFeedbackProps {
  researchId: string;
}

type FeedbackRating = 'THUMBS_UP' | 'THUMBS_DOWN';

export default function ResearchFeedback({ researchId }: ResearchFeedbackProps) {
  const { data: session } = useSession();
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [comment, setComment] = useState('');
  const [showComment, setShowComment] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load existing feedback
  useEffect(() => {
    if (!session?.user) return;
    fetch(`/api/research/${researchId}/feedback`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.data) {
          setRating(body.data.rating);
          setComment(body.data.comment || '');
          setSubmitted(true);
        }
      })
      .catch(() => {});
  }, [researchId, session?.user]);

  if (!session?.user) return null;

  const handleRate = async (newRating: FeedbackRating) => {
    setRating(newRating);
    setShowComment(true);
  };

  const handleSubmit = async () => {
    if (!rating) return;
    setLoading(true);

    try {
      const response = await fetch(`/api/research/${researchId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      });

      if (response.ok) {
        setSubmitted(true);
        setShowComment(false);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (submitted && !showComment) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-center">
        <p className="text-sm text-gray-400">Thanks for your feedback!</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <p className="text-sm text-gray-300 mb-3">Was this research helpful?</p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleRate('THUMBS_UP')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            rating === 'THUMBS_UP'
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          aria-label="Thumbs up"
        >
          👍 Helpful
        </button>
        <button
          onClick={() => handleRate('THUMBS_DOWN')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            rating === 'THUMBS_DOWN'
              ? 'bg-red-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          aria-label="Thumbs down"
        >
          👎 Not helpful
        </button>
      </div>

      {showComment && (
        <div className="mt-3 space-y-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What could be improved?"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-sm text-gray-300 placeholder-gray-600 resize-none focus:outline-none focus:border-blue-500"
            rows={2}
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white text-sm rounded-lg transition-colors"
          >
            {loading ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      )}
    </div>
  );
}
