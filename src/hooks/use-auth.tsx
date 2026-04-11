'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { signalService } from '@/lib/signal-service';
import {
  generateKeypair,
  generateSalt,
  deriveKey,
  encryptPrivateKey,
  decryptPrivateKey,
} from '@/lib/e2ee';

const E2EE_SESSION_KEY = 'alfychat_e2ee_private_key';

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  role?: 'user' | 'moderator' | 'admin';
  status: 'online' | 'offline' | 'idle' | 'dnd' | 'invisible';
  customStatus?: string | null;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  privateKey: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, turnstileToken?: string) => Promise<{ success: boolean; error?: string; twoFactorRequired?: boolean; twoFactorToken?: string; emailNotVerified?: boolean }>;
  loginWith2FA: (twoFactorToken: string, code: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: { email: string; username: string; password: string; displayName?: string; inviteCode?: string; turnstileToken?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  // Écouter les mises à jour de profil via WebSocket
  useEffect(() => {
    if (!user) return;
    const handleProfileUpdate = (data: unknown) => {
      const payload = (data as { payload?: Record<string, unknown> })?.payload || data;
      const p = payload as { id?: string; userId?: string; displayName?: string; avatarUrl?: string; bio?: string; status?: 'online' | 'idle' | 'dnd' | 'invisible' | 'offline' };
      // Mise à jour de son propre profil (réponse du gateway) OU notification d'un autre client
      const targetId = p?.id || p?.userId;
      if (!targetId || targetId === user.id) {
        setUser((prev) => prev ? { ...prev, ...p } : prev);
      }
    };
    socketService.onProfileUpdate(handleProfileUpdate);
    return () => {
      socketService.off('PROFILE_UPDATE', handleProfileUpdate as any);
    };
  }, [user?.id]);

  const checkAuth = async () => {
    console.log('🔍 checkAuth: Début de la vérification');
    const token = localStorage.getItem('alfychat_token');
    const refreshToken = localStorage.getItem('alfychat_refresh_token');
    console.log('🔑 Token présent:', !!token, '| Refresh token:', !!refreshToken);
    
    if (!token && !refreshToken) {
      console.log('❌ Aucun token, arrêt de checkAuth');
      setIsLoading(false);
      return;
    }

    // Si pas de token d'accès mais refresh token présent → tenter le refresh immédiatement
    if (!token && refreshToken) {
      console.log('🔄 Pas de token d\'accès, tentative de refresh...');
      const refreshed = await api.tryRefreshToken();
      if (!refreshed) {
        console.log('❌ Refresh échoué, suppression des tokens');
        localStorage.removeItem('alfychat_token');
        localStorage.removeItem('alfychat_refresh_token');
        setIsLoading(false);
        return;
      }
    }

    console.log('📡 Appel API getMe...');
    const response = await api.getMe();
    console.log('📥 Réponse getMe:', response);
    
    if (response.success && response.data) {
      console.log('✅ Utilisateur chargé:', response.data);
      setUser(response.data as User);

      // Vérification des clés Signal (best-effort, ne bloque jamais l'auth)
      try {
        const { signalStore } = await import('../lib/signal-store');
        const localIdentity = await signalStore.getIdentityKeyPair();
        const localECDH     = await signalStore.getECDHKeyPair();

        if (!localIdentity || !localECDH) {
          // Clés locales absentes — E2EE dégradé mais la session reste active.
          // L'utilisateur devra se re-connecter (login) pour restaurer ses clés.
          console.warn('[Signal] Clés locales absentes — E2EE dégradé, re-login recommandé pour restaurer');
        } else {
          // Synchroniser l'état en mémoire (initialized flag)
          await signalService.isInitialized();

          // Vérifier si le serveur a encore notre bundle public (ex : après restart DB)
          const keyStatus = await api.getSignalKeyStatus();
          if (keyStatus && !keyStatus.hasBundle) {
            console.warn('[Signal] Bundle serveur absent — tentative de re-publication depuis IndexedDB...');
            const rebuilt = await signalService.rebuildPublicBundle();
            if (rebuilt) {
              const publishRes = await api.publishSignalKeyBundle(rebuilt);
              if (publishRes.success) {
                console.log('[Signal] Bundle public re-publié depuis IndexedDB ✓');
              } else {
                console.warn('[Signal] Échec re-publication — E2EE dégradé');
              }
            } else {
              console.warn('[Signal] Impossible de re-publier (signature manquante) — E2EE dégradé');
            }
          }
        }
      } catch (idbErr) {
        console.error('[Signal] Erreur lecture IndexedDB lors du checkAuth:', idbErr);
      }

      // Restaurer la clé privée E2EE depuis sessionStorage
      try {
        const storedPrivKey = sessionStorage.getItem(E2EE_SESSION_KEY);
        if (storedPrivKey) {
          setPrivateKey(storedPrivKey);
        }
      } catch {
        // sessionStorage inaccessible (iframe sandboxé, etc.)
      }

      // Utiliser le token frais (potentiellement rafraîchi)
      const freshToken = localStorage.getItem('alfychat_token')!;
      console.log('🔌 Connexion WebSocket...');
      const socket = socketService.connect(freshToken);
      console.log('🔌 WebSocket connecté:', !!socket);
    } else {
      // getMe a échoué même après un éventuel refresh automatique dans api.request()
      // → les tokens sont vraiment invalides
      console.log('❌ Échec getMe après refresh, suppression des tokens');
      localStorage.removeItem('alfychat_token');
      localStorage.removeItem('alfychat_refresh_token');
    }
    setIsLoading(false);
    console.log('✅ checkAuth terminé');
  };

  const login = async (email: string, password: string, turnstileToken?: string) => {
    const response = await api.login({ email, password, ...(turnstileToken && { turnstileToken }) });

    // Email non vérifié → cas spécial (HTTP 403, body: { emailNotVerified: true })
    if (!response.success && (response.data as any)?.emailNotVerified) {
      return { success: false, emailNotVerified: true };
    }

    if (response.success && response.data) {
      const data = response.data as any;

      // 2FA requis → retourner le token intermédiaire au composant
      if (data.twoFactorRequired) {
        return {
          success: false,
          twoFactorRequired: true,
          twoFactorToken: data.twoFactorToken as string,
        };
      }

      const accessToken = data.tokens?.accessToken;
      const refreshToken = data.tokens?.refreshToken;
      const userData = data.user;

      if (!accessToken || !refreshToken || !userData) {
        console.error('Données de connexion invalides:', data);
        return { success: false, error: 'Données de connexion invalides' };
      }

      localStorage.setItem('alfychat_token', accessToken);
      localStorage.setItem('alfychat_refresh_token', refreshToken);
      if (data.tokens?.sessionId) localStorage.setItem('alfychat_session_id', data.tokens.sessionId);
      setUser(userData as User);
      socketService.connect(accessToken);

      // Décrypter la clé privée existante ou générer un nouveau keypair
      try {
        if (data.keySalt && data.encryptedPrivateKey) {
          try {
            const aesKey = await deriveKey(password, data.keySalt);
            const decryptedPrivKey = await decryptPrivateKey(data.encryptedPrivateKey, aesKey);
            setPrivateKey(decryptedPrivKey);
            sessionStorage.setItem(E2EE_SESSION_KEY, decryptedPrivKey);
          } catch (decryptErr) {
            // OperationError: clés chiffrées avec un ancien mot de passe
            // Régénérer un nouveau keypair chiffré avec le mot de passe actuel
            console.warn('[E2EE] Déchiffrement échoué (clés obsolètes) — régénération...', decryptErr);
            const keypair = await generateKeypair();
            const salt = generateSalt();
            const aesKey = await deriveKey(password, salt);
            const encPrivKey = await encryptPrivateKey(keypair.privateKey, aesKey);
            await api.saveMyKeys({ publicKey: keypair.publicKey, encryptedPrivateKey: encPrivKey, keySalt: salt });
            setPrivateKey(keypair.privateKey);
            sessionStorage.setItem(E2EE_SESSION_KEY, keypair.privateKey);
            console.log('[E2EE] Nouvelles clés générées après échec déchiffrement ✓');
          }
        } else if (data.keyMissing) {
          // Utilisateur existant sans clé → générer et sauvegarder silencieusement
          console.log('[E2EE] Génération des clés pour utilisateur existant...');
          const keypair = await generateKeypair();
          const salt = generateSalt();
          const aesKey = await deriveKey(password, salt);
          const encPrivKey = await encryptPrivateKey(keypair.privateKey, aesKey);
          await api.saveMyKeys({ publicKey: keypair.publicKey, encryptedPrivateKey: encPrivKey, keySalt: salt });
          setPrivateKey(keypair.privateKey);
          sessionStorage.setItem(E2EE_SESSION_KEY, keypair.privateKey);
          console.log('[E2EE] Clés générées et sauvegardées ✓');
        }
      } catch (err) {
        console.error('[E2EE] Erreur initialisation clé privée:', err);
      }

      // Initialiser le bundle Signal E2EE (si pas encore fait pour cet appareil)
      try {
        await initSignalKeys(password);
      } catch (err) {
        console.error('[Signal] Erreur initialisation clés:', err);
      }

      return { success: true };
    }

    return { success: false, error: response.error };
  };

  const loginWith2FA = async (twoFactorToken: string, code: string, password: string) => {
    const response = await api.loginWith2FA(twoFactorToken, code);
    if (response.success && response.data) {
      const data = response.data as any;
      const accessToken = data.tokens?.accessToken;
      const refreshToken = data.tokens?.refreshToken;
      const userData = data.user;

      if (!accessToken || !refreshToken || !userData) {
        return { success: false, error: 'Données de connexion invalides' };
      }

      localStorage.setItem('alfychat_token', accessToken);
      localStorage.setItem('alfychat_refresh_token', refreshToken);
      if (data.tokens?.sessionId) localStorage.setItem('alfychat_session_id', data.tokens.sessionId);
      setUser(userData as User);
      socketService.connect(accessToken);

      // Décrypter la clé privée existante ou générer un nouveau keypair
      try {
        if (data.keySalt && data.encryptedPrivateKey) {
          try {
            const aesKey = await deriveKey(password, data.keySalt);
            const decryptedPrivKey = await decryptPrivateKey(data.encryptedPrivateKey, aesKey);
            setPrivateKey(decryptedPrivKey);
            sessionStorage.setItem(E2EE_SESSION_KEY, decryptedPrivKey);
          } catch (decryptErr) {
            console.warn('[E2EE] Déchiffrement échoué (clés obsolètes, 2FA) — régénération...', decryptErr);
            const keypair = await generateKeypair();
            const salt = generateSalt();
            const aesKey = await deriveKey(password, salt);
            const encPrivKey = await encryptPrivateKey(keypair.privateKey, aesKey);
            await api.saveMyKeys({ publicKey: keypair.publicKey, encryptedPrivateKey: encPrivKey, keySalt: salt });
            setPrivateKey(keypair.privateKey);
            sessionStorage.setItem(E2EE_SESSION_KEY, keypair.privateKey);
            console.log('[E2EE] Nouvelles clés générées après échec déchiffrement (2FA) ✓');
          }
        } else if (data.keyMissing) {
          console.log('[E2EE] Génération des clés pour utilisateur existant (2FA)...');
          const keypair = await generateKeypair();
          const salt = generateSalt();
          const aesKey = await deriveKey(password, salt);
          const encPrivKey = await encryptPrivateKey(keypair.privateKey, aesKey);
          await api.saveMyKeys({ publicKey: keypair.publicKey, encryptedPrivateKey: encPrivKey, keySalt: salt });
          setPrivateKey(keypair.privateKey);
          sessionStorage.setItem(E2EE_SESSION_KEY, keypair.privateKey);
          console.log('[E2EE] Clés générées et sauvegardées ✓');
        }
      } catch (err) {
        console.error('[E2EE] Erreur initialisation clé privée (2FA):', err);
      }

      try {
        await initSignalKeys(password);
      } catch (err) {
        console.error('[Signal] Erreur init clés après 2FA:', err);
      }

      return { success: true };
    }
    return { success: false, error: response.error };
  };

  const register = async (data: { email: string; username: string; password: string; displayName?: string; inviteCode?: string; turnstileToken?: string }) => {
    // Générer le keypair E2EE avant l'inscription
    let e2eeFields: { publicKey?: string; encryptedPrivateKey?: string; keySalt?: string } = {};
    let rawPrivateKey: string | null = null;
    try {
      const keypair = await generateKeypair();
      rawPrivateKey = keypair.privateKey;
      const salt = generateSalt();
      const aesKey = await deriveKey(data.password, salt);
      const encPrivKey = await encryptPrivateKey(keypair.privateKey, aesKey);
      e2eeFields = {
        publicKey: keypair.publicKey,
        encryptedPrivateKey: encPrivKey,
        keySalt: salt,
      };
    } catch (err) {
      console.error('[E2EE] Erreur génération keypair à l\'inscription:', err);
    }

    const response = await api.register({ ...data, ...e2eeFields });

    if (!response.success) {
      return { success: false, error: response.error };
    }

    // Utiliser directement les tokens retournés par l'inscription
    // (évite un 2ème appel /login qui peut échouer si email non vérifié, turnstile, etc.)
    const regData = response.data as any;
    const accessToken = regData?.tokens?.accessToken;
    const refreshToken = regData?.tokens?.refreshToken;
    const userData = regData?.user;

    if (accessToken && refreshToken && userData) {
      localStorage.setItem('alfychat_token', accessToken);
      localStorage.setItem('alfychat_refresh_token', refreshToken);
      if (regData.tokens?.sessionId) localStorage.setItem('alfychat_session_id', regData.tokens.sessionId);
      setUser(userData as User);
      socketService.connect(accessToken);

      if (rawPrivateKey) {
        setPrivateKey(rawPrivateKey);
        sessionStorage.setItem(E2EE_SESSION_KEY, rawPrivateKey);
      }

      try {
        await initSignalKeys(data.password);
      } catch (err) {
        console.error('[Signal] Erreur init clés après inscription:', err);
      }

      return { success: true };
    }

    // Fallback : tokens absents dans la réponse (ne devrait pas arriver)
    return login(data.email, data.password);
  };

  const logout = async () => {
    await api.logout();
    localStorage.removeItem('alfychat_token');
    localStorage.removeItem('alfychat_refresh_token');
    localStorage.removeItem('alfychat_session_id');
    sessionStorage.removeItem(E2EE_SESSION_KEY);
    socketService.disconnect();
    // Effacer les clés Signal de cet appareil
    await signalService.reset().catch(() => {});
    setUser(null);
    setPrivateKey(null);
  };

  /**
   * Initialise les clés Signal E2EE à chaque connexion.
   * Vérifie le bundle côté serveur et le (re)crée si absent.
   * En cas de multi-appareil, re-synchronise les clés depuis le backup serveur
   * une fois par session pour garantir la cohérence entre appareils.
   */
  async function initSignalKeys(password: string) {
    try {
      // IMPORTANT: un échec réseau ne doit jamais être interprété comme
      // « aucun bundle serveur », sinon on régénère des clés et on casse le multi-appareil.
      const { signalStore } = await import('../lib/signal-store');
      const status = await api.getSignalKeyStatus();
      const statusKnown = status !== null;
      const serverHasBundle = status?.hasBundle === true;
      const alreadySynced = sessionStorage.getItem('signal_synced_this_session') === '1';

      const localIdentityBefore = await signalStore.getIdentityKeyPair();
      const localECDHBefore = await signalStore.getECDHKeyPair();
      // L'ECDH est optionnel — l'identité seule suffit pour détecter un store complet
      const hasLocalBundleBefore = !!localIdentityBefore;

      // Une fois par session, ou si le store local est incomplet, restaurer le backup privé.
      if (!alreadySynced || !hasLocalBundleBefore) {
        const backupRes = await api.downloadPrivateBundle();
        const encryptedBundle = backupRes?.encryptedBundle ?? null;

        if (encryptedBundle) {
          console.log('[Signal] Synchronisation des clés multi-appareil...');
          await signalService.decryptAndImportPrivateBundle(encryptedBundle, password);
          sessionStorage.setItem('signal_synced_this_session', '1');
          console.log('[Signal] Clés synchronisées ✓');

          const ecdhAfterRestore = await signalStore.getECDHKeyPair();
          if (!ecdhAfterRestore) {
            // Ne générer une nouvelle clé ECDH QUE si le serveur n'en a pas.
            // Si le serveur a déjà une clé ECDH, c'est que l'ancien backup ne la contenait pas :
            // générer une nouvelle clé invaliderait tous les senderContent chiffrés avec l'ancienne
            // sur tous les autres appareils. On passe en mode ECDH dégradé (fallback AES-GCM).
            if (!status?.hasEcdhKey) {
              console.log('[Signal] Clé ECDH absente du backup et du serveur, initialisation...');
              await signalService.addMissingECDHKey(password);
            } else {
              console.warn('[Signal] Clé ECDH absente du backup mais présente sur le serveur — mode dégradé (senderContent ECDH non déchiffrable cette session). Reconnectez-vous depuis l\'appareil d\'origine pour resynchroniser.');
            }
          }

          // Republier le bundle public reconstruit depuis le backup restauré
          // afin que tous les appareils convergent vers la même clé ECDH.
          const rebuilt = await signalService.rebuildPublicBundle();
          if (rebuilt) {
            const publishRes = await api.publishSignalKeyBundle(rebuilt);
            if (publishRes.success) {
              console.log('[Signal] Bundle public réaligné depuis le backup ✓');
            } else {
              console.warn('[Signal] Échec réalignement bundle public:', publishRes.error);
            }
          }
        }
      }

      const localIdentity = await signalStore.getIdentityKeyPair();
      // L'ECDH est optionnel : en son absence on fonctionne en mode dégradé (fallback AES-GCM)
      // mais on ne bloque pas l'utilisateur — l'identité Signal suffit pour la messagerie.
      const hasLocalBundle = !!localIdentity;

      if (!hasLocalBundle) {
        if (statusKnown && !serverHasBundle) {
          console.log('[Signal] Aucun bundle confirmé et aucune clé locale, génération complète...');
          await signalService.reset();
          await generateAndPublishBundle(password);
          sessionStorage.setItem('signal_synced_this_session', '1');
        } else if (statusKnown && serverHasBundle) {
          console.warn('[Signal] Bundle serveur présent mais backup/local absents — aucune régénération automatique pour préserver le multi-appareil');
        } else {
          console.warn('[Signal] Statut serveur indisponible — aucune régénération automatique');
        }
        return;
      }

      if (!statusKnown) {
        console.warn('[Signal] Statut bundle indisponible — conservation des clés locales');
        return;
      }

      if (!serverHasBundle) {
        console.warn('[Signal] Bundle serveur absent — re-publication depuis le store local/backup');
        const rebuilt = await signalService.rebuildPublicBundle();
        if (rebuilt) {
          const publishRes = await api.publishSignalKeyBundle(rebuilt);
          if (publishRes.success) {
            console.log('[Signal] Bundle public re-publié ✓');
            const encryptedBlob = await signalService.encryptPrivateBundle(password);
            await api.uploadPrivateBundle(encryptedBlob);
            sessionStorage.setItem('signal_synced_this_session', '1');
          } else {
            console.warn('[Signal] Échec re-publication bundle public:', publishRes.error);
          }
        } else {
          console.warn('[Signal] Bundle local incomplet — re-publication impossible');
        }
        return;
      }

      // Vérifier le stock de prekeys
      if ((status.prekeyCount ?? 0) < signalService.lowPrekeyThreshold) {
        const startId = await signalService.getNextPreKeyId();
        const newPrekeys = await signalService.generateOneTimePrekeys(
          startId,
          signalService.prekeyBatchSize
        );
        await api.replenishSignalPrekeys(newPrekeys);
        const encryptedBlob = await signalService.encryptPrivateBundle(password);
        await api.uploadPrivateBundle(encryptedBlob);
        console.log(`[Signal] ${newPrekeys.length} prekeys rechargées ✓`);
      }
    } catch (err) {
      console.error('[Signal] Erreur initialisation clés:', err);
    }
  }

  async function generateAndPublishBundle(password: string) {
    const bundle = await signalService.generateKeyBundle();
    const publishRes = await api.publishSignalKeyBundle(bundle);
    if (!publishRes.success) {
      console.error('[Signal] Échec publication bundle:', publishRes.error);
      return;
    }
    console.log('[Signal] Bundle public publié ✓');
    const encryptedBlob = await signalService.encryptPrivateBundle(password);
    await api.uploadPrivateBundle(encryptedBlob);
    console.log('[Signal] Backup privé chiffré uploadé ✓');
  }

  const updateUser = (data: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...data });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        privateKey,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWith2FA,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
}
