import { Metadata } from 'next';
import { NewsroomClient } from './newsroom-client';

export const metadata: Metadata = {
  title: 'Espace actualités — AlfyChat',
  description: 'Toutes les dernières actualités, mises à jour et annonces d\'AlfyChat et d\'AlfyCore.',
};

export default function NewsroomPage() {
  return <NewsroomClient />;
}
