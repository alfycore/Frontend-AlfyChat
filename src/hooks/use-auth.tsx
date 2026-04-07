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
      const p = payload as { userId?: string; displayName?: string; avatarUrl?: string; bio?: string; status?: 'online' | 'idle' | 'dnd' | 'invisible' | 'offline' };
      // Si c'est notre propre profil qui a été mis à jour par un autre client
      if (p?.userId === user.id) {
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
      // Vérifier que les clés Signal locales sont intactes (IndexedDB)
      try {
        const { signalStore } = await import('../lib/signal-store');
        const localIdentity = await signalStore.getIdentityKeyPair();
        const localECDH     = await signalStore.getECDHKeyPair();

        if (!localIdentity || !localECDH) {
          // Clés locales absentes (IndexedDB vidé, nouveau navigateur, etc.)
          // → forcer un vrai login pour avoir le mot de passe et restaurer le backup
          console.warn('[Signal] Clés locales absentes — login requis pour restaurer le backup chiffré');
          localStorage.removeItem('alfychat_token');
          localStorage.removeItem('alfychat_refresh_token');
          setIsLoading(false);
          return;
        }

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
              console.error('[Signal] Échec re-publication, re-login requis');
              localStorage.removeItem('alfychat_token');
              localStorage.removeItem('alfychat_refresh_token');
              setIsLoading(false);
              return;
            }
          } else {
            // Signature manquante → impossible de re-publier sans mot de passe
            console.warn('[Signal] Impossible de re-publier (signature manquante) — re-login requis');
            localStorage.removeItem('alfychat_token');
            localStorage.removeItem('alfychat_refresh_token');
            setIsLoading(false);
            return;
          }
        }
      } catch (idbErr) {
        // L'IndexedDB a eu un problème — laisser passer mais E2EE sera dégradé
        console.error('[Signal] Erreur lecture IndexedDB lors du checkAuth:', idbErr);
      }

      console.log('✅ Utilisateur chargé:', response.data);
      setUser(response.data as User);

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
          const aesKey = await deriveKey(password, data.keySalt);
          const decryptedPrivKey = await decryptPrivateKey(data.encryptedPrivateKey, aesKey);
          setPrivateKey(decryptedPrivKey);
          sessionStorage.setItem(E2EE_SESSION_KEY, decryptedPrivKey);
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
          const aesKey = await deriveKey(password, data.keySalt);
          const decryptedPrivKey = await decryptPrivateKey(data.encryptedPrivateKey, aesKey);
          setPrivateKey(decryptedPrivKey);
          sessionStorage.setItem(E2EE_SESSION_KEY, decryptedPrivKey);
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
    try {
      const keypair = await generateKeypair();
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

    if (response.success) {
      return login(data.email, data.password);
    }

    return { success: false, error: response.error };
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
   */
  async function initSignalKeys(password: string) {
    try {
      // Vérifier si le serveur a déjà un bundle pour cet utilisateur
      const status = await api.getSignalKeyStatus();
      const serverHasBundle = status?.hasBundle === true;

      if (serverHasBundle) {
        // Le serveur a un bundle — essayer de restaurer les clés locales
        const alreadyInit = await signalService.isInitialized();

        if (!alreadyInit) {
          // Pas de clés locales : restaurer depuis le backup chiffré
          const backupRes = await api.downloadPrivateBundle();
          const encryptedBundle = backupRes?.encryptedBundle ?? null;

          if (encryptedBundle) {
            console.log('[Signal] Restauration des clés depuis le backup...');
            await signalService.decryptAndImportPrivateBundle(encryptedBundle, password);
            console.log('[Signal] Clés restaurées ✓');

            // Vérifier que la clé ECDH P-256 existe après restauration
            const { signalStore } = await import('../lib/signal-store');
            const ecdhAfterRestore = await signalStore.getECDHKeyPair();
            if (!ecdhAfterRestore) {
              console.log('[Signal] Clé ECDH absente du backup, ajout...');
              await signalService.addMissingECDHKey(password);
            }
          } else {
            // Backup absent → regénérer tout
            console.log('[Signal] Pas de backup, regénération complète...');
            await signalService.reset();
            await generateAndPublishBundle(password);
          }
        } else {
          // Clés locales OK — vérifier si la clé ECDH est présente
          const { signalStore } = await import('../lib/signal-store');
          const localECDH = await signalStore.getECDHKeyPair();
          if (!localECDH) {
            console.log('[Signal] Clé ECDH manquante, ajout sans reset...');
            await signalService.addMissingECDHKey(password);
          }

          // Vérifier le stock de prekeys
          if ((status!.prekeyCount ?? 0) < signalService.lowPrekeyThreshold) {
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
        }
      } else {
        // Pas de bundle côté serveur → reset local et générer tout
        console.log('[Signal] Aucun bundle serveur, génération complète...');
        await signalService.reset();
        await generateAndPublishBundle(password);
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
