'use client';

import { useState } from 'react';
import type { SnapshotTimeRange } from '@/types/api';

interface TimeRangeSelectorProps {
  activeRange: SnapshotTimeRange | 'custom';
  onRangeChange: (range: SnapshotTimeRange) => void;
  onCustomRange: (start: string, end: string) => void;
}

const PRESET_RANGES: { label: string; value: SnapshotTimeRange }[] = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' },
  { label: '1Y', value: '1y' },
  { label: 'All', value: 'all' },
];

export default function TimeRangeSelector({
  activeRange,
  onRangeChange,
  onCustomRange,
}: TimeRangeSelectorProps) {
  const [showCustom, setShowCustom] = useState(activeRange === 'custom');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  function handlePresetClick(range: SnapshotTimeRange) {
    setShowCustom(false);
    onRangeChange(range);
  }

  function handleCustomClick() {
    setShowCustom(true);
  }

  function handleApply() {
    if (startDate && endDate) {
      onCustomRange(startDate, endDate);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESET_RANGES.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => handlePresetClick(value)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            activeRange === value && !showCustom
              ? 'bg-blue-500 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {label}
        </button>
      ))}
      <button
        onClick={handleCustomClick}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          showCustom
            ? 'bg-blue-500 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        Custom
      </button>
      {showCustom && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-gray-700 text-white text-sm rounded-lg px-2 py-1.5 border border-gray-600"
            aria-label="Start date"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-gray-700 text-white text-sm rounded-lg px-2 py-1.5 border border-gray-600"
            aria-label="End date"
          />
          <button
            onClick={handleApply}
            disabled={!startDate || !endDate}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
