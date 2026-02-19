import { formatDate } from '@/lib/format';

interface SiteFooterProps {
  latestSnapshotDate: Date | null;
}

export default function SiteFooter({ latestSnapshotDate }: SiteFooterProps) {
  return (
    <footer className="mt-12 border-t border-gray-700 pt-6 pb-4 text-center text-gray-500 text-sm space-y-2">
      {latestSnapshotDate && (
        <p>
          Data as of {formatDate(latestSnapshotDate)}
        </p>
      )}
      <p>
        Prices and market data reflect daily snapshots and are not real-time.
        Not affiliated with CoinMarketCap.
      </p>
      <p>
        <a
          href="https://github.com/alfredivory/cmcrank-ai"
          className="text-blue-400 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </p>
    </footer>
  );
}
