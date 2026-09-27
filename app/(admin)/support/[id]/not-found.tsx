import { redirect } from 'next/navigation';

export default function SupportNotFoundRedirect() {
  redirect('/app-support');
}
