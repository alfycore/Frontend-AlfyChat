import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Politique de Confidentialité — AlfyChat',
  description: 'Politique de confidentialité d\'AlfyChat.',
};

export default function PrivacyPage() {
  redirect('/legal/privacy');
}
