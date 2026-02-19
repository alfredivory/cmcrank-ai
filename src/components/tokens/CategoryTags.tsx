'use client';

import { useState } from 'react';

const VISIBLE_COUNT = 3;

interface CategoryTagsProps {
  categories: string[];
}

export default function CategoryTags({ categories }: CategoryTagsProps) {
  const [expanded, setExpanded] = useState(false);

  if (categories.length === 0) return null;

  const hasOverflow = categories.length > VISIBLE_COUNT;
  const visible = expanded ? categories : categories.slice(0, VISIBLE_COUNT);
  const hiddenCount = categories.length - VISIBLE_COUNT;

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((category) => (
        <span
          key={category}
          className="bg-gray-700/50 text-gray-300 px-3 py-1 rounded-full text-xs"
        >
          {category}
        </span>
      ))}
      {hasOverflow && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="bg-gray-700/50 text-blue-400 px-3 py-1 rounded-full text-xs hover:bg-gray-600/50 transition-colors"
        >
          +{hiddenCount} more
        </button>
      )}
      {hasOverflow && expanded && (
        <button
          onClick={() => setExpanded(false)}
          className="bg-gray-700/50 text-blue-400 px-3 py-1 rounded-full text-xs hover:bg-gray-600/50 transition-colors"
        >
          Show less
        </button>
      )}
    </div>
  );
}
