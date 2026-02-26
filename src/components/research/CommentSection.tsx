'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type { CommentItem } from '@/types/comments';
import CommentThread from './CommentThread';
import CommentForm from './CommentForm';
import AuthGuard from '../auth/AuthGuard';

interface CommentSectionProps {
  researchId: string;
  researchVersion: number;
  citedText?: string;
  onClearCitation?: () => void;
}

export default function CommentSection({
  researchId,
  researchVersion,
  citedText,
  onClearCitation,
}: CommentSectionProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/research/${researchId}/comments`);
      if (res.ok) {
        const body = await res.json();
        setComments(body.data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [researchId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  function handleCommentDeleted(commentId: string) {
    // Optimistically mark as deleted in local state
    const markDeleted = (items: CommentItem[]): CommentItem[] =>
      items.map((item) => {
        if (item.id === commentId) {
          return { ...item, isDeleted: true, content: '[deleted]', citedText: null };
        }
        return { ...item, replies: markDeleted(item.replies) };
      });
    setComments(markDeleted);
  }

  const totalCount = comments.reduce(
    (acc, c) => acc + 1 + c.replies.length,
    0
  );

  return (
    <div id="comments" className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        Comments{totalCount > 0 ? ` (${totalCount})` : ''}
      </h3>

      {/* Comment form — requires auth + allowlist */}
      <div className="mb-6">
        <AuthGuard action="comment on research" requireAllowlist>
          <CommentForm
            researchId={researchId}
            citedText={citedText}
            onClearCitation={onClearCitation}
            onSubmitted={fetchComments}
          />
        </AuthGuard>
      </div>

      {/* Comment list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          No comments yet. Be the first to share your thoughts.
        </p>
      ) : (
        <div className="divide-y divide-gray-700/50">
          {comments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              researchId={researchId}
              researchVersion={researchVersion}
              currentUserId={session?.user?.id}
              onCommentAdded={fetchComments}
              onCommentDeleted={handleCommentDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}
