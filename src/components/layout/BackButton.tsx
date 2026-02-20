'use client';

import { useRouter } from 'next/navigation';

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center text-gray-400 hover:text-blue-400 transition-colors mb-6"
    >
      &larr; Back
    </button>
  );
}
