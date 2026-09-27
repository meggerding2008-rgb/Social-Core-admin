import { redirect } from 'next/navigation';

export default function SupportNewRedirectPage({
  searchParams,
}: {
  searchParams: { userId?: string };
}) {
  const qs = searchParams.userId
    ? `?userId=${encodeURIComponent(searchParams.userId)}`
    : '';
  redirect(`/app-support/new${qs}`);
}
