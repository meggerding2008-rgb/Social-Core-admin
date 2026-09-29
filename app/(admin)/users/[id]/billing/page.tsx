import { canViewBilling } from '@/lib/auth/permissions';
import { renderUserSectionPlaceholder } from '@/lib/users/section-page';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: { id: string } }) {
  return renderUserSectionPlaceholder({
    userId: params.id,
    tabId: 'billing',
    canView: canViewBilling,
  });
}
