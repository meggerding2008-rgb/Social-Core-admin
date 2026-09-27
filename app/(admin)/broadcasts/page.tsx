import { redirect } from 'next/navigation';

/** Broadcasts module is replaced by Pop-ups. */
export default function BroadcastsRedirectPage() {
  redirect('/popups');
}
