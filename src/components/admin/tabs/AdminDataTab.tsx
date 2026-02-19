'use client';

import IngestionStatus from '@/components/admin/IngestionStatus';
import TokenScopeSelector from '@/components/admin/TokenScopeSelector';
import BackfillStatus from '@/components/admin/BackfillStatus';

export default function AdminDataTab() {
  return (
    <div className="space-y-6">
      <IngestionStatus />
      <TokenScopeSelector />
      <BackfillStatus />
    </div>
  );
}
