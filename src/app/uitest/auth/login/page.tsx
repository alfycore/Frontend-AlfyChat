import { AuthShell } from '@/components/alfy/auth/auth-shell';
import { LoginCard } from '@/components/alfy/auth/login-card';

export default function UitestLoginPage() {
  return (
    <AuthShell>
      <LoginCard />
    </AuthShell>
  );
}
