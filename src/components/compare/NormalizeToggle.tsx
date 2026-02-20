'use client';

interface NormalizeToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export default function NormalizeToggle({ enabled, onToggle }: NormalizeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        enabled
          ? 'bg-blue-500 text-white'
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
    >
      Normalize
    </button>
  );
}
