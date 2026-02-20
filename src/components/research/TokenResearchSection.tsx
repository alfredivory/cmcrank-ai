'use client';

import { useState, useMemo } from 'react';
import RankChart from '@/components/charts/RankChart';
import ResearchTrigger from './ResearchTrigger';
import ResearchList from './ResearchList';
import type { SnapshotDataPoint, SnapshotTimeRange, ChartOverlay, ResearchListItem, TokenSearchResult } from '@/types/api';

interface TokenResearchSectionProps {
  tokenId: string;
  slug: string;
  tokenName: string;
  initialSnapshots: SnapshotDataPoint[];
  initialRange: SnapshotTimeRange | 'custom';
  initialOverlay?: ChartOverlay;
  researchItems: ResearchListItem[];
  mainToken: TokenSearchResult;
  initialCompareTokens?: TokenSearchResult[];
  initialCompareSnapshots?: [string, SnapshotDataPoint[]][];
}

export default function TokenResearchSection({
  tokenId,
  slug,
  tokenName,
  initialSnapshots,
  initialRange,
  initialOverlay,
  researchItems,
  mainToken,
  initialCompareTokens,
  initialCompareSnapshots,
}: TokenResearchSectionProps) {
  const [selectedStart, setSelectedStart] = useState<string | undefined>();
  const [selectedEnd, setSelectedEnd] = useState<string | undefined>();

  const handleRangeSelect = (start: string, end: string) => {
    setSelectedStart(start);
    setSelectedEnd(end);
  };

  const researchPeriods = useMemo(
    () => researchItems
      .filter(item => item.status === 'COMPLETE')
      .map(item => ({
        id: item.id,
        title: item.title,
        dateRangeStart: item.dateRangeStart,
        dateRangeEnd: item.dateRangeEnd,
        importanceScore: item.importanceScore,
      })),
    [researchItems]
  );

  // Compare token names for research hint (derived from initialCompareTokens)
  const compareTokenNames = useMemo(
    () => (initialCompareTokens ?? []).map(t => t.name),
    [initialCompareTokens]
  );

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
          researchPeriods={researchPeriods}
          mainToken={mainToken}
          initialCompareTokens={initialCompareTokens}
          initialCompareSnapshots={initialCompareSnapshots}
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
          compareTokenNames={compareTokenNames}
        />
      </div>

      {/* Research List */}
      <div className="mt-4">
        <ResearchList items={researchItems} />
      </div>
    </>
  );
}
