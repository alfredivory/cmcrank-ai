'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ResearchDetail } from '@/types/api';
import type { RankMovement } from '@/lib/chart-utils';

interface ResearchDocumentProps {
  research: ResearchDetail;
  movement?: RankMovement;
}

const MOVEMENT_ACCENT: Record<RankMovement, { border: string; title: string }> = {
  positive: { border: 'border-l-green-500', title: 'text-green-300' },
  negative: { border: 'border-l-red-500', title: 'text-red-300' },
  neutral:  { border: 'border-l-yellow-500', title: 'text-yellow-300' },
};

interface ResearchContent {
  executiveSummary: string;
  findings: { title: string; content: string }[];
  sources: { url: string; title: string; domain: string }[];
}

function getImportanceColor(score: number): string {
  if (score >= 81) return 'text-red-400';
  if (score >= 61) return 'text-orange-400';
  if (score >= 31) return 'text-yellow-400';
  return 'text-gray-400';
}

export default function ResearchDocument({ research, movement }: ResearchDocumentProps) {
  const router = useRouter();
  const content = research.content as ResearchContent | null;
  const accent = movement ? MOVEMENT_ACCENT[movement] : null;
  const [copied, setCopied] = useState(false);
  const isComplete = research.status === 'COMPLETE';

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.back()}
          className="mt-6 text-gray-400 hover:text-blue-400 transition-colors text-lg leading-none shrink-0"
          aria-label="Go back"
        >
          &larr;
        </button>
        <div className={`flex-1 bg-gray-800/50 border border-gray-700 rounded-xl p-6${accent ? ` border-l-4 ${accent.border}` : ''}`}>
        <div className="flex items-center gap-3 mb-3">
          {research.token.logoUrl && (
            <Image
              src={research.token.logoUrl}
              alt={research.token.name}
              width={32}
              height={32}
              className="rounded-full"
            />
          )}
          <div>
            <h1 className={`text-xl font-semibold ${accent ? accent.title : 'text-white'}`}>
              {research.token.name} ({research.token.symbol})
            </h1>
            <p className="text-sm text-gray-400">
              Research: {research.dateRangeStart} to {research.dateRangeEnd}
            </p>
          </div>
        </div>
        {research.title && (
          <p className={`text-lg font-medium mb-3 ${accent ? accent.title : 'text-gray-200'}`}>
            {research.title}
          </p>
        )}
        <div className="flex items-center gap-4 text-sm">
          <Link
            href={`/token/${research.token.slug}`}
            className="text-blue-400 hover:text-blue-300"
          >
            View Token Chart
          </Link>
          <span className={`${getImportanceColor(research.importanceScore)}`}>
            Importance: {research.importanceScore}/100
          </span>
        </div>
        {isComplete && (
          <div className="flex items-center gap-2 mt-3">
            <a
              href={`/api/research/${research.id}/download`}
              download
              className="bg-gray-700 text-gray-300 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-sm"
            >
              Download PDF
            </a>
            <button
              onClick={handleCopyLink}
              className="bg-gray-700 text-gray-300 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-sm"
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        )}
        </div>
      </div>

      {/* Content */}
      {content && (
        <>
          {/* Executive Summary */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">Executive Summary</h2>
            <p className="text-gray-300 leading-relaxed">{content.executiveSummary}</p>
          </div>

          {/* Findings */}
          {content.findings.map((finding, index) => (
            <div key={index} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-3">{finding.title}</h2>
              <div
                className="text-gray-300 leading-relaxed prose prose-invert prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(finding.content) }}
              />
            </div>
          ))}

          {/* Sources */}
          {content.sources.length > 0 && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-3">Sources</h2>
              <div className="space-y-2">
                {content.sources.map((source, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-400">
                      {source.domain}
                    </span>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300 truncate"
                    >
                      {source.title}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!content && research.status === 'COMPLETE' && research.renderedMarkdown && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <div
            className="text-gray-300 prose prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(research.renderedMarkdown) }}
          />
        </div>
      )}

      {research.status === 'FAILED' && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-6 text-center">
          <p className="text-red-400">This research investigation failed. Please try again.</p>
        </div>
      )}

      {(research.status === 'PENDING' || research.status === 'RUNNING') && (
        <div className="bg-blue-900/30 border border-blue-700/50 rounded-xl p-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-blue-300">Research is in progress...</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Simple markdown to HTML renderer for research findings.
 * Handles bold, links, and bullet points.
 */
function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300">$1</a>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*<\/li>)/g, '<ul class="list-disc list-inside space-y-1">$1</ul>')
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/\n/g, '<br>');
}
