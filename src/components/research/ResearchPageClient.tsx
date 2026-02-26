'use client';

import { useState, useRef } from 'react';
import type { ResearchDetail } from '@/types/api';
import type { RankMovement } from '@/lib/chart-utils';
import ResearchDocument from './ResearchDocument';
import ResearchFeedback from './ResearchFeedback';
import CommentSection from './CommentSection';
import ChatPanel from './ChatPanel';
import ChatToggleButton from './ChatToggleButton';

interface ResearchPageClientProps {
  research: ResearchDetail;
  movement: RankMovement;
}

export default function ResearchPageClient({ research, movement }: ResearchPageClientProps) {
  const [citedText, setCitedText] = useState<string | undefined>();
  const [chatOpen, setChatOpen] = useState(false);
  const commentSectionRef = useRef<HTMLDivElement>(null);

  function handleCiteText(text: string) {
    setCitedText(text);
    commentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <>
      <ResearchDocument
        research={research}
        movement={movement}
        onCiteText={research.status === 'COMPLETE' ? handleCiteText : undefined}
      />

      {research.status === 'COMPLETE' && (
        <>
          <div className="mt-6 max-w-4xl mx-auto">
            <ResearchFeedback researchId={research.id} />
          </div>
          <div ref={commentSectionRef} className="mt-6 max-w-4xl mx-auto">
            <CommentSection
              researchId={research.id}
              researchVersion={research.version}
              citedText={citedText}
              onClearCitation={() => setCitedText(undefined)}
            />
          </div>

          <ChatToggleButton
            isOpen={chatOpen}
            onClick={() => setChatOpen(true)}
          />
          <ChatPanel
            researchId={research.id}
            isOpen={chatOpen}
            onClose={() => setChatOpen(false)}
          />
        </>
      )}
    </>
  );
}
