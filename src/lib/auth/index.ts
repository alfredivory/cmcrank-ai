import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import { PrismaAdapter } from '@auth/prisma-adapter';
import type { Adapter } from 'next-auth/adapters';
import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { isEmailAllowlisted } from './allowlist';
import { getCreditsRemaining, getEffectiveLimit } from './credits';

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
      allowDangerousEmailAccountLinking: true,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        logger.warn('auth.signIn.noEmail');
        return false;
      }
      return true;
    },
    async session({ session, user }) {
      // user is the DB record (database strategy) — safe to update
      const email = user.email?.toLowerCase();
      if (email) {
        const initialAdmins = getInitialAdmins();
        if (initialAdmins.includes(email) && user.role !== 'ADMIN') {
          await prisma.user.update({
            where: { id: user.id },
            data: { role: 'ADMIN', isAllowlisted: true },
          });
          user.role = 'ADMIN';
          user.isAllowlisted = true;
          logger.info('auth.session.autoAdmin', {
            userId: user.id,
            metadata: { email },
          });
        }
      }

      const creditsRemaining = await getCreditsRemaining(user.id);
      const effectiveLimit = getEffectiveLimit(user);

      session.user.id = user.id;
      session.user.role = user.role;
      session.user.isAllowlisted = user.isAllowlisted;
      session.user.creditsRemaining = creditsRemaining;
      session.user.dailyCreditLimit = effectiveLimit;

      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Fires after PrismaAdapter has persisted the new user
      const email = user.email?.toLowerCase();
      if (!email) return;

      const initialAdmins = getInitialAdmins();
      const isInitialAdmin = initialAdmins.includes(email);
      const allowlisted = await isEmailAllowlisted(email);

      if (isInitialAdmin) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: 'ADMIN', isAllowlisted: true },
        });
        logger.info('auth.createUser.autoAdmin', {
          userId: user.id,
          metadata: { email },
        });
      } else if (allowlisted) {
        await prisma.user.update({
          where: { id: user.id },
          data: { isAllowlisted: true },
        });
        logger.info('auth.createUser.allowlisted', {
          userId: user.id,
          metadata: { email },
        });
      } else {
        logger.info('auth.createUser.standard', {
          userId: user.id,
          metadata: { email },
        });
      }
    },
  },
};
