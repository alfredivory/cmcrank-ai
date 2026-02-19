'use client';

import { useState } from 'react';
import RankChart from '@/components/charts/RankChart';
import ResearchTrigger from './ResearchTrigger';
import ResearchList from './ResearchList';
import type { SnapshotDataPoint, SnapshotTimeRange, ChartOverlay, ResearchListItem } from '@/types/api';

interface TokenResearchSectionProps {
  tokenId: string;
  slug: string;
  tokenName: string;
  initialSnapshots: SnapshotDataPoint[];
  initialRange: SnapshotTimeRange | 'custom';
  initialOverlay?: ChartOverlay;
  researchItems: ResearchListItem[];
}

export default function TokenResearchSection({
  tokenId,
  slug,
  tokenName,
  initialSnapshots,
  initialRange,
  initialOverlay,
  researchItems,
}: TokenResearchSectionProps) {
  const [selectedStart, setSelectedStart] = useState<string | undefined>();
  const [selectedEnd, setSelectedEnd] = useState<string | undefined>();

  const handleRangeSelect = (start: string, end: string) => {
    setSelectedStart(start);
    setSelectedEnd(end);
  };

  return (
    <>
      {/* Rank Chart */}
      <div className="mt-6">
        <RankChart
          tokenId={tokenId}
          slug={slug}
          initialSnapshots={initialSnapshots}
          initialRange={initialRange}
          initialOverlay={initialOverlay}
          onRangeSelect={handleRangeSelect}
        />
      </div>

      {/* Research Trigger */}
      <div className="mt-4">
        <ResearchTrigger
          tokenId={tokenId}
          slug={slug}
          tokenName={tokenName}
          selectedStart={selectedStart}
          selectedEnd={selectedEnd}
        />
      </div>

      {/* Research List */}
      <div className="mt-4">
        <ResearchList items={researchItems} />
      </div>
    </>
  );
}
