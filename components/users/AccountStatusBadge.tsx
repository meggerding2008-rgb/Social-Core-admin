import type { AccountStatus } from '@/lib/users/types';
import { accountStatusLabel } from '@/lib/users/types';

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  if (status === 'blocked') {
    return (
      <span className="inline-flex rounded-[8px] border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800">
        {accountStatusLabel(status)}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-[8px] border border-brand-border bg-brand-mist px-2 py-0.5 text-xs font-medium text-brand-navy">
      {accountStatusLabel(status)}
    </span>
  );
}
