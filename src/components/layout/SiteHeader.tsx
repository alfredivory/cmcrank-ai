import Link from 'next/link';
import UserMenu from '@/components/auth/UserMenu';

interface SiteHeaderProps {
  rightContent?: React.ReactNode;
}

export default function SiteHeader({ rightContent }: SiteHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between mb-8">
      <div>
        <Link href="/" className="hover:opacity-90 transition-opacity">
          <h1 className="text-3xl font-bold">
            CMCRank<span className="text-blue-400">.ai</span>
          </h1>
        </Link>
        <p className="text-gray-400 mt-1">
          Relative performance analysis through CMC rank tracking
        </p>
      </div>
      <div className="mt-4 sm:mt-0 flex items-center gap-4">
        {rightContent}
        <UserMenu />
      </div>
    </div>
  );
}
