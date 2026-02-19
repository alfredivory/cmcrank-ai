import type { UserRole, AllowlistOverride } from '@prisma/client';
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
      isAllowlisted: boolean;
      creditsRemaining: number;
    };
  }

  interface User {
    role: UserRole;
    isAllowlisted: boolean;
    researchCreditsUsed: number;
    creditsResetAt: Date;
    dailyCreditLimit: number | null;
    allowlistOverride: AllowlistOverride | null;
  }
}

declare module 'next-auth/adapters' {
  interface AdapterUser {
    role: UserRole;
    isAllowlisted: boolean;
    researchCreditsUsed: number;
    creditsResetAt: Date;
    dailyCreditLimit: number | null;
    allowlistOverride: AllowlistOverride | null;
  }
}
