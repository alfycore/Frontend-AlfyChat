import { redirect } from 'next/navigation';

export const metadata = {
  title: "Conditions Générales d'Utilisation — AlfyChat",
  description: "Conditions générales d'utilisation d'AlfyChat.",
};

export default function TermsPage() {
  redirect('/legal/cgu');
}
