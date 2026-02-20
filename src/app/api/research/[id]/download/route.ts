export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createRequestLogger } from '@/lib/logger';
import { getResearchById } from '@/lib/queries/research';
import { generateResearchPdf } from '@/lib/pdf/research';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const logger = createRequestLogger(request, 'api');
  const startTime = Date.now();
  const { id } = await params;

  try {
    const research = await getResearchById(id);

    if (!research || research.status !== 'COMPLETE') {
      logger.warn('research.download.not_found', {
        metadata: { id, status: research?.status ?? null },
      });
      return NextResponse.json({ error: 'Research not found' }, { status: 404 });
    }

    const pdfInput = {
      id: research.id,
      title: research.title,
      dateRangeStart: research.dateRangeStart.toISOString().split('T')[0],
      dateRangeEnd: research.dateRangeEnd.toISOString().split('T')[0],
      importanceScore: research.importanceScore,
      content: research.content,
      renderedMarkdown: research.renderedMarkdown,
      token: {
        name: research.token.name,
        symbol: research.token.symbol,
        slug: research.token.slug,
        logoUrl: research.token.logoUrl,
      },
    };

    const pdfBuffer = await generateResearchPdf(pdfInput);

    const filename = `${research.token.slug}-research-${pdfInput.dateRangeStart}-to-${pdfInput.dateRangeEnd}.pdf`;

    logger.info('research.download', {
      durationMs: Date.now() - startTime,
      metadata: { id, filename, sizeBytes: pdfBuffer.length },
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (error) {
    logger.error('research.download.failed', error as Error, {
      durationMs: Date.now() - startTime,
      metadata: { id },
    });
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
