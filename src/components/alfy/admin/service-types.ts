/**
 * Types de microservices enregistrables auprès du gateway.
 * Miroir de `SERVICE_TYPES` dans `gateway/src/lb/registry.ts` : la page Services
 * reçoit la liste du gateway et ne se rabat sur celle-ci que hors ligne.
 */
import { API_URL } from '@/lib/api';

export const SERVICE_TYPES = [
  'users', 'messages', 'friends', 'calls', 'servers', 'bots', 'media',
  'serverhosting', 'subscriptions', 'media-server',
] as const;

/** Port local par défaut de chaque service (exemples des formulaires) */
export const SERVICE_PORTS: Record<string, number> = {
  users: 3001, messages: 3002, friends: 3003, calls: 3004, servers: 3005,
  bots: 3006, media: 3007, serverhosting: 3008, subscriptions: 3009,
  'media-server': 3010,
};

export const LOCATIONS = ['EU', 'NA', 'AS', 'SA', 'OC', 'AF'] as const;

/** Variables à reporter dans le .env du microservice pour qu'il se déclare au gateway */
export function serviceEnvSnippet(id: string, key: string, endpoint?: string): string {
  return [
    `SERVICE_ID=${id}`,
    `SERVICE_KEY=${key}`,
    `SERVICE_ENDPOINT=${endpoint || 'https://<domaine-de-l-instance>'}`,
    `GATEWAY_URL=${API_URL}`,
  ].join('\n');
}
