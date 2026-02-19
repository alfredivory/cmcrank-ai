'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminDataTab from './tabs/AdminDataTab';
import AdminUsersTab from './tabs/AdminUsersTab';
import AdminAllowlistTab from './tabs/AdminAllowlistTab';
import AdminAccessRequestsTab from './tabs/AdminAccessRequestsTab';

const TABS = [
  { key: 'data', label: 'Data' },
  { key: 'users', label: 'Users' },
  { key: 'allowlist', label: 'Allowlist' },
  { key: 'requests', label: 'Access Requests' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

interface AdminLayoutProps {
  initialTab: string;
}

export default function AdminLayout({ initialTab }: AdminLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabKey>(
    (TABS.find((t) => t.key === initialTab)?.key) ?? 'data'
  );
  const router = useRouter();

  function handleTabChange(tab: TabKey) {
    setActiveTab(tab);
    router.push(`/admin?tab=${tab}`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-gray-400 mt-1">Manage CMCRank.ai settings and users</p>
        </div>
        <Link
          href="/"
          className="text-gray-400 hover:text-blue-400 text-sm transition-colors"
        >
          &larr; Back to site
        </Link>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-gray-700 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'data' && <AdminDataTab />}
      {activeTab === 'users' && <AdminUsersTab />}
      {activeTab === 'allowlist' && <AdminAllowlistTab />}
      {activeTab === 'requests' && <AdminAccessRequestsTab />}
    </div>
  );
}
