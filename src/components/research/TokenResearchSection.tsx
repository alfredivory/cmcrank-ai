'use client';

import { useState, useMemo, useCallback } from 'react';
import RankChart from '@/components/charts/RankChart';
import ResearchTrigger from './ResearchTrigger';
import ResearchProgress from './ResearchProgress';
import type { SnapshotDataPoint, SnapshotTimeRange, ChartOverlay, TokenSearchResult } from '@/types/api';
import type { ResearchPeriod } from '@/components/charts/ResearchBandTooltip';

interface TokenResearchSectionProps {
  tokenId: string;
  slug: string;
  tokenName: string;
  initialSnapshots: SnapshotDataPoint[];
  initialRange: SnapshotTimeRange | 'custom';
  initialOverlay?: ChartOverlay;
  researchPeriods: ResearchPeriod[];
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
  researchPeriods,
  mainToken,
  initialCompareTokens,
  initialCompareSnapshots,
}: TokenResearchSectionProps) {
  const [selectedStart, setSelectedStart] = useState<string | undefined>();
  const [selectedEnd, setSelectedEnd] = useState<string | undefined>();
  const [activeResearchId, setActiveResearchId] = useState<string | null>(null);

  const handleRangeSelect = (start: string, end: string) => {
    setSelectedStart(start);
    setSelectedEnd(end);
  };

  const handleClose = useCallback(() => {
    setSelectedStart(undefined);
    setSelectedEnd(undefined);
  }, []);

  const handleResearchStarted = useCallback((researchId: string) => {
    setActiveResearchId(researchId);
  }, []);

  const compareTokenNames = useMemo(
    () => (initialCompareTokens ?? []).map(t => t.name),
    [initialCompareTokens]
  );

  return (
    <>
      {/* Subtle research hint */}
      <p className="text-xs text-gray-600 mt-4 mb-1">
        Select a period on the chart to start AI-powered research
      </p>

      {/* Rank Chart */}
      <div>
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

      {/* Inline research progress (shown after trigger succeeds) */}
      {activeResearchId && (
        <div className="mt-3">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <ResearchProgress researchId={activeResearchId} />
          </div>
        </div>
      )}

      {/* Research Trigger Modal */}
      <ResearchTrigger
        tokenId={tokenId}
        slug={slug}
        tokenName={tokenName}
        selectedStart={selectedStart}
        selectedEnd={selectedEnd}
        compareTokenNames={compareTokenNames}
        onClose={handleClose}
        onResearchStarted={handleResearchStarted}
      />
    </>
  );
}
