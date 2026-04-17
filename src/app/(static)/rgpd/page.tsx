import { Metadata } from 'next';
import { RGPDClient } from './rgpd-client';

export const metadata: Metadata = {
  title: 'RGPD — Vos droits — AlfyChat',
  description: 'Conformité RGPD d\'AlfyChat. Exercez vos droits sur vos données personnelles.',
};

export default function RGPDPage() {
  return <RGPDClient />;
}
