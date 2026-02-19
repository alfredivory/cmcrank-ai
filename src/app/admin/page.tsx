export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/helpers';
import AdminLayout from '@/components/admin/AdminLayout';

const VALID_TABS = ['data', 'users', 'allowlist', 'requests'] as const;
type AdminTab = (typeof VALID_TABS)[number];

interface AdminPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const session = await getSession();

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  const resolvedParams = await searchParams;
  const tabParam = typeof resolvedParams.tab === 'string' ? resolvedParams.tab : undefined;
  const initialTab: AdminTab = VALID_TABS.includes(tabParam as AdminTab)
    ? (tabParam as AdminTab)
    : 'data';

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <AdminLayout initialTab={initialTab} />
      </div>
    </main>
  );
}
