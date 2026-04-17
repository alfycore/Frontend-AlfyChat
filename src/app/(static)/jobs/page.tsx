import { Metadata } from 'next';
import { JobsClient } from './jobs-client';

export const metadata: Metadata = {
  title: 'Emplois — AlfyChat',
  description: 'Rejoignez AlfyCore et contribuez à construire la messagerie privée de demain.',
};

export default function JobsPage() {
  return <JobsClient />;
}
