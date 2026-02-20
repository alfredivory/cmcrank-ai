'use client';

import { useSession } from 'next-auth/react';

interface CreditStatusProps {
  className?: string;
}

export default function CreditStatus({ className }: CreditStatusProps) {
  const { data: session } = useSession();

  if (!session?.user?.isAllowlisted && session?.user?.role !== 'ADMIN') {
    return null;
  }

  const { creditsRemaining, dailyCreditLimit } = session.user;

  if (creditsRemaining === -1) {
    return (
      <span className={className ?? 'text-sm text-gray-400'}>
        Unlimited credits
      </span>
    );
  }

  const colorClass = creditsRemaining === 0 ? 'text-red-400' : 'text-gray-400';

  return (
    <span className={className ?? `text-sm ${colorClass}`}>
      {creditsRemaining}/{dailyCreditLimit} credits available
    </span>
  );
}
