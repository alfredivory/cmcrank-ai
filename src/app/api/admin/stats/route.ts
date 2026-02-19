export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createRequestLogger } from '@/lib/logger';
import { requireAdminDual, isAuthError } from '@/lib/auth/helpers';

export async function GET(request: Request) {
  const logger = createRequestLogger(request, 'api');

  const authResult = await requireAdminDual(request);
  if (isAuthError(authResult)) {
    logger.warn('admin.stats.unauthorized');
    return authResult;
  }

  try {
    const [totalUsers, allowlistedUsers, pendingRequests, creditsUsedToday] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isAllowlisted: true } }),
        prisma.accessRequest.count({ where: { status: 'PENDING' } }),
        prisma.user.aggregate({
          _sum: { researchCreditsUsed: true },
          where: {
            creditsResetAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

    const stats = {
      totalUsers,
      allowlistedUsers,
      pendingRequests,
      creditsConsumedToday: creditsUsedToday._sum.researchCreditsUsed ?? 0,
    };

    logger.info('admin.stats.fetched', { metadata: { ...stats } });

    return NextResponse.json({ data: stats });
  } catch (error) {
    logger.error('admin.stats.failed', error as Error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
