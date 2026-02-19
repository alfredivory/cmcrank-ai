import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createRequestLogger } from '@/lib/logger';

function isAuthorized(request: Request): boolean {
  const secret = request.headers.get('x-admin-secret');
  const expected = process.env.ADMIN_API_SECRET;
  if (!expected) return false;
  return secret === expected;
}

export async function GET(request: Request) {
  const logger = createRequestLogger(request, 'api');

  if (!isAuthorized(request)) {
    logger.warn('admin.config.list.unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const configs = await prisma.systemConfig.findMany();

    const configMap: Record<string, unknown> = {};
    for (const config of configs) {
      configMap[config.key] = config.value;
    }

    logger.info('admin.config.list', {
      metadata: { count: configs.length },
    });

    return NextResponse.json({ data: configMap });
  } catch (error) {
    logger.error('admin.config.list.failed', error as Error);
    return NextResponse.json(
      { error: 'Failed to list config' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const logger = createRequestLogger(request, 'api');

  if (!isAuthorized(request)) {
    logger.warn('admin.config.update.unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { key, value } = body as { key: string; value: unknown };

    if (!key) {
      return NextResponse.json({ error: 'key is required' }, { status: 400 });
    }

    if (value === undefined) {
      return NextResponse.json({ error: 'value is required' }, { status: 400 });
    }

    const config = await prisma.systemConfig.upsert({
      where: { key },
      update: { value: value as never },
      create: { key, value: value as never },
    });

    logger.info('admin.config.updated', {
      metadata: { key, value },
    });

    return NextResponse.json({ data: { key: config.key, value: config.value } });
  } catch (error) {
    logger.error('admin.config.update.failed', error as Error);
    return NextResponse.json(
      { error: 'Failed to update config' },
      { status: 500 }
    );
  }
}
