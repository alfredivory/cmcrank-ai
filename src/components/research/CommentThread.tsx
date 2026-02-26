'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { CommentItem } from '@/types/comments';
import ReactionBar from './ReactionBar';
import CommentForm from './CommentForm';

interface CommentThreadProps {
  comment: CommentItem;
  researchId: string;
  researchVersion: number;
  currentUserId?: string;
  depth?: number;
  onCommentAdded: () => void;
  onCommentDeleted: (commentId: string) => void;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function CommentThread({
  comment,
  researchId,
  researchVersion,
  currentUserId,
  depth = 0,
  onCommentAdded,
  onCommentDeleted,
}: CommentThreadProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const canReply = depth < 2;
  const isAuthor = currentUserId === comment.author.id;

  async function handleDelete() {
    if (!confirm('Delete this comment?')) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/research/${researchId}/comments/${comment.id}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        onCommentDeleted(comment.id);
      }
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={`${depth > 0 ? 'ml-6 border-l border-gray-700 pl-4' : ''}`}>
      <div className="py-3">
        {/* Author line */}
        <div className="flex items-center gap-2 mb-2">
          {comment.author.image ? (
            <Image
              src={comment.author.image}
              alt={comment.author.name || 'User'}
              width={20}
              height={20}
              className="rounded-full"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-gray-600" />
          )}
          <span className="text-sm text-gray-300 font-medium">
            {comment.isDeleted ? 'Deleted' : (comment.author.name || 'Anonymous')}
          </span>
          <span className="px-1.5 py-0.5 text-[10px] bg-gray-700 text-gray-400 rounded font-mono">
            v{comment.researchVersion}
          </span>
          <span className="text-xs text-gray-500">{timeAgo(comment.createdAt)}</span>
        </div>

        {/* Cited text */}
        {comment.citedText && !comment.isDeleted && (
          <blockquote className="border-l-2 border-blue-500/50 pl-3 mb-2 text-sm text-gray-400 italic">
            {comment.citedText.length > 200
              ? comment.citedText.slice(0, 200) + '...'
              : comment.citedText}
          </blockquote>
        )}

        {/* Content */}
        <p className="text-sm text-gray-300 whitespace-pre-wrap mb-2">
          {comment.content}
        </p>

        {/* Actions */}
        {!comment.isDeleted && (
          <div className="flex items-center gap-3">
            <ReactionBar
              commentId={comment.id}
              researchId={researchId}
              reactions={comment.reactions}
              userReactions={comment.userReactions}
            />
            {canReply && currentUserId && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Reply
              </button>
            )}
            {isAuthor && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        )}

        {/* Reply form */}
        {showReplyForm && (
          <div className="mt-3">
            <CommentForm
              researchId={researchId}
              parentCommentId={comment.id}
              onSubmitted={() => {
                setShowReplyForm(false);
                onCommentAdded();
              }}
              onCancel={() => setShowReplyForm(false)}
              compact
            />
          </div>
        )}
      </div>

      {/* Nested replies */}
      {comment.replies.map((reply) => (
        <CommentThread
          key={reply.id}
          comment={reply}
          researchId={researchId}
          researchVersion={researchVersion}
          currentUserId={currentUserId}
          depth={depth + 1}
          onCommentAdded={onCommentAdded}
          onCommentDeleted={onCommentDeleted}
        />
      ))}
    </div>
  );
}
