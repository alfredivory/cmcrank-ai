'use client';

import { signIn } from 'next-auth/react';

interface SignInButtonProps {
  className?: string;
}

export default function SignInButton({ className }: SignInButtonProps) {
  return (
    <button
      onClick={() => signIn()}
      className={className ?? 'px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors text-white'}
    >
      Sign In
    </button>
  );
}
