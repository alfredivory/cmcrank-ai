'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ResearchDetail } from '@/types/api';

interface ResearchDocumentProps {
  research: ResearchDetail;
}

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

export default function ResearchDocument({ research }: ResearchDocumentProps) {
  const content = research.content as ResearchContent | null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
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
            <h1 className="text-xl font-semibold text-white">
              {research.token.name} ({research.token.symbol})
            </h1>
            <p className="text-sm text-gray-400">
              Research: {research.dateRangeStart} to {research.dateRangeEnd}
            </p>
          </div>
        </div>
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
