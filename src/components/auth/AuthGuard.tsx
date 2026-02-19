'use client';

import { useSession } from 'next-auth/react';
import SignInButton from './SignInButton';
import RequestAccessButton from './RequestAccessButton';

interface AuthGuardProps {
  children: React.ReactNode;
  action: string;
  requireAllowlist?: boolean;
}

export default function AuthGuard({
  children,
  action,
  requireAllowlist = true,
}: AuthGuardProps) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center">
        <p className="text-gray-300 mb-2">Sign in to {action}</p>
        <p className="text-gray-500 text-sm mb-4">
          You need to be signed in to access this feature.
        </p>
        <SignInButton />
      </div>
    );
  }

  if (requireAllowlist && !session.user.isAllowlisted) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center">
        <p className="text-gray-300 mb-2">
          You don&apos;t have research access
        </p>
        <p className="text-gray-500 text-sm mb-4">
          Research access lets you trigger AI-powered investigations and chat with research results.
        </p>
        <RequestAccessButton />
      </div>
    );
  }

  return <>{children}</>;
}
