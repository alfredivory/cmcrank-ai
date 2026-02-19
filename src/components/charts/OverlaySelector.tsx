'use client';

import type { ChartOverlay } from '@/types/api';

interface OverlaySelectorProps {
  activeOverlay: ChartOverlay;
  onOverlayChange: (overlay: ChartOverlay) => void;
}

const OVERLAYS: { label: string; value: ChartOverlay }[] = [
  { label: 'Rank', value: 'rank' },
  { label: 'Market Cap', value: 'marketCap' },
  { label: 'Price', value: 'price' },
  { label: 'Volume', value: 'volume24h' },
  { label: 'Supply', value: 'circulatingSupply' },
];

export default function OverlaySelector({ activeOverlay, onOverlayChange }: OverlaySelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {OVERLAYS.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => onOverlayChange(value)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            activeOverlay === value
              ? 'bg-blue-500 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
