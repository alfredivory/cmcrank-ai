import PDFDocument from 'pdfkit';

interface ResearchContent {
  executiveSummary: string;
  findings: { title: string; content: string }[];
  sources: { url: string; title: string; domain: string }[];
}

interface PdfResearchInput {
  id: string;
  title: string | null;
  dateRangeStart: string;
  dateRangeEnd: string;
  importanceScore: number;
  content: unknown;
  renderedMarkdown: string | null;
  token: {
    name: string;
    symbol: string;
    slug: string;
    logoUrl: string | null;
  };
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/^- /gm, '• ');
}

function isResearchContent(value: unknown): value is ResearchContent {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.executiveSummary === 'string' &&
    Array.isArray(obj.findings) &&
    Array.isArray(obj.sources)
  );
}

async function fetchLogoBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

export async function generateResearchPdf(research: PdfResearchInput): Promise<Buffer> {
  const content = isResearchContent(research.content) ? research.content : null;

  let logoBuffer: Buffer | null = null;
  if (research.token.logoUrl) {
    logoBuffer = await fetchLogoBuffer(research.token.logoUrl);
  }

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: research.title || `${research.token.name} Research`,
        Author: 'CMCRank.ai',
        Subject: `Research report for ${research.token.name} (${research.token.symbol})`,
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // --- Header ---
    let headerX = doc.page.margins.left;

    if (logoBuffer) {
      try {
        doc.image(logoBuffer, headerX, doc.y, { width: 28, height: 28 });
        headerX += 36;
      } catch {
        // Logo decode failed — continue without it
      }
    }

    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .fillColor('#111827')
      .text(`${research.token.name} (${research.token.symbol})`, headerX, doc.y, {
        width: pageWidth - (headerX - doc.page.margins.left),
      });

    doc.moveDown(0.3);

    if (research.title) {
      doc
        .font('Helvetica')
        .fontSize(14)
        .fillColor('#374151')
        .text(research.title, doc.page.margins.left, doc.y, { width: pageWidth });
      doc.moveDown(0.3);
    }

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#6B7280')
      .text(
        `Period: ${research.dateRangeStart} to ${research.dateRangeEnd}  |  Importance: ${research.importanceScore}/100`,
        doc.page.margins.left,
        doc.y,
        { width: pageWidth }
      );

    doc.moveDown(0.5);
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.margins.left + pageWidth, doc.y)
      .strokeColor('#D1D5DB')
      .stroke();
    doc.moveDown(1);

    if (content) {
      // --- Executive Summary ---
      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .fillColor('#111827')
        .text('Executive Summary', doc.page.margins.left, doc.y, { width: pageWidth });
      doc.moveDown(0.4);
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#374151')
        .text(stripMarkdown(content.executiveSummary), doc.page.margins.left, doc.y, {
          width: pageWidth,
          lineGap: 3,
        });
      doc.moveDown(1);

      // --- Findings ---
      for (const finding of content.findings) {
        doc
          .font('Helvetica-Bold')
          .fontSize(12)
          .fillColor('#111827')
          .text(finding.title, doc.page.margins.left, doc.y, { width: pageWidth });
        doc.moveDown(0.3);
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor('#374151')
          .text(stripMarkdown(finding.content), doc.page.margins.left, doc.y, {
            width: pageWidth,
            lineGap: 3,
          });
        doc.moveDown(0.8);
      }

      // --- Sources ---
      if (content.sources.length > 0) {
        doc.moveDown(0.5);
        doc
          .font('Helvetica-Bold')
          .fontSize(14)
          .fillColor('#111827')
          .text('Sources', doc.page.margins.left, doc.y, { width: pageWidth });
        doc.moveDown(0.4);

        for (let i = 0; i < content.sources.length; i++) {
          const source = content.sources[i];
          doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor('#374151')
            .text(`${i + 1}. ${source.title}`, doc.page.margins.left, doc.y, {
              width: pageWidth,
              continued: true,
            })
            .fillColor('#6B7280')
            .text(` — ${source.url}`, { link: source.url });
          doc.moveDown(0.2);
        }
      }
    } else if (research.renderedMarkdown) {
      // Fallback: plain text from rendered markdown
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#374151')
        .text(stripMarkdown(research.renderedMarkdown), doc.page.margins.left, doc.y, {
          width: pageWidth,
          lineGap: 3,
        });
    }

    // --- Footer ---
    doc.moveDown(2);
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.margins.left + pageWidth, doc.y)
      .strokeColor('#D1D5DB')
      .stroke();
    doc.moveDown(0.5);
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#9CA3AF')
      .text(
        `Generated by CMCRank.ai on ${new Date().toISOString().split('T')[0]}`,
        doc.page.margins.left,
        doc.y,
        { width: pageWidth, align: 'center' }
      );

    doc.end();
  });
}
