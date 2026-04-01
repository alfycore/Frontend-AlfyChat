'use client';

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

/**
 * Version du singleton. Incrémenter à chaque ajout de méthode pour
 * forcer la recréation lors d'un HMR Next.js/Turbopack.
 */
const SOCKET_VERSION = 6;

/**
 * Clé pour le singleton global sur window.
 * Garantit qu'il n'y a qu'UNE seule instance de SocketService,
 * même après un Hot Module Replacement (HMR) de Next.js.
 */
const SINGLETON_KEY = Symbol.for('__alfychat_socket_service__');

/**
 * EventBus interne utilisant EventTarget natif du navigateur.
 * GARANTI de ne jamais perdre ses listeners (pas de removeAllListeners magique).
 * Socket.IO `onAny` dispatch ici → les hooks écoutent ici.
 *
 * Utilise un WeakMap<callback, Map<event, wrapper>> pour supporter l'enregistrement
 * du même callback sur plusieurs événements différents sans écrasement.
 */
class InternalEventBus {
  private target = new EventTarget();
  private wrappers = new WeakMap<Function, Map<string, EventListener>>();

  on(event: string, callback: (data: any) => void): void {
    if (!this.wrappers.has(callback)) {
      this.wrappers.set(callback, new Map());
    }
    const eventMap = this.wrappers.get(callback)!;
    // Si déjà enregistré pour cet event, supprimer l'ancien listener d'abord
    const existing = eventMap.get(event);
    if (existing) this.target.removeEventListener(event, existing);
    const wrapper = (e: Event) => callback((e as CustomEvent).detail);
    eventMap.set(event, wrapper);
    this.target.addEventListener(event, wrapper);
  }

  off(event: string, callback: (data: any) => void): void {
    const eventMap = this.wrappers.get(callback);
    if (!eventMap) return;
    const wrapper = eventMap.get(event);
    if (wrapper) {
      this.target.removeEventListener(event, wrapper);
      eventMap.delete(event);
    }
  }

  emit(event: string, data: any): void {
    this.target.dispatchEvent(new CustomEvent(event, { detail: data }));
  }
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /** Version du singleton — doit correspondre à SOCKET_VERSION. */
  readonly _version = SOCKET_VERSION;

  /**
   * Bus d'événements interne. Socket.IO `onAny` → dispatch ici.
   * Les hooks écoutent ce bus, PAS le socket directement.
   * Cela garantit que les listeners NE SONT JAMAIS PERDUS.
   */
  private bus = new InternalEventBus();

  connect(token: string): Socket | null {
    console.log('🔌 SocketService.connect appelé');

    if (!token) {
      console.warn('⚠️ Tentative de connexion WebSocket sans token - ignoré');
      return null;
    }

    if (this.socket?.connected) {
      console.log('✅ Socket déjà connecté, id:', this.socket.id);
      return this.socket;
    }

    // Fermer l'ancien socket s'il existe mais n'est pas connecté
    if (this.socket) {
      console.log('🔌 Nettoyage ancien socket (connected=' + this.socket.connected + ')');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    console.log('🔌 Création nouvelle connexion Socket.IO vers', SOCKET_URL);
    this.socket = io(SOCKET_URL, {
      auth: (cb) => {
        const freshToken =
          (typeof localStorage !== 'undefined' && localStorage.getItem('alfychat_token')) || token;
        cb({ token: freshToken });
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.socket.on('connect', () => {
      console.log('✅ Connecté au serveur WebSocket, id:', this.socket?.id);
      this.reconnectAttempts = 0;
      // Notifier le bus de la reconnexion pour que les hooks puissent re-rejoindre les rooms
      this.bus.emit('socket:reconnected', {});
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Déconnecté:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Erreur de connexion WebSocket:', error.message);
      this.reconnectAttempts++;
    });

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  onAny : SEUL point d'entrée pour TOUS les événements.     ║
    // ║  Dispatch vers le bus interne (EventTarget natif).         ║
    // ║  Les listeners spécifiques sont sur le bus, PAS le socket. ║
    // ╚══════════════════════════════════════════════════════════════╝
    this.socket.onAny((eventName: string, ...args: any[]) => {
      // Debug log (filtrer les événements bruyants)
      if (!eventName.startsWith('typing') && !eventName.startsWith('presence')) {
        console.log('📩 [Socket→Bus]', eventName, JSON.stringify(args).substring(0, 300));
      }
      // Dispatch vers le bus interne avec le premier argument
      this.bus.emit(eventName, args[0]);
    });

    console.log('✅ Socket initialisé');
    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Attend que le socket soit connecté (max 10s).
   * Si déjà connecté, resolve immédiatement.
   */
  private waitForConnection(timeout = 10000): Promise<void> {
    if (this.socket?.connected) return Promise.resolve();
    if (!this.socket) return Promise.reject(new Error('no socket'));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.socket?.off('connect', onConnect);
        reject(new Error('timeout'));
      }, timeout);
      const onConnect = () => {
        clearTimeout(timer);
        resolve();
      };
      this.socket!.once('connect', onConnect);
    });
  }

  // =====================================
  // ÉMISSION (vers le serveur via socket)
  // =====================================

  // Messages
  sendMessage(data: {
    channelId?: string;
    recipientId?: string;
    content: string;
    senderContent?: string;
    e2eeType?: 1 | 3;
    replyToId?: string;
    attachments?: string[];
  }): void {
    console.log('🔌 Émission WebSocket message:send:', data);
    this.socket?.emit('message:send', data);
  }

  editMessage(messageId: string, content: string, conversationId?: string): void {
    this.socket?.emit('message:edit', { messageId, content, conversationId });
  }

  deleteMessage(messageId: string, conversationId?: string): void {
    this.socket?.emit('message:delete', { messageId, conversationId });
  }

  addReaction(messageId: string, emoji: string, conversationId: string): void {
    this.socket?.emit('REACTION_ADD', { messageId, emoji, conversationId });
  }

  // Typing
  startTyping(channelId?: string, recipientId?: string): void {
    this.socket?.emit('typing:start', { channelId, recipientId });
  }

  stopTyping(channelId?: string, recipientId?: string): void {
    this.socket?.emit('typing:stop', { channelId, recipientId });
  }

  // Présence
  updatePresence(status: 'online' | 'idle' | 'dnd' | 'invisible', customStatus?: string | null): void {
    this.socket?.emit('PRESENCE_UPDATE', { status, customStatus: customStatus ?? null });
  }

  // Appels
  initiateCall(
    data: {
      recipientId?: string;
      conversationId?: string;
      channelId?: string;
      type: 'voice' | 'video';
    },
    callback?: (response: any) => void,
  ): void {
    this.socket?.emit('CALL_INITIATE', data, callback);
  }

  acceptCall(callId: string): void {
    this.socket?.emit('CALL_ACCEPT', { callId });
  }

  rejectCall(callId: string): void {
    this.socket?.emit('CALL_REJECT', { callId });
  }

  endCall(callId: string): void {
    this.socket?.emit('CALL_END', { callId });
  }

  rejoinCall(callId: string): void {
    this.socket?.emit('CALL_REJOIN', { callId });
  }

  // ── Appels groupe LiveKit SFU ──

  initiateGroupCall(channelId: string, type: 'voice' | 'video'): void {
    this.socket?.emit('GROUP_CALL_INITIATE', { channelId, type });
  }

  joinGroupCall(callId: string): void {
    this.socket?.emit('GROUP_CALL_JOIN', { callId });
  }

  leaveGroupCall(callId: string): void {
    this.socket?.emit('GROUP_CALL_LEAVE', { callId });
  }

  endGroupCall(callId: string): void {
    this.socket?.emit('GROUP_CALL_END', { callId });
  }

  onReconnected(callback: (data: unknown) => void): void {
    this.on('socket:reconnected', callback);
  }

  sendWebRTCOffer(callId: string, offer: RTCSessionDescriptionInit, targetUserId?: string): void {
    this.socket?.emit('WEBRTC_OFFER', { callId, offer, targetUserId });
  }

  sendWebRTCAnswer(callId: string, answer: RTCSessionDescriptionInit, targetUserId?: string): void {
    this.socket?.emit('WEBRTC_ANSWER', { callId, answer, targetUserId });
  }

  sendICECandidate(callId: string, candidate: RTCIceCandidateInit, targetUserId?: string): void {
    this.socket?.emit('WEBRTC_ICE_CANDIDATE', { callId, candidate, targetUserId });
  }

  // Serveurs
  joinServer(serverId: string): void {
    this.socket?.emit('SERVER_JOIN', { serverId });
  }

  leaveServer(serverId: string): void {
    this.socket?.emit('SERVER_LEAVE', { serverId });
  }

  /** Met à jour un serveur via socket → le gateway broadcast SERVER_UPDATE à tous les membres. */
  sendServerUpdate(serverId: string, updates: {
    name?: string;
    description?: string;
    iconUrl?: string;
    bannerUrl?: string;
    isPublic?: boolean;
  }): void {
    this.socket?.emit('SERVER_UPDATE', { serverId, updates });
  }

  /**
   * Notifie tous les membres d'une mise à jour du serveur (nom/icône/bannière)
   * SANS déclencher une seconde écriture DB — la mise à jour DB est déjà faite via HTTP.
   */
  notifyServerUpdated(serverId: string, data: { name?: string; iconUrl?: string; bannerUrl?: string; description?: string }): void {
    this.socket?.emit('SERVER_UPDATED_NOTIFY', { serverId, ...data });
  }

  joinChannel(channelId: string): void {
    this.socket?.emit('CHANNEL_JOIN', { channelId });
  }

  leaveChannel(channelId: string): void {
    this.socket?.emit('CHANNEL_LEAVE', { channelId });
  }

  // ── Server info / update via socket ──

  /** Récupère les infos d'un serveur via socket (acknowledge). */
  requestServerInfo(serverId: string, callback: (data: any) => void): void {
    this.waitForConnection().then(() => {
      this.socket!.emit('SERVER_INFO', { serverId }, callback);
    }).catch(() => callback({ error: 'not connected' }));
  }

  /** Met à jour un serveur directement via le node (acknowledge). */
  updateServerViaNode(serverId: string, updates: {
    name?: string; description?: string; iconUrl?: string; bannerUrl?: string; isPublic?: boolean;
  }): void {
    this.socket?.emit('SERVER_UPDATE_NODE', { serverId, ...updates });
  }

  // ── Channels CRUD via socket ──

  /** Crée un channel via socket → le gateway broadcast CHANNEL_CREATE. */
  createChannel(serverId: string, data: { name: string; type?: string; topic?: string; parentId?: string }): void {
    this.socket?.emit('CHANNEL_CREATE', { serverId, ...data });
  }

  /** Met à jour un channel via socket → le gateway broadcast CHANNEL_UPDATE. */
  updateChannel(serverId: string, channelId: string, data: { name?: string; topic?: string; position?: number }): void {
    this.socket?.emit('CHANNEL_UPDATE', { serverId, channelId, ...data });
  }

  /** Supprime un channel via socket → le gateway broadcast CHANNEL_DELETE. */
  deleteChannel(serverId: string, channelId: string): void {
    this.socket?.emit('CHANNEL_DELETE', { serverId, channelId });
  }

  // ── Membres via socket ──

  /** Récupère la liste des membres via socket (acknowledge). */
  requestMembers(serverId: string, callback: (data: any) => void): void {
    this.waitForConnection().then(() => {
      this.socket!.emit('MEMBER_LIST', { serverId }, callback);
    }).catch(() => callback({ members: [] }));
  }

  /** Récupère la présence en masse pour une liste d'utilisateurs (DM list, amis). */
  requestBulkPresence(userIds: string[], callback: (data: Array<{ userId: string; status: string; customStatus: string | null }>) => void): void {
    this.waitForConnection().then(() => {
      this.socket!.emit('GET_BULK_PRESENCE', { userIds }, (res: any) => {
        callback(res?.presence || []);
      });
    }).catch(() => callback([]));
  }

  /** Récupère l'état vocal actuel d'un serveur (channelId → participants[]). */
  requestVoiceState(serverId: string, callback: (data: Array<{ channelId: string; participants: any[] }>) => void): void {
    this.waitForConnection().then(() => {
      this.socket!.emit('GET_VOICE_STATE', { serverId }, (res: any) => {
        callback(res?.channels || []);
      });
    }).catch(() => callback([]));
  }

  /** Expulse un membre via socket. */
  kickMember(serverId: string, targetUserId: string): void {
    this.socket?.emit('MEMBER_KICK', { serverId, targetUserId });
  }

  /** Bannit un membre via socket. */
  banMember(serverId: string, targetUserId: string, reason?: string): void {
    this.socket?.emit('MEMBER_BAN', { serverId, targetUserId, reason });
  }

  /** Met à jour un membre (rôles, nickname, etc.) */
  updateMember(serverId: string, targetUserId: string, data: { roleIds?: string[]; nickname?: string }): void {
    this.socket?.emit('MEMBER_UPDATE', { serverId, targetUserId, ...data });
  }

  // ── Rôles CRUD via socket ──

  /** Récupère la liste des rôles via socket (acknowledge). */
  requestRoles(serverId: string, callback: (data: any) => void): void {
    this.waitForConnection().then(() => {
      this.socket!.emit('ROLE_LIST', { serverId }, callback);
    }).catch(() => callback({ roles: [] }));
  }

  /** Crée un rôle via socket. */
  createRole(serverId: string, data: { name: string; color?: string; permissions?: number }): void {
    this.socket?.emit('ROLE_CREATE', { serverId, ...data });
  }

  /** Met à jour un rôle via socket. */
  updateRole(serverId: string, roleId: string, data: { name?: string; color?: string; permissions?: number; iconEmoji?: string }): void {
    this.socket?.emit('ROLE_UPDATE', { serverId, roleId, ...data });
  }

  /** Supprime un rôle via socket. */
  deleteRole(serverId: string, roleId: string): void {
    this.socket?.emit('ROLE_DELETE', { serverId, roleId });
  }

  // ── Invitations via socket ──

  /** Récupère la liste des invitations via socket (acknowledge). */
  requestInvites(serverId: string, callback: (data: any) => void): void {
    this.waitForConnection().then(() => {
      this.socket!.emit('INVITE_LIST', { serverId }, callback);
    }).catch(() => callback({ invites: [] }));
  }

  /** Crée une invitation via socket (acknowledge). */
  createInvite(serverId: string, data: { maxUses?: number; expiresIn?: number; customSlug?: string; isPermanent?: boolean }, callback: (data: any) => void): void {
    this.waitForConnection().then(() => {
      this.socket!.emit('INVITE_CREATE', { serverId, ...data }, callback);
    }).catch(() => callback({ error: 'not connected' }));
  }

  /** Supprime une invitation via socket (acknowledge). */
  deleteInvite(serverId: string, inviteId: string, callback?: (data: any) => void): void {
    if (!this.socket?.connected) { callback?.({ error: 'not connected' }); return; }
    this.socket.emit('INVITE_DELETE', { serverId, inviteId }, callback);
  }

  /** Récupère les permissions par salon */
  requestChannelPerms(serverId: string, channelId: string, callback: (data: any) => void): void {
    this.waitForConnection().then(() => {
      this.socket!.emit('CHANNEL_PERMS_GET', { serverId, channelId }, callback);
    }).catch(() => callback({ permissions: [] }));
  }

  /** Définit les permissions d'un rôle pour un salon */
  setChannelPerms(serverId: string, channelId: string, roleId: string, allow: number, deny: number): void {
    this.socket?.emit('CHANNEL_PERMS_SET', { serverId, channelId, roleId, allow, deny });
  }

  /** Join a voice channel */
  joinVoiceChannel(serverId: string, channelId: string): void {
    this.socket?.emit('VOICE_JOIN', { serverId, channelId });
  }

  /** Leave a voice channel */
  leaveVoiceChannel(serverId: string, channelId: string): void {
    this.socket?.emit('VOICE_LEAVE', { serverId, channelId });
  }

  /** Update voice state (mute/deafen) */
  updateVoiceState(serverId: string, channelId: string, state: { muted?: boolean; deafened?: boolean }): void {
    this.socket?.emit('VOICE_STATE_UPDATE', { serverId, channelId, ...state });
  }

  /** Send WebRTC offer for voice channel */
  sendVoiceOffer(channelId: string, targetUserId: string, offer: RTCSessionDescriptionInit): void {
    this.socket?.emit('VOICE_OFFER', { channelId, targetUserId, offer });
  }

  /** Send WebRTC answer for voice channel */
  sendVoiceAnswer(channelId: string, targetUserId: string, answer: RTCSessionDescriptionInit): void {
    this.socket?.emit('VOICE_ANSWER', { channelId, targetUserId, answer });
  }

  /** Send ICE candidate for voice channel */
  sendVoiceICE(channelId: string, targetUserId: string, candidate: RTCIceCandidateInit): void {
    this.socket?.emit('VOICE_ICE_CANDIDATE', { channelId, targetUserId, candidate });
  }

  // ── Historique messages via socket ──

  /** Récupère l'historique des messages d'un channel serveur via socket (acknowledge). */
  requestMessageHistory(serverId: string, channelId: string, options: { before?: string; limit?: number }, callback: (data: any) => void): void {
    this.waitForConnection().then(() => {
      this.socket!.emit('SERVER_MESSAGE_HISTORY', { serverId, channelId, ...options }, callback);
    }).catch(() => callback({ messages: [] }));
  }

  // Messages serveur
  sendServerMessage(data: {
    serverId: string;
    channelId: string;
    content: string;
    attachments?: string[];
    replyToId?: string;
    tags?: string[];
  }): void {
    this.socket?.emit('SERVER_MESSAGE_SEND', data);
  }

  editServerMessage(serverId: string, messageId: string, content: string, channelId: string): void {
    this.socket?.emit('SERVER_MESSAGE_EDIT', { serverId, messageId, content, channelId });
  }

  deleteServerMessage(serverId: string, messageId: string, channelId: string): void {
    this.socket?.emit('SERVER_MESSAGE_DELETE', { serverId, messageId, channelId });
  }

  toggleServerReaction(serverId: string, channelId: string, messageId: string, emoji: string, hasReacted: boolean): void {
    const event = hasReacted ? 'SERVER_REACTION_REMOVE' : 'SERVER_REACTION_ADD';
    this.socket?.emit(event, { serverId, channelId, messageId, emoji });
  }

  private typingThrottle: Record<string, number> = {};

  startServerTyping(serverId: string, channelId: string): void {
    const key = `${serverId}:${channelId}`;
    const now = Date.now();
    if (this.typingThrottle[key] && now - this.typingThrottle[key] < 2000) return;
    this.typingThrottle[key] = now;
    this.socket?.emit('SERVER_TYPING_START', { serverId, channelId });
  }

  stopServerTyping(serverId: string, channelId: string): void {
    this.socket?.emit('SERVER_TYPING_STOP', { serverId, channelId });
  }

  // Amis
  sendFriendRequest(userId: string): void {
    this.socket?.emit('FRIEND_REQUEST', { userId });
  }

  acceptFriendRequest(requestId: string): void {
    this.socket?.emit('FRIEND_ACCEPT', { requestId });
  }

  declineFriendRequest(requestId: string): void {
    this.socket?.emit('FRIEND_DECLINE', { requestId });
  }

  // Conversations
  joinConversation(recipientId?: string, conversationId?: string): void {
    this.socket?.emit('conversation:join', { recipientId, conversationId });
  }

  // Profil
  updateProfile(data: {
    displayName?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    bio?: string;
    cardColor?: string;
    showBadges?: boolean;
  }): void {
    this.socket?.emit('PROFILE_UPDATE', data);
  }

  // Groupes
  createGroup(data: { name: string; participantIds: string[]; avatarUrl?: string }): void {
    this.socket?.emit('GROUP_CREATE', data);
  }

  updateGroup(data: {
    groupId: string;
    name?: string;
    avatarUrl?: string;
    addParticipants?: string[];
    removeParticipants?: string[];
  }): void {
    this.socket?.emit('GROUP_UPDATE', data);
  }

  leaveGroup(groupId: string): void {
    this.socket?.emit('GROUP_LEAVE', { groupId });
  }

  deleteGroup(groupId: string): void {
    this.socket?.emit('GROUP_DELETE', { groupId });
  }

  // Réactions (supprimer)
  removeReaction(messageId: string, emoji: string, conversationId: string): void {
    this.socket?.emit('REACTION_REMOVE', { messageId, emoji, conversationId });
  }

  // ===== SYSTÈME HYBRIDE DM - ARCHIVAGE P2P =====

  confirmArchive(conversationId: string, archiveLogId: string): void {
    this.socket?.emit('DM_ARCHIVE_CONFIRM', { conversationId, archiveLogId });
  }

  requestArchivedMessage(data: {
    conversationId: string;
    messageId?: string;
    beforeDate?: string;
    limit?: number;
  }): void {
    this.socket?.emit('DM_ARCHIVE_REQUEST', data);
  }

  respondToPeerArchiveRequest(data: {
    requestId: string;
    conversationId: string;
    messages: unknown[];
    requesterId: string;
  }): void {
    this.socket?.emit('DM_ARCHIVE_PEER_RESPONSE', data);
  }

  requestArchiveStatus(conversationId: string): void {
    this.socket?.emit('DM_ARCHIVE_STATUS', { conversationId });
  }

  // =====================================
  // ÉCOUTE (via le bus interne EventTarget)
  // =====================================

  /**
   * Écouter un événement. Le callback est attaché au bus interne (EventTarget natif),
   * PAS au socket. Il ne sera JAMAIS perdu par une reconnexion Socket.IO.
   */
  on(event: string, callback: (data: any) => void): void {
    this.bus.on(event, callback);
  }

  /**
   * Retirer un listener spécifique du bus interne.
   */
  off(event: string, callback: (data: any) => void): void {
    this.bus.off(event, callback);
  }

  // Raccourcis pour les événements courants
  onMessage(callback: (message: unknown) => void): void {
    this.on('message:new', callback);
  }
  onMessageEdit(callback: (data: unknown) => void): void {
    this.on('message:edited', callback);
  }
  onMessageDelete(callback: (data: unknown) => void): void {
    this.on('message:deleted', callback);
  }
  onMessageError(callback: (data: unknown) => void): void {
    this.on('message:error', callback);
  }
  onTyping(callback: (data: unknown) => void): void {
    this.on('typing:update', callback);
  }
  onReactionAdd(callback: (data: unknown) => void): void {
    this.on('REACTION_ADD', callback);
  }
  onReactionRemove(callback: (data: unknown) => void): void {
    this.on('REACTION_REMOVE', callback);
  }
  onPresenceUpdate(callback: (data: unknown) => void): void {
    this.on('PRESENCE_UPDATE', callback);
  }
  onPendingPings(callback: (data: unknown) => void): void {
    this.on('PENDING_PINGS', callback);
  }
  onCall(callback: (data: unknown) => void): void {
    this.on('CALL_INCOMING', callback);
  }
  onCallAccepted(callback: (data: unknown) => void): void {
    this.on('CALL_ACCEPT', callback);
  }
  onCallRejected(callback: (data: unknown) => void): void {
    this.on('CALL_REJECT', callback);
  }
  onCallEnded(callback: (data: unknown) => void): void {
    this.on('CALL_END', callback);
  }
  onWebRTCOffer(callback: (data: unknown) => void): void {
    this.on('WEBRTC_OFFER', callback);
  }
  onWebRTCAnswer(callback: (data: unknown) => void): void {
    this.on('WEBRTC_ANSWER', callback);
  }
  onICECandidate(callback: (data: unknown) => void): void {
    this.on('WEBRTC_ICE_CANDIDATE', callback);
  }
  onFriendRequest(callback: (data: unknown) => void): void {
    this.on('FRIEND_REQUEST', callback);
  }
  onFriendAccepted(callback: (data: unknown) => void): void {
    this.on('FRIEND_ACCEPT', callback);
  }
  onProfileUpdate(callback: (data: unknown) => void): void {
    this.on('PROFILE_UPDATE', callback);
  }
  onGroupCreate(callback: (data: unknown) => void): void {
    this.on('GROUP_CREATE', callback);
  }
  onGroupUpdate(callback: (data: unknown) => void): void {
    this.on('GROUP_UPDATE', callback);
  }
  onGroupLeave(callback: (data: unknown) => void): void {
    this.on('GROUP_LEAVE', callback);
  }
  onGroupDelete(callback: (data: unknown) => void): void {
    this.on('GROUP_DELETE', callback);
  }
  onGroupMemberAdd(callback: (data: unknown) => void): void {
    this.on('GROUP_MEMBER_ADD', callback);
  }
  onGroupMemberRemove(callback: (data: unknown) => void): void {
    this.on('GROUP_MEMBER_REMOVE', callback);
  }

  // Server events
  onServerMessageNew(callback: (data: unknown) => void): void {
    this.on('SERVER_MESSAGE_NEW', callback);
  }
  onServerMessageEdited(callback: (data: unknown) => void): void {
    this.on('SERVER_MESSAGE_EDITED', callback);
  }
  onServerMessageDeleted(callback: (data: unknown) => void): void {
    this.on('SERVER_MESSAGE_DELETED', callback);
  }
  onServerTypingStart(callback: (data: unknown) => void): void {
    this.on('SERVER_TYPING_START', callback);
  }
  onServerTypingStop(callback: (data: unknown) => void): void {
    this.on('SERVER_TYPING_STOP', callback);
  }
  onMemberJoin(callback: (data: unknown) => void): void {
    this.on('MEMBER_JOIN', callback);
  }
  onMemberLeave(callback: (data: unknown) => void): void {
    this.on('MEMBER_LEAVE', callback);
  }
  onMemberUpdate(callback: (data: any) => void): void {
    this.on('MEMBER_UPDATE', callback);
  }
  onServerNodeOnline(callback: (data: { serverId: string }) => void): void {
    this.on('SERVER_NODE_ONLINE', callback);
  }
  onServerNodeOffline(callback: (data: { serverId: string }) => void): void {
    this.on('SERVER_NODE_OFFLINE', callback);
  }
  onServerOwnerJoined(callback: (data: { serverId: string; ownerId: string }) => void): void {
    this.on('SERVER_OWNER_JOINED', callback);
  }

  // Demande les channels d'un serveur via socket (acknowledge).
  // Attend la connexion si le socket n'est pas encore prêt.
  requestServerChannels(serverId: string, callback: (channels: any[]) => void): void {
    this.waitForConnection().then(() => {
      this.socket!.emit('SERVER_GET_CHANNELS', { serverId }, (res: any) => {
        callback(res?.channels || []);
      });
    }).catch(() => callback([]));
  }

  onChannelCreate(callback: (data: any) => void): void {
    this.on('CHANNEL_CREATE', callback);
  }
  onChannelUpdate(callback: (data: any) => void): void {
    this.on('CHANNEL_UPDATE', callback);
  }
  onChannelDelete(callback: (data: any) => void): void {
    this.on('CHANNEL_DELETE', callback);
  }
  onRoleCreate(callback: (data: any) => void): void {
    this.on('ROLE_CREATE', callback);
  }
  onRoleUpdate(callback: (data: any) => void): void {
    this.on('ROLE_UPDATE', callback);
  }
  onRoleDelete(callback: (data: any) => void): void {
    this.on('ROLE_DELETE', callback);
  }

  // ── Voice event listeners ──
  onVoiceStateUpdate(callback: (data: any) => void): void {
    this.on('VOICE_STATE_UPDATE', callback);
  }
  onVoiceUserJoined(callback: (data: any) => void): void {
    this.on('VOICE_USER_JOINED', callback);
  }
  onVoiceUserLeft(callback: (data: any) => void): void {
    this.on('VOICE_USER_LEFT', callback);
  }
  onVoiceOffer(callback: (data: any) => void): void {
    this.on('VOICE_OFFER', callback);
  }
  onVoiceAnswer(callback: (data: any) => void): void {
    this.on('VOICE_ANSWER', callback);
  }
  onVoiceICECandidate(callback: (data: any) => void): void {
    this.on('VOICE_ICE_CANDIDATE', callback);
  }

  // Listeners pour les événements d'archive
  onArchivePush(callback: (data: unknown) => void): void {
    this.on('DM_ARCHIVE_PUSH', callback);
  }
  onArchiveResponse(callback: (data: unknown) => void): void {
    this.on('DM_ARCHIVE_RESPONSE', callback);
  }
  onArchivePeerRequest(callback: (data: unknown) => void): void {
    this.on('DM_ARCHIVE_PEER_REQUEST', callback);
  }
  onArchiveStatus(callback: (data: unknown) => void): void {
    this.on('DM_ARCHIVE_STATUS', callback);
  }
  onArchiveConfirmAck(callback: (data: unknown) => void): void {
    this.on('DM_ARCHIVE_CONFIRM_ACK', callback);
  }

  /**
   * NE PAS appeler cette méthode — elle détruit le bridge onAny→bus.
   * Chaque hook doit gérer son propre cleanup via off() sur le bus.
   * @deprecated Utiliser off() pour retirer des listeners spécifiques.
   */
  offAll(): void {
    // Ne plus appeler removeAllListeners() car cela détruit aussi onAny
    // qui est le pont entre le socket et le bus d'événements.
    // Chaque hook gère son propre cleanup via off().
    console.warn('[Socket] offAll() appelé — ignoré pour préserver le bridge onAny→bus');
  }
}

/**
 * Singleton garanti via Symbol.for sur globalThis.
 * Survit aux rechargements HMR de Next.js.
 */
function getOrCreateSingleton(): SocketService {
  const g = (
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof window !== 'undefined'
        ? window
        : {}
  ) as any;
  const existing = g[SINGLETON_KEY];
  if (!existing || existing._version !== SOCKET_VERSION) {
    if (existing) {
      try { existing.disconnect(); } catch {}
      console.log('🔌 Singleton SocketService obsolète (version mismatch) — recréation');
    } else {
      console.log('🔌 Nouvelle instance SocketService créée (singleton)');
    }
    g[SINGLETON_KEY] = new SocketService();
  } else {
    console.log('🔌 Réutilisation du singleton SocketService existant');
  }
  return g[SINGLETON_KEY];
}

export const socketService = getOrCreateSingleton();
export default socketService;
