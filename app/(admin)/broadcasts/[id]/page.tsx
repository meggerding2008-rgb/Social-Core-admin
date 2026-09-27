import { redirect } from 'next/navigation';

export default function BroadcastsIdRedirectPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/popups/${params.id}`);
}
