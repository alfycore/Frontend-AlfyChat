'use client';

import { useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { subscribePush } from '@/lib/push-service';

// ── Détection du contexte ─────────────────────────────────────────────────────

function isNativeWebView(): boolean {
  if (typeof window === 'undefined') return false;
  // App.tsx injecte window.__ALFYCHAT_NATIVE__ = true
  if ((window as any).__ALFYCHAT_NATIVE__) return true;
  // Fallback : user-agent
  return /AlfyChatMobile/i.test(navigator.userAgent);
}

function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

// ── Hook : écoute le token Expo depuis l'app native ───────────────────────────

function useNativePushToken() {
  const registeredRef = useRef(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.type !== 'EXPO_PUSH_TOKEN' || !detail?.token) return;
      if (registeredRef.current) return;
      registeredRef.current = true;
      api.subscribeExpoPush(detail.token).catch(() => {});
    };
    window.addEventListener('alfychat:native', handler);
    // Demander le token si l'app native est déjà chargée
    if (isNativeWebView() && (window as any).ReactNativeWebView) {
      try {
        (window as any).ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'REQUEST_PUSH_TOKEN' })
        );
      } catch {}
    }
    return () => window.removeEventListener('alfychat:native', handler);
  }, []);
}

// ── Composant principal ───────────────────────────────────────────────────────

export function MobilePermissionPrompt() {
  // Dans l'app native : écouter uniquement le token Expo, ne rien afficher
  useNativePushToken();

  // Dans un navigateur mobile classique : demander les permissions web
  useEffect(() => {
    if (isNativeWebView()) return; // géré nativement côté App.tsx
    if (!isMobileBrowser()) return;

    const key = 'alfychat_mobile_perm_v1';
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');

    // Permission notification web (navigateur mobile hors WebView)
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
        .then((p) => { if (p === 'granted') subscribePush().catch(() => {}); })
        .catch(() => {});
    }
  }, []);

  // Aucune UI — tout est géré nativement ou silencieusement
  return null;
}
