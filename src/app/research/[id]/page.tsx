export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import ResearchDocument from '@/components/research/ResearchDocument';
import ResearchFeedback from '@/components/research/ResearchFeedback';
import { getResearchById } from '@/lib/queries/research';
import { getLatestSnapshotDate } from '@/lib/queries/tokens';
import type { ResearchDetail } from '@/types/api';

interface ResearchPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ResearchPageProps): Promise<Metadata> {
  const { id } = await params;
  const research = await getResearchById(id);

  if (!research) {
    return { title: 'Research Not Found — CMCRank.ai' };
  }

  const startStr = research.dateRangeStart.toISOString().split('T')[0];
  const endStr = research.dateRangeEnd.toISOString().split('T')[0];

  const titleText = research.title ?? `${startStr} to ${endStr}`;

  return {
    title: `${titleText} — ${research.token.name} Research — CMCRank.ai`,
    description: `AI-powered research investigation for ${research.token.name} covering ${startStr} to ${endStr}.`,
  };
}

export default async function ResearchPage({ params }: ResearchPageProps) {
  const { id } = await params;
  const [research, latestSnapshotDate] = await Promise.all([
    getResearchById(id),
    getLatestSnapshotDate(),
  ]);

  if (!research) {
    notFound();
  }

  // Serialize for client components
  const serializedResearch: ResearchDetail = {
    id: research.id,
    title: research.title,
    tokenId: research.tokenId,
    dateRangeStart: research.dateRangeStart.toISOString().split('T')[0],
    dateRangeEnd: research.dateRangeEnd.toISOString().split('T')[0],
    status: research.status,
    content: research.content,
    renderedMarkdown: research.renderedMarkdown,
    importanceScore: research.importanceScore,
    userContext: research.userContext,
    parentResearchId: research.parentResearchId,
    createdAt: research.createdAt.toISOString(),
    updatedAt: research.updatedAt.toISOString(),
    token: research.token,
    events: research.events.map((ev) => ({
      ...ev,
      eventDate: ev.eventDate.toISOString().split('T')[0],
    })),
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <SiteHeader />

        <ResearchDocument research={serializedResearch} />

        {research.status === 'COMPLETE' && (
          <div className="mt-6 max-w-4xl mx-auto">
            <ResearchFeedback researchId={research.id} />
          </div>
        )}

        <SiteFooter latestSnapshotDate={latestSnapshotDate} />
      </div>
    </main>
  );
}
