'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import SignInButton from './SignInButton';

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (status === 'loading') {
    return <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />;
  }

  if (!session?.user) {
    return <SignInButton />;
  }

  const { user } = session;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1 rounded-full hover:ring-2 hover:ring-blue-500 transition-all"
        aria-label="User menu"
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name || 'User'}
            width={32}
            height={32}
            className="rounded-full shrink-0"
            unoptimized
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-medium shrink-0">
            {(user.name || user.email || '?')[0].toUpperCase()}
          </div>
        )}
        <span className="text-sm text-gray-300 max-w-[150px] truncate hidden sm:inline">
          {user.name || user.email}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
          <div className="px-4 py-3 border-b border-gray-700">
            <p className="text-sm font-medium text-white truncate">
              {user.name || 'User'}
            </p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                user.role === 'ADMIN'
                  ? 'bg-purple-600/20 text-purple-400'
                  : 'bg-gray-700 text-gray-400'
              }`}>
                {user.role}
              </span>
              {(user.isAllowlisted || user.role === 'ADMIN') && (
                <span className={`text-xs ${
                  user.creditsRemaining === -1 || user.creditsRemaining > 0
                    ? 'text-green-400'
                    : 'text-red-400'
                }`}>
                  {user.creditsRemaining === -1
                    ? 'Unlimited'
                    : `${user.creditsRemaining}/${user.dailyCreditLimit} credits`}
                </span>
              )}
            </div>
          </div>

          <div className="py-1">
            {user.role === 'ADMIN' && (
              <Link
                href="/admin"
                className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                onClick={() => setOpen(false)}
              >
                Admin Panel
              </Link>
            )}
            <button
              onClick={() => signOut()}
              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
