import { redirect } from 'next/navigation';

export default function SupportDetailRedirectPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/app-support/${params.id}`);
}
