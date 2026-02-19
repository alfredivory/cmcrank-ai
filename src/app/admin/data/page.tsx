import { redirect } from 'next/navigation';

export default function AdminDataRedirect() {
  redirect('/admin?tab=data');
}
