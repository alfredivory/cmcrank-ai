'use client';

import { useState } from 'react';

type RequestStatus = 'idle' | 'loading' | 'submitted' | 'already-pending' | 'already-allowlisted' | 'error';

export default function RequestAccessButton() {
  const [status, setStatus] = useState<RequestStatus>('idle');

  async function handleRequest() {
    setStatus('loading');
    try {
      const res = await fetch('/api/auth/access-request', { method: 'POST' });
      const body = await res.json();

      if (res.ok) {
        setStatus('submitted');
      } else if (res.status === 409) {
        setStatus(body.error === 'Already allowlisted' ? 'already-allowlisted' : 'already-pending');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  if (status === 'submitted') {
    return (
      <p className="text-green-400 text-sm">
        Access request submitted! An admin will review it soon.
      </p>
    );
  }

  if (status === 'already-pending') {
    return (
      <p className="text-yellow-400 text-sm">
        You already have a pending access request.
      </p>
    );
  }

  if (status === 'already-allowlisted') {
    return (
      <p className="text-green-400 text-sm">
        You already have access! Try refreshing the page.
      </p>
    );
  }

  if (status === 'error') {
    return (
      <div className="space-y-2">
        <p className="text-red-400 text-sm">Failed to submit request.</p>
        <button
          onClick={handleRequest}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleRequest}
      disabled={status === 'loading'}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
    >
      {status === 'loading' ? 'Requesting...' : 'Request Access'}
    </button>
  );
}
