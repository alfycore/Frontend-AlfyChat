import { Metadata } from 'next';
import { AboutClient } from './about-client';

export const metadata: Metadata = {
  title: 'À propos — AlfyChat',
  description: 'AlfyChat est développé par AlfyCore, une association loi 1901 à but non lucratif dédiée à la communication privée et sécurisée.',
};

export default function AboutPage() {
  return <AboutClient />;
}
