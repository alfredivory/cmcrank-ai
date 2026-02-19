import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import { PrismaAdapter } from '@auth/prisma-adapter';
import type { Adapter } from 'next-auth/adapters';
import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { isEmailAllowlisted } from './allowlist';
import { getCreditsRemaining } from './credits';

const logger = createLogger('api');

function getInitialAdmins(): string[] {
  const raw = process.env.INITIAL_ADMINS || '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: 'database',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) {
        logger.warn('auth.signIn.noEmail', { metadata: { userId: user.id } });
        return false;
      }

      const initialAdmins = getInitialAdmins();
      const isInitialAdmin = initialAdmins.includes(email);
      const allowlisted = await isEmailAllowlisted(email);

      // Auto-promote initial admins on sign-in
      if (isInitialAdmin) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            role: 'ADMIN',
            isAllowlisted: true,
          },
        });
        logger.info('auth.signIn.autoAdmin', {
          userId: user.id,
          metadata: { email },
        });
      } else if (allowlisted) {
        await prisma.user.update({
          where: { id: user.id },
          data: { isAllowlisted: true },
        });
        logger.info('auth.signIn.allowlisted', {
          userId: user.id,
          metadata: { email },
        });
      } else {
        logger.info('auth.signIn.standard', {
          userId: user.id,
          metadata: { email },
        });
      }

      return true;
    },
    async session({ session, user }) {
      const creditsRemaining = await getCreditsRemaining(user.id);

      session.user.id = user.id;
      session.user.role = user.role;
      session.user.isAllowlisted = user.isAllowlisted;
      session.user.creditsRemaining = creditsRemaining;

      return session;
    },
  },
};
