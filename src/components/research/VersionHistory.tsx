'use client';

import Link from 'next/link';

interface VersionHistoryProps {
  currentVersion: number;
  parentResearchId: string | null;
  researchId: string;
}

export default function VersionHistory({
  currentVersion,
  parentResearchId,
}: VersionHistoryProps) {
  if (currentVersion <= 1 && !parentResearchId) return null;

  return (
    <div className="flex items-center gap-1 text-xs text-gray-500">
      {parentResearchId && (
        <>
          <Link
            href={`/research/${parentResearchId}`}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            v{currentVersion - 1}
          </Link>
          <span>&rarr;</span>
        </>
      )}
      <span className="text-gray-300 font-medium">v{currentVersion} (current)</span>
    </div>
  );
}
