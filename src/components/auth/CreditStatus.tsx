'use client';

import { useSession } from 'next-auth/react';

interface CreditStatusProps {
  className?: string;
}

export default function CreditStatus({ className }: CreditStatusProps) {
  const { data: session } = useSession();

  if (!session?.user?.isAllowlisted) {
    return null;
  }

  const { creditsRemaining } = session.user;

  return (
    <span className={className ?? 'text-sm text-gray-400'}>
      {creditsRemaining} credit{creditsRemaining !== 1 ? 's' : ''} remaining today
    </span>
  );
}
