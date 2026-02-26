'use client';

import { useState } from 'react';
import type { ReactionType } from '@prisma/client';
import type { ReactionCounts } from '@/types/comments';

interface ReactionBarProps {
  commentId: string;
  researchId: string;
  reactions: ReactionCounts;
  userReactions: ReactionType[];
}

const REACTION_DISPLAY: Record<ReactionType, { emoji: string; label: string }> = {
  UPVOTE: { emoji: '\u25B2', label: 'Upvote' },
  DOWNVOTE: { emoji: '\u25BC', label: 'Downvote' },
  FIRE: { emoji: '\uD83D\uDD25', label: 'Fire' },
  LIGHTBULB: { emoji: '\uD83D\uDCA1', label: 'Insightful' },
  THINKING: { emoji: '\uD83E\uDD14', label: 'Thinking' },
  HUNDRED: { emoji: '\uD83D\uDCAF', label: '100' },
};

const VOTE_TYPES: ReactionType[] = ['UPVOTE', 'DOWNVOTE'];
const EMOJI_TYPES: ReactionType[] = ['FIRE', 'LIGHTBULB', 'THINKING', 'HUNDRED'];

export default function ReactionBar({
  commentId,
  researchId,
  reactions: initialReactions,
  userReactions: initialUserReactions,
}: ReactionBarProps) {
  const [reactions, setReactions] = useState<ReactionCounts>(initialReactions);
  const [userReactions, setUserReactions] = useState<ReactionType[]>(initialUserReactions);
  const [pending, setPending] = useState(false);

  async function handleReaction(type: ReactionType) {
    if (pending) return;
    setPending(true);

    const wasActive = userReactions.includes(type);

    // Optimistic update
    setReactions((prev) => {
      const next = { ...prev };
      if (wasActive) {
        next[type] = Math.max(0, next[type] - 1);
      } else {
        next[type] = next[type] + 1;
        // Mutual exclusion for votes
        if (VOTE_TYPES.includes(type)) {
          const opposite: ReactionType = type === 'UPVOTE' ? 'DOWNVOTE' : 'UPVOTE';
          if (userReactions.includes(opposite)) {
            next[opposite] = Math.max(0, next[opposite] - 1);
          }
        }
      }
      return next;
    });

    setUserReactions((prev) => {
      let next = wasActive ? prev.filter((r) => r !== type) : [...prev, type];
      if (!wasActive && VOTE_TYPES.includes(type)) {
        const opposite: ReactionType = type === 'UPVOTE' ? 'DOWNVOTE' : 'UPVOTE';
        next = next.filter((r) => r !== opposite);
      }
      return next;
    });

    try {
      await fetch(
        `/api/research/${researchId}/comments/${commentId}/reactions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type }),
        }
      );
    } catch {
      // Revert on failure
      setReactions(initialReactions);
      setUserReactions(initialUserReactions);
    } finally {
      setPending(false);
    }
  }

  const voteScore = reactions.UPVOTE - reactions.DOWNVOTE;

  return (
    <div className="flex items-center gap-1">
      {/* Vote buttons */}
      <div className="flex items-center bg-gray-800 rounded-lg">
        <button
          onClick={() => handleReaction('UPVOTE')}
          className={`px-2 py-1 text-xs rounded-l-lg transition-colors ${
            userReactions.includes('UPVOTE')
              ? 'text-green-400 bg-green-900/30'
              : 'text-gray-400 hover:text-green-400'
          }`}
          aria-label="Upvote"
        >
          {REACTION_DISPLAY.UPVOTE.emoji}
        </button>
        <span className={`px-1 text-xs font-mono ${
          voteScore > 0 ? 'text-green-400' : voteScore < 0 ? 'text-red-400' : 'text-gray-500'
        }`}>
          {voteScore}
        </span>
        <button
          onClick={() => handleReaction('DOWNVOTE')}
          className={`px-2 py-1 text-xs rounded-r-lg transition-colors ${
            userReactions.includes('DOWNVOTE')
              ? 'text-red-400 bg-red-900/30'
              : 'text-gray-400 hover:text-red-400'
          }`}
          aria-label="Downvote"
        >
          {REACTION_DISPLAY.DOWNVOTE.emoji}
        </button>
      </div>

      {/* Emoji reactions */}
      {EMOJI_TYPES.map((type) => {
        const count = reactions[type];
        const isActive = userReactions.includes(type);
        if (count === 0 && !isActive) return null;
        return (
          <button
            key={type}
            onClick={() => handleReaction(type)}
            className={`px-2 py-1 text-xs rounded-lg transition-colors ${
              isActive
                ? 'bg-blue-900/30 text-blue-300'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            aria-label={REACTION_DISPLAY[type].label}
          >
            {REACTION_DISPLAY[type].emoji}{count > 0 ? ` ${count}` : ''}
          </button>
        );
      })}

      {/* Add reaction button */}
      <div className="relative group">
        <button
          className="px-2 py-1 text-xs text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
          aria-label="Add reaction"
        >
          +
        </button>
        <div className="absolute bottom-full left-0 mb-1 hidden group-hover:flex gap-1 bg-gray-900 border border-gray-700 rounded-lg p-1 z-10">
          {EMOJI_TYPES.filter((type) => !userReactions.includes(type) && reactions[type] === 0).map((type) => (
            <button
              key={type}
              onClick={() => handleReaction(type)}
              className="px-2 py-1 text-xs hover:bg-gray-700 rounded transition-colors"
              aria-label={REACTION_DISPLAY[type].label}
            >
              {REACTION_DISPLAY[type].emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
