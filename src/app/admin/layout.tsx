import { AdminShell } from '@/components/alfy/admin/admin-shell';

export const metadata = {
  title: 'Console admin — AlfyChat',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
