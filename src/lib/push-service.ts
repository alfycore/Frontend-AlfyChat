/**
 * push-service.ts
 * Gère l'enregistrement, la souscription et la désouscription aux Web Push Notifications.
 *
 * Prérequis :
 * - NEXT_PUBLIC_VAPID_PUBLIC_KEY dans .env.local
 * - Le service worker /sw.js exposé dans /public
 * - Endpoints backend : POST /api/users/push/subscribe, DELETE /api/users/push/subscribe
 */

import { api } from '@/lib/api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

let _registration: ServiceWorkerRegistration | null = null;

/**
 * Enregistre le service worker et retourne la registration.
 * Idempotent — retourne la registration existante si déjà enregistrée.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    if (_registration) return _registration;
    _registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return _registration;
  } catch (err) {
    console.warn('[PushService] SW registration failed:', err);
    return null;
  }
}

/**
 * Souscrit aux Web Push Notifications et envoie la subscription au backend.
 * Ne fait rien si la permission est refusée ou si les Web Push ne sont pas supportés.
 */
export async function subscribePush(): Promise<boolean> {
  if (typeof window === 'undefined' || !('PushManager' in window)) return false;

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    console.warn('[PushService] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set — Web Push disabled');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const reg = await registerServiceWorker();
    if (!reg) return false;

    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      // Déjà souscrit — synchroniser avec le backend quand même
      await syncSubscription(existing);
      return true;
    }

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
    });

    await syncSubscription(subscription);

    // Écouter les changements de subscription (expiration)
    navigator.serviceWorker.addEventListener('message', handleSWMessage);

    return true;
  } catch (err) {
    console.warn('[PushService] Subscribe failed:', err);
    return false;
  }
}

async function syncSubscription(subscription: PushSubscription): Promise<void> {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;
  await api.subscribePush({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    userAgent: navigator.userAgent,
  });
}

function handleSWMessage(event: MessageEvent) {
  if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGED' && event.data.subscription) {
    syncSubscription(event.data.subscription).catch(() => {});
  }
}

/**
 * Se désabonne des Web Push et notifie le backend.
 */
export async function unsubscribePush(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!reg) return;
    const subscription = await reg.pushManager.getSubscription();
    if (!subscription) return;
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await api.unsubscribePush(endpoint);
    navigator.serviceWorker.removeEventListener('message', handleSWMessage);
  } catch (err) {
    console.warn('[PushService] Unsubscribe failed:', err);
  }
}

/**
 * Retourne vrai si l'utilisateur est actuellement souscrit aux push notifications.
 */
export async function isPushSubscribed(): Promise<boolean> {
  if (typeof window === 'undefined' || !('PushManager' in window)) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!reg) return false;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}
