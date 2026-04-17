import { Metadata } from 'next';
import { FAQClient } from './faq-client';

export const metadata: Metadata = {
  title: 'FAQ — AlfyChat',
  description: 'Foire aux questions AlfyChat. Trouvez les réponses à vos questions sur la messagerie.',
};

export default function FAQPage() {
  return <FAQClient />;
}
