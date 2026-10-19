/** Icône par type de salon (sidebar, en-têtes, sélecteurs). */

import {
  BarChart3,
  FileText,
  Folder,
  Gamepad2,
  Hash,
  Heart,
  HelpCircle,
  Image as ImageIcon,
  Lightbulb,
  Megaphone,
  MessagesSquare,
  PlaySquare,
  Radio,
  Sigma,
  Spool,
  Volume2,
  type LucideIcon,
} from 'lucide-react';

import type { GuildChannelType } from '@/components/alfy/guild/types';

export const CHANNEL_ICONS: Record<GuildChannelType, LucideIcon> = {
  text: Hash,
  voice: Volume2,
  announcement: Megaphone,
  forum: MessagesSquare,
  stage: Radio,
  gallery: ImageIcon,
  media: PlaySquare,
  doc: FileText,
  poll: BarChart3,
  counting: Sigma,
  minigame: Gamepad2,
  trivia: HelpCircle,
  suggestion: Lightbulb,
  vent: Heart,
  thread: Spool,
  category: Folder,
};

export const isVoiceType = (type: GuildChannelType) => type === 'voice' || type === 'stage';
